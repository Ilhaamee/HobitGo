<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLogo from '../components/ui/AppLogo.vue'
import { supabase } from '../lib/supabase'
import { HOBBIES_LIST } from '../data/hobbiesData.js'

const router = useRouter()
const saving = ref(false)
const checking = ref(true)
const errorMsg = ref('')    // ← mensaje de error visible

// ── Estado global ─────────────────────────────────────
const current   = ref(0)
const animDir   = ref('next')   // 'next' | 'prev'
const isAnimating = ref(false)
const answers   = ref({ goal: null, hobbies: [], time: null })

const TOTAL = 5

// ── Opciones ──────────────────────────────────────────
const goals = [
  { id: 'new',    icon: '✦', label: 'Crear hábitos nuevos',       desc: 'Añadir rutinas positivas a mi día' },
  { id: 'quit',   icon: '◈', label: 'Eliminar hábitos malos',     desc: 'Reemplazar lo negativo por algo mejor' },
  { id: 'time',   icon: '◉', label: 'Organizar mi tiempo',        desc: 'Estructurar mis días con intención' },
  { id: 'hobby',  icon: '◇', label: 'Descubrir nuevos hobbies',   desc: 'Explorar actividades que me apasionen' },
]

const hobbies = [
  { id: 'yoga',         label: 'Yoga' },
  { id: 'reading',      label: 'Lectura' },
  { id: 'music',        label: 'Música' },
  { id: 'photography',  label: 'Fotografía' },
  { id: 'running',      label: 'Running' },
  { id: 'cooking',      label: 'Cocinar' },
  { id: 'drawing',      label: 'Dibujo' },
  { id: 'meditation',   label: 'Meditación' },
  { id: 'writing',      label: 'Escritura' },
  { id: 'swimming',     label: 'Natación' },
  { id: 'dance',        label: 'Baile' },
  { id: 'climbing',     label: 'Escalada' },
]

const times = [
  { id: '15',  label: '15 min',   desc: 'Rápido pero constante' },
  { id: '30',  label: '30 min',   desc: 'El punto ideal' },
  { id: '60',  label: '1 hora',   desc: 'Comprometido de verdad' },
  { id: '60+', label: 'Más de 1h',desc: 'Toda mi energía' },
]

// ── Computed: puede avanzar ───────────────────────────
const canContinue = computed(() => {
  if (current.value === 1) return !!answers.value.goal
  if (current.value === 2) return answers.value.hobbies.length > 0
  if (current.value === 3) return !!answers.value.time
  return true
})

// ── Navegación ────────────────────────────────────────
function go(dir) {
  if (isAnimating.value) return
  isAnimating.value = true
  animDir.value = dir
  setTimeout(() => {
    current.value += dir === 'next' ? 1 : -1
    isAnimating.value = false
  }, 320)
}

function next() { if (canContinue.value && current.value < TOTAL - 1) go('next') }
function prev() { if (current.value > 0) go('prev') }

function toggleHobby(id) {
  const arr = answers.value.hobbies
  const i   = arr.indexOf(id)
  if (i === -1) arr.push(id)
  else          arr.splice(i, 1)
}

async function finish() {
  if (saving.value) return
  saving.value = true
  errorMsg.value = ''

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      errorMsg.value = 'No se encontró usuario. Inicia sesión de nuevo.'
      saving.value = false
      return
    }

    // ── 1. Guardar perfil ──────────────────────────────
    const rawUsername = user.email.split('@')[0]
    const username = rawUsername.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'usuario'

    const profileData = {
      id:              user.id,
      username:        username,
      onboarding_goal: answers.value.goal || null,
      onboarding_hobbies: answers.value.hobbies.length > 0 ? answers.value.hobbies : null,
      onboarding_time: answers.value.time || null,
      onboarding_done: true
    }

    console.log('Guardando onboarding:', profileData)

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })

    if (profileError) {
      console.error('Error guardando perfil:', profileError)
      errorMsg.value = `Error al guardar perfil: ${profileError.message}`
      saving.value = false
      return
    }

    // ── 2. Crear hobbies reales ────────────────────────
    const selectedHobbyIds = answers.value.hobbies || []
    const dailyMinutes = parseInt(answers.value.time) || 20

    for (const hobbyId of selectedHobbyIds) {
      const hobbyDef = HOBBIES_LIST.find(h => h.id === hobbyId)
      if (!hobbyDef) {
        console.warn(`Hobby no encontrado: ${hobbyId}`)
        continue
      }

      // Verificar si ya existe este hobby para el usuario
      const { data: existing } = await supabase
        .from('hobbies')
        .select('id')
        .eq('user_id', user.id)
        .eq('hobby_id', hobbyId)
        .maybeSingle()

      if (existing) {
        console.log(`Hobby ${hobbyDef.name} ya existe, saltando`)
        continue
      }

      // Crear el hobby
      const { error: hobbyError } = await supabase
        .from('hobbies')
        .insert({
          user_id:       user.id,
          hobby_id:      hobbyId,
          name:          hobbyDef.name,
          category:      hobbyDef.category || 'creatividad',
          gradient:      hobbyDef.gradient || ['#ff6b9d', '#ffb3c6'],
          image_url:     hobbyDef.img || null,
          total_minutes: 0,
          total_days:    30,
          daily_minutes: dailyMinutes,
          difficulty:    'media',
          is_public:     true,
          motivation:    null,
          reminder:      false,
          reminder_time: null
        })

      if (hobbyError) {
        console.warn(`Error creando hobby ${hobbyDef.name}:`, hobbyError)
        // No bloqueamos el flujo si un hobby falla
      } else {
        console.log(`Hobby creado: ${hobbyDef.name}`)
      }
    }

    console.log('Onboarding completado correctamente')

  } catch (e) {
    console.error('Error inesperado:', e)
    errorMsg.value = `Error inesperado: ${e.message}`
    saving.value = false
    return
  }

  localStorage.setItem('onboarding_done', 'true')
  router.push('/dashboard')
}

// ── Entrada inicial ───────────────────────────────────
onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.push('/'); return }

  const { data } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', user.id)
    .single()

  if (data?.onboarding_done) {
    localStorage.setItem('onboarding_done', 'true')
    router.push('/dashboard')
    return
  }

  checking.value = false  
})
</script>

<template>
  <div v-if="!checking" class="ob-root">

    <!-- ══ FONDO ════════════════════════════════════════ -->
    <div class="ob-bg" aria-hidden="true">
      <div class="bg-blob bb1"></div>
      <div class="bg-blob bb2"></div>
      <div class="bg-blob bb3"></div>
      <div class="bg-grid"></div>
    </div>

    <!-- ══ CONTENEDOR ══════════════════════════════════ -->
    <div class="ob-wrap">

      <!-- Header: logo + skip -->
      <header class="ob-header">
        <AppLogo :size="22" />
        <button v-if="current < TOTAL - 1" class="skip-btn" @click="finish">
          Saltar
          <svg viewBox="0 0 16 16" fill="none" width="13">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </header>

      <!-- Línea de progreso con segmentos -->
      <div class="ob-progress" role="progressbar" :aria-valuenow="current" :aria-valuemax="TOTAL - 1">
        <div
          v-for="i in TOTAL"
          :key="i"
          class="prog-seg"
          :class="{
            done:    i - 1 < current,
            active:  i - 1 === current,
          }"
        >
          <div class="prog-fill"></div>
        </div>
      </div>

      <!-- ══ PANTALLAS ════════════════════════════════ -->
      <div class="ob-stage">
        <Transition :name="'slide-' + animDir" mode="out-in">

          <!-- ── 0: Bienvenida ────────────────────────── -->
          <div v-if="current === 0" key="s0" class="screen s-welcome">
            <div class="welcome-icon">
              <div class="wi-ring r1"></div>
              <div class="wi-ring r2"></div>
              <div class="wi-ring r3"></div>
              <span class="wi-emoji">◎</span>
            </div>
            <h1 class="screen-title">Bienvenido a<br><span class="accent">HobitGo</span></h1>
            <p class="screen-desc">
              En los próximos segundos vamos a personalizar tu experiencia.<br>
              Solo 4 preguntas rápidas.
            </p>
            <div class="welcome-chips">
              <span class="chip">30 días</span>
              <span class="chip">1 hábito</span>
              <span class="chip">Tu ritmo</span>
            </div>
          </div>

          <!-- ── 1: Objetivo ──────────────────────────── -->
          <div v-else-if="current === 1" key="s1" class="screen">
            <div class="screen-tag">Pregunta 1 de 3</div>
            <h2 class="screen-title">¿Para qué estás aquí?</h2>
            <p class="screen-desc">Elige tu objetivo principal.</p>
            <div class="goal-grid">
              <button
                v-for="g in goals" :key="g.id"
                class="goal-card"
                :class="{ selected: answers.goal === g.id }"
                @click="answers.goal = g.id"
              >
                <span class="goal-icon">{{ g.icon }}</span>
                <span class="goal-label">{{ g.label }}</span>
                <span class="goal-desc">{{ g.desc }}</span>
                <div class="goal-check">
                  <svg viewBox="0 0 12 12" fill="none" width="10">
                    <path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <!-- ── 2: Hobbies ───────────────────────────── -->
          <div v-else-if="current === 2" key="s2" class="screen">
            <div class="screen-tag">Pregunta 2 de 3</div>
            <h2 class="screen-title">¿Qué te interesa?</h2>
            <p class="screen-desc">Elige uno o varios hobbies.</p>
            <div class="hobby-grid">
              <button
                v-for="h in hobbies" :key="h.id"
                class="hobby-pill"
                :class="{ selected: answers.hobbies.includes(h.id) }"
                @click="toggleHobby(h.id)"
              >
                <span class="hp-check">
                  <svg viewBox="0 0 10 10" fill="none" width="9">
                    <path d="M1.5 5l2.5 2.5L8.5 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </span>
                {{ h.label }}
              </button>
            </div>
            <p class="hobby-hint" v-if="answers.hobbies.length === 0">Selecciona al menos uno</p>
            <p class="hobby-hint selected-hint" v-else>{{ answers.hobbies.length }} seleccionado{{ answers.hobbies.length > 1 ? 's' : '' }}</p>
          </div>

          <!-- ── 3: Tiempo ────────────────────────────── -->
          <div v-else-if="current === 3" key="s3" class="screen">
            <div class="screen-tag">Pregunta 3 de 3</div>
            <h2 class="screen-title">¿Cuánto tiempo tienes al día?</h2>
            <p class="screen-desc">Adaptaremos los retos a tu disponibilidad.</p>
            <div class="time-grid">
              <button
                v-for="t in times" :key="t.id"
                class="time-card"
                :class="{ selected: answers.time === t.id }"
                @click="answers.time = t.id"
              >
                <span class="time-val">{{ t.label }}</span>
                <span class="time-desc">{{ t.desc }}</span>
                <div class="time-check">
                  <svg viewBox="0 0 12 12" fill="none" width="10">
                    <path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <!-- ── 4: Listo ─────────────────────────────── -->
          <div v-else-if="current === 4" key="s4" class="screen s-done">
            <div class="done-ring">
              <svg viewBox="0 0 80 80" fill="none" width="80">
                <circle cx="40" cy="40" r="36" stroke="#ff6b9d" stroke-width="2" stroke-dasharray="226" stroke-dashoffset="0" class="done-circle"/>
                <path d="M24 40l12 12 20-20" stroke="#ff6b9d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="done-check"/>
              </svg>
            </div>
            <h2 class="screen-title">¡Todo listo,<br><span class="accent">empieza tu reto!</span></h2>
            <p class="screen-desc">Tu perfil está personalizado.<br>Tu primer hábito de 30 días te espera.</p>

            <!-- Resumen de respuestas -->
            <div class="summary">
              <div class="sum-item" v-if="answers.goal">
                <span class="sum-label">Objetivo</span>
                <span class="sum-val">{{ goals.find(g => g.id === answers.goal)?.label }}</span>
              </div>
              <div class="sum-item" v-if="answers.hobbies.length">
                <span class="sum-label">Intereses</span>
                <span class="sum-val">{{ answers.hobbies.slice(0,3).map(id => hobbies.find(h => h.id === id)?.label).join(', ') }}{{ answers.hobbies.length > 3 ? '...' : '' }}</span>
              </div>
              <div class="sum-item" v-if="answers.time">
                <span class="sum-label">Tiempo</span>
                <span class="sum-val">{{ times.find(t => t.id === answers.time)?.label }} al día</span>
              </div>
            </div>
          </div>

        </Transition>
      </div>

      <!-- Mensaje de error -->
      <div v-if="errorMsg" class="error-banner">
        <svg viewBox="0 0 16 16" fill="none" width="14" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="8" cy="8" r="6"/><path d="M8 5v3M8 11h.01" stroke-linecap="round"/>
        </svg>
        {{ errorMsg }}
      </div>

      <!-- ══ BOTONES NAV ══════════════════════════════ -->
      <div class="ob-nav">
        <button
          v-if="current > 0"
          class="nav-back"
          @click="prev"
        >
          <svg viewBox="0 0 16 16" fill="none" width="15">
            <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Atrás
        </button>
        <div v-else class="nav-spacer"></div>

        <!-- Último paso: botón Empezar -->
        <button
          v-if="current === TOTAL - 1"
          class="nav-next finish-btn"
          @click="finish"
          :disabled="saving"
        >
          {{ saving ? 'Guardando...' : 'Empezar mi reto' }}
          <svg v-if="!saving" viewBox="0 0 16 16" fill="none" width="15">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- Resto de pasos -->
        <button
          v-else
          class="nav-next"
          :class="{ disabled: !canContinue }"
          @click="next"
          :disabled="!canContinue"
        >
          {{ current === 0 ? 'Empezar' : 'Continuar' }}
          <svg viewBox="0 0 16 16" fill="none" width="15">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ─── Colores ─────────────────────────────────────────
   navy:       #22284E
   pink:       #ff6b9d
   pink-light: #ffb3c6
   yellow:     #fff59e
────────────────────────────────────────────────────── */

/* ─── Root ───────────────────────────────────────────── */
.ob-root {
  min-height: 100svh;
  display: flex; align-items: center; justify-content: center;
  background: #fff59e;
  overflow: hidden; position: relative;
  font-family: inherit;
}

/* ─── Fondo ──────────────────────────────────────────── */
.ob-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; }

.bg-blob {
  position: absolute; border-radius: 50%;
  filter: blur(80px);
}
.bb1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(255,107,157,.45), transparent 70%);
  top: -150px; right: -100px;
  animation: blobFloat 14s ease-in-out infinite;
}
.bb2 {
  width: 380px; height: 380px;
  background: radial-gradient(circle, rgba(197,202,233,.5), transparent 70%);
  bottom: -100px; left: -80px;
  animation: blobFloat 18s ease-in-out infinite reverse;
}
.bb3 {
  width: 240px; height: 240px;
  background: radial-gradient(circle, rgba(255,179,198,.4), transparent 70%);
  top: 40%; left: 20%;
  animation: blobFloat 11s ease-in-out infinite 3s;
}
@keyframes blobFloat {
  0%,100% { transform: translate(0,0) scale(1); }
  50%      { transform: translate(24px,-18px) scale(1.06); }
}

.bg-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(34,40,78,.1) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 100%);
}

/* ─── Wrap ───────────────────────────────────────────── */
.ob-wrap {
  position: relative; z-index: 10;
  width: 100%; max-width: 480px;
  margin: 0 auto;
  padding: 24px 24px 32px;
  display: flex; flex-direction: column; gap: 20px;
  min-height: 100svh;
}

/* ─── Header ─────────────────────────────────────────── */
.ob-header {
  display: flex; align-items: center;
  justify-content: space-between;
  padding-top: 8px;
}

.skip-btn {
  display: flex; align-items: center; gap: 4px;
  background: none; border: none;
  font-size: 13px; font-weight: 600;
  color: rgba(34,40,78,.45); cursor: pointer;
  padding: 6px 10px; border-radius: 8px;
  transition: color .2s, background .2s;
}
.skip-btn:hover { color: #22284E; background: rgba(34,40,78,.06); }

/* ─── Línea de progreso ──────────────────────────────── */
.ob-progress {
  display: flex; gap: 6px; align-items: center;
}

.prog-seg {
  flex: 1; height: 4px; border-radius: 99px;
  background: rgba(34,40,78,.12);
  overflow: hidden; position: relative;
}

.prog-fill {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, #ff6b9d, #ffb3c6);
  border-radius: 99px;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform .5s cubic-bezier(.4,0,.2,1);
}

/* Segmento completado — fill visible */
.prog-seg.done .prog-fill {
  transform: scaleX(1);
}
/* Segmento activo — fill con animación de shimmer */
.prog-seg.active .prog-fill {
  transform: scaleX(1);
  animation: shimmer 2s linear infinite;
  background: linear-gradient(90deg, #ff6b9d, #ffb3c6, #ff6b9d);
  background-size: 200% 100%;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ─── Stage (área de pantallas) ──────────────────────── */
.ob-stage {
  flex: 1;
  display: flex; align-items: center;
  min-height: 0;
  position: relative;
}

/* ─── Transiciones slide ─────────────────────────────── */
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: opacity .32s ease, transform .32s cubic-bezier(.4,0,.2,1);
  position: absolute; width: 100%;
}

.slide-next-enter-from { opacity: 0; transform: translateX(48px); }
.slide-next-leave-to   { opacity: 0; transform: translateX(-48px); }
.slide-prev-enter-from { opacity: 0; transform: translateX(-48px); }
.slide-prev-leave-to   { opacity: 0; transform: translateX(48px); }

/* ─── Screen base ────────────────────────────────────── */
.screen {
  width: 100%;
  display: flex; flex-direction: column; gap: 16px;
}

.screen-tag {
  display: inline-block;
  font-size: 11px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #ff6b9d;
  padding: 4px 0;
}

.screen-title {
  font-size: clamp(26px, 5vw, 36px);
  font-weight: 900; letter-spacing: -1.5px;
  color: #22284E; line-height: 1.1; margin: 0;
}

.accent {
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

.screen-desc {
  font-size: 14px; color: rgba(34,40,78,.55);
  line-height: 1.7; margin: 0;
}

/* ─── BIENVENIDA ─────────────────────────────────────── */
.s-welcome { text-align: center; align-items: center; }

.welcome-icon {
  position: relative; width: 100px; height: 100px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 8px;
}
.wi-ring {
  position: absolute; border-radius: 50%;
  border: 2px solid rgba(255,107,157,.25);
  animation: ringPulse 3s ease-in-out infinite;
}
.wi-ring.r1 { width: 60px;  height: 60px;  animation-delay: 0s; }
.wi-ring.r2 { width: 80px;  height: 80px;  animation-delay: .4s; border-color: rgba(255,107,157,.15); }
.wi-ring.r3 { width: 100px; height: 100px; animation-delay: .8s; border-color: rgba(255,107,157,.08); }
@keyframes ringPulse {
  0%,100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.08); opacity: .7; }
}
.wi-emoji {
  font-size: 36px; color: #ff6b9d; z-index: 1;
  animation: spinSlow 10s linear infinite;
}
@keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.welcome-chips {
  display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
  margin-top: 4px;
}
.chip {
  background: rgba(34,40,78,.08);
  border: 1px solid rgba(34,40,78,.12);
  color: #22284E; font-size: 12px; font-weight: 700;
  padding: 6px 14px; border-radius: 99px;
  letter-spacing: .04em;
}

/* ─── OBJETIVO (grid 2x2) ────────────────────────────── */
.goal-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.goal-card {
  position: relative;
  display: flex; flex-direction: column; gap: 4px; align-items: flex-start;
  padding: 16px 14px 14px;
  background: rgba(255,255,255,.7);
  border: 2px solid rgba(34,40,78,.1);
  border-radius: 16px; cursor: pointer; text-align: left;
  backdrop-filter: blur(8px);
  transition: border-color .2s, background .2s, transform .15s, box-shadow .2s;
}
.goal-card:hover { border-color: rgba(255,107,157,.4); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,107,157,.1); }
.goal-card.selected {
  border-color: #ff6b9d;
  background: rgba(255,107,157,.06);
  box-shadow: 0 0 0 4px rgba(255,107,157,.08);
}

.goal-icon  { font-size: 22px; color: #ff6b9d; margin-bottom: 2px; }
.goal-label { font-size: 13px; font-weight: 700; color: #22284E; line-height: 1.3; }
.goal-desc  { font-size: 11px; color: rgba(34,40,78,.45); line-height: 1.4; }

.goal-check {
  position: absolute; top: 10px; right: 10px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #ff6b9d;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transform: scale(.5);
  transition: opacity .2s, transform .2s;
}
.goal-card.selected .goal-check { opacity: 1; transform: scale(1); }

/* ─── HOBBIES (pills wrap) ───────────────────────────── */
.hobby-grid {
  display: flex; flex-wrap: wrap; gap: 8px;
}

.hobby-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 16px;
  background: rgba(255,255,255,.7);
  border: 2px solid rgba(34,40,78,.1);
  border-radius: 99px;
  font-size: 13px; font-weight: 600; color: rgba(34,40,78,.7);
  cursor: pointer; backdrop-filter: blur(8px);
  transition: all .18s ease;
}
.hobby-pill:hover { border-color: rgba(255,107,157,.4); color: #22284E; }
.hobby-pill.selected {
  background: #22284E; border-color: #22284E;
  color: #fff59e;
}

.hp-check {
  width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;
  color: transparent; flex-shrink: 0;
  transition: color .18s;
}
.hobby-pill.selected .hp-check { color: #fff59e; }

.hobby-hint {
  font-size: 12px; color: rgba(34,40,78,.4);
  margin: 0; text-align: center;
}
.selected-hint { color: #ff6b9d; font-weight: 600; }

/* ─── TIEMPO ─────────────────────────────────────────── */
.time-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.time-card {
  position: relative;
  display: flex; flex-direction: column; gap: 4px;
  align-items: flex-start; padding: 18px 16px;
  background: rgba(255,255,255,.7);
  border: 2px solid rgba(34,40,78,.1);
  border-radius: 16px; cursor: pointer;
  backdrop-filter: blur(8px);
  transition: border-color .2s, background .2s, transform .15s, box-shadow .2s;
}
.time-card:hover { border-color: rgba(255,107,157,.4); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,107,157,.1); }
.time-card.selected {
  border-color: #ff6b9d;
  background: rgba(255,107,157,.06);
  box-shadow: 0 0 0 4px rgba(255,107,157,.08);
}

.time-val  { font-size: 20px; font-weight: 900; color: #22284E; letter-spacing: -1px; }
.time-desc { font-size: 11px; color: rgba(34,40,78,.45); }

.time-check {
  position: absolute; top: 10px; right: 10px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #ff6b9d;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transform: scale(.5);
  transition: opacity .2s, transform .2s;
}
.time-card.selected .time-check { opacity: 1; transform: scale(1); }

/* ─── LISTO ──────────────────────────────────────────── */
.s-done { text-align: center; align-items: center; }

.done-ring {
  width: 100px; height: 100px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 8px;
}
.done-circle {
  stroke-dasharray: 226;
  stroke-dashoffset: 226;
  animation: drawCircle .8s ease .1s forwards;
}
.done-check {
  stroke-dasharray: 60;
  stroke-dashoffset: 60;
  animation: drawCheck .5s ease .7s forwards;
}
@keyframes drawCircle { to { stroke-dashoffset: 0; } }
@keyframes drawCheck  { to { stroke-dashoffset: 0; } }

/* Resumen */
.summary {
  width: 100%;
  background: rgba(255,255,255,.6);
  border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 16px; padding: 16px 20px;
  backdrop-filter: blur(8px);
  display: flex; flex-direction: column; gap: 10px;
}
.sum-item { display: flex; align-items: baseline; gap: 10px; }
.sum-label {
  font-size: 11px; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; color: rgba(34,40,78,.4);
  min-width: 70px; flex-shrink: 0;
}
.sum-val { font-size: 13px; font-weight: 600; color: #22284E; }

/* ─── Botones nav ────────────────────────────────────── */
.ob-nav {
  display: flex; align-items: center;
  justify-content: space-between; gap: 12px;
}

.nav-back {
  display: flex; align-items: center; gap: 5px;
  background: rgba(34,40,78,.07);
  border: 1.5px solid rgba(34,40,78,.12);
  color: #22284E; font-size: 14px; font-weight: 600;
  padding: 12px 18px; border-radius: 12px; cursor: pointer;
  transition: background .2s;
}
.nav-back:hover { background: rgba(34,40,78,.12); }

.nav-spacer { flex: 1; }

.nav-next {
  display: flex; align-items: center; gap: 8px;
  background: #22284E; color: #fff59e;
  border: none; font-size: 15px; font-weight: 800;
  padding: 14px 28px; border-radius: 14px; cursor: pointer;
  box-shadow: 0 6px 20px rgba(34,40,78,.28);
  transition: transform .18s, box-shadow .18s, opacity .2s;
  flex: 1;
  justify-content: center;
}
.nav-next:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(34,40,78,.36); }
.nav-next.disabled { opacity: .4; cursor: not-allowed; transform: none; }

.finish-btn {
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  box-shadow: 0 6px 20px rgba(255,107,157,.35);
}
.finish-btn:hover { box-shadow: 0 10px 28px rgba(255,107,157,.45); }

/* ─── Error banner ─────────────────────────────────────── */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(239,68,68,.1);
  border: 1.5px solid rgba(239,68,68,.2);
  border-radius: 10px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
  animation: fadeIn .3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Responsive web ─────────────────────────────────── */
@media (min-width: 768px) {
  .ob-root { padding: 0; }
  .ob-wrap {
    max-width: 520px;
    background: rgba(255,255,255,.7);
    backdrop-filter: blur(20px);
    border-radius: 28px;
    border: 1.5px solid rgba(255,255,255,.8);
    box-shadow: 0 32px 80px rgba(34,40,78,.14);
    min-height: auto;
    padding: 36px 40px 36px;
    margin: 40px auto;
  }
  .ob-stage { min-height: 340px; }
}
</style>