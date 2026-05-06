<script setup>
import { computed } from 'vue'

const props = defineProps({
  sessions: { type: Array,  default: () => [] },
  color:    { type: String, default: '#ff6b9d' },
})

const DAY_LABELS = ['D','L','M','X','J','V','S']

const weekData = computed(() => {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const ds   = d.toDateString()
    const mins = props.sessions
      .filter(s => new Date(s.created_at).toDateString() === ds)
      .reduce((sum, s) => sum + s.minutes, 0)
    return { label: DAY_LABELS[d.getDay()], mins, isToday: i === 6 }
  })
})

const maxMins = computed(() => Math.max(1, ...weekData.value.map(d => d.mins)))

function barHeight(mins) {
  return mins > 0 ? Math.max(6, (mins / maxMins.value) * 40) : 4
}

function formatMins(mins) {
  if (!mins) return '0 min'
  return mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}h ${mins%60 ? mins%60+'min' : ''}`
}
</script>

<template>
  <div class="week-chart">
    <div
      v-for="(day, i) in weekData" :key="i"
      class="col"
    >
      <span class="val" v-if="day.mins > 0">{{ formatMins(day.mins) }}</span>
      <div class="bar-wrap">
        <div
          class="bar"
          :style="{
            height: barHeight(day.mins) + 'px',
            background: day.mins > 0 ? color : 'rgba(34,40,78,.08)',
            opacity: day.isToday ? 1 : .75
          }"
          :title="`${day.label}: ${formatMins(day.mins)}`"
        ></div>
      </div>
      <span class="lbl" :class="{ today: day.isToday }">{{ day.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.week-chart {
  display: flex; gap: 5px; align-items: flex-end;
  height: 72px; width: 100%;
}
.col {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; gap: 3px; height: 100%;
  justify-content: flex-end;
}
.bar-wrap {
  display: flex; align-items: flex-end;
  flex: 1; width: 100%;
}
.bar {
  width: 100%; border-radius: 4px 4px 0 0;
  min-height: 4px; transition: height .4s ease;
}
.lbl {
  font-size: 9px; color: rgba(34,40,78,.35);
  font-weight: 500;
}
.lbl.today { color: #ff6b9d; font-weight: 700; }
.val {
  font-size: 8px; color: rgba(34,40,78,.4);
  white-space: nowrap; overflow: hidden;
  max-width: 100%; text-overflow: ellipsis;
}
</style>