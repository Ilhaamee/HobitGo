<template>
  <div class="heatmap-wrap">

    <div class="hm-header">
      <h4>{{ totalSessions }} sesiones este año</h4>
      <div class="hm-legend">
        <span>Menos</span>
        <div class="legend-cells">
          <div class="cell" :style="cellStyle(null)"></div>
          <div class="cell" :style="{ background: `rgba(${hexToRgb(color)}, 0.25)` }"></div>
          <div class="cell" :style="{ background: `rgba(${hexToRgb(color)}, 0.50)` }"></div>
          <div class="cell" :style="{ background: `rgba(${hexToRgb(color)}, 0.75)` }"></div>
          <div class="cell" :style="{ background: `rgba(${hexToRgb(color)}, 1)` }"></div>
        </div>
        <span>Más</span>
      </div>
    </div>

    <!-- Etiquetas de meses -->
    <div class="month-labels">
      <span v-for="m in monthLabels" :key="m.label" :style="{ left: m.pct + '%' }">
        {{ m.label }}
      </span>
    </div>

    <!-- Grid -->
    <div class="hm-scroll">
      <div class="hm-grid">

        <!-- Días semana -->
        <div class="day-labels">
          <span>L</span><span></span><span>X</span>
          <span></span><span>V</span><span></span><span>D</span>
        </div>

        <!-- Semanas -->
        <div class="weeks">
          <div class="week" v-for="(week, wi) in weeks" :key="wi">
            <div
              v-for="(day, di) in week"
              :key="di"
              class="cell"
              :class="[{ today: day?.isToday }]"
              :style="cellStyle(day)"
              :title="day ? `${day.date}: ${day.count} sesión${day.count !== 1 ? 'es' : ''}` : ''"
            ></div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sessions: { type: Array,  default: () => [] },
  color:    { type: String, default: '#ff6b9d' },
})

const dateMap = computed(() => {
  const map = {}
  props.sessions.forEach(s => {
    const d = new Date(s.created_at).toISOString().split('T')[0]
    map[d] = (map[d] || 0) + 1
  })
  return map
})

const totalSessions = computed(() => props.sessions.length)

const weeks = computed(() => {
  const today    = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Empezar el 1 de enero del año actual, en lunes
  const jan1  = new Date(today.getFullYear(), 0, 1)
  const start = new Date(jan1)
  // Retroceder al lunes anterior al 1 de enero
  const dow = jan1.getDay() // 0=Dom
  const diff = dow === 0 ? 6 : dow - 1
  start.setDate(jan1.getDate() - diff)

  const result = []
  let cur = new Date(start)

  while (cur <= today || result.length < 53) {
    // Si ya pasamos hoy y tenemos al menos 52 semanas, parar
    if (cur > today && result.length >= 52) break

    const week = []
    for (let d = 0; d < 7; d++) {
      const date    = new Date(cur)
      const dateStr = date.toISOString().split('T')[0]

      // Celdas fuera del año actual o futuras = null
      if (date.getFullYear() !== today.getFullYear() || date > today) {
        week.push(null)
      } else {
        const count = dateMap.value[dateStr] || 0
        const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4
        week.push({ date: dateStr, count, level, isToday: dateStr === todayStr })
      }
      cur.setDate(cur.getDate() + 1)
    }
    result.push(week)
  }

  return result
})

const monthLabels = computed(() => {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const labels  = []
  let lastMonth = -1
  const today   = new Date()

  weeks.value.forEach((week, wi) => {
    // Usar la primera celda real O calcular la fecha del inicio de la semana
    const first = week.find(d => d !== null)
    // Si todas son null (semanas futuras), calcular fecha manualmente
    const refDate = first
      ? new Date(first.date)
      : (() => {
          // Reconstruir fecha del inicio de la semana
          const jan1 = new Date(today.getFullYear(), 0, 1)
          const dow  = jan1.getDay()
          const diff = dow === 0 ? 6 : dow - 1
          const start = new Date(jan1)
          start.setDate(jan1.getDate() - diff + wi * 7)
          return start
        })()

    // Solo mostrar meses del año actual
    if (refDate.getFullYear() !== today.getFullYear()) return

    const m = refDate.getMonth()
    if (m !== lastMonth) {
      labels.push({ label: months[m], pct: wi === 0 ? 0 : (wi / weeks.value.length) * 100 })
      lastMonth = m
    }
  })
  return labels
}) 

// Color directo sin CSS vars
const OPACITIES = [0, 0.25, 0.50, 0.75, 1]

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  return `${r},${g},${b}`
}

function cellStyle(day) {
  if (!day || day.level === 0) return { background: 'rgba(34,40,78,0.07)' }
  const opacity = OPACITIES[day.level]
  const rgb     = hexToRgb(props.color)
  return { background: `rgba(${rgb}, ${opacity})` }
}
</script>

<style scoped>
.heatmap-wrap {
  background: #fff;
  border-radius: 18px; padding: 18px 16px;
  border: 1px solid rgba(34,40,78,.07);
  box-shadow: 0 2px 12px rgba(34,40,78,.05);
}

.hm-header {
  display: flex; justify-content: space-between;
  align-items: center; margin-bottom: 8px;
}
.hm-header h4 { font-size: 13px; font-weight: 700; color: rgba(34,40,78,.55); margin: 0; }

.hm-legend { display: flex; align-items: center; gap: 5px; font-size: 10px; color: rgba(34,40,78,.4); }
.legend-cells { display: flex; gap: 2px; }

.month-labels { position: relative; height: 16px; margin-left: 18px; margin-bottom: 2px; width: calc(100% - 18px); }
.month-labels span {
  position: absolute; font-size: 9px; color: rgba(34,40,78,.4); font-weight: 600;
}
/* Sin scroll — todo cabe en el ancho del contenedor */
.hm-scroll { overflow: hidden; width: 100%; }
.hm-grid   { display: flex; gap: 2px; width: 100%; }

.day-labels { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
.day-labels span {
  height: 10px; width: 14px;
  font-size: 8px; color: rgba(34,40,78,.35);
  display: flex; align-items: center; font-weight: 600;
}

.weeks { display: flex; gap: 2px; flex: 1; justify-content: space-between; }
.week  { display: flex; flex-direction: column; gap: 2px; flex: 1; }

/* Celdas cuadradas que se adaptan al ancho */
.cell {
  width: 100%;
  height: 10px;
  border-radius: 2px;
  transition: transform .15s;
  isolation: isolate;
}
.cell:hover { transform: scale(1.3); cursor: default; }
.today { outline: 1.5px solid #ff6b9d; outline-offset: 1px; }
.legend-cells .cell {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  aspect-ratio: unset;
}
</style>