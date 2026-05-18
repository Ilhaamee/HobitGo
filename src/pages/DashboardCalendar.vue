<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import CalendarGrid     from '../components/calendar/CalendarGrid.vue'
import CalendarDayPanel from '../components/calendar/CalendarDayPanel.vue'
import CalendarFilter   from '../components/calendar/CalendarFilter.vue'
import HabitUniverse    from '../components/calendar/Habituniverse.vue'

/* ── state ─────────────────────────────────────────── */
const today        = new Date()
const currentMonth = ref(today.getMonth())
const currentYear  = ref(today.getFullYear())
const selectedDate = ref(null)
const filterHobby  = ref(null)
const userId       = ref(null)

const hobbies  = ref([])
const sessions = ref([])
const events   = ref([])

/* ── cargar datos ───────────────────────────────────── */
async function load() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  userId.value = user.id

  const [{ data: hData }, { data: sData }, { data: eData }] = await Promise.all([
    supabase.from('hobbies').select('id, name, gradient, created_at, daily_minutes, total_days, completed_at').eq('user_id', user.id),
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
  await supabase.from('hobby_sessions').update({ done }).eq('id', sessionId)
  const s = sessions.value.find(s => s.id === sessionId)
  if (s) s.done = done
}

onMounted(load)
</script>

<<template>
  <div class="cal-page">

    <!-- ══ HEADER ESTILO CHAT ═══════════════════════════ -->
    <div class="cal-header">
      <div class="cal-title">
        <h1>Calendario <HabitUniverse :hobbies="hobbies" :sessions="sessions" inline /></h1>
        <p>Registra y visualiza tu progreso</p>
      </div>
    </div>

    <!-- Filtro por hobby -->
    <CalendarFilter
      :hobbies="hobbies"
      :active="filterHobby"
      @change="filterHobby = $event"
    />

    <!-- ══ CONTENIDO ORIGINAL (una columna) ══════════════ -->
    <div class="cal-body">
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

      <!-- Panel inferior del día (aparece al pulsar) -->
      <Transition name="slide-up">
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
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* ══ LAYOUT PRINCIPAL ═════════════════════════════════ */
.cal-page {
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
}

/* ── HEADER (igual que Chat) ── */
.cal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  flex-shrink: 0;
  padding-top: 8px;
}

.cal-title h1 {
  font-size: 26px;
  font-weight: 900;
  color: #22284E;
  letter-spacing: -1px;
  margin: 0 0 3px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.cal-title p {
  font-size: 13px;
  color: rgba(34,40,78,.45);
  margin: 0;
}

/* ── BODY (original, una columna) ── */
.cal-body {
  overflow-x: hidden;
  width: 100%;
}

/* Transición del panel */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Responsive */
@media (max-width: 768px) {
  .cal-page {
    padding: 0 12px 12px;
  }
  .cal-header {
    padding: 12px 4px;
    margin-bottom: 8px;
  }
  .desktop-only { display: none; }
  .mobile-only { display: flex; }
  .cal-body {
    flex-direction: column;
  }
  .cal-main {
    max-width: 100%;
  }
}

@media (min-width: 769px) {
  .mobile-only { display: none !important; }
}
</style>