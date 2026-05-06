<template>
  <div class="dashboard-home">
    <!-- ═══ SALUDO ═══════════════════════════════════════════ -->
    <div class="greeting">
      <div class="greeting-left">
        <h1>{{ greeting }}, {{ username }}</h1>
        <p class="subtitle">Tu espacio personal de desafíos y hobbies</p>
      </div>
      <div class="greeting-date">
        <span class="gd-day">{{ todayDay }}</span>
        <span class="gd-month">{{ todayMonth }}</span>
      </div>
    </div>

    <!-- ═══ BANNER ONBOARDING ══════════════════════════════ -->
    <div v-if="onboarding.goal" class="ob-banner">
      <div class="ob-suggest">
        <div class="obs-left">
          <div class="obs-tag">
            <svg viewBox="0 0 16 16" fill="none" width="12" stroke="#ffb3c6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 1l1.8 3.6L14 5.2l-3 2.9.7 4.1L8 10.3l-3.7 1.9.7-4.1-3-2.9 4.2-.6L8 1z"/>
            </svg>
            Sugerido para ti
          </div>
          <h3 class="obs-title">
            <span v-if="onboarding.goal === 'new'">Empieza con 10 min de lectura al día</span>
            <span v-else-if="onboarding.goal === 'quit'">30 días sin redes sociales por la mañana</span>
            <span v-else-if="onboarding.goal === 'time'">Planifica tu día cada mañana — 5 min</span>
            <span v-else-if="onboarding.goal === 'hobby'">Dedica 20 min diarios a tu hobby favorito</span>
          </h3>
          <p class="obs-desc">
            Basado en tu objetivo:
            <strong>
              <span v-if="onboarding.goal === 'new'">Crear hábitos nuevos</span>
              <span v-else-if="onboarding.goal === 'quit'">Eliminar hábitos malos</span>
              <span v-else-if="onboarding.goal === 'time'">Organizar tu tiempo</span>
              <span v-else-if="onboarding.goal === 'hobby'">Descubrir nuevos hobbies</span>
            </strong>
            <span v-if="onboarding.time"> · {{ onboarding.time }} min al día</span>
          </p>
        </div>
        <button class="obs-btn" @click="startSuggestedGoal">
          <svg viewBox="0 0 16 16" fill="none" width="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 8h10M9 4l4 4-4 4"/>
          </svg>
          Empezar reto
        </button>
      </div>

      <div v-if="onboarding.hobbies?.length" class="ob-hobbies">
        <span class="obh-label">Tus intereses</span>
        <div class="obh-pills">
          <span v-for="h in onboarding.hobbies" :key="h" class="obh-pill">{{ h }}</span>
        </div>
      </div>
    </div>

    <!-- ═══ STATS GRID ═════════════════════════════════════ -->
    <div class="stats-grid">
      <div class="stat-card" v-for="(stat, i) in statItems" :key="i">
        <div class="stat-icon" :class="stat.key">
          <svg viewBox="0 0 24 24" fill="none" width="22" height="22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path v-if="stat.key === 'challenges'" d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
            <path v-if="stat.key === 'hobbies'" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            <rect v-if="stat.key === 'events'" x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line v-if="stat.key === 'events'" x1="16" y1="2" x2="16" y2="6"/>
            <line v-if="stat.key === 'events'" x1="8" y1="2" x2="8" y2="6"/>
            <line v-if="stat.key === 'events'" x1="3" y1="10" x2="21" y2="10"/>
            <polygon v-if="stat.key === 'points'" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
        <div class="stat-trend" v-if="stat.trend">
          <svg viewBox="0 0 16 16" fill="none" width="12" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12l4-4 3 3 4-4"/>
          </svg>
          <span>+{{ stat.trend }}</span>
        </div>
      </div>
    </div>

    <!-- ═══ MIDDLE GRID: Racha + Gráfica ═══════════════════ -->
    <div class="middle-grid">
      <!-- Racha -->
      <div class="section-card streak-card">
        <div class="streak-header">
          <div class="streak-icon">
            <svg viewBox="0 0 24 24" fill="none" width="28" stroke="#ff6b9d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
            </svg>
          </div>
          <div>
            <h2>Racha actual</h2>
            <p class="streak-sub">Días consecutivos activo</p>
          </div>
        </div>
        <div class="streak-number">{{ streak }}</div>
        <div class="streak-days">
          <div v-for="(day, i) in last7Days" :key="i" class="streak-day" :class="{ active: day.active, today: day.isToday }">
            <div class="streak-dot">
              <svg v-if="day.active" viewBox="0 0 16 16" fill="none" width="10" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 8l3 3 7-7"/>
              </svg>
            </div>
            <span class="streak-label">{{ day.label }}</span>
          </div>
        </div>
        <p class="streak-msg">{{ streakMessage }}</p>
      </div>

      <!-- Gráfica -->
      <div class="section-card chart-card">
        <div class="chart-header">
          <h2>Actividad esta semana</h2>
          <div class="chart-legend">
            <span class="legend-dot" style="background:#ff6b9d"></span>
            <span>Actividad</span>
          </div>
        </div>
        <div class="chart">
          <div class="chart-bars">
            <div class="bar-col" v-for="(day, i) in weeklyData" :key="i">
              <div class="bar-wrapper">
                <div
                  class="bar"
                  :style="{ height: day.count > 0 ? Math.max(10, (day.count / maxWeekly) * 130) + 'px' : '6px' }"
                  :class="{ active: day.count > 0, today: day.isToday }"
                ></div>
              </div>
              <span class="bar-label">{{ day.label }}</span>
              <span class="bar-count" v-if="day.count > 0">{{ day.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ RETOS ══════════════════════════════════════════ -->
    <div class="section-card goals-section">
      <div class="goals-header">
        <div class="goals-title">
          <svg viewBox="0 0 24 24" fill="none" width="20" stroke="#22284E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
          <h2>Mis retos</h2>
        </div>
        <button class="btn-add" @click="showGoalForm = !showGoalForm">
          <svg viewBox="0 0 16 16" fill="none" width="14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 1v14M1 8h14"/>
          </svg>
          Nuevo reto
        </button>
      </div>

      <!-- Formulario nuevo reto -->
      <Transition name="slide">
        <div v-if="showGoalForm" class="goal-form">
          <div class="gf-row">
            <input v-model="newGoalTitle" type="text" class="input" placeholder="Ej: 30 días sin azúcar, 30 días de ejercicio..." />
          </div>
          <div class="gf-row">
            <div class="form-field">
              <label>Duración (mínimo 30 días)</label>
              <input v-model.number="newGoalDays" type="number" min="30" class="input" placeholder="30" />
            </div>
            <div class="form-actions">
              <button class="btn-primary" @click="addGoal" :disabled="savingGoal">
                <span v-if="savingGoal">Guardando...</span>
                <span v-else>Empezar reto</span>
              </button>
              <button class="btn-ghost" @click="showGoalForm = false">Cancelar</button>
            </div>
          </div>
          <div v-if="goalError" class="error-message">{{ goalError }}</div>
        </div>
      </Transition>

      <!-- Lista de retos -->
      <div v-if="goals.length > 0" class="goals-list">
        <div v-for="goal in goals" :key="goal.id" class="goal-item" :class="{ completed: goal.completed }">
          <div class="goal-top">
            <div class="goal-title-row">
              <span class="goal-title">{{ goal.title }}</span>
              <span v-if="goal.completed" class="completed-badge">
                <svg viewBox="0 0 16 16" fill="none" width="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 8l3 3 7-7"/>
                </svg>
                Completado
              </span>
              <span v-else-if="checkedInToday(goal)" class="done-today-badge">
                <svg viewBox="0 0 16 16" fill="none" width="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 8l3 3 7-7"/>
                </svg>
                Hecho hoy
              </span>
            </div>
            <button class="delete-btn" @click="deleteGoal(goal.id)" title="Eliminar reto">
              <svg viewBox="0 0 16 16" fill="none" width="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 4h12M5 4V2a1 1 0 011-1h4a1 1 0 011 1v2M6 7v6M10 7v6"/>
              </svg>
            </button>
          </div>

          <!-- Progreso -->
          <div class="goal-progress">
            <div class="progress-info">
              <span class="progress-days">Día {{ goal.current_day }} de {{ goal.total_days }}</span>
              <span class="progress-pct">{{ Math.round((goal.current_day / goal.total_days) * 100) }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: (goal.current_day / goal.total_days * 100) + '%' }" :class="{ completed: goal.completed }"></div>
            </div>
          </div>

          <!-- Días visuales -->
          <div class="days-grid">
            <div
              v-for="d in Math.min(goal.total_days, 30)"
              :key="d"
              class="day-dot"
              :class="{
                done: d <= goal.current_day,
                current: d === goal.current_day + 1 && !goal.completed,
                completed: goal.completed
              }"
              :title="`Día ${d}`"
            ></div>
            <span v-if="goal.total_days > 30" class="days-more">+{{ goal.total_days - 30 }}</span>
          </div>

          <!-- Check-in -->
          <button
            v-if="!goal.completed && !checkedInToday(goal)"
            class="btn-checkin"
            @click="checkIn(goal)"
          >
            <svg viewBox="0 0 16 16" fill="none" width="14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 8l3 3 7-7"/>
            </svg>
            Marcar día {{ goal.current_day + 1 }} como completado
          </button>
          <p v-else-if="!goal.completed && checkedInToday(goal)" class="checkin-done">
            <svg viewBox="0 0 16 16" fill="none" width="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 1v6l3 3"/>
            </svg>
            ¡Ya completaste el día de hoy! Vuelve mañana
          </p>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" width="40" stroke="#ddd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 12h8M12 8v8"/>
          </svg>
        </div>
        <p class="empty-text">No tienes retos activos</p>
        <p class="empty-sub">¡Empieza uno y construye hábitos positivos!</p>
      </div>
    </div>

    <!-- ═══ BOTTOM GRID: Eventos + Actividad ═══════════════ -->
    <div class="bottom-grid">
      <!-- Próximos eventos -->
      <div class="section-card">
        <div class="card-header">
          <svg viewBox="0 0 24 24" fill="none" width="18" stroke="#22284E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <h2>Próximos eventos</h2>
        </div>
        <div v-if="upcomingEvents.length > 0" class="events-list">
          <div class="event-item" v-for="event in upcomingEvents" :key="event.id">
            <div class="event-date">
              <span class="event-day">{{ getDay(event.date) }}</span>
              <span class="event-month">{{ getMonth(event.date) }}</span>
            </div>
            <div class="event-info">
              <span class="event-title">{{ event.title }}</span>
              <span v-if="event.start_time" class="event-time">
                <svg viewBox="0 0 16 16" fill="none" width="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="8" cy="8" r="6"/>
                  <path d="M8 4v4l2 2"/>
                </svg>
                {{ event.start_time.slice(0,5) }}{{ event.end_time ? ' - ' + event.end_time.slice(0,5) : '' }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state-small">
          <p class="empty-text">No tienes eventos próximos</p>
        </div>
      </div>

      <!-- Actividad reciente -->
      <div class="section-card">
        <div class="card-header">
          <svg viewBox="0 0 24 24" fill="none" width="18" stroke="#22284E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <h2>Actividad reciente</h2>
        </div>
        <div v-if="recentActivity.length > 0" class="activity-list">
          <div class="activity-item" v-for="item in recentActivity" :key="item.id">
            <div class="activity-icon" :class="item.type">
              <svg viewBox="0 0 24 24" fill="none" width="16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect v-if="item.type === 'event'" x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line v-if="item.type === 'event'" x1="16" y1="2" x2="16" y2="6"/>
                <line v-if="item.type === 'event'" x1="8" y1="2" x2="8" y2="6"/>
                <line v-if="item.type === 'event'" x1="3" y1="10" x2="21" y2="10"/>
                <path v-if="item.type === 'hobby'" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                <path v-if="item.type === 'challenge'" d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path v-if="item.type === 'message'" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
              </svg>
            </div>
            <div class="activity-content">
              <p class="activity-title">{{ item.title }}</p>
              <span class="activity-time">{{ timeAgo(item.created_at) }}</span>
            </div>
            <span v-if="item.points > 0" class="activity-points">+{{ item.points }} pts</span>
          </div>
        </div>
        <div v-else class="empty-state-small">
          <p class="empty-text">No hay actividad reciente</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const currentUser = ref(null)
const username = ref('Usuario')
const upcomingEvents = ref([])
const onboarding = ref({ goal: null, hobbies: [], time: null })
const recentActivity = ref([])
const stats = ref({ challenges: 0, hobbies: 0, events: 0, points: 0 })
const streak = ref(0)
const last7Days = ref([])
const weeklyData = ref([])
const goals = ref([])
const showGoalForm = ref(false)
const newGoalTitle = ref('')
const newGoalDays = ref(30)
const savingGoal = ref(false)
const goalError = ref('')

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const today = new Date()
const todayDay = String(today.getDate()).padStart(2, '0')
const todayMonth = monthNames[today.getMonth()]

const greeting = computed(() => {
  const h = today.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
})

const maxWeekly = computed(() => Math.max(1, ...weeklyData.value.map(d => d.count)))

const streakMessage = computed(() => {
  if (streak.value === 0) return 'Empieza hoy tu racha'
  if (streak.value < 3) return '¡Buen comienzo, sigue así!'
  if (streak.value < 7) return '¡Vas muy bien, no pares!'
  if (streak.value < 30) return '¡Increíble racha!'
  return '¡Leyenda absoluta!'
})

const statItems = computed(() => [
  { key: 'challenges', value: stats.value.challenges, label: 'Desafíos activos', trend: null },
  { key: 'hobbies', value: stats.value.hobbies, label: 'Hobbies', trend: null },
  { key: 'events', value: stats.value.events, label: 'Eventos este mes', trend: null },
  { key: 'points', value: stats.value.points, label: 'Puntos totales', trend: null },
])

function getDay(date) { return date.split('-')[2] }
function getMonth(date) { return monthNames[parseInt(date.split('-')[1]) - 1] }
function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}
function checkedInToday(goal) {
  if (!goal.last_checked_in) return false
  return goal.last_checked_in === formatDate(new Date())
}
function calculateStreak(activityDates) {
  if (!activityDates || activityDates.length === 0) return 0
  const todayStr = formatDate(new Date())
  const dateSet = new Set(activityDates.map(a => a.activity_date))
  let count = 0
  let current = new Date()
  if (!dateSet.has(todayStr)) current.setDate(current.getDate() - 1)
  while (true) {
    const d = formatDate(current)
    if (dateSet.has(d)) { count++; current.setDate(current.getDate() - 1) }
    else break
  }
  return count
}
function buildLast7Days(activityDates) {
  const dateSet = new Set((activityDates || []).map(a => a.activity_date))
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    return { label: dayLabels[d.getDay()], active: dateSet.has(formatDate(d)), isToday: i === 6 }
  })
}
function buildWeeklyData(activityDates) {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const dateStr = formatDate(d)
    return { label: dayLabels[d.getDay()], count: (activityDates || []).filter(a => a.activity_date === dateStr).length, isToday: i === 6 }
  })
}

