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

  // días del mes anterior para rellenar
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

    // estado del día según sesiones
    let status = null
    if (sessions.length > 0) {
      const allDone = sessions.every(s => s.done)
      status = allDone ? 'done' : 'partial'
    }

    // colores de hasta 3 hobbies distintos ese día
    const hobbyIds = [...new Set(sessions.map(s => s.hobby_id))].slice(0, 3)
    const hobbyColors = hobbyIds.map(id => {
      const h = props.hobbies.find(h => h.id === id)
      return h && Array.isArray(h.gradient) ? h.gradient[0] : '#ff6b9d'
    })

    out.push({ date: ds, num: i, other: false, status, hasEvent, hobbyColors, isToday: ds === todayStr })
  }

  // rellenar hasta completar la última semana
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
      <span class="lg-item"><span class="lg-sq event"></span>Evento</span>
    </div>

  </div>
</template>

<style scoped>
.cg-card {
  background: #fff; border-radius: 20px; padding: 20px;
  box-shadow: 0 2px 16px rgba(34,40,78,.07);
  border: 1px solid rgba(34,40,78,.05);
  margin-bottom: 16px;
}

.cg-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 18px;
}
.cg-month { font-size: 17px; font-weight: 800; color: #22284E; }
.cg-nav {
  width: 34px; height: 34px; border-radius: 10px;
  background: rgba(34,40,78,.05); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #22284E; transition: background .2s;
}
.cg-nav:hover { background: rgba(255,107,157,.12); color: #ff6b9d; }

.cg-labels {
  display: grid; grid-template-columns: repeat(7, 1fr);
  margin-bottom: 6px;
}
.cg-labels span {
  text-align: center; font-size: 11px; font-weight: 700;
  color: rgba(34,40,78,.35); letter-spacing: .04em;
}

.cg-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
}

.cg-day {
  position: relative;
  aspect-ratio: 1; border-radius: 10px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  cursor: pointer; transition: background .15s;
  gap: 2px;
}
.cg-day:hover:not(.other) { background: rgba(34,40,78,.05); }
.cg-day.other { opacity: .25; pointer-events: none; }

.cg-day.done    { background: rgba(34,197,94,.12); }
.cg-day.partial { background: rgba(255,107,157,.1); }
.cg-day.today   { background: #22284E; }
.cg-day.today .cg-num { color: #ff6b9d; }
.cg-day.selected:not(.today) { outline: 2px solid #ff6b9d; }

.cg-num { font-size: 13px; font-weight: 600; color: #22284E; line-height: 1; }

.cg-dots { display: flex; gap: 2px; }
.cg-dot  { width: 5px; height: 5px; border-radius: 50%; }

.cg-event-dot {
  position: absolute; bottom: 3px; right: 5px;
  width: 5px; height: 5px; border-radius: 50%; background: #f59e0b;
}

.cg-legend {
  display: flex; gap: 16px; justify-content: center;
  margin-top: 14px; padding-top: 12px;
  border-top: 1px solid rgba(34,40,78,.06);
}
.lg-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(34,40,78,.5); }
.lg-sq { width: 10px; height: 10px; border-radius: 3px; }
.lg-sq.done    { background: rgba(34,197,94,.4); }
.lg-sq.partial { background: rgba(255,107,157,.35); }
.lg-sq.event   { background: #f59e0b; }
</style>