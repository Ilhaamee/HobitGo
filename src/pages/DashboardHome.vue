<template>
  <div class="dashboard-home">
    <!-- Saludo -->
    <div class="greeting">
      <h1>{{ greeting }}, {{ username }} 👋</h1>
      <p class="subtitle">Tu espacio personal de desafíos y hobbies</p>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon challenges"><font-awesome-icon icon="trophy" /></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.challenges }}</span>
          <span class="stat-label">Desafíos activos</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon hobbies"><font-awesome-icon icon="heart" /></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.hobbies }}</span>
          <span class="stat-label">Hobbies</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon events"><font-awesome-icon icon="calendar" /></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.events }}</span>
          <span class="stat-label">Eventos este mes</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon points"><font-awesome-icon icon="star" /></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.points }}</span>
          <span class="stat-label">Puntos totales</span>
        </div>
      </div>
    </div>

    <!-- Racha + Gráfica -->
    <div class="middle-grid">
      <div class="section-card streak-card">
        <div class="streak-header">
          <div class="streak-flame">🔥</div>
          <div>
            <h2>Racha actual</h2>
            <p class="streak-sub">Días consecutivos activo</p>
          </div>
        </div>
        <div class="streak-number">{{ streak }}</div>
        <div class="streak-days">
          <div v-for="(day, i) in last7Days" :key="i" class="streak-day" :class="{ active: day.active, today: day.isToday }">
            <div class="streak-dot"></div>
            <span class="streak-label">{{ day.label }}</span>
          </div>
        </div>
        <p class="streak-msg">{{ streakMessage }}</p>
      </div>

      <div class="section-card">
        <h2>📊 Actividad esta semana</h2>
        <div class="chart">
          <div class="chart-bars">
            <div class="bar-col" v-for="(day, i) in weeklyData" :key="i">
              <div class="bar-wrapper">
                <div class="bar" :style="{ height: day.count > 0 ? Math.max(8, (day.count / maxWeekly) * 120) + 'px' : '4px' }" :class="{ active: day.count > 0, today: day.isToday }"></div>
              </div>
              <span class="bar-label">{{ day.label }}</span>
              <span class="bar-count" v-if="day.count > 0">{{ day.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Objetivos / Retos -->
    <div class="section-card goals-section">
      <div class="goals-header">
        <h2>🎯 Mis retos</h2>
        <button class="btn-add" @click="showGoalForm = !showGoalForm">
          <font-awesome-icon icon="plus" /> Nuevo reto
        </button>
      </div>

      <div v-if="showGoalForm" class="goal-form">
        <input v-model="newGoalTitle" type="text" class="input" placeholder="Ej: 30 días sin azúcar, 30 días de ejercicio..." />
        <div class="goal-form-row">
          <div class="form-field">
            <label>Duración (mínimo 30 días)</label>
            <input v-model.number="newGoalDays" type="number" min="30" class="input" placeholder="30" />
          </div>
          <div class="form-actions">
            <button class="btn-primary" @click="addGoal" :disabled="savingGoal">{{ savingGoal ? '...' : 'Empezar reto' }}</button>
            <button class="btn-cancel" @click="showGoalForm = false">Cancelar</button>
          </div>
        </div>
        <div v-if="goalError" class="error-message">{{ goalError }}</div>
      </div>

      <div v-if="goals.length > 0" class="goals-list">
        <div v-for="goal in goals" :key="goal.id" class="goal-item" :class="{ completed: goal.completed }">
          <div class="goal-top">
            <div class="goal-title-row">
              <span class="goal-title">{{ goal.title }}</span>
              <span v-if="goal.completed" class="completed-badge">🏆 Completado</span>
              <span v-else-if="checkedInToday(goal)" class="done-today-badge">✅ Hecho hoy</span>
            </div>
            <button class="delete-btn" @click="deleteGoal(goal.id)"><font-awesome-icon icon="trash" /></button>
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
              v-for="d in goal.total_days"
              :key="d"
              class="day-dot"
              :class="{
                done: d <= goal.current_day,
                current: d === goal.current_day + 1,
                completed: goal.completed
              }"
              :title="`Día ${d}`"
            ></div>
          </div>

          <!-- Botón check-in -->
          <button
            v-if="!goal.completed && !checkedInToday(goal)"
            class="btn-checkin"
            @click="checkIn(goal)"
          >
            ✅ Marcar día {{ goal.current_day + 1 }} como completado
          </button>
          <p v-else-if="!goal.completed && checkedInToday(goal)" class="checkin-done">
            ¡Ya completaste el día de hoy! Vuelve mañana 💪
          </p>
        </div>
      </div>
      <p v-else class="empty-text">No tienes retos activos. ¡Empieza uno!</p>
    </div>

    <div class="bottom-grid">
      <div class="section-card">
        <h2>📅 Próximos eventos</h2>
        <div v-if="upcomingEvents.length > 0" class="events-list">
          <div class="event-item" v-for="event in upcomingEvents" :key="event.id">
            <div class="event-date">
              <span class="event-day">{{ getDay(event.date) }}</span>
              <span class="event-month">{{ getMonth(event.date) }}</span>
            </div>
            <div class="event-info">
              <span class="event-title">{{ event.title }}</span>
              <span v-if="event.start_time" class="event-time">
                {{ event.start_time.slice(0,5) }}{{ event.end_time ? ' - ' + event.end_time.slice(0,5) : '' }}
              </span>
            </div>
          </div>
        </div>
        <p v-else class="empty-text">No tienes eventos próximos</p>
      </div>

      <div class="section-card">
        <h2>⚡ Actividad reciente</h2>
        <div v-if="recentActivity.length > 0" class="activity-list">
          <div class="activity-item" v-for="item in recentActivity" :key="item.id">
            <div class="activity-icon" :class="item.type">
              <font-awesome-icon :icon="getActivityIcon(item.type)" />
            </div>
            <div class="activity-content">
              <p class="activity-title">{{ item.title }}</p>
              <span class="activity-time">{{ timeAgo(item.created_at) }}</span>
            </div>
            <span v-if="item.points > 0" class="activity-points">+{{ item.points }} pts</span>
          </div>
        </div>
        <p v-else class="empty-text">No hay actividad reciente</p>
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

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
})
const maxWeekly = computed(() => Math.max(1, ...weeklyData.value.map(d => d.count)))
const streakMessage = computed(() => {
  if (streak.value === 0) return 'Empieza hoy tu racha 💪'
  if (streak.value < 3) return '¡Buen comienzo, sigue así!'
  if (streak.value < 7) return '¡Vas muy bien, no pares!'
  if (streak.value < 30) return '¡Increíble racha! 🔥'
  return '¡Leyenda absoluta! 🏆'
})

function getDay(date) { return date.split('-')[2] }
function getMonth(date) { return monthNames[parseInt(date.split('-')[1]) - 1] }
function getActivityIcon(type) {
  const icons = { event: 'calendar', hobby: 'heart', challenge: 'trophy', message: 'comments' }
  return icons[type] || 'star'
}
function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora mismo'
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
  const today = formatDate(new Date())
  const dateSet = new Set(activityDates.map(a => a.activity_date))
  let count = 0
  let current = new Date()
  if (!dateSet.has(today)) current.setDate(current.getDate() - 1)
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
  const today = formatDate(new Date())

  const { error } = await supabase.from('goals').update({
    current_day: newDay,
    last_checked_in: today,
    completed
  }).eq('id', goal.id)

  if (!error) {
    goal.current_day = newDay
    goal.last_checked_in = today
    goal.completed = completed

    // Registrar en activity_log
    await supabase.from('activity_log').insert({
      user_id: currentUser.value.id,
      type: 'challenge',
      title: `Día ${newDay} de "${goal.title}"`,
      points: completed ? 500 : 10,
      activity_date: today
    })
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

  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
  username.value = profile ? profile.username : user.email.split('@')[0]

  const today = formatDate(new Date())
  const { data: events } = await supabase.from('events').select('*').eq('user_id', user.id)
    .gte('date', today).order('date', { ascending: true }).limit(5)
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

  await loadGoals()
}

onMounted(loadData)
</script>

<style scoped>
.dashboard-home { max-width: 1000px; margin: 0 auto; }
.greeting { margin-bottom: 32px; }
h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 8px; }
.subtitle { color: #666; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px; }
.stat-card { background: #fff; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.stat-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.stat-icon.challenges { background: #fff3e0; color: #ff9800; }
.stat-icon.hobbies { background: #fce4ec; color: #e91e63; }
.stat-icon.events { background: #e3f2fd; color: #2196f3; }
.stat-icon.points { background: #e8f5e9; color: #4caf50; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
.stat-label { font-size: 13px; color: #666; }

.middle-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; margin-bottom: 24px; }
.section-card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.section-card h2 { font-size: 16px; color: #1a1a2e; margin-bottom: 20px; }

.streak-card { display: flex; flex-direction: column; }
.streak-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.streak-flame { font-size: 32px; }
.streak-header h2 { margin-bottom: 2px; }
.streak-sub { font-size: 12px; color: #888; margin: 0; }
.streak-number { font-size: 56px; font-weight: 800; color: #E08E6B; text-align: center; line-height: 1; margin-bottom: 20px; }
.streak-days { display: flex; justify-content: space-between; margin-bottom: 12px; }
.streak-day { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.streak-dot { width: 28px; height: 28px; border-radius: 50%; background: #f0f0f0; transition: background 0.2s; }
.streak-day.active .streak-dot { background: #E08E6B; }
.streak-day.today .streak-dot { border: 2px solid #E08E6B; }
.streak-day.active.today .streak-dot { background: #E08E6B; border-color: #c07050; }
.streak-label { font-size: 11px; color: #888; }
.streak-msg { text-align: center; font-size: 13px; color: #888; margin: 0; }

.chart { display: flex; align-items: flex-end; height: 160px; }
.chart-bars { display: flex; align-items: flex-end; gap: 8px; width: 100%; height: 100%; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; justify-content: flex-end; height: 100%; }
.bar-wrapper { flex: 1; display: flex; align-items: flex-end; width: 100%; }
.bar { width: 100%; border-radius: 6px 6px 0 0; background: #f0f0f0; transition: height 0.4s ease; min-height: 4px; }
.bar.active { background: #E08E6B; }
.bar.today { background: #22284E; }
.bar-label { font-size: 11px; color: #888; }
.bar-count { font-size: 11px; font-weight: 700; color: #E08E6B; }

/* Retos */
.goals-section { margin-bottom: 24px; }
.goals-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.goals-header h2 { margin-bottom: 0; }
.btn-add { display: flex; align-items: center; gap: 6px; background: #E08E6B; color: #fff; border: none; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
.btn-add:hover { opacity: 0.9; }

.goal-form { background: #f9f9f9; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.goal-form-row { display: flex; gap: 12px; align-items: flex-end; margin-top: 10px; }
.form-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.form-field label { font-size: 12px; color: #888; font-weight: 500; }
.form-actions { display: flex; gap: 8px; }

.goals-list { display: flex; flex-direction: column; gap: 16px; }
.goal-item { background: #f9f9f9; border-radius: 14px; padding: 16px; border-left: 4px solid #E08E6B; transition: all 0.2s; }
.goal-item.completed { border-left-color: #4caf50; opacity: 0.8; }

.goal-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.goal-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.goal-title { font-size: 15px; font-weight: 700; color: #1a1a2e; }
.completed-badge { background: #e8f5e9; color: #4caf50; font-size: 12px; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
.done-today-badge { background: #e3f2fd; color: #2196f3; font-size: 12px; padding: 2px 8px; border-radius: 20px; font-weight: 600; }

.goal-progress { margin-bottom: 12px; }
.progress-info { display: flex; justify-content: space-between; margin-bottom: 6px; }
.progress-days { font-size: 13px; color: #666; }
.progress-pct { font-size: 13px; font-weight: 700; color: #E08E6B; }
.progress-bar { height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: #E08E6B; border-radius: 4px; transition: width 0.4s ease; }
.progress-fill.completed { background: #4caf50; }

.days-grid { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 14px; }
.day-dot { width: 14px; height: 14px; border-radius: 3px; background: #e0e0e0; transition: background 0.2s; }
.day-dot.done { background: #E08E6B; }
.day-dot.current { background: #fff; border: 2px solid #E08E6B; }
.day-dot.completed { background: #4caf50; }

.btn-checkin { width: 100%; padding: 10px; background: #E08E6B; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
.btn-checkin:hover { opacity: 0.9; }
.checkin-done { text-align: center; font-size: 13px; color: #2196f3; margin: 0; padding: 8px; background: #e3f2fd; border-radius: 8px; }

.bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.empty-text { color: #aaa; font-size: 14px; text-align: center; padding: 20px 0; }

.events-list { display: flex; flex-direction: column; gap: 12px; }
.event-item { display: flex; align-items: center; gap: 14px; padding: 10px; border-radius: 10px; background: #f9f9f9; }
.event-date { display: flex; flex-direction: column; align-items: center; background: #E08E6B; color: #fff; border-radius: 8px; padding: 6px 10px; min-width: 44px; flex-shrink: 0; }
.event-day { font-size: 18px; font-weight: 700; line-height: 1; }
.event-month { font-size: 11px; text-transform: uppercase; }
.event-info { display: flex; flex-direction: column; gap: 2px; }
.event-title { font-size: 14px; font-weight: 600; color: #1a1a2e; }
.event-time { font-size: 12px; color: #888; }

.activity-list { display: flex; flex-direction: column; gap: 12px; }
.activity-item { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; background: #f9f9f9; }
.activity-icon { width: 36px; height: 36px; border-radius: 10px; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.activity-icon.event { background: #2196f3; }
.activity-icon.hobby { background: #e91e63; }
.activity-icon.challenge { background: #ff9800; }
.activity-icon.message { background: #9c27b0; }
.activity-content { flex: 1; }
.activity-title { font-size: 13px; color: #1a1a2e; margin: 0 0 2px; }
.activity-time { font-size: 12px; color: #888; }
.activity-points { font-size: 13px; font-weight: 600; color: #4caf50; flex-shrink: 0; }

.input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; font-family: inherit; }
.input:focus { outline: none; border-color: #E08E6B; }
.error-message { background: #ffebee; color: #c62828; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-top: 8px; }
.btn-primary { background: #E08E6B; color: #fff; padding: 10px 20px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; font-size: 14px; transition: opacity 0.2s; white-space: nowrap; }
.btn-primary:hover { opacity: 0.9; }
.btn-cancel { background: #f5f5f5; color: #555; border: none; border-radius: 8px; padding: 10px 16px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.btn-cancel:hover { background: #eee; }
.delete-btn { background: none; border: none; color: #ccc; cursor: pointer; padding: 4px; transition: color 0.2s; }
.delete-btn:hover { color: #e53935; }

@media (max-width: 768px) {
  .middle-grid { grid-template-columns: 1fr; }
  .bottom-grid { grid-template-columns: 1fr; }
  .goal-form-row { flex-direction: column; }
}
</style>