function startSuggestedGoal() {
  const titles = {
    new: '10 min de lectura al día',
    quit: '30 días sin redes por la mañana',
    time: 'Planificar el día cada mañana',
    hobby: '20 min de mi hobby favorito'
  }
  newGoalTitle.value = titles[onboarding.value.goal] || ''
  newGoalDays.value = 30
  showGoalForm.value = true
}

async function loadGoals() {
  const { data } = await supabase.from('goals').select('*').eq('user_id', currentUser.value.id).order('created_at', { ascending: false })
  if (data) goals.value = data
}

async function addGoal() {
  if (!newGoalTitle.value.trim()) { goalError.value = 'El título es obligatorio'; return }
  if (newGoalDays.value < 30) { goalError.value = 'El mínimo son 30 días'; return }
  savingGoal.value = true
  goalError.value = ''
  const { data, error } = await supabase.from('goals').insert({
    user_id: currentUser.value.id,
    title: newGoalTitle.value.trim(),
    total_days: newGoalDays.value,
    current_day: 0
  }).select()
  if (error) { goalError.value = 'Error al guardar' }
  else {
    goals.value.unshift(data[0])
    newGoalTitle.value = ''
    newGoalDays.value = 30
    showGoalForm.value = false
  }
  savingGoal.value = false
}

