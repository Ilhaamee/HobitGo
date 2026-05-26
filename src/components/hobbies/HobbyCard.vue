<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getSpecialMode, getHobbyGradient } from '../../data/hobbiesData.js'
import AchievementBadge from './AchievementBadge.vue'
import WeekChart from './WeekChart.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  hobby:    { type: Object, required: true },
  sessions: { type: Array,  default: () => [] },
})
const emit = defineEmits(['delete', 'add-session', 'open-detail', 'edit', 'continue-hobby', 'restart-hobby', 'celebrate'])

const showSession = ref(false)
const sessionMin  = ref(props.hobby.daily_minutes || 20)
const sessionNote = ref('')
const adding      = ref(false)
const justAdded   = ref(false)
const cardRef     = ref(null)

const sessionsByDay = computed(() => {
  const map = {}
  props.sessions
    .filter(s => s.hobby_id === props.hobby.id)
    .forEach(s => {
      const day = new Date(s.created_at).toDateString()
      map[day] = (map[day] || 0) + s.minutes
    })
  return map
})

const hobbySessions = computed(() =>
  props.sessions
    .filter(s => s.hobby_id === props.hobby.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)

const sessionCount = computed(() => hobbySessions.value.length)
const activeDays   = computed(() => Object.keys(sessionsByDay.value).length)

const streak = computed(() => {
  if (!activeDays.value) return 0
  const today = new Date(); today.setHours(0,0,0,0)
  const sorted = Object.keys(sessionsByDay.value)
    .map(d => new Date(d)).sort((a,b) => b - a)
  let count = 0, cur = today
  for (const d of sorted) {
    if (Math.round((cur - d) / 86400000) <= 1) { count++; cur = d }
    else break
  }
  return count
})

const isCompleted = computed(() => {
  if (props.hobby.completed_at) return true
  const total = props.hobby.total_days || 30
  return activeDays.value >= total && activeDays.value > 0
})

const daysLeft = computed(() => {
  const total = props.hobby.total_days || 30
  return Math.max(0, total - activeDays.value)
})

const retoProgress = computed(() => {
  const total = props.hobby.total_days || 30
  return Math.min(100, (activeDays.value / total) * 100)
})

const totalMinutesComputed = computed(() => 
  hobbySessions.value.reduce((sum, s) => sum + (s.minutes || 0), 0)
)

const cardColor  = computed(() => props.hobby.gradient?.[0] || '#ff6b9d')
const cardColor2 = computed(() => props.hobby.gradient?.[1] || '#ffb3c6')
const cardGradient = computed(() =>
  props.hobby.gradient
    ? `linear-gradient(135deg, ${props.hobby.gradient[0]}, ${props.hobby.gradient[1]})`
    : getHobbyGradient(props.hobby.hobby_id)
)

const specialMode = computed(() => getSpecialMode(props.hobby.hobby_id))

const achievements = computed(() => {
  const c = sessionCount.value
  const m = totalMinutesComputed.value
  return [
    { name: 'Principiante', symbol: '◌', label: 'Primera sesión',  unlocked: c >= 1   },
    { name: 'Constante',    symbol: '◈', label: '10 sesiones',     unlocked: c >= 10  },
    { name: 'Dedicado',     symbol: '✦', label: '5 horas totales', unlocked: m >= 300 },
    { name: 'Maestro',      symbol: '▲', label: '30 sesiones',     unlocked: c >= 30  },
  ]
})

const difficultyInfo = computed(() => {
  const labels = { facil:'Fácil', media:'Media', dificil:'Difícil' }
  const colors  = { facil:'#22c55e', media:'#f59e0b', dificil:'#ef4444' }
  const d = props.hobby.difficulty
  if (!d || !labels[d]) return null
  return { label: labels[d], color: colors[d] }
})

watch(isCompleted, (newVal, oldVal) => {
  if (newVal && !oldVal && !props.hobby.completed_at) {
    emit('celebrate', {
      hobbyId: props.hobby.id,
      hobbyName: props.hobby.name
    })
  }
})

onMounted(() => {
  if (!cardRef.value) return
  cardRef.value.style.opacity = '0'
  cardRef.value.style.transform = 'translateY(24px)'
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!cardRef.value) return
      cardRef.value.style.transition = 'opacity .45s ease, transform .45s cubic-bezier(.4,0,.2,1)'
      cardRef.value.style.opacity = '1'
      cardRef.value.style.transform = 'translateY(0)'
    })
  })
})

