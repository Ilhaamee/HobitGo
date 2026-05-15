<template>
  <div class="dashboard-home">
    <div class="greeting">
      <h1>{{ greeting }}, {{ username }} 👋</h1>
      <p class="subtitle">{{ t('home_subtitle') }}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon challenges"><font-awesome-icon icon="trophy" /></div>
        <div class="stat-info"><span class="stat-value">{{ stats.challenges }}</span><span class="stat-label">{{ t('active_challenges') }}</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon hobbies"><font-awesome-icon icon="heart" /></div>
        <div class="stat-info"><span class="stat-value">{{ stats.hobbies }}</span><span class="stat-label">{{ t('hobbies') }}</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon events"><font-awesome-icon icon="calendar" /></div>
        <div class="stat-info"><span class="stat-value">{{ stats.events }}</span><span class="stat-label">{{ t('events_this_month') }}</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon points"><font-awesome-icon icon="star" /></div>
        <div class="stat-info"><span class="stat-value">{{ stats.points }}</span><span class="stat-label">{{ t('total_points') }}</span></div>
      </div>
    </div>

    <div class="middle-grid">
      <div class="section-card streak-card">
        <div class="streak-header">
          <div class="streak-flame">🔥</div>
          <div><h2>{{ t('current_streak') }}</h2><p class="streak-sub">{{ t('consecutive_days') }}</p></div>
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
        <h2>📊 {{ t('activity_this_week') }}</h2>
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

    <div class="section-card goals-section">
      <div class="goals-header">
        <h2>🎯 {{ t('my_challenges') }}</h2>
        <button class="btn-add" @click="showGoalForm = !showGoalForm">
          <font-awesome-icon icon="plus" /> {{ t('new_challenge') }}
        </button>
      </div>

      <div v-if="showGoalForm" class="goal-form">
        <input v-model="newGoalTitle" type="text" class="input" :placeholder="t('add_challenge_placeholder')" />
        <div class="goal-form-row">
          <div class="form-field">
            <label>{{ t('duration_label') }}</label>
            <input v-model.number="newGoalDays" type="number" min="30" class="input" placeholder="30" />
          </div>
          <div class="form-actions">
            <button class="btn-primary" @click="addGoal" :disabled="savingGoal">{{ savingGoal ? t('saving') : t('start_challenge') }}</button>
            <button class="btn-cancel" @click="showGoalForm = false">{{ t('cancel') }}</button>
          </div>
        </div>
        <div v-if="goalError" class="error-message">{{ goalError }}</div>
      </div>

      <div v-if="goals.length > 0" class="goals-list">
        <div v-for="goal in goals" :key="goal.id" class="goal-item" :class="{ completed: goal.completed }">
          <div class="goal-top">
            <div class="goal-title-row">
              <span class="goal-title">{{ goal.title }}</span>
              <span v-if="goal.completed" class="completed-badge">{{ t('completed_badge') }}</span>
              <span v-else-if="checkedInToday(goal)" class="done-today-badge">{{ t('done_today') }}</span>
            </div>
            <button class="delete-btn" @click="deleteGoal(goal.id)"><font-awesome-icon icon="trash" /></button>
          </div>
          <div class="goal-progress">
            <div class="progress-info">
              <span class="progress-days">{{ t('day_of').replace('{current}', goal.current_day).replace('{total}', goal.total_days) }}</span>
              <span class="progress-pct">{{ Math.round((goal.current_day / goal.total_days) * 100) }}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" :style="{ width: (goal.current_day / goal.total_days * 100) + '%' }" :class="{ completed: goal.completed }"></div></div>
          </div>
          <div class="days-grid">
            <div v-for="d in goal.total_days" :key="d" class="day-dot" :class="{ done: d <= goal.current_day, current: d === goal.current_day + 1, completed: goal.completed }" :title="`Day ${d}`"></div>
          </div>
          <button v-if="!goal.completed && !checkedInToday(goal)" class="btn-checkin" @click="checkIn(goal)">
            ✅ {{ t('mark_day').replace('{day}', goal.current_day + 1) }}
          </button>
          <p v-else-if="!goal.completed && checkedInToday(goal)" class="checkin-done">{{ t('come_back_tomorrow') }}</p>
        </div>
      </div>
      <p v-else class="empty-text">{{ t('no_challenges') }}</p>
    </div>

    <div class="bottom-grid">
      <div class="section-card">
        <h2>{{ t('upcoming_events') }}</h2>
        <div v-if="upcomingEvents.length > 0" class="events-list">
          <div class="event-item" v-for="event in upcomingEvents" :key="event.id">
            <div class="event-date"><span class="event-day">{{ getDay(event.date) }}</span><span class="event-month">{{ getMonth(event.date) }}</span></div>
            <div class="event-info">
              <span class="event-title">{{ event.title }}</span>
              <span v-if="event.start_time" class="event-time">{{ event.start_time.slice(0,5) }}{{ event.end_time ? ' - ' + event.end_time.slice(0,5) : '' }}</span>
            </div>
          </div>
        </div>
        <p v-else class="empty-text">{{ t('no_upcoming_events') }}</p>
      </div>

      <div class="section-card">
        <h2>{{ t('recent_activity') }}</h2>
        <div v-if="recentActivity.length > 0" class="activity-list">
          <div class="activity-item" v-for="item in recentActivity" :key="item.id">
            <div class="activity-icon" :class="item.type"><font-awesome-icon :icon="getActivityIcon(item.type)" /></div>
            <div class="activity-content"><p class="activity-title">{{ item.title }}</p><span class="activity-time">{{ timeAgo(item.created_at) }}</span></div>
            <span v-if="item.points > 0" class="activity-points">+{{ item.points }} pts</span>
          </div>
        </div>
        <p v-else class="empty-text">{{ t('no_recent_activity') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useI18n } from '../composables/useI18n'

const { t, currentLang } = useI18n()

const today = new Date()
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

const monthNames = { es: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'], en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] }
const dayLabels = { es: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] }

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return t('good_morning')
  if (h < 20) return t('good_afternoon')
  return t('good_evening')
})
const maxWeekly = computed(() => Math.max(1, ...weeklyData.value.map(d => d.count)))
const streakMessage = computed(() => {
  if (streak.value === 0) return currentLang.value === 'en' ? 'Start your streak today 💪' : 'Empieza hoy tu racha 💪'
  if (streak.value < 3) return currentLang.value === 'en' ? 'Good start, keep going!' : '¡Buen comienzo, sigue así!'
  if (streak.value < 7) return currentLang.value === 'en' ? "You're doing great, don't stop!" : '¡Vas muy bien, no pares!'
  if (streak.value < 30) return currentLang.value === 'en' ? 'Incredible streak! 🔥' : '¡Increíble racha! 🔥'
  return currentLang.value === 'en' ? 'Absolute legend! 🏆' : '¡Leyenda absoluta! 🏆'
})