async function checkIn(goal) {
  const newDay = goal.current_day + 1
  const completed = newDay >= goal.total_days
  const todayStr = formatDate(new Date())

  const { error } = await supabase.from('goals').update({
    current_day: newDay,
    last_checked_in: todayStr,
    completed
  }).eq('id', goal.id)

  if (!error) {
    goal.current_day = newDay
    goal.last_checked_in = todayStr
    goal.completed = completed
    await supabase.from('activity_log').insert({
      user_id: currentUser.value.id,
      type: 'challenge',
      title: `Día ${newDay} de "${goal.title}"`,
      points: completed ? 500 : 10,
      activity_date: todayStr
    })
    // Recargar stats
    await loadData()
  }
}

async function deleteGoal(id) {
  await supabase.from('goals').delete().eq('id', id)
  goals.value = goals.value.filter(g => g.id !== id)
}

async function loadData() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  currentUser.value = user

  const { data: profile } = await supabase.from('profiles')
    .select('username, onboarding_goal, onboarding_hobbies, onboarding_time, onboarding_done')
    .eq('id', user.id).single()
  username.value = profile ? profile.username : user.email.split('@')[0]

  if (profile?.onboarding_done) {
    onboarding.value = {
      goal: profile.onboarding_goal,
      hobbies: profile.onboarding_hobbies || [],
      time: profile.onboarding_time,
    }
  }

  const todayStr = formatDate(new Date())
  const { data: events } = await supabase.from('events').select('*').eq('user_id', user.id)
    .gte('date', todayStr).order('date', { ascending: true }).limit(5)
  if (events) upcomingEvents.value = events

  const firstDay = formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const lastDay = formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
  const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).gte('date', firstDay).lte('date', lastDay)
  stats.value.events = eventsCount || 0

  const { data: activity } = await supabase.from('activity_log').select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(50)
  if (activity) {
    recentActivity.value = activity.slice(0, 5)
    stats.value.points = activity.reduce((sum, a) => sum + (a.points || 0), 0)
    streak.value = calculateStreak(activity)
    last7Days.value = buildLast7Days(activity)
    weeklyData.value = buildWeeklyData([...activity, ...(events || []).map(e => ({ activity_date: e.date }))])
  } else {
    last7Days.value = buildLast7Days([])
    weeklyData.value = buildWeeklyData([])
  }

  const { count: hobbiesCount } = await supabase.from('hobbies').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  stats.value.hobbies = hobbiesCount || 0

  const { count: goalsCount } = await supabase.from('goals').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', false)
  stats.value.challenges = goalsCount || 0

  await loadGoals()
}

