<template>
  <div class="dashboard-calendar">
    <h1>Calendario</h1>
    <p class="subtitle">Planifica tus actividades y desafíos</p>

    <div class="calendar-card">
      <div class="calendar-header">
        <button class="nav-btn" @click="prevMonth"><font-awesome-icon icon="chevron-left" /></button>
        <h2>{{ monthName }} {{ currentYear }}</h2>
        <button class="nav-btn" @click="nextMonth"><font-awesome-icon icon="chevron-right" /></button>
      </div>

      <div class="calendar-grid">
        <div class="day-header" v-for="day in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']" :key="day">{{ day }}</div>
        <div
          class="calendar-day"
          v-for="day in calendarDays"
          :key="day.date"
          :class="{ 'other-month': day.otherMonth, 'today': day.isToday, 'has-event': day.hasEvent }"
          @click="openDay(day)"
        >
          <span class="day-number">{{ day.dateNum }}</span>
          <span v-if="day.hasEvent" class="event-dot"></span>
        </div>
      </div>
    </div>

    <div v-if="selectedDay" class="overlay" @click.self="selectedDay = null">
      <div class="modal">
        <button class="close" @click="selectedDay = null">X</button>
        <h3>{{ formatSelectedDate }}</h3>

        <div v-if="dayEvents.length > 0" class="events-list">
          <div class="event-item" v-for="event in dayEvents" :key="event.id">
            <div v-if="editingId === event.id" class="edit-form">
              <input v-model="editTitle" type="text" class="input" placeholder="Titulo" />
              <textarea v-model="editDescription" class="input textarea" placeholder="Descripcion (opcional)"></textarea>
              <div class="time-row">
                <div class="time-field">
                  <label>Inicio</label>
                  <input v-model="editStartTime" type="time" class="input" />
                </div>
                <div class="time-field">
                  <label>Fin</label>
                  <input v-model="editEndTime" type="time" class="input" />
                </div>
              </div>
              <div class="edit-actions">
                <button class="btn-save" @click="saveEdit(event.id)" :disabled="saving">{{ saving ? '...' : 'Guardar' }}</button>
                <button class="btn-cancel" @click="editingId = null">Cancelar</button>
              </div>
            </div>
            <template v-else>
              <div class="event-info">
                <span class="event-title">{{ event.title }}</span>
                <span v-if="event.start_time" class="event-time">
                  <font-awesome-icon icon="clock" />
                  {{ event.start_time.slice(0,5) }}{{ event.end_time ? ' - ' + event.end_time.slice(0,5) : '' }}
                </span>
                <span v-if="event.description" class="event-desc">{{ event.description }}</span>
              </div>
              <div class="event-actions">
                <button class="edit-btn" @click="startEdit(event)"><font-awesome-icon icon="pen" /></button>
                <button class="delete-btn" @click="deleteEvent(event.id)"><font-awesome-icon icon="trash" /></button>
              </div>
            </template>
          </div>
        </div>
        <p v-else class="no-events">No hay eventos este dia</p>

        <div class="new-event-form">
          <h4>Anadir evento</h4>
          <input v-model="newTitle" type="text" placeholder="Titulo del evento" class="input" />
          <textarea v-model="newDescription" placeholder="Descripcion (opcional)" class="input textarea"></textarea>
          <div class="time-row">
            <div class="time-field">
              <label>Inicio</label>
              <input v-model="newStartTime" type="time" class="input" />
            </div>
            <div class="time-field">
              <label>Fin</label>
              <input v-model="newEndTime" type="time" class="input" />
            </div>
          </div>
          <div v-if="formError" class="error-message">{{ formError }}</div>
          <button class="btn-primary" @click="addEvent" :disabled="saving">
            {{ saving ? 'Guardando...' : 'Anadir evento' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const today = new Date()
const currentMonth = ref(today.getMonth())
const currentYear = ref(today.getFullYear())
const events = ref([])
const selectedDay = ref(null)
const newTitle = ref('')
const newDescription = ref('')
const newStartTime = ref('')
const newEndTime = ref('')
const saving = ref(false)
const formError = ref('')
const editingId = ref(null)
const editTitle = ref('')
const editDescription = ref('')
const editStartTime = ref('')
const editEndTime = ref('')

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const monthName = computed(() => monthNames[currentMonth.value])

const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)

  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(currentYear.value, currentMonth.value, -i)
    days.push({ date: formatDate(d), dateNum: d.getDate(), otherMonth: true, isToday: false, hasEvent: false })
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(currentYear.value, currentMonth.value, i)
    const dateStr = formatDate(d)
    days.push({
      date: dateStr, dateNum: i, otherMonth: false,
      isToday: dateStr === formatDate(today),
      hasEvent: events.value.some(e => e.date === dateStr)
    })
  }

  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear.value, currentMonth.value + 1, i)
      days.push({ date: formatDate(d), dateNum: d.getDate(), otherMonth: true, isToday: false, hasEvent: false })
    }
  }
  return days
})

const dayEvents = computed(() => {
  if (!selectedDay.value) return []
  return events.value
    .filter(e => e.date === selectedDay.value.date)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
})

const formatSelectedDate = computed(() => {
  if (!selectedDay.value) return ''
  const [year, month, day] = selectedDay.value.date.split('-')
  return `${day} de ${monthNames[parseInt(month) - 1]} de ${year}`
})

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function prevMonth() {
  if (currentMonth.value === 0) { currentMonth.value = 11; currentYear.value-- }
  else currentMonth.value--
}

function nextMonth() {
  if (currentMonth.value === 11) { currentMonth.value = 0; currentYear.value++ }
  else currentMonth.value++
}

function openDay(day) {
  if (day.otherMonth) return
  selectedDay.value = day
  newTitle.value = ''; newDescription.value = ''; newStartTime.value = ''; newEndTime.value = ''
  formError.value = ''; editingId.value = null
}

async function loadEvents() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data } = await supabase.from('events').select('*').eq('user_id', user.id)
  if (data) events.value = data
}

async function addEvent() {
  if (!newTitle.value.trim()) { formError.value = 'El titulo es obligatorio'; return }
  if (newStartTime.value && newEndTime.value && newEndTime.value <= newStartTime.value) {
    formError.value = 'La hora de fin debe ser posterior a la de inicio'; return
  }
  saving.value = true; formError.value = ''
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('events').insert({
    user_id: user.id, title: newTitle.value.trim(), description: newDescription.value.trim(),
    date: selectedDay.value.date, start_time: newStartTime.value || null, end_time: newEndTime.value || null
  }).select()
  if (error) { formError.value = 'Error al guardar el evento' }
  else { events.value.push(data[0]); newTitle.value = ''; newDescription.value = ''; newStartTime.value = ''; newEndTime.value = '' }
  saving.value = false
}

function startEdit(event) {
  editingId.value = event.id; editTitle.value = event.title
  editDescription.value = event.description || ''
  editStartTime.value = event.start_time ? event.start_time.slice(0, 5) : ''
  editEndTime.value = event.end_time ? event.end_time.slice(0, 5) : ''
}

async function saveEdit(id) {
  if (!editTitle.value.trim()) return
  saving.value = true
  const { error } = await supabase.from('events').update({
    title: editTitle.value.trim(), description: editDescription.value.trim(),
    start_time: editStartTime.value || null, end_time: editEndTime.value || null
  }).eq('id', id)
  if (!error) {
    const event = events.value.find(e => e.id === id)
    if (event) {
      event.title = editTitle.value.trim(); event.description = editDescription.value.trim()
      event.start_time = editStartTime.value || null; event.end_time = editEndTime.value || null
    }
    editingId.value = null
  }
  saving.value = false
}

async function deleteEvent(id) {
  await supabase.from('events').delete().eq('id', id)
  events.value = events.value.filter(e => e.id !== id)
}

onMounted(loadEvents)
</script>

<style scoped>
.dashboard-calendar { max-width: 800px; margin: 0 auto; }
h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 8px; }
.subtitle { color: #666; margin-bottom: 32px; }
.calendar-card { background: #fff; border-radius: 20px; padding: 24px; box-shadow: 0 2px 20px rgba(0,0,0,0.05); }
.calendar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.calendar-header h2 { font-size: 20px; color: #1a1a2e; }
.nav-btn { width: 40px; height: 40px; border-radius: 10px; border: none; background: #f5f5f5; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease; }
.nav-btn:hover { background: #E08E6B; color: #fff; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
.day-header { text-align: center; font-size: 13px; font-weight: 600; color: #888; padding: 8px; }
.calendar-day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12px; position: relative; cursor: pointer; transition: all 0.2s ease; }
.calendar-day:hover:not(.other-month) { background: #f5f5f5; }
.calendar-day.other-month { color: #ccc; cursor: default; }
.calendar-day.today { background: #E08E6B; color: #fff; }
.calendar-day.today:hover { background: #d07a5a; }
.day-number { font-size: 14px; font-weight: 500; }
.event-dot { width: 6px; height: 6px; border-radius: 50%; background: #4CAF50; position: absolute; bottom: 6px; }
.calendar-day.today .event-dot { background: #fff; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal { background: #fff; padding: 32px; width: 460px; max-width: 90vw; border-radius: 20px; position: relative; max-height: 90vh; overflow-y: auto; }
.close { position: absolute; top: 12px; right: 12px; background: transparent; border: none; font-size: 20px; cursor: pointer; opacity: 0.6; }
.close:hover { opacity: 1; }
.modal h3 { font-size: 18px; color: #1a1a2e; margin-bottom: 16px; }
.events-list { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
.event-item { display: flex; align-items: flex-start; justify-content: space-between; background: #f9f9f9; padding: 12px 16px; border-radius: 10px; gap: 8px; }
.event-info { display: flex; flex-direction: column; gap: 3px; flex: 1; }
.event-title { font-size: 14px; font-weight: 600; color: #1a1a2e; }
.event-time { font-size: 12px; color: #E08E6B; font-weight: 500; display: flex; align-items: center; gap: 4px; }
.event-desc { font-size: 12px; color: #888; }
.event-actions { display: flex; gap: 6px; flex-shrink: 0; }
.edit-btn { background: none; border: none; color: #ccc; cursor: pointer; padding: 4px; transition: color 0.2s; }
.edit-btn:hover { color: #E08E6B; }
.delete-btn { background: none; border: none; color: #ccc; cursor: pointer; padding: 4px; transition: color 0.2s; }
.delete-btn:hover { color: #e53935; }
.edit-form { width: 100%; display: flex; flex-direction: column; gap: 6px; }
.edit-actions { display: flex; gap: 8px; }
.btn-save { background: #E08E6B; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel { background: #f5f5f5; color: #555; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; cursor: pointer; transition: background 0.2s; }
.btn-cancel:hover { background: #eee; }
.no-events { color: #aaa; font-size: 14px; margin-bottom: 20px; }
.new-event-form h4 { font-size: 15px; color: #1a1a2e; margin-bottom: 12px; }
.time-row { display: flex; gap: 12px; }
.time-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.time-field label { font-size: 12px; color: #888; font-weight: 500; }
.input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; margin-bottom: 10px; box-sizing: border-box; font-family: inherit; }
.input:focus { outline: none; border-color: #E08E6B; }
.textarea { resize: vertical; min-height: 70px; }
.error-message { background: #ffebee; color: #c62828; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 10px; }
.btn-primary { background: #E08E6B; color: #fff; padding: 12px; border-radius: 8px; width: 100%; font-weight: 600; border: none; cursor: pointer; font-size: 14px; transition: opacity 0.2s; margin-top: 4px; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