function getDay(date) { return date.split('-')[2] }
function getMonth(date) { return (monthNames[currentLang.value] || monthNames.es)[parseInt(date.split('-')[1]) - 1] }
function getActivityIcon(type) { return { event: 'calendar', hobby: 'heart', challenge: 'trophy', message: 'comments' }[type] || 'star' }
function formatDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  const en = currentLang.value === 'en'
  if (mins < 1) return en ? 'Just now' : 'Ahora mismo'
  if (mins < 60) return en ? `${mins} min ago` : `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return en ? `${hours}h ago` : `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return en ? 'Yesterday' : 'Ayer'
  return en ? `${days} days ago` : `Hace ${days} días`
}
function checkedInToday(goal) { return goal.last_checked_in === formatDate(new Date()) }
function calculateStreak(activityDates) {
  if (!activityDates?.length) return 0
  const today = formatDate(new Date())
  const dateSet = new Set(activityDates.map(a => a.activity_date))
  let count = 0; let current = new Date()
  if (!dateSet.has(today)) current.setDate(current.getDate() - 1)
  while (true) { const d = formatDate(current); if (dateSet.has(d)) { count++; current.setDate(current.getDate() - 1) } else break }
  return count
}
function buildLast7Days(activityDates) {
  const dateSet = new Set((activityDates || []).map(a => a.activity_date))
  const labels = dayLabels[currentLang.value] || dayLabels.es
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i))
    return { label: labels[d.getDay()], active: dateSet.has(formatDate(d)), isToday: i === 6 }
  })
}
function buildWeeklyData(activityDates) {
  const labels = dayLabels[currentLang.value] || dayLabels.es
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i))
    const dateStr = formatDate(d)
    return { label: labels[d.getDay()], count: (activityDates || []).filter(a => a.activity_date === dateStr).length, isToday: i === 6 }
  })
}

async function loadGoals() {
  const { data } = await supabase.from('goals').select('*').eq('user_id', currentUser.value.id).order('created_at', { ascending: false })
  if (data) goals.value = data
}

async function addGoal() {
  if (!newGoalTitle.value.trim()) { goalError.value = t('title_required'); return }
  if (newGoalDays.value < 30) { goalError.value = t('min_days_error'); return }
  savingGoal.value = true; goalError.value = ''
  const { data, error } = await supabase.from('goals').insert({ user_id: currentUser.value.id, title: newGoalTitle.value.trim(), total_days: newGoalDays.value, current_day: 0 }).select()
  if (error) { goalError.value = t('error_saving') }
  else { goals.value.unshift(data[0]); newGoalTitle.value = ''; newGoalDays.value = 30; showGoalForm.value = false }
  savingGoal.value = false
}

async function checkIn(goal) {
  const newDay = goal.current_day + 1
  const completed = newDay >= goal.total_days
  const todayStr = formatDate(new Date())
  await supabase.from('goals').update({ current_day: newDay, last_checked_in: todayStr, completed }).eq('id', goal.id)
  goal.current_day = newDay; goal.last_checked_in = todayStr; goal.completed = completed
  await supabase.from('activity_log').insert({ user_id: currentUser.value.id, type: 'challenge', title: `Day ${newDay} of "${goal.title}"`, points: completed ? 500 : 10, activity_date: todayStr })
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

  const todayStr = formatDate(new Date())
  const { data: events } = await supabase.from('events').select('*').eq('user_id', user.id).gte('date', todayStr).order('date', { ascending: true }).limit(5)
  if (events) upcomingEvents.value = events

  const firstDay = formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const lastDay = formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
  const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('date', firstDay).lte('date', lastDay)
  stats.value.events = eventsCount || 0

  const { count: hobbiesCount } = await supabase.from('hobbies').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  stats.value.hobbies = hobbiesCount || 0

  const { data: activity } = await supabase.from('activity_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
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

  const { count: goalsCount } = await supabase.from('goals').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', false)
  stats.value.challenges = goalsCount || 0

  const { count: streakCount } = await supabase.from('goals').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true)
  streak.value = streakCount || 0

  await loadGoals()
}

onMounted(loadData)
</script>

<style scoped>
.dashboard-home { max-width: 1000px; margin: 0 auto; }
.greeting { margin-bottom: 32px; }
h1 { font-size: 28px; color: var(--text-primary); margin-bottom: 8px; }
.subtitle { color: var(--text-secondary); }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 10px var(--shadow); }
.stat-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.stat-icon.challenges { background: #fff3e0; color: #ff9800; }
.stat-icon.hobbies { background: #fce4ec; color: #e91e63; }
.stat-icon.events { background: #e3f2fd; color: #2196f3; }
.stat-icon.points { background: #e8f5e9; color: #4caf50; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: 13px; color: var(--text-secondary); }
.middle-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; margin-bottom: 24px; }
.section-card { background: var(--bg-card); border-radius: 16px; padding: 24px; box-shadow: 0 2px 10px var(--shadow); }
.section-card h2 { font-size: 16px; color: var(--text-primary); margin-bottom: 20px; }
.streak-card { display: flex; flex-direction: column; }
.streak-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.streak-flame { font-size: 32px; }
.streak-header h2 { margin-bottom: 2px; }
.streak-sub { font-size: 12px; color: var(--text-muted); margin: 0; }
.streak-number { font-size: 56px; font-weight: 800; color: #E08E6B; text-align: center; line-height: 1; margin-bottom: 20px; }
.streak-days { display: flex; justify-content: space-between; margin-bottom: 12px; }
.streak-day { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.streak-dot { width: 28px; height: 28px; border-radius: 50%; background: var(--bg-hover); transition: background 0.2s; }
.streak-day.active .streak-dot { background: #E08E6B; }
.streak-day.today .streak-dot { border: 2px solid #E08E6B; }
.streak-label { font-size: 11px; color: var(--text-muted); }
.streak-msg { text-align: center; font-size: 13px; color: var(--text-muted); margin: 0; }
.chart { display: flex; align-items: flex-end; height: 160px; }
.chart-bars { display: flex; align-items: flex-end; gap: 8px; width: 100%; height: 100%; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; justify-content: flex-end; height: 100%; }
.bar-wrapper { flex: 1; display: flex; align-items: flex-end; width: 100%; }
.bar { width: 100%; border-radius: 6px 6px 0 0; background: var(--bg-hover); transition: height 0.4s ease; min-height: 4px; }
.bar.active { background: #E08E6B; }
.bar.today { background: #22284E; }
.bar-label { font-size: 11px; color: var(--text-muted); }
.bar-count { font-size: 11px; font-weight: 700; color: #E08E6B; }
.goals-section { margin-bottom: 24px; }
.goals-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.goals-header h2 { margin-bottom: 0; }
.btn-add { display: flex; align-items: center; gap: 6px; background: #E08E6B; color: #fff; border: none; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-add:hover { opacity: 0.9; }
.goal-form { background: var(--bg-hover); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.goal-form-row { display: flex; gap: 12px; align-items: flex-end; margin-top: 10px; }
.form-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.form-field label { font-size: 12px; color: var(--text-muted); font-weight: 500; }
.form-actions { display: flex; gap: 8px; }
.goals-list { display: flex; flex-direction: column; gap: 16px; }
.goal-item { background: var(--bg-hover); border-radius: 14px; padding: 16px; border-left: 4px solid #E08E6B; }
.goal-item.completed { border-left-color: #4caf50; opacity: 0.8; }
.goal-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.goal-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.goal-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.completed-badge { background: #e8f5e9; color: #4caf50; font-size: 12px; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
.done-today-badge { background: #e3f2fd; color: #2196f3; font-size: 12px; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
.goal-progress { margin-bottom: 12px; }
.progress-info { display: flex; justify-content: space-between; margin-bottom: 6px; }
.progress-days { font-size: 13px; color: var(--text-secondary); }
.progress-pct { font-size: 13px; font-weight: 700; color: #E08E6B; }
.progress-bar { height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: #E08E6B; border-radius: 4px; transition: width 0.4s ease; }
.progress-fill.completed { background: #4caf50; }
.days-grid { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 14px; }
.day-dot { width: 14px; height: 14px; border-radius: 3px; background: var(--border-color); }
.day-dot.done { background: #E08E6B; }
.day-dot.current { background: transparent; border: 2px solid #E08E6B; }
.day-dot.completed { background: #4caf50; }
.btn-checkin { width: 100%; padding: 10px; background: #E08E6B; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-checkin:hover { opacity: 0.9; }
.checkin-done { text-align: center; font-size: 13px; color: #2196f3; margin: 0; padding: 8px; background: #e3f2fd; border-radius: 8px; }
.bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.empty-text { color: var(--text-muted); font-size: 14px; text-align: center; padding: 20px 0; }
.events-list { display: flex; flex-direction: column; gap: 12px; }
.event-item { display: flex; align-items: center; gap: 14px; padding: 10px; border-radius: 10px; background: var(--bg-hover); }
.event-date { display: flex; flex-direction: column; align-items: center; background: #E08E6B; color: #fff; border-radius: 8px; padding: 6px 10px; min-width: 44px; flex-shrink: 0; }
.event-day { font-size: 18px; font-weight: 700; line-height: 1; }
.event-month { font-size: 11px; text-transform: uppercase; }
.event-info { display: flex; flex-direction: column; gap: 2px; }
.event-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.event-time { font-size: 12px; color: var(--text-muted); }
.activity-list { display: flex; flex-direction: column; gap: 12px; }
.activity-item { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; background: var(--bg-hover); }
.activity-icon { width: 36px; height: 36px; border-radius: 10px; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.activity-icon.event { background: #2196f3; }
.activity-icon.hobby { background: #e91e63; }
.activity-icon.challenge { background: #ff9800; }
.activity-icon.message { background: #9c27b0; }
.activity-content { flex: 1; }
.activity-title { font-size: 13px; color: var(--text-primary); margin: 0 0 2px; }
.activity-time { font-size: 12px; color: var(--text-muted); }
.activity-points { font-size: 13px; font-weight: 600; color: #4caf50; flex-shrink: 0; }
.input { width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); border-radius: 8px; font-size: 14px; box-sizing: border-box; font-family: inherit; background: var(--bg-secondary); color: var(--text-primary); }
.input:focus { outline: none; border-color: #E08E6B; }
.error-message { background: #ffebee; color: #c62828; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-top: 8px; }
.btn-primary { background: #E08E6B; color: #fff; padding: 10px 20px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; font-size: 14px; }
.btn-primary:hover { opacity: 0.9; }
.btn-cancel { background: var(--bg-card); color: var(--text-secondary); border: none; border-radius: 8px; padding: 10px 16px; font-size: 13px; cursor: pointer; }
.delete-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
.delete-btn:hover { color: #e53935; }
@media (max-width: 768px) {
  .middle-grid { grid-template-columns: 1fr; }
  .bottom-grid { grid-template-columns: 1fr; }
  .goal-form-row { flex-direction: column; }
}
</style>