onMounted(loadData)
</script>

<style scoped>
.dashboard-home { max-width: 1040px; margin: 0 auto; }

/* ═══ SALUDO ═══════════════════════════════════════════ */
.greeting {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
}
h1 { font-size: 28px; color: #22284E; margin: 0 0 6px; font-weight: 800; letter-spacing: -0.5px; }
.subtitle { color: #8b92a8; margin: 0; font-size: 15px; }
.greeting-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #22284E, #2d3561);
  border-radius: 14px;
  padding: 10px 18px;
  color: #fff;
}
.gd-day { font-size: 24px; font-weight: 800; line-height: 1; }
.gd-month { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-top: 2px; }

/* ═══ BANNER ONBOARDING ════════════════════════════════ */
.ob-banner { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }

.ob-suggest {
  background: linear-gradient(135deg, #22284E 0%, #2d3561 100%);
  border-radius: 20px;
  padding: 24px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  box-shadow: 0 8px 32px rgba(34,40,78,.2);
}
.obs-left { flex: 1; }
.obs-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,107,157,.15);
  border: 1px solid rgba(255,107,157,.25);
  color: #ffb3c6;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  padding: 5px 12px;
  border-radius: 99px;
  margin-bottom: 10px;
}
.obs-title { font-size: 17px; font-weight: 700; color: #fff; margin: 0 0 8px; line-height: 1.3; }
.obs-desc { font-size: 13px; color: rgba(255,255,255,.45); margin: 0; }
.obs-desc strong { color: rgba(255,255,255,.7); font-weight: 600; }

.obs-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  border: none;
  font-size: 14px;
  font-weight: 700;
  padding: 12px 20px;
  border-radius: 14px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: 0 6px 20px rgba(255,107,157,.35);
  transition: transform .18s, box-shadow .18s;
}
.obs-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(255,107,157,.45); }

.ob-hobbies { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.obh-label { font-size: 11px; font-weight: 700; color: rgba(34,40,78,.35); letter-spacing: .06em; text-transform: uppercase; }
.obh-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.obh-pill {
  background: rgba(255,107,157,.08);
  border: 1.5px solid rgba(255,107,157,.15);
  color: #ff6b9d;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 99px;
}

/* ═══ STATS GRID ═══════════════════════════════════════ */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: #fff;
  border-radius: 18px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(34,40,78,.04);
  border: 1px solid rgba(34,40,78,.04);
  transition: transform .2s, box-shadow .2s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(34,40,78,.08); }
.stat-icon {
  width: 48px; height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-icon.challenges { background: linear-gradient(135deg, #fff3e0, #ffe0b2); color: #f59e0b; }
.stat-icon.hobbies { background: linear-gradient(135deg, #fce4ec, #f8bbd9); color: #e91e63; }
.stat-icon.events { background: linear-gradient(135deg, #e3f2fd, #bbdefb); color: #2196f3; }
.stat-icon.points { background: linear-gradient(135deg, #e8f5e9, #c8e6c9); color: #4caf50; }
.stat-info { display: flex; flex-direction: column; flex: 1; }
.stat-value { font-size: 26px; font-weight: 800; color: #22284E; line-height: 1; }
.stat-label { font-size: 12px; color: #8b92a8; margin-top: 4px; }
.stat-trend {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 700;
  color: #22c55e;
  background: #f0fdf4;
  padding: 4px 8px;
  border-radius: 8px;
}

/* ═══ MIDDLE GRID ══════════════════════════════════════ */
.middle-grid { display: grid; grid-template-columns: 1fr 1.6fr; gap: 20px; margin-bottom: 24px; }
.section-card {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(34,40,78,.04);
  border: 1px solid rgba(34,40,78,.04);
}

/* Racha */
.streak-card { display: flex; flex-direction: column; }
.streak-header { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.streak-icon {
  width: 48px; height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255,107,157,.12), rgba(255,179,198,.12));
  display: flex;
  align-items: center;
  justify-content: center;
}
.streak-header h2 { font-size: 16px; color: #22284E; margin: 0 0 2px; font-weight: 700; }
.streak-sub { font-size: 12px; color: #8b92a8; margin: 0; }
.streak-number { font-size: 56px; font-weight: 900; color: #ff6b9d; text-align: center; line-height: 1; margin-bottom: 20px; }
.streak-days { display: flex; justify-content: space-between; margin-bottom: 14px; }
.streak-day { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.streak-dot {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: #f0f1f5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.streak-day.active .streak-dot { background: linear-gradient(135deg, #ff6b9d, #ffb3c6); }
.streak-day.today .streak-dot { border: 2px solid #ff6b9d; }
.streak-day.active.today .streak-dot { background: linear-gradient(135deg, #ff6b9d, #ffb3c6); border-color: #e91e63; }
.streak-label { font-size: 11px; color: #8b92a8; font-weight: 500; }
.streak-msg { text-align: center; font-size: 13px; color: #8b92a8; margin: 0; font-weight: 500; }

/* Gráfica */
.chart-card { display: flex; flex-direction: column; }
.chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.chart-header h2 { font-size: 16px; color: #22284E; margin: 0; font-weight: 700; }
.chart-legend { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #8b92a8; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.chart { display: flex; align-items: flex-end; height: 170px; }
.chart-bars { display: flex; align-items: flex-end; gap: 10px; width: 100%; height: 100%; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; justify-content: flex-end; height: 100%; }
.bar-wrapper { flex: 1; display: flex; align-items: flex-end; width: 100%; }
.bar {
  width: 100%;
  border-radius: 8px 8px 0 0;
  background: #f0f1f5;
  transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 6px;
}
.bar.active { background: linear-gradient(180deg, #ff6b9d, #ffb3c6); }
.bar.today { background: linear-gradient(180deg, #22284E, #3d4570); }
.bar-label { font-size: 11px; color: #8b92a8; font-weight: 500; }
.bar-count { font-size: 11px; font-weight: 700; color: #ff6b9d; }

/* ═══ RETOS ════════════════════════════════════════════ */
.goals-section { margin-bottom: 24px; }
.goals-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.goals-title { display: flex; align-items: center; gap: 10px; }
.goals-title h2 { font-size: 16px; color: #22284E; margin: 0; font-weight: 700; }
.btn-add {
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform .18s, box-shadow .18s;
  box-shadow: 0 4px 16px rgba(255,107,157,.25);
}
.btn-add:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(255,107,157,.35); }

/* Formulario */
.goal-form { background: #f8f9fb; border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(34,40,78,.06); }
.gf-row { display: flex; gap: 12px; align-items: flex-end; }
.gf-row + .gf-row { margin-top: 12px; }
.form-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.form-field label { font-size: 12px; color: #8b92a8; font-weight: 600; }
.form-actions { display: flex; gap: 8px; }

.goals-list { display: flex; flex-direction: column; gap: 16px; }
.goal-item {
  background: #f8f9fb;
  border-radius: 16px;
  padding: 20px;
  border-left: 4px solid #ff6b9d;
  transition: all 0.2s;
}
.goal-item.completed { border-left-color: #22c55e; opacity: 0.85; }

.goal-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.goal-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.goal-title { font-size: 15px; font-weight: 700; color: #22284E; }
.completed-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f0fdf4;
  color: #22c55e;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 700;
}
.done-today-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #eff6ff;
  color: #3b82f6;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 700;
}

.goal-progress { margin-bottom: 14px; }
.progress-info { display: flex; justify-content: space-between; margin-bottom: 6px; }
.progress-days { font-size: 13px; color: #8b92a8; font-weight: 500; }
.progress-pct { font-size: 13px; font-weight: 700; color: #ff6b9d; }
.progress-bar { height: 8px; background: #e8eaf0; border-radius: 99px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #ff6b9d, #ffb3c6); border-radius: 99px; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.progress-fill.completed { background: linear-gradient(90deg, #22c55e, #86efac); }

.days-grid { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 16px; align-items: center; }
.day-dot {
  width: 14px; height: 14px;
  border-radius: 4px;
  background: #e8eaf0;
  transition: all 0.2s;
}
.day-dot.done { background: linear-gradient(135deg, #ff6b9d, #ffb3c6); }
.day-dot.current { background: #fff; border: 2px solid #ff6b9d; }
.day-dot.completed { background: linear-gradient(135deg, #22c55e, #86efac); }
.days-more { font-size: 11px; color: #8b92a8; font-weight: 600; margin-left: 4px; }

.btn-checkin {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform .18s, box-shadow .18s;
  box-shadow: 0 4px 16px rgba(255,107,157,.25);
}
.btn-checkin:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(255,107,157,.35); }
.checkin-done {
  text-align: center;
  font-size: 13px;
  color: #3b82f6;
  margin: 0;
  padding: 10px;
  background: #eff6ff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 500;
}

/* Empty state */
.empty-state { text-align: center; padding: 40px 20px; }
.empty-icon { margin-bottom: 12px; }
.empty-text { color: #8b92a8; font-size: 14px; margin: 0 0 4px; font-weight: 600; }
.empty-sub { color: #b0b5c8; font-size: 13px; margin: 0; }
.empty-state-small { text-align: center; padding: 30px 20px; }

/* ═══ BOTTOM GRID ══════════════════════════════════════ */
.bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.card-header h2 { font-size: 16px; color: #22284E; margin: 0; font-weight: 700; }

.events-list { display: flex; flex-direction: column; gap: 10px; }
.event-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8f9fb;
  transition: background 0.2s;
}
.event-item:hover { background: #f0f1f5; }
.event-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  border-radius: 10px;
  padding: 8px 12px;
  min-width: 48px;
  flex-shrink: 0;
}
.event-day { font-size: 18px; font-weight: 800; line-height: 1; }
.event-month { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; }
.event-info { display: flex; flex-direction: column; gap: 3px; }
.event-title { font-size: 14px; font-weight: 600; color: #22284E; }
.event-time {
  font-size: 12px;
  color: #8b92a8;
  display: flex;
  align-items: center;
  gap: 4px;
}

.activity-list { display: flex; flex-direction: column; gap: 10px; }
.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8f9fb;
  transition: background 0.2s;
}
.activity-item:hover { background: #f0f1f5; }
.activity-icon {
  width: 38px; height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.activity-icon.event { background: linear-gradient(135deg, #e3f2fd, #bbdefb); color: #2196f3; }
.activity-icon.hobby { background: linear-gradient(135deg, #fce4ec, #f8bbd9); color: #e91e63; }
.activity-icon.challenge { background: linear-gradient(135deg, #fff3e0, #ffe0b2); color: #f59e0b; }
.activity-icon.message { background: linear-gradient(135deg, #f3e5f5, #e1bee7); color: #9c27b0; }
.activity-content { flex: 1; min-width: 0; }
.activity-title { font-size: 13px; color: #22284E; margin: 0 0 3px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.activity-time { font-size: 11px; color: #b0b5c8; }
.activity-points { font-size: 13px; font-weight: 700; color: #22c55e; flex-shrink: 0; }

/* ═══ FORM ELEMENTS ════════════════════════════════════ */
.input {
  width: 100%;
  padding: 11px 14px;
  border: 1.5px solid #e8eaf0;
  border-radius: 12px;
  font-size: 14px;
  box-sizing: border-box;
  font-family: inherit;
  background: #fff;
  color: #22284E;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input:focus { outline: none; border-color: #ff6b9d; box-shadow: 0 0 0 3px rgba(255,107,157,.1); }
.input::placeholder { color: #b0b5c8; }

.btn-primary {
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  padding: 11px 20px;
  border-radius: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: transform .18s, box-shadow .18s;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(255,107,157,.25);
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(255,107,157,.35); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.btn-ghost {
  background: #fff;
  color: #8b92a8;
  border: 1.5px solid #e8eaf0;
  border-radius: 12px;
  padding: 11px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.btn-ghost:hover { border-color: #ff6b9d; color: #ff6b9d; }

.delete-btn {
  background: none;
  border: none;
  color: #d1d5db;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.delete-btn:hover { color: #ef4444; background: #fef2f2; }

.error-message {
  background: #fef2f2;
  color: #ef4444;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  margin-top: 10px;
  font-weight: 500;
}

/* ═══ TRANSICIONES ═════════════════════════════════════ */
.slide-enter-active, .slide-leave-active { transition: all 0.3s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-10px); }

/* ═══ RESPONSIVE ═══════════════════════════════════════ */
@media (max-width: 768px) {
  .greeting { flex-direction: column; gap: 12px; }
  .middle-grid { grid-template-columns: 1fr; }
  .bottom-grid { grid-template-columns: 1fr; }
  .gf-row { flex-direction: column; }
  .form-actions { width: 100%; }
  .form-actions button { flex: 1; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .ob-suggest { flex-direction: column; align-items: flex-start; }
  .obs-btn { width: 100%; justify-content: center; }
}
</style>