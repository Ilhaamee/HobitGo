<script setup>
import { computed } from 'vue'

const props = defineProps({
  month:          { type: Number, required: true },
  year:           { type: Number, required: true },
  selectedDate:   { type: String, default: null },
  sessionsByDate: { type: Object, default: () => ({}) },
  eventsByDate:   { type: Object, default: () => ({}) },
  hobbies:        { type: Array,  default: () => [] },
  filterHobby:    { type: String, default: null },
})
const emit = defineEmits(['prev', 'next', 'day-click'])

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_LABELS  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const todayStr = fmt(new Date())

const days = computed(() => {
  const first = new Date(props.year, props.month, 1)
  const last  = new Date(props.year, props.month + 1, 0)
  const out   = []

  let dow = first.getDay() - 1; if (dow < 0) dow = 6
  for (let i = dow - 1; i >= 0; i--) {
    const d = new Date(props.year, props.month, -i)
    out.push({ date: fmt(d), num: d.getDate(), other: true })
  }

  for (let i = 1; i <= last.getDate(); i++) {
    const d = new Date(props.year, props.month, i)
    const ds = fmt(d)
    const sessions = props.sessionsByDate[ds] || []
    const hasEvent = !!(props.eventsByDate[ds]?.length)

    let status = null
    if (sessions.length > 0) {
      const minsByHobby = {}
      sessions.forEach(s => {
        minsByHobby[s.hobby_id] = (minsByHobby[s.hobby_id] || 0) + (s.minutes || 0)
      })
      const dayEnd = new Date(ds + 'T23:59:59')
      const activeHobbies = props.hobbies.filter(h => new Date(h.created_at) <= dayEnd)
      const hobbiesWithSessions = activeHobbies.filter(h => minsByHobby[h.id] !== undefined)
      if (hobbiesWithSessions.length === 0) {
        status = 'partial'
      } else {
        const allMet = hobbiesWithSessions.every(h => {
          const goal = h.daily_minutes || 20
          return minsByHobby[h.id] >= goal
        })
        status = allMet ? 'done' : 'partial'
      }
    } else {
      const today = new Date(); today.setHours(0,0,0,0)
      const dayDate = new Date(ds + 'T00:00:00')
      const dayEnd  = new Date(ds + 'T23:59:59')

      // Si hay filtro activo — solo cuenta el hobby filtrado
      // Si no hay filtro — cuenta todos los hobbies
      const relevantHobbies = props.filterHobby
        ? props.hobbies.filter(h => h.id === props.filterHobby)
        : props.hobbies

      const hadHobbies = relevantHobbies.some(h => new Date(h.created_at) <= dayEnd)
      if (hadHobbies && dayDate < today) {
        status = 'missed'
      }
    }

    // colores de hasta 3 hobbies distintos ese día
    const hobbyIds = [...new Set(sessions.map(s => s.hobby_id))].slice(0, 3)
    const hobbyColors = hobbyIds.map(id => {
      const h = props.hobbies.find(h => h.id === id)
      return h && Array.isArray(h.gradient) ? h.gradient[0] : '#ff6b9d'
    })

    out.push({ date: ds, num: i, other: false, status, hasEvent, hobbyColors, isToday: ds === todayStr })
  }

  const rem = 7 - (out.length % 7)
  if (rem < 7) {
    for (let i = 1; i <= rem; i++) {
      const d = new Date(props.year, props.month + 1, i)
      out.push({ date: fmt(d), num: d.getDate(), other: true })
    }
  }
  return out
})
</script>

<template>
  <div class="cg-card">

    <!-- Cabecera mes -->
    <div class="cg-head">
      <button class="cg-nav" @click="emit('prev')">
        <svg viewBox="0 0 16 16" fill="none" width="14">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <span class="cg-month">{{ MONTH_NAMES[month] }} {{ year }}</span>
      <button class="cg-nav" @click="emit('next')">
        <svg viewBox="0 0 16 16" fill="none" width="14">
          <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- Leyenda días semana -->
    <div class="cg-labels">
      <span v-for="l in DAY_LABELS" :key="l">{{ l }}</span>
    </div>

    <!-- Grid días -->
    <div class="cg-grid">
      <div
        v-for="d in days" :key="d.date"
        class="cg-day"
        :class="{
          other:    d.other,
          today:    d.isToday,
          selected: selectedDate === d.date && !d.other,
          done:     d.status === 'done',
          partial:  d.status === 'partial',
          missed:   d.status === 'missed',
        }"
        @click="!d.other && emit('day-click', d.date)"
      >
        <span class="cg-num">{{ d.num }}</span>

        <!-- Puntos de hobbies -->
        <div v-if="d.hobbyColors?.length" class="cg-dots">
          <span
            v-for="(c, i) in d.hobbyColors" :key="i"
            class="cg-dot"
            :style="{ background: c }"
          ></span>
        </div>

        <!-- Punto de evento -->
        <span v-if="d.hasEvent && !d.other" class="cg-event-dot"></span>
      </div>
    </div>

    <!-- Leyenda colores -->
    <div class="cg-legend">
      <span class="lg-item"><span class="lg-sq done"></span>Completado</span>
      <span class="lg-item"><span class="lg-sq partial"></span>Parcial</span>
      <span class="lg-item"><span class="lg-sq missed"></span>Sin actividad</span>
      <span class="lg-item"><span class="lg-sq event"></span>Evento</span>
    </div>

  </div>
</template>

<style scoped>
.cg-card {
  background: #fff; border-radius: 16px; padding: 14px 8px;
  box-shadow: 0 2px 16px rgba(34,40,78,.07);
  border: 1px solid rgba(34,40,78,.05);
  margin-bottom: 12px;
  overflow: hidden;
}

.cg-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.cg-month { font-size: 16px; font-weight: 800; color: #22284E; }
.cg-nav {
  width: 32px; height: 32px; border-radius: 10px;
  background: rgba(34,40,78,.05); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #22284E; transition: background .2s; flex-shrink: 0;
}
.cg-nav:hover { background: rgba(255,107,157,.12); color: #ff6b9d; }

.cg-labels {
  display: grid; grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}
.cg-labels span {
  text-align: center; font-size: 10px; font-weight: 700;
  color: rgba(34,40,78,.35); letter-spacing: .02em;
}

.cg-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;
}

.cg-day {
  position: relative;
  aspect-ratio: 1; border-radius: 8px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  cursor: pointer; transition: background .15s;
  gap: 1px; min-width: 0;
}
.cg-day:hover:not(.other) { background: rgba(34,40,78,.05); }
.cg-day.other { opacity: .22; pointer-events: none; }

.cg-day.done    { background: rgba(34,197,94,.12); }
.cg-day.partial { background: rgba(245,158,11,.12); }
.cg-day.today   { background: #22284E; }
.cg-day.today .cg-num { color: #ff6b9d; }
.cg-day.selected:not(.today) { outline: 2px solid #ff6b9d; outline-offset: -1px; }

.cg-num { font-size: 12px; font-weight: 600; color: #22284E; line-height: 1; }

.cg-dots { display: flex; gap: 2px; flex-wrap: wrap; justify-content: center; }
.cg-dot  { width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0; }

.cg-event-dot {
  position: absolute; bottom: 2px; right: 3px;
  width: 4px; height: 4px; border-radius: 50%; background: #f59e0b;
}

.cg-legend {
  display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
  margin-top: 12px; padding-top: 10px;
  border-top: 1px solid rgba(34,40,78,.06);
}
.lg-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(34,40,78,.5); }
.lg-sq { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.lg-sq.done    { background: rgba(34,197,94,.4); }
.lg-sq.partial { background: rgba(245,158,11,.5); }
.lg-sq.event   { background: #f59e0b; }

.cg-day.missed { background: rgba(239,68,68,.1); }
.cg-day.missed .cg-num { color: rgba(239,68,68,.55); }
.lg-sq.missed  { background: rgba(239,68,68,.4); }

@media (min-width: 400px) {
  .cg-card { padding: 18px 16px; border-radius: 20px; }
  .cg-num  { font-size: 13px; }
  .cg-dot  { width: 5px; height: 5px; }
  .cg-labels span { font-size: 11px; }
}
</style>