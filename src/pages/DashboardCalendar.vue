<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import CalendarGrid     from '../components/calendar/CalendarGrid.vue'
import CalendarDayPanel from '../components/calendar/CalendarDayPanel.vue'
import CalendarFilter   from '../components/calendar/CalendarFilter.vue'

/* ── state ─────────────────────────────────────────── */
const today        = new Date()
const currentMonth = ref(today.getMonth())
const currentYear  = ref(today.getFullYear())
const selectedDate = ref(null)          // 'YYYY-MM-DD'
const filterHobby  = ref(null)          // hobby id o null = todos
const userId       = ref(null)

const hobbies  = ref([])   // hobbies del usuario
const sessions = ref([])   // hobby_sessions
const events   = ref([])   // eventos del calendario

/* ── cargar datos ───────────────────────────────────── */
async function load() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  userId.value = user.id

  const [{ data: hData }, { data: sData }, { data: eData }] = await Promise.all([
    supabase.from('hobbies').select('id, name, gradient').eq('user_id', user.id),
    supabase.from('hobby_sessions').select('*').eq('user_id', user.id),
    supabase.from('events').select('*').eq('user_id', user.id),
  ])
  if (hData) hobbies.value  = hData
  if (sData) sessions.value = sData
  if (eData) events.value   = eData
}

/* ── sesiones del día seleccionado ─────────────────── */
const daySessions = computed(() => {
  if (!selectedDate.value) return []
  return sessions.value.filter(s =>
    new Date(s.created_at).toDateString() === new Date(selectedDate.value).toDateString()
  )
})

/* ── eventos del día seleccionado ───────────────────── */
const dayEvents = computed(() => {
  if (!selectedDate.value) return []
  return events.value.filter(e => e.date === selectedDate.value)
})

/* ── dots por día (para el grid) ────────────────────── */
const sessionsByDate = computed(() => {
  const map = {}
  sessions.value.forEach(s => {
    if (filterHobby.value && s.hobby_id !== filterHobby.value) return
    const d = new Date(s.created_at).toISOString().split('T')[0]
    if (!map[d]) map[d] = []
    map[d].push(s)
  })
  return map
})

const eventsByDate = computed(() => {
  const map = {}
  events.value.forEach(e => {
    if (!map[e.date]) map[e.date] = []
    map[e.date].push(e)
  })
  return map
})

/* ── navegación ─────────────────────────────────────── */
function prevMonth() {
  if (currentMonth.value === 0) { currentMonth.value = 11; currentYear.value-- }
  else currentMonth.value--
}
function nextMonth() {
  if (currentMonth.value === 11) { currentMonth.value = 0; currentYear.value++ }
  else currentMonth.value++
}

/* ── handlers ───────────────────────────────────────── */
function onDayClick(dateStr) {
  selectedDate.value = selectedDate.value === dateStr ? null : dateStr
}

async function onAddEvent(ev) {
  const { data } = await supabase.from('events').insert({
    user_id: userId.value, ...ev
  }).select()
  if (data) events.value.push(data[0])
}

async function onDeleteEvent(id) {
  await supabase.from('events').delete().eq('id', id)
  events.value = events.value.filter(e => e.id !== id)
}

async function onToggleSession(sessionId, done) {
  // marca/desmarca una sesión como completada (campo done)
  await supabase.from('hobby_sessions').update({ done }).eq('id', sessionId)
  const s = sessions.value.find(s => s.id === sessionId)
  if (s) s.done = done
}

onMounted(load)
</script>

<template>
  <div class="cal-page">

    <div class="page-head">
      <div>
        <h1 class="page-title">Calendario</h1>
        <p class="page-sub">Registra y visualiza tu progreso</p>
      </div>
    </div>

    <!-- Filtro por hobby -->
    <CalendarFilter
      :hobbies="hobbies"
      :active="filterHobby"
      @change="filterHobby = $event"
    />

    <!-- Grid del mes -->
    <CalendarGrid
      :month="currentMonth"
      :year="currentYear"
      :selected-date="selectedDate"
      :sessions-by-date="sessionsByDate"
      :events-by-date="eventsByDate"
      :hobbies="hobbies"
      :filter-hobby="filterHobby"
      @prev="prevMonth"
      @next="nextMonth"
      @day-click="onDayClick"
    />

    <!-- Panel inferior del día -->
    <CalendarDayPanel
      v-if="selectedDate"
      :date="selectedDate"
      :sessions="daySessions"
      :events="dayEvents"
      :hobbies="hobbies"
      @add-event="onAddEvent"
      @delete-event="onDeleteEvent"
      @toggle-session="onToggleSession"
    />

  </div>
</template>

<style scoped>
.cal-page { max-width: 700px; margin: 0 auto; }
.page-head { margin-bottom: 20px; }
.page-title { font-size: 26px; font-weight: 900; color: #22284E; letter-spacing: -1px; margin: 0 0 4px; }
.page-sub   { font-size: 13px; color: rgba(34,40,78,.45); margin: 0; }
</style>