const quickMins = [5, 10, 15, 20, 30, 45, 60, 90]

function formatTime(mins) {
  if (!mins) return '0 min'
  return mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h${mins%60?mins%60+'m':''}`
}

function openMode() {
  const mode = specialMode.value?.mode
  if (mode === 'library') router.push(`/dashboard/hobbies/${props.hobby.id}/library`)
  else if (mode === 'kitchen') router.push(`/dashboard/hobbies/${props.hobby.id}/kitchen`)
  else if (mode === 'gallery') router.push(`/dashboard/hobbies/${props.hobby.id}/gallery`)
  else router.push(`/dashboard/hobbies/${props.hobby.id}`) 
}

async function addSession() {
  if (sessionMin.value < 1 || adding.value) return
  adding.value = true

  emit('add-session', {
    hobbyId: props.hobby.id,
    minutes: sessionMin.value,
    note: sessionNote.value.trim() || null
  })

  await new Promise(r => setTimeout(r, 500))
  adding.value    = false
  justAdded.value = true

  setTimeout(() => {
    justAdded.value  = false
    showSession.value = false
    sessionNote.value = ''
    sessionMin.value  = props.hobby.daily_minutes || 20
  }, 2000)
}

function onContinue() {
  emit('continue-hobby', props.hobby.id)
}

function onRestart() {
  emit('restart-hobby', props.hobby.id)
}
</script>

<template>
  <div class="hcard" ref="cardRef">

    <!-- HERO -->
    <div class="hcard-hero"
      :style="hobby.image_url
        ? { backgroundImage: `url(${hobby.image_url})` }
        : { background: cardGradient }"
      @click.self="specialMode ? openMode() : null"
    >
      <div class="hero-grad"
        :style="{ background: `linear-gradient(to top, ${cardColor}f2 0%, ${cardColor}80 40%, rgba(0,0,0,0.2) 100%)` }">
      </div>

      <!-- Top: modo especial + edit/borrar -->
      <div class="hero-top">
        <button v-if="specialMode" class="pill-mode" @click="openMode()">
          {{ specialMode.label + ' →' }}
        </button>
        <div v-else></div>
        
        <div style="display:flex;gap:5px">
          <button class="del-btn" @click="emit('edit', hobby)" title="Editar">
            <svg viewBox="0 0 14 14" fill="none" width="12">
              <path d="M9 2l3 3-7 7H2v-3l7-7z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="del-btn danger" @click="emit('delete', hobby.id)" title="Eliminar">
            <svg viewBox="0 0 14 14" fill="none" width="11">
              <path d="M1 3h12M4 3V2h6v1M5 6v5M9 6v5M2 3l1 9h8l1-9"
                stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="hero-bottom">
        <div class="hero-name-row">
          <div class="hero-name-left">
            <h3 class="hero-name">{{ hobby.name }}</h3>
            <span v-if="difficultyInfo" class="diff-tag"
              :style="{ background: difficultyInfo.color + '28', color: difficultyInfo.color }">
              {{ difficultyInfo.label }}
            </span>
            <span v-if="hobby.is_public === false" class="priv-tag">Privado</span>
          </div>
          
          <!-- Derecha: botones de acción (solo cuando completado) -->
          <div v-if="isCompleted" class="hero-actions-inline">
            <button class="ha-btn ha-continue" @click="onContinue" title="Añadir más días">
              <svg viewBox="0 0 14 14" fill="none" width="10">
                <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="ha-btn ha-restart" @click="onRestart" title="Reiniciar hobby">
              <svg viewBox="0 0 14 14" fill="none" width="10">
                <path d="M1 7a6 6 0 0110.2-4.2M13 7a6 6 0 01-10.2 4.2M3 3l-2 2 2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <p v-if="hobby.motivation" class="hero-motto">"{{ hobby.motivation }}"</p>
      </div>
    </div>

    <div class="reto-section" :class="{ completed: isCompleted }">
      <div class="reto-stats">

        <!-- Contador días -->
        <div class="days-counter" :class="{ completed: isCompleted }">
          <span class="dc-num" :style="{ color: isCompleted ? '#f59e0b' : cardColor }">
            {{ isCompleted ? '✓' : daysLeft }}
          </span>
          <span class="dc-label">
            <template v-if="isCompleted">COMPLETADO</template>
            <template v-else>días restantes</template>
          </span>
        </div>

        <div class="reto-dividers">
          <div class="reto-col">
            <span class="rc-val">{{ formatTime(totalMinutesComputed) }}</span>
            <span class="rc-lbl">total</span>
          </div>
          <div class="reto-col">
            <span class="rc-val">{{ sessionCount }}</span>
            <span class="rc-lbl">sesiones</span>
          </div>
          <div class="reto-col">
            <span class="rc-val" :style="streak > 0 ? { color: '#f59e0b' } : {}">
              {{ streak > 0 ? streak + '🔥' : '—' }}
            </span>
            <span class="rc-lbl">racha</span>
          </div>
          <div class="reto-col">
            <span class="rc-val">{{ activeDays }}/{{ hobby.total_days || 30 }}</span>
            <span class="rc-lbl">días</span>
          </div>
        </div>
      </div>

      <!-- Barra de progreso -->
      <div class="reto-bar-wrap">
        <div class="reto-bar-track">
          <div class="reto-bar-fill"
            :class="{ completed: isCompleted }"
            :style="{ 
              width: retoProgress + '%', 
              background: isCompleted 
                ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' 
                : `linear-gradient(90deg, ${cardColor}, ${cardColor2})` 
            }">
          </div>
        </div>
        <span class="reto-pct">{{ activeDays }}/{{ hobby.total_days || 30 }} días</span>
      </div>
    </div>

    <!-- LOGROS -->
    <div class="badges-row">
      <AchievementBadge v-for="a in achievements" :key="a.name" v-bind="a" :color="cardColor" />
    </div>

    <!-- GRÁFICA -->
    <div class="chart-section">
      <WeekChart :sessions="hobbySessions" :color="cardColor" />
    </div>

    <!-- REGISTRAR SESIÓN -->
    <div class="session-block">

      <button
        class="session-trigger"
        :class="{ done: justAdded, completed: isCompleted }"
        :style="justAdded
          ? { background: 'linear-gradient(135deg,#22c55e,#4ade80)' }
          : isCompleted
            ? { background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }
            : { background: `linear-gradient(135deg, ${cardColor}, ${cardColor2})` }"
        @click="showSession = !showSession"
      >
        <div class="st-icon">
          <Transition name="icon-swap" mode="out-in">
            <svg v-if="justAdded" key="check" viewBox="0 0 20 20" fill="none" width="18">
              <path d="M4 10l4 4 8-8" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else-if="isCompleted" key="trophy" viewBox="0 0 20 20" fill="none" width="18">
              <path d="M5 4h10M7 4v8a3 3 0 006 0V4M6 16h8" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            <svg v-else key="clock" viewBox="0 0 20 20" fill="none" width="18">
              <circle cx="10" cy="10" r="7.5" stroke="#fff" stroke-width="1.8"/>
              <path d="M10 6.5V10l2.5 2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </Transition>
        </div>
        <div class="st-info">
          <span class="st-title">
            {{ justAdded ? '¡Guardado!' : isCompleted ? '¡Sigue practicando!' : 'Registrar sesión' }}
          </span>
          <span class="st-sub">
            {{ justAdded ? `+${sessionMin}m añadidos` : `Meta diaria: ${hobby.daily_minutes || 20} min` }}
          </span>
        </div>
        <svg viewBox="0 0 12 12" fill="none" width="13"
          class="st-chevron" :class="{ open: showSession }"
          :style="{ color: 'rgba(255,255,255,.7)' }">
          <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>

      <!-- Panel desplegable -->
      <Transition name="slide-panel">
        <div v-if="showSession" class="session-panel">

          <p class="panel-label">Duración rápida</p>
          <div class="quick-grid">
            <button
              v-for="m in quickMins" :key="m"
              class="qbtn"
              :class="{ active: sessionMin === m }"
              :style="sessionMin === m
                ? { background: cardColor, borderColor: cardColor, color: '#fff', boxShadow: `0 4px 12px ${cardColor}44` }
                : {}"
              @click="sessionMin = m"
            >{{ m }}m</button>
          </div>

          <div class="manual-row">
            <button class="mc-btn" @click="sessionMin = Math.max(1, sessionMin - 5)">−</button>
            <div class="mc-display">
              <span class="mc-num">{{ sessionMin }}</span>
              <span class="mc-unit">min</span>
            </div>
            <button class="mc-btn" @click="sessionMin = Math.min(480, sessionMin + 5)">+</button>
          </div>

          <input
            v-model="sessionNote"
            class="note-input"
            type="text"
            placeholder="Nota rápida (opcional)..."
            maxlength="100"
            @keyup.enter="addSession"
          />

          <button
            class="save-btn"
            :disabled="adding"
            :style="{ background: isCompleted 
              ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' 
              : `linear-gradient(135deg, ${cardColor}, ${cardColor2})` }"
            @click="addSession"
          >
            <Transition name="icon-swap" mode="out-in">
              <span v-if="!adding" key="txt" class="save-inner">
                <svg viewBox="0 0 14 14" fill="none" width="13">
                  <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Guardar {{ sessionMin }} min
              </span>
              <span v-else key="spin" class="save-inner">
                <span class="spinner"></span> Guardando...
              </span>
            </Transition>
          </button>

        </div>
      </Transition>
    </div>

  </div>
</template>

<style scoped>
/* Modal */
.mode-overlay {
  position: fixed; inset: 0;
  background: #f5f0e8;
  z-index: 500;
  overflow-y: auto;
}

.fade-up-enter-active, .fade-up-leave-active { transition: opacity .25s, transform .25s; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(20px); }

/* Card */
.hcard {
  background: #fff; border-radius: 22px; overflow: hidden;
  box-shadow: 0 4px 24px rgba(34,40,78,.09);
  border: 1px solid rgba(34,40,78,.06);
  display: flex; flex-direction: column;
  transition: box-shadow .22s;
  will-change: transform;
}
.hcard:hover { box-shadow: 0 16px 40px rgba(34,40,78,.14); }

/* Hero */
.hcard-hero {
  position: relative; height: 185px;
  background-size: cover; background-position: center;
  display: flex; flex-direction: column; justify-content: space-between;
  overflow: hidden;
}
.hero-grad { position: absolute; inset: 0; }

.hero-top {
  position: relative; z-index: 2;
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 12px;
}
.pill-mode {
  background: rgba(255,255,255,.18); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.3); color: #fff;
  font-size: 9px; font-weight: 800; letter-spacing: .08em;
  text-transform: uppercase; padding: 5px 12px; border-radius: 99px;
  cursor: pointer; transition: background .2s, transform .15s;
}
.pill-mode:hover { background: rgba(255,255,255,.3); transform: scale(1.04); }
.del-btn {
  width: 30px; height: 30px; border-radius: 9px;
  background: rgba(0,0,0,.25); backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,.12);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(255,255,255,.85);
  transition: background .2s, transform .15s;
}
.del-btn:hover { background: rgba(255,255,255,.28); transform: scale(1.08); }
.del-btn.danger:hover { background: rgba(239,68,68,.65); }

.hero-bottom { position: relative; z-index: 2; padding: 0 14px 14px; }
.hero-name-row { 
  display: flex; 
  align-items: center; 
  gap: 7px; 
  margin-bottom: 3px; 
}
.hero-name-left {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.hero-actions-inline {
  display: flex;
  gap: 5px;
  margin-left: auto;
  flex-shrink: 0;
}
.ha-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all .2s;
  flex-shrink: 0;
}
.ha-continue {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  color: #fff;
  box-shadow: 0 2px 6px rgba(245,158,11,.3);
}
.ha-continue:hover {
  transform: scale(1.12);
  box-shadow: 0 3px 10px rgba(245,158,11,.4);
}
.ha-restart {
  background: rgba(255,255,255,.2);
  color: rgba(255,255,255,.9);
  border: 1px solid rgba(255,255,255,.25);
  backdrop-filter: blur(4px);
}
.ha-restart:hover {
  background: rgba(255,255,255,.35);
  transform: scale(1.12);
}
.hero-name { font-size: 22px; font-weight: 900; color: #fff; margin: 0; letter-spacing: -.6px; text-shadow: 0 1px 8px rgba(0,0,0,.3); }
.diff-tag {
  font-size: 9px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .05em; padding: 3px 9px; border-radius: 99px;
}
.priv-tag {
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .04em; padding: 3px 9px; border-radius: 99px;
  background: rgba(255,255,255,.15); color: rgba(255,255,255,.8);
  border: 1px solid rgba(255,255,255,.2);
}
.hero-motto {
  font-size: 11px; color: rgba(255,255,255,.65); margin: 0;
  font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ── Reto section ── */
.reto-section {
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(34,40,78,.06);
  transition: background .3s;
}
.reto-section.completed {
  background: linear-gradient(135deg, rgba(245,158,11,.06), rgba(251,191,36,.04));
}

.reto-stats { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }

.days-counter {
  display: flex; flex-direction: column; align-items: center;
  background: rgba(34,40,78,.03); border-radius: 14px;
  padding: 10px 14px; flex-shrink: 0; gap: 1px;
  border: 1px solid rgba(34,40,78,.06);
  transition: all .3s;
}
.days-counter.completed {
  background: linear-gradient(135deg, rgba(245,158,11,.15), rgba(251,191,36,.1));
  border-color: rgba(245,158,11,.3);
}
.dc-num   { font-size: 32px; font-weight: 900; line-height: 1; transition: color .3s; }
.dc-label { font-size: 9px; color: rgba(34,40,78,.4); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; text-align: center; line-height: 1.3; }

.reto-dividers {
  flex: 1; display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.reto-col {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: rgba(34,40,78,.02); border-radius: 10px;
  padding: 7px 4px; border: 1px solid rgba(34,40,78,.05);
}
.rc-val { font-size: 15px; font-weight: 800; color: #22284E; line-height: 1; }
.rc-lbl { font-size: 9px; color: rgba(34,40,78,.4); font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }

.reto-bar-wrap { display: flex; align-items: center; gap: 8px; }
.reto-bar-track { flex: 1; height: 6px; background: rgba(34,40,78,.07); border-radius: 99px; overflow: hidden; }
.reto-bar-fill  { height: 100%; border-radius: 99px; min-width: 6px; transition: width .7s cubic-bezier(.4,0,.2,1), background .3s; }
.reto-bar-fill.completed { box-shadow: 0 0 8px rgba(245,158,11,.3); }
.reto-pct { font-size: 11px; font-weight: 700; color: rgba(34,40,78,.35); white-space: nowrap; }
/* Badges */
.badges-row {
  display: flex; gap: 5px; flex-wrap: wrap;
  padding: 10px 14px; border-bottom: 1px solid rgba(34,40,78,.06);
}

/* Chart */
.chart-section { padding: 10px 14px; border-bottom: 1px solid rgba(34,40,78,.06); }

/* Session block */
.session-block { overflow: hidden; }

.session-trigger {
  width: 100%; display: flex; align-items: center; gap: 12px;
  padding: 15px 16px; border: none; cursor: pointer;
  text-align: left; transition: opacity .18s;
  will-change: transform;
}
.session-trigger:hover { opacity: .93; }
.session-trigger.completed {
  background: linear-gradient(135deg, #f59e0b, #fbbf24) !important;
}

.st-icon {
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(255,255,255,.2); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.st-info { flex: 1; }
.st-title { display: block; font-size: 14px; font-weight: 800; color: #fff; }
.st-sub   { display: block; font-size: 11px; color: rgba(255,255,255,.65); margin-top: 2px; }
.st-chevron { flex-shrink: 0; transition: transform .28s cubic-bezier(.4,0,.2,1); }
.st-chevron.open { transform: rotate(180deg); }

/* Panel */
.session-panel {
  padding: 14px 14px 16px; display: flex; flex-direction: column; gap: 10px;
  background: #f8f9fb; border-top: 1px solid rgba(34,40,78,.05);
}
.slide-panel-enter-active, .slide-panel-leave-active { transition: all .28s cubic-bezier(.4,0,.2,1); max-height: 400px; }
.slide-panel-enter-from, .slide-panel-leave-to { opacity: 0; transform: translateY(-8px); max-height: 0; }

.panel-label { font-size: 10px; font-weight: 700; color: rgba(34,40,78,.4); text-transform: uppercase; letter-spacing: .06em; margin: 0; }

.quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
.qbtn {
  padding: 10px 4px; border-radius: 11px; font-size: 13px; font-weight: 700;
  border: 1.5px solid rgba(34,40,78,.1); background: #fff;
  color: rgba(34,40,78,.6); cursor: pointer;
  transition: all .15s cubic-bezier(.4,0,.2,1);
}
.qbtn:hover:not(.active) { border-color: rgba(34,40,78,.25); transform: translateY(-1px); }
.qbtn.active { transform: translateY(-1px); }

.manual-row {
  display: flex; align-items: center;
  background: #fff; border-radius: 14px;
  border: 1.5px solid rgba(34,40,78,.1); overflow: hidden;
}
.mc-btn {
  width: 48px; height: 48px; background: none; border: none;
  font-size: 22px; font-weight: 700; color: rgba(34,40,78,.5);
  cursor: pointer; transition: background .15s; flex-shrink: 0;
}
.mc-btn:hover { background: rgba(34,40,78,.05); }
.mc-display {
  flex: 1; display: flex; align-items: baseline; justify-content: center; gap: 3px;
}
.mc-num  { font-size: 28px; font-weight: 900; color: #22284E; }
.mc-unit { font-size: 13px; font-weight: 600; color: rgba(34,40,78,.35); }

.note-input {
  padding: 10px 14px; border: 1.5px solid rgba(34,40,78,.1); border-radius: 11px;
  font-size: 13px; color: #22284E; background: #fff;
  font-family: inherit; box-sizing: border-box; width: 100%;
  transition: border-color .2s;
}
.note-input:focus { outline: none; border-color: #ff6b9d; }

.save-btn {
  padding: 13px; border-radius: 12px; border: none; color: #fff;
  font-size: 15px; font-weight: 800; cursor: pointer;
  transition: opacity .18s, transform .15s;
  will-change: transform;
}
.save-btn:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
.save-btn:disabled { opacity: .6; cursor: not-allowed; }
.save-inner { display: flex; align-items: center; justify-content: center; gap: 7px; }

.spinner {
  width: 15px; height: 15px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.35); border-top-color: #fff;
  animation: spin .7s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Transiciones iconos */
.icon-swap-enter-active, .icon-swap-leave-active { transition: all .2s; }
.icon-swap-enter-from, .icon-swap-leave-to { opacity: 0; transform: scale(.7) rotate(-10deg); }
</style>