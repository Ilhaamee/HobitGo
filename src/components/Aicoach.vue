<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

const open      = ref(false)
const messages  = ref([])
const input     = ref('')
const loading   = ref(false)
const messagesRef = ref(null)

// Datos del usuario
const userData  = ref(null)
const dataLoaded = ref(false)

// Sugerencias rápidas
const QUICK_SUGGESTIONS = [
  '¿Cómo voy esta semana?',
  'Dame un programa de 30 días',
  '¿Qué hobby debería priorizar?',
  'Eventos de running en Madrid',
]

// Cargar datos del usuario desde Supabase 
async function loadUserData() {
  if (dataLoaded.value) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const [
    { data: profile },
    { data: hobbies },
    { data: sessions },
    { data: events },
  ] = await Promise.all([
    supabase.from('profiles').select('username, bio').eq('id', user.id).single(),
    supabase.from('hobbies').select('id, name, daily_minutes, total_days, total_minutes, gradient').eq('user_id', user.id),
    supabase.from('hobby_sessions').select('hobby_id, minutes, created_at, note').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('events').select('title, date').eq('user_id', user.id).limit(10),
  ])

  // Calcular rachas por hobby
  const streaksByHobby = {}
  if (hobbies && sessions) {
    hobbies.forEach(h => {
      const dates = [...new Set(
        sessions
          .filter(s => s.hobby_id === h.id)
          .map(s => new Date(s.created_at).toDateString())
      )].map(d => new Date(d)).sort((a, b) => b - a)

      let streak = 0
      let cur = new Date(); cur.setHours(0, 0, 0, 0)
      for (const d of dates) {
        if (Math.round((cur - d) / 86400000) <= 1) { streak++; cur = d }
        else break
      }
      streaksByHobby[h.id] = streak
    })
  }

  // Sesiones de los últimos 7 días
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const thisWeekSessions = (sessions || []).filter(s => new Date(s.created_at) >= weekAgo)

  // Sesiones de este mes
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)
  const thisMonthSessions = (sessions || []).filter(s => new Date(s.created_at) >= monthAgo)

  // Minutos por hobby este mes
  const minutesByHobby = {}
  thisMonthSessions.forEach(s => {
    minutesByHobby[s.hobby_id] = (minutesByHobby[s.hobby_id] || 0) + (s.minutes || 0)
  })

  userData.value = {
    username: profile?.username || 'Usuario',
    hobbies: hobbies || [],
    streaksByHobby,
    totalSessionsThisWeek: thisWeekSessions.length,
    totalMinutesThisWeek: thisWeekSessions.reduce((s, x) => s + (x.minutes || 0), 0),
    totalSessionsThisMonth: thisMonthSessions.length,
    totalMinutesThisMonth: thisMonthSessions.reduce((s, x) => s + (x.minutes || 0), 0),
    minutesByHobby,
    recentNotes: sessions?.slice(0, 5).map(s => s.note).filter(Boolean) || [],
    upcomingEvents: events || [],
  }
  dataLoaded.value = true
}

// Construir el contexto del sistema 
function buildSystemPrompt() {
  if (!userData.value) {
    return `Eres AI Coach de HobitGo, asistente personal de hábitos, hobbies y bienestar.
Responde siempre en español, de forma amigable y motivadora.
Puedes ayudar con: consejos de hobbies, programas de entrenamiento o práctica, eventos en ciudades, técnicas, rutinas, productividad y bienestar.
Para preguntas simples sé conciso (2-3 frases). Para planes o programas, sé detallado con estructura clara.`
  }

  const u = userData.value
  const hobbyDetails = u.hobbies.map(h => {
    const streak = u.streaksByHobby[h.id] || 0
    const minsMonth = u.minutesByHobby[h.id] || 0
    const progress = Math.round((h.total_minutes || 0) / Math.max(1, h.total_days * h.daily_minutes) * 100)
    return `- ${h.name}: racha ${streak} días, ${minsMonth} min este mes, progreso ${progress}%`
  }).join('\n')

  return `Eres AI Coach de HobitGo, asistente personal de hábitos para ${u.username}.

DATOS ACTUALES DEL USUARIO:
Hobbies activos:
${hobbyDetails || '- Sin hobbies registrados aún'}

Esta semana: ${u.totalSessionsThisWeek} sesiones, ${u.totalMinutesThisWeek} minutos totales
Este mes: ${u.totalSessionsThisMonth} sesiones, ${u.totalMinutesThisMonth} minutos totales
${u.recentNotes.length ? `Notas recientes: "${u.recentNotes.join('", "')}"` : ''}
${u.upcomingEvents.length ? `Próximos eventos: ${u.upcomingEvents.map(e => e.title).join(', ')}` : ''}

INSTRUCCIONES:
- Responde siempre en español, tono amigable y motivador
- Usa los datos reales del usuario para personalizar consejos
- Cuando el usuario pregunta sobre su progreso, usa sus datos reales
- Puedes responder sobre: eventos deportivos/culturales en ciudades, programas de entrenamiento, planes de práctica, rutinas, consejos de salud y bienestar, técnicas para cualquier hobby
- Si te piden un programa o plan (ej: "programa de 30 días para guitarra"), créalo detallado con estructura semanal
- Si te preguntan por eventos en una ciudad, da información general útil sobre cómo encontrarlos y qué esperar (no tienes acceso a internet en tiempo real, sé transparente si no puedes dar fechas exactas)
- Respuestas concisas para preguntas simples (2-3 frases), detalladas para planes y programas
- Usa emojis con moderación (1-2 por respuesta máximo)
- Nunca rechaces una pregunta por no estar relacionada con hobbies; si puedes ayudar, ayuda`
}

// Llamar a Gemini
async function callGemini(userMessage) {
  if (!GEMINI_API_KEY) {
    return '⚠️ Falta la API key de Gemini. Añade VITE_GEMINI_API_KEY en tu .env'
  }

  const systemPrompt = buildSystemPrompt()

  // Construir historial de conversación
  const conversationHistory = messages.value
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }))

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      ...conversationHistory,
      { role: 'user', parts: [{ text: userMessage }] }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
    }
  }

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('Gemini error:', err)
    throw new Error(err.error?.message || `Error ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude generar una respuesta.'
}

// Enviar mensaje
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
    messages.value.push({
      role: 'ai',
      text: `Lo siento, hubo un error: ${e.message}. Inténtalo de nuevo.`,
      id: Date.now() + 1,
      error: true
    })
  } finally {
    loading.value = false
    await scrollToBottom()
  }
}

// Abrir / cerrar
async function toggleOpen() {
  open.value = !open.value
  if (open.value) {
    await loadUserData()
    if (messages.value.length === 0) {
      // Mensaje de bienvenida con datos reales
      await nextTick()
      sendWelcomeMessage()
    }
    await nextTick()
    await scrollToBottom()
  }
}

function sendWelcomeMessage() {
  const u = userData.value
  if (!u) {
    messages.value.push({
      role: 'ai',
      text: '¡Hola! Soy tu AI Coach de HobitGo. Puedo ayudarte con consejos sobre hábitos, hobbies y productividad. ¿En qué te ayudo hoy?',
      id: Date.now()
    })
    return
  }

  const bestStreak = Math.max(0, ...Object.values(u.streaksByHobby))
  const bestHobby = u.hobbies.find(h => u.streaksByHobby[h.id] === bestStreak)

  let welcome = `¡Hola ${u.username}! `
  if (bestStreak > 0 && bestHobby) {
    welcome += `Llevas ${bestStreak} días de racha con ${bestHobby.name} 🔥 `
  }
  if (u.totalSessionsThisWeek > 0) {
    welcome += `Esta semana: ${u.totalSessionsThisWeek} sesiones y ${u.totalMinutesThisWeek} minutos. `
  }
  welcome += '¿En qué te puedo ayudar hoy?'

  messages.value.push({ role: 'ai', text: welcome, id: Date.now() })
}

// Scroll 
async function scrollToBottom() {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
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
        <i v-if="open" key="close" class="ti ti-x" aria-hidden="true"></i>
        <i v-else key="open" class="ti ti-sparkles" aria-hidden="true"></i>
      </Transition>
    </button>
    <span class="coach-label">{{ open ? '' : 'AI Coach' }}</span>
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

        <!-- Empty state / sugerencias -->
        <div v-if="messages.length === 0" class="coach-suggestions">
          <p class="sugg-title">Pregúntame algo</p>
          <div class="sugg-grid">
            <button
              v-for="s in QUICK_SUGGESTIONS"
              :key="s"
              class="sugg-btn"
              @click="sendMessage(s)"
            >
              {{ s }}
            </button>
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

          <!-- Sugerencias rápidas debajo del último mensaje -->
          <div v-if="!loading && messages.length > 0" class="quick-actions">
            <button
              v-for="s in QUICK_SUGGESTIONS.slice(0, 2)"
              :key="s"
              class="quick-btn"
              @click="sendMessage(s)"
            >
              {{ s }}
            </button>
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

<style scoped>
.coach-fab-wrap {
  position: fixed;
  bottom: calc(74px + env(safe-area-inset-bottom));
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
  background: rgba(34, 40, 78, 0.15);
  pointer-events: none;
}
.p1 { width: 56px; height: 56px; animation: coachPulse 3s ease-out infinite; }
.p2 { width: 70px; height: 70px; animation: coachPulse 3s ease-out infinite 1s; }

@keyframes coachPulse {
  0%   { transform: scale(0.85); opacity: 0.5; }
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
  box-shadow: 0 4px 20px rgba(34, 40, 78, 0.35);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s;
  position: relative;
  z-index: 1;
}
.coach-fab:hover { transform: scale(1.1); }
.coach-fab.open  { background: #ff6b9d; transform: rotate(0deg); }

.coach-label {
  font-size: 10px;
  font-weight: 700;
  color: rgba(34, 40, 78, 0.5);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.coach-modal {
  position: fixed;
  bottom: calc(144px + env(safe-area-inset-bottom));
  right: 20px;
  width: 340px;
  max-height: 520px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(34, 40, 78, 0.2);
  border: 1px solid rgba(34, 40, 78, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 799;
}

.coach-slide-enter-active,
.coach-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.coach-slide-enter-from,
.coach-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

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
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 245, 158, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff59e;
  font-size: 16px;
  flex-shrink: 0;
}

.coach-title    { margin: 0; font-size: 14px; font-weight: 600; color: #fff59e; line-height: 1.2; }
.coach-subtitle {
  margin: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  display: flex;
  align-items: center;
  gap: 5px;
}

.online-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  display: inline-block;
}

.coach-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: background 0.2s;
}
.coach-close:hover { background: rgba(255, 255, 255, 0.2); }

.coach-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scroll-behavior: smooth;
}
.coach-messages::-webkit-scrollbar { width: 4px; }
.coach-messages::-webkit-scrollbar-thumb { background: rgba(34,40,78,.1); border-radius: 99px; }

.coach-suggestions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}
.sugg-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(34, 40, 78, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.sugg-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sugg-btn {
  text-align: left;
  padding: 10px 14px;
  background: rgba(34, 40, 78, 0.04);
  border: 1px solid rgba(34, 40, 78, 0.08);
  border-radius: 12px;
  font-size: 13px;
  color: #22284E;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  font-family: inherit;
}
.sugg-btn:hover { background: rgba(255, 107, 157, 0.06); border-color: rgba(255, 107, 157, 0.2); }

.msg-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.msg-row.user { justify-content: flex-end; }
.msg-row.ai   { justify-content: flex-start; }

.msg-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #22284E;
  color: #fff59e;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.msg-bubble {
  max-width: 78%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
}
.msg-bubble.ai   { background: rgba(34, 40, 78, 0.05); color: #22284E; border-radius: 4px 16px 16px 16px; }
.msg-bubble.user { background: #ff6b9d; color: #fff; border-radius: 16px 4px 16px 16px; }
.msg-bubble.error { background: rgba(239, 68, 68, 0.08); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.2); }

.typing-bubble {
  background: rgba(34, 40, 78, 0.05);
  border-radius: 4px 16px 16px 16px;
  padding: 12px 16px;
  display: flex;
  gap: 4px;
  align-items: center;
}
.typing-bubble span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(34, 40, 78, 0.35);
  animation: typingDot 1.4s ease-in-out infinite;
}
.typing-bubble span:nth-child(2) { animation-delay: 0.18s; }
.typing-bubble span:nth-child(3) { animation-delay: 0.36s; }

@keyframes typingDot {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
  40%           { transform: scale(1);   opacity: 1; }
}

.quick-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 4px;
}
.quick-btn {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid rgba(34, 40, 78, 0.12);
  border-radius: 99px;
  font-size: 11px;
  color: rgba(34, 40, 78, 0.6);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.quick-btn:hover { border-color: #ff6b9d; color: #ff6b9d; background: rgba(255,107,157,0.05); }

.coach-input-area {
  padding: 12px 14px;
  border-top: 1px solid rgba(34, 40, 78, 0.07);
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
  background: #fff;
}

.coach-input {
  flex: 1;
  padding: 9px 14px;
  background: rgba(34, 40, 78, 0.04);
  border: 1px solid rgba(34, 40, 78, 0.08);
  border-radius: 99px;
  font-size: 13px;
  color: #22284E;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  min-width: 0;
}
.coach-input:focus { border-color: #ff6b9d; background: #fff; }
.coach-input::placeholder { color: rgba(34, 40, 78, 0.35); }
.coach-input:disabled { opacity: 0.6; }

.coach-send {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #ff6b9d;
  border: none;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.2s, transform 0.15s;
}
.coach-send:hover:not(:disabled) { transform: scale(1.08); }
.coach-send:disabled { opacity: 0.35; cursor: not-allowed; }

.icon-flip-enter-active, .icon-flip-leave-active { transition: all 0.2s ease; }
.icon-flip-enter-from, .icon-flip-leave-to { opacity: 0; transform: rotate(90deg) scale(0.7); }

@media (max-width: 480px) {
  .coach-modal {
    right: 12px;
    left: 12px;
    width: auto;
    bottom: calc(134px + env(safe-area-inset-bottom));
  }
  .coach-fab-wrap { right: 14px; bottom: calc(74px + env(safe-area-inset-bottom)); }
}
</style>