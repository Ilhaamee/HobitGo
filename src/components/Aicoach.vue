<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'

// ── Config ─────────────────────────────────────────────
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

const route = useRoute()

const isVisible = computed(() => {
  const p = route.path
  // Solo visible dentro de /dashboard
  return p.startsWith('/dashboard')
})

// Cerrar y limpiar al salir del dashboard
watch(isVisible, (val) => {
  if (!val) {
    open.value       = false
    messages.value   = []
    dataLoaded.value = false
    userData.value   = null
  }
})

// ── State ──────────────────────────────────────────────
const open        = ref(false)
const messages    = ref([])
const input       = ref('')
const loading     = ref(false)
const messagesRef = ref(null)
const userData    = ref(null)
const dataLoaded  = ref(false)

const QUICK_SUGGESTIONS = [
  '¿Cómo voy esta semana?',
  'Dame consejos para mi racha',
  '¿Qué hobby debería priorizar?',
  'Analiza mi progreso del mes',
]

// ── Cargar datos reales de Supabase ────────────────────
// Tablas usadas: hobby_sessions (hobby_id, minutes, created_at)
//                hobbies (id, name, daily_minutes, total_days, total_minutes)
//                profiles (username)
async function loadUserData() {
  if (dataLoaded.value) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const now      = new Date()
  const weekAgo  = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30)

  const [
    { data: profile },
    { data: hobbies },
    { data: sessions },
  ] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user.id).single(),
    supabase.from('hobbies')
      .select('id, name, daily_minutes, total_days, total_minutes')
      .eq('user_id', user.id),
    supabase.from('hobby_sessions')
      .select('hobby_id, minutes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  const allSessions   = sessions || []
  const allHobbies    = hobbies  || []

  // Filtrar por periodo
  const weekSessions  = allSessions.filter(s => new Date(s.created_at) >= weekAgo)
  const monthSessions = allSessions.filter(s => new Date(s.created_at) >= monthAgo)

  // Minutos totales y del mes por hobby
  const minsTotalByHobby = {}
  const minsMonthByHobby = {}

  allSessions.forEach(s => {
    minsTotalByHobby[s.hobby_id] = (minsTotalByHobby[s.hobby_id] || 0) + (s.minutes || 0)
  })
  monthSessions.forEach(s => {
    minsMonthByHobby[s.hobby_id] = (minsMonthByHobby[s.hobby_id] || 0) + (s.minutes || 0)
  })

  // Racha actual por hobby (días consecutivos hasta hoy)
  const streakByHobby = {}
  allHobbies.forEach(h => {
    const days = [...new Set(
      allSessions
        .filter(s => s.hobby_id === h.id)
        .map(s => {
          const d = new Date(s.created_at)
          d.setHours(0, 0, 0, 0)
          return d.getTime()
        })
    )].sort((a, b) => b - a)

    let streak = 0
    let cur = new Date(); cur.setHours(0, 0, 0, 0)
    for (const t of days) {
      const diff = Math.round((cur.getTime() - t) / 86400000)
      if (diff <= 1) { streak++; cur = new Date(t) }
      else break
    }
    streakByHobby[h.id] = streak
  })

  // Hobby con mayor racha activa
  const bestHobby = allHobbies.length
    ? allHobbies.reduce((b, h) => (streakByHobby[h.id] || 0) > (streakByHobby[b.id] || 0) ? h : b, allHobbies[0])
    : null

  // Día de la semana con más minutos esta semana
  const DAY_NAMES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const dayMins   = {}
  weekSessions.forEach(s => {
    const d = DAY_NAMES[new Date(s.created_at).getDay()]
    dayMins[d] = (dayMins[d] || 0) + (s.minutes || 0)
  })
  const bestDay = Object.entries(dayMins).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  userData.value = {
    username:       profile?.username || 'Usuario',
    hobbies:        allHobbies,
    streakByHobby,
    bestHobby,
    bestStreak:     bestHobby ? (streakByHobby[bestHobby.id] || 0) : 0,
    minsTotalByHobby,
    minsMonthByHobby,
    weekSessions:   weekSessions.length,
    weekMinutes:    weekSessions.reduce((s, x) => s + (x.minutes || 0), 0),
    monthSessions:  monthSessions.length,
    monthMinutes:   monthSessions.reduce((s, x) => s + (x.minutes || 0), 0),
    bestDay,
  }

  dataLoaded.value = true
}

// ── System prompt ──────────────────────────────────────
function buildSystemPrompt() {
  if (!userData.value) {
    return `Eres AI Coach de HobitGo, app de hábitos y hobbies.
Responde siempre en español, tono amigable y motivador. Máximo 4 frases por respuesta.`
  }

  const u = userData.value

  const hobbyLines = u.hobbies.map(h => {
    const streak  = u.streakByHobby[h.id]    || 0
    const minsM   = u.minsMonthByHobby[h.id] || 0
    const minsT   = u.minsTotalByHobby[h.id] || 0
    const goal    = (h.total_days || 30) * (h.daily_minutes || 20)
    const pct     = goal > 0 ? Math.min(100, Math.round((minsT / goal) * 100)) : 0
    return `• ${h.name}: racha ${streak}d | ${minsM}min este mes | ${pct}% del reto`
  }).join('\n')

  return `Eres AI Coach de HobitGo para ${u.username}.

DATOS HOY (${new Date().toLocaleDateString('es-ES')}):
${hobbyLines || '• Sin hobbies registrados'}

Esta semana → ${u.weekSessions} sesiones · ${u.weekMinutes} min
Este mes    → ${u.monthSessions} sesiones · ${u.monthMinutes} min
${u.bestStreak > 0 && u.bestHobby ? `Mejor racha: ${u.bestStreak} días con ${u.bestHobby.name}` : ''}
${u.bestDay ? `Día más activo esta semana: ${u.bestDay}` : ''}

REGLAS:
- Responde en español, tono motivador y amigable
- Usa los datos reales de arriba cuando el usuario pregunte por su progreso
- Máximo 4 frases, directo al punto
- 1-2 emojis por respuesta máximo
- Si la pregunta no tiene que ver con hábitos/hobbies, redirige amablemente`
}

// ── Llamar a Gemini ────────────────────────────────────
async function callGemini(userMessage) {
  if (!GEMINI_API_KEY) {
    return '⚠️ Añade VITE_GEMINI_API_KEY en tu .env para activar el AI Coach.'
  }

  const history = messages.value.map(m => ({
    role:  m.role === 'ai' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }))

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: buildSystemPrompt() }] },
      contents: [...history, { role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 280 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Error ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text
    || 'No pude generar una respuesta. Inténtalo de nuevo.'
}

// ── Enviar mensaje ─────────────────────────────────────
async function sendMessage(text = null) {
  const msg = (text || input.value).trim()
  if (!msg || loading.value) return

  input.value = ''
  messages.value.push({ role: 'user', text: msg, id: Date.now() })
  loading.value = true
  await scrollToBottom()

  try {
    const reply = await callGemini(msg)
    messages.value.push({ role: 'ai', text: reply, id: Date.now() + 1 })
  } catch (e) {
    console.error('Gemini error:', e)
    messages.value.push({
      role: 'ai',
      text: 'Error al conectar con Gemini. Revisa tu API key o inténtalo más tarde.',
      id: Date.now() + 1,
      error: true,
    })
  } finally {
    loading.value = false
    await scrollToBottom()
  }
}

// ── Abrir / cerrar ─────────────────────────────────────
async function toggleOpen() {
  open.value = !open.value

  if (open.value) {
    await loadUserData()
    if (messages.value.length === 0) buildWelcomeMessage()
    await nextTick()
    await scrollToBottom()
  }
}

// Mensaje de bienvenida con datos reales
function buildWelcomeMessage() {
  const u = userData.value

  if (!u || !u.hobbies.length) {
    messages.value.push({
      role: 'ai',
      text: '¡Hola! Soy tu AI Coach de HobitGo. Puedo ayudarte con consejos sobre hábitos, hobbies y productividad. ¿En qué te ayudo hoy?',
      id: Date.now(),
    })
    return
  }

  const parts = [`¡Hola ${u.username}!`]

  if (u.bestStreak > 0 && u.bestHobby) {
    parts.push(`Llevas ${u.bestStreak} días de racha con ${u.bestHobby.name} 🔥`)
  }

  if (u.weekSessions > 0) {
    parts.push(`Esta semana: ${u.weekSessions} sesión${u.weekSessions > 1 ? 'es' : ''} · ${u.weekMinutes} min practicados.`)
  } else {
    parts.push('Todavía no tienes sesiones esta semana — hoy es un buen momento para empezar.')
  }

  parts.push('¿En qué te puedo ayudar?')

  messages.value.push({ role: 'ai', text: parts.join(' '), id: Date.now() })
}

// ── Scroll ─────────────────────────────────────────────
async function scrollToBottom() {
  await nextTick()
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <!-- Solo aparece dentro del dashboard, nunca en login / home / onboarding -->
  <template v-if="isVisible">

    <!-- Botón flotante -->
    <div class="coach-fab-wrap">
      <div class="coach-pulse p1"></div>
      <div class="coach-pulse p2"></div>
      <button
        class="coach-fab"
        :class="{ open }"
        @click="toggleOpen"
        :aria-label="open ? 'Cerrar AI Coach' : 'Abrir AI Coach'"
      >
        <Transition name="icon-flip" mode="out-in">
          <i v-if="open" key="close"  class="ti ti-x"        aria-hidden="true"></i>
          <i v-else      key="open"   class="ti ti-sparkles"  aria-hidden="true"></i>
        </Transition>
      </button>
      <span v-if="!open" class="coach-label">AI Coach</span>
    </div>

    <!-- Modal de chat -->
    <Transition name="coach-slide">
      <div v-if="open" class="coach-modal" role="dialog" aria-label="AI Coach">

        <!-- Header -->
        <div class="coach-header">
          <div class="coach-header-left">
            <div class="coach-avatar">
              <i class="ti ti-sparkles" aria-hidden="true"></i>
            </div>
            <div>
              <p class="coach-title">AI Coach</p>
              <p class="coach-subtitle">
                <span class="online-dot"></span>
                Powered by Gemini
              </p>
            </div>
          </div>
          <button class="coach-close" @click="toggleOpen" aria-label="Cerrar">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>

        <!-- Mensajes -->
        <div class="coach-messages" ref="messagesRef">

          <!-- Sugerencias antes del primer mensaje -->
          <div v-if="messages.length === 0 && !loading" class="coach-suggestions">
            <p class="sugg-title">Pregúntame algo</p>
            <div class="sugg-grid">
              <button
                v-for="s in QUICK_SUGGESTIONS"
                :key="s"
                class="sugg-btn"
                @click="sendMessage(s)"
              >{{ s }}</button>
            </div>
          </div>

          <!-- Historial -->
          <template v-else>
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="msg-row"
              :class="msg.role"
            >
              <div v-if="msg.role === 'ai'" class="msg-avatar">
                <i class="ti ti-sparkles" aria-hidden="true"></i>
              </div>
              <div class="msg-bubble" :class="[msg.role, { error: msg.error }]">
                {{ msg.text }}
              </div>
            </div>

            <!-- Accesos rápidos tras conversar -->
            <div v-if="!loading" class="quick-actions">
              <button
                v-for="s in QUICK_SUGGESTIONS.slice(0, 2)"
                :key="s"
                class="quick-btn"
                @click="sendMessage(s)"
              >{{ s }}</button>
            </div>
          </template>

          <!-- Typing indicator -->
          <div v-if="loading" class="msg-row ai">
            <div class="msg-avatar">
              <i class="ti ti-sparkles" aria-hidden="true"></i>
            </div>
            <div class="typing-bubble">
              <span></span><span></span><span></span>
            </div>
          </div>

        </div>

        <!-- Input -->
        <div class="coach-input-area">
          <input
            v-model="input"
            type="text"
            class="coach-input"
            placeholder="Pregunta sobre tu progreso..."
            :disabled="loading"
            @keydown="handleKeydown"
            maxlength="500"
          />
          <button
            class="coach-send"
            :disabled="!input.trim() || loading"
            @click="sendMessage()"
            aria-label="Enviar"
          >
            <i class="ti ti-send" aria-hidden="true"></i>
          </button>
        </div>

      </div>
    </Transition>

  </template>
</template>

<style scoped>
/* ── FAB ──────────────────────────────────────────────── */
.coach-fab-wrap {
  position: fixed;
  bottom: 90px;
  right: 20px;
  z-index: 800;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.coach-pulse {
  position: absolute;
  border-radius: 50%;
  background: rgba(34,40,78,.12);
  pointer-events: none;
}
.p1 { width: 52px; height: 52px; animation: coachPulse 3s ease-out infinite; }
.p2 { width: 68px; height: 68px; animation: coachPulse 3s ease-out infinite 1s; }

@keyframes coachPulse {
  0%   { transform: scale(.85); opacity: .5; }
  100% { transform: scale(1.7); opacity: 0; }
}

.coach-fab {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #22284E;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff59e;
  font-size: 22px;
  box-shadow: 0 4px 20px rgba(34,40,78,.28);
  transition: transform .25s cubic-bezier(.34,1.56,.64,1), background .2s;
  position: relative;
  z-index: 1;
}
.coach-fab:hover { transform: scale(1.1); }
.coach-fab.open  { background: #ff6b9d; }

.coach-label {
  font-size: 10px;
  font-weight: 700;
  color: rgba(34,40,78,.45);
  letter-spacing: .05em;
  text-transform: uppercase;
}

/* ── Modal ────────────────────────────────────────────── */
.coach-modal {
  position: fixed;
  bottom: 160px;
  right: 20px;
  width: 340px;
  max-height: 500px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(34,40,78,.18);
  border: 1px solid rgba(34,40,78,.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 799;
}

.coach-slide-enter-active,
.coach-slide-leave-active  { transition: all .3s cubic-bezier(.16,1,.3,1); }
.coach-slide-enter-from,
.coach-slide-leave-to      { opacity: 0; transform: translateY(20px) scale(.95); }

/* ── Header ───────────────────────────────────────────── */
.coach-header {
  background: #22284E;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.coach-header-left { display: flex; align-items: center; gap: 10px; }

.coach-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(255,245,158,.13);
  display: flex; align-items: center; justify-content: center;
  color: #fff59e; font-size: 15px; flex-shrink: 0;
}

.coach-title    { margin: 0; font-size: 14px; font-weight: 600; color: #fff59e; line-height: 1.2; }
.coach-subtitle { margin: 0; font-size: 11px; color: rgba(255,255,255,.4); display: flex; align-items: center; gap: 5px; }

.online-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; display: inline-block; }

.coach-close {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255,255,255,.08); border: none;
  color: rgba(255,255,255,.55); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; transition: background .2s;
}
.coach-close:hover { background: rgba(255,255,255,.18); }

/* ── Mensajes ─────────────────────────────────────────── */
.coach-messages {
  flex: 1; overflow-y: auto;
  padding: 14px;
  display: flex; flex-direction: column; gap: 8px;
  scroll-behavior: smooth;
}
.coach-messages::-webkit-scrollbar       { width: 4px; }
.coach-messages::-webkit-scrollbar-thumb { background: rgba(34,40,78,.1); border-radius: 99px; }

.coach-suggestions { display: flex; flex-direction: column; gap: 8px; }
.sugg-title {
  margin: 0; font-size: 11px; font-weight: 700;
  color: rgba(34,40,78,.4); text-transform: uppercase; letter-spacing: .06em;
}
.sugg-grid  { display: flex; flex-direction: column; gap: 6px; }
.sugg-btn {
  text-align: left; padding: 10px 13px;
  background: rgba(34,40,78,.03);
  border: 1px solid rgba(34,40,78,.09);
  border-radius: 12px; font-size: 13px; color: #22284E;
  cursor: pointer; font-family: inherit; line-height: 1.4;
  transition: background .15s, border-color .15s;
}
.sugg-btn:hover { background: rgba(255,107,157,.06); border-color: rgba(255,107,157,.2); }

.msg-row        { display: flex; gap: 8px; align-items: flex-end; }
.msg-row.user   { justify-content: flex-end; }
.msg-row.ai     { justify-content: flex-start; }

.msg-avatar {
  width: 26px; height: 26px; border-radius: 50%;
  background: #22284E; color: #fff59e; font-size: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.msg-bubble {
  max-width: 80%; padding: 10px 14px;
  border-radius: 16px; font-size: 13px;
  line-height: 1.55; word-break: break-word;
}
.msg-bubble.ai    { background: rgba(34,40,78,.05); color: #22284E; border-radius: 4px 16px 16px 16px; }
.msg-bubble.user  { background: #ff6b9d; color: #fff; border-radius: 16px 4px 16px 16px; }
.msg-bubble.error { background: rgba(239,68,68,.07); color: #dc2626; border: 1px solid rgba(239,68,68,.2); border-radius: 4px 16px 16px 16px; }

.typing-bubble {
  background: rgba(34,40,78,.05);
  border-radius: 4px 16px 16px 16px;
  padding: 12px 16px; display: flex; gap: 4px; align-items: center;
}
.typing-bubble span {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(34,40,78,.3);
  animation: typingDot 1.4s ease-in-out infinite;
}
.typing-bubble span:nth-child(2) { animation-delay: .18s; }
.typing-bubble span:nth-child(3) { animation-delay: .36s; }
@keyframes typingDot {
  0%,80%,100% { transform: scale(.7); opacity: .4; }
  40%          { transform: scale(1);  opacity: 1; }
}

.quick-actions { display: flex; gap: 6px; flex-wrap: wrap; padding-top: 2px; }
.quick-btn {
  padding: 5px 11px; background: transparent;
  border: 1px solid rgba(34,40,78,.12); border-radius: 99px;
  font-size: 11px; color: rgba(34,40,78,.55);
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.quick-btn:hover { border-color: #ff6b9d; color: #ff6b9d; background: rgba(255,107,157,.04); }

/* ── Input ────────────────────────────────────────────── */
.coach-input-area {
  padding: 11px 13px; border-top: 1px solid rgba(34,40,78,.07);
  display: flex; gap: 8px; align-items: center;
  flex-shrink: 0; background: #fff;
}

.coach-input {
  flex: 1; padding: 9px 13px;
  background: rgba(34,40,78,.04);
  border: 1px solid rgba(34,40,78,.09);
  border-radius: 99px; font-size: 13px; color: #22284E;
  font-family: inherit; outline: none; min-width: 0;
  transition: border-color .2s, background .2s;
}
.coach-input:focus        { border-color: #ff6b9d; background: #fff; }
.coach-input::placeholder { color: rgba(34,40,78,.35); }
.coach-input:disabled     { opacity: .6; }

.coach-send {
  width: 36px; height: 36px; border-radius: 50%;
  background: #ff6b9d; border: none; color: #fff; font-size: 16px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: opacity .2s, transform .15s;
}
.coach-send:hover:not(:disabled) { transform: scale(1.08); }
.coach-send:disabled             { opacity: .35; cursor: not-allowed; }

.icon-flip-enter-active, .icon-flip-leave-active { transition: all .2s ease; }
.icon-flip-enter-from,   .icon-flip-leave-to     { opacity: 0; transform: rotate(90deg) scale(.7); }

@media (max-width: 480px) {
  .coach-modal    { right: 10px; left: 10px; width: auto; bottom: 145px; }
  .coach-fab-wrap { right: 14px; bottom: 78px; }
}
</style>