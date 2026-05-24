// src/funciones/useNotifications.js
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'

// VAPID public key — genera las tuyas en: https://vapidkeys.com/
// Pega aquí la PUBLIC key (la privada va en la Edge Function)
const VAPID_PUBLIC_KEY = 'BD9XuLGWJuaB7jiuQCIu7eb_mCDl4_l-oP_8scFM5zs5p7DlR8vKs19eCyenkgzsLHIbcf0fM7lckGsLk6SAzL4'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function useNotifications() {
  const permission  = ref(Notification.permission)
  const supported   = ref('serviceWorker' in navigator && 'PushManager' in window)
  const subscribing = ref(false)

  // ── Registrar SW y suscribir al push ────
  async function subscribe() {
    if (!supported.value) return { ok: false, reason: 'not_supported' }
    subscribing.value = true

    try {
      // 1. Pedir permiso
      const perm = await Notification.requestPermission()
      permission.value = perm
      if (perm !== 'granted') {
        subscribing.value = false
        return { ok: false, reason: 'denied' }
      }

      // 2. Registrar Service Worker
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      // 3. Crear suscripción push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // 4. Guardar en Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { subscribing.value = false; return { ok: false, reason: 'no_user' } }

      const subJson = sub.toJSON()
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id:  user.id,
          endpoint: subJson.endpoint,
          p256dh:   subJson.keys.p256dh,
          auth:     subJson.keys.auth,
        }, { onConflict: 'user_id,endpoint' })

      if (error) console.error('Error guardando suscripción:', error)

      subscribing.value = false
      return { ok: true }

    } catch (err) {
      console.error('Error al suscribir:', err)
      subscribing.value = false
      return { ok: false, reason: err.message }
    }
  }

  // ── Cancelar suscripción ─────────────────
  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (!reg) return

      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        // Borrar de Supabase
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', sub.endpoint)
        }
      }
    } catch (err) {
      console.error('Error al cancelar suscripción:', err)
    }
  }

  // ── Comprobar si ya está suscrito ────────
  async function isSubscribed() {
    if (!supported.value) return false
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (!reg) return false
      const sub = await reg.pushManager.getSubscription()
      return !!sub
    } catch { return false }
  }

  // ── Check in-app: ¿hay hobby pendiente hoy? ──
  async function checkTodayReminders() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const now     = new Date()
    const nowMins = now.getHours() * 60 + now.getMinutes()

    // Cargar hobbies con reminder activo
    const { data: hobbies } = await supabase
      .from('hobbies')
      .select('id, name, reminder, reminder_time, daily_minutes, gradient')
      .eq('user_id', user.id)
      .eq('reminder', true)

    if (!hobbies?.length) return []

    // Ver cuáles ya tienen sesión hoy
    const today = now.toISOString().split('T')[0]
    const { data: sessions } = await supabase
      .from('hobby_sessions')
      .select('hobby_id, minutes')
      .eq('user_id', user.id)
      .gte('created_at', today + 'T00:00:00')

    const doneMap = {}
    sessions?.forEach(s => {
      doneMap[s.hobby_id] = (doneMap[s.hobby_id] || 0) + s.minutes
    })

    // Filtrar los que toca ahora (±30 min del reminder_time) y no están completados
    const pending = hobbies.filter(h => {
      if (!h.reminder_time) return false
      const [hh, mm] = h.reminder_time.split(':').map(Number)
      const targetMins = hh * 60 + mm
      const diff = Math.abs(nowMins - targetMins)
      const alreadyDone = (doneMap[h.id] || 0) >= (h.daily_minutes || 20)
      return diff <= 30 && !alreadyDone
    })

    return pending
  }

  return {
    permission,
    supported,
    subscribing,
    subscribe,
    unsubscribe,
    isSubscribed,
    checkTodayReminders,
  }
}