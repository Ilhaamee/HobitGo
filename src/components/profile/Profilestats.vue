<template>
  <div class="stats-wrap">

    <!-- Heatmap -->
    <ActivityHeatmap :sessions="sessions" :color="mainColor" />

    <!-- Números clave -->
    <div class="numbers-row">
      <div class="num-card" v-for="n in numbers" :key="n.label">
        <div class="num-icon" :style="{ background: n.bg }">
          <svg viewBox="0 0 20 20" fill="none" width="16"
            v-html="n.svg" :style="{ color: n.color }"></svg>
        </div>
        <div class="num-val">{{ n.value }}</div>
        <div class="num-lbl">{{ n.label }}</div>
      </div>
    </div>

    <!-- Rachas por hobby -->
    <div class="section-card">
      <h4 class="section-title">Rachas activas 🔥</h4>
      <div v-if="hobbyStreaks.length === 0" class="empty-msg">Sin sesiones recientes</div>
      <div v-else class="streaks-list">
        <div class="streak-row" v-for="h in hobbyStreaks" :key="h.id">
          <div class="sr-left">
            <div class="sr-dot" :style="{ background: h.color }"></div>
            <span class="sr-name">{{ h.name }}</span>
          </div>
          <div class="sr-bar-wrap">
            <div class="sr-bar">
              <div class="sr-fill" :style="{ width: barWidth(h.streak) + '%', background: h.color }"></div>
            </div>
          </div>
          <div class="sr-num">{{ h.streak }}d</div>
        </div>
      </div>
    </div>

    <!-- Hobbies activos este mes -->
    <div class="section-card">
      <h4 class="section-title">Este mes</h4>
      <div v-if="activeHobbies.length === 0" class="empty-msg">Sin actividad este mes</div>
      <div v-else class="hobbies-list">
        <div class="ha-item" v-for="h in activeHobbies" :key="h.id">
          <div class="ha-top">
            <div class="ha-name-row">
              <div class="ha-dot" :style="{ background: h.color }"></div>
              <span class="ha-name">{{ h.name }}</span>
            </div>
            <span class="ha-count">{{ h.sessions }} sesiones · {{ h.totalMins }} min</span>
          </div>
          <div class="ha-track">
            <div class="ha-fill" :style="{ width: (h.sessions / maxSessions * 100) + '%', background: h.color }"></div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import ActivityHeatmap from './ActivityHeatmap.vue'

const props = defineProps({
  sessions: { type: Array,  default: () => [] },
  hobbies:  { type: Array,  default: () => [] },
  stats:    { type: Object, default: () => ({}) },
})

const mainColor = computed(() => '#ff6b9d')

const uniqueDays = computed(() =>
  new Set(props.sessions.map(s => new Date(s.created_at).toISOString().split('T')[0])).size
)

const totalMins = computed(() => {
  const mins = props.sessions.reduce((sum, s) => sum + (s.minutes || 0), 0)
  if (mins < 60)   return mins + ' min'
  if (mins < 1440) return (mins / 60).toFixed(1).replace('.0','') + 'h'
  return (mins / 1440).toFixed(1).replace('.0','') + 'd'
})

const numbers = computed(() => [
  {
    label: 'Sesiones', value: props.sessions.length,
    bg: 'rgba(255,107,157,.1)', color: '#ff6b9d',
    svg: '<circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.6"/><path d="M10 7v3l2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  },
  {
    label: 'Hobbies', value: props.hobbies.length,
    bg: 'rgba(34,40,78,.08)', color: '#22284E',
    svg: '<path d="M10 17s-7-4.35-7-8a4 4 0 018-1.17A4 4 0 0117 9c0 3.65-7 8-7 8z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  },
  {
    label: 'Días activos', value: uniqueDays.value,
    bg: 'rgba(34,197,94,.1)', color: '#22c55e',
    svg: '<rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M14 2v4M6 2v4M2 9h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  },
  {
    label: 'Tiempo', value: totalMins.value,
    bg: 'rgba(245,158,11,.1)', color: '#f59e0b',
    svg: '<polygon points="10 2 12.09 8.26 19 9.27 14 14.14 15.18 21.02 10 17.77 4.82 21.02 6 14.14 1 9.27 7.91 8.26 10 2" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  },
])

// Racha continua por hobby
const hobbyStreaks = computed(() =>
  props.hobbies.map(h => {
    const dates = [...new Set(
      props.sessions
        .filter(s => s.hobby_id === h.id)
        .map(s => new Date(s.created_at).toDateString())
    )].map(d => new Date(d)).sort((a,b) => b - a)

    let streak = 0
    let cur    = new Date(); cur.setHours(0,0,0,0)
    for (const d of dates) {
      if (Math.round((cur - d) / 86400000) <= 1) { streak++; cur = d } else break
    }
    return { id: h.id, name: h.name, color: h.gradient?.[0] || '#ff6b9d', streak }
  })
  .filter(h => h.streak > 0)
  .sort((a,b) => b.streak - a.streak)
)

const maxStreak = computed(() => Math.max(1, ...hobbyStreaks.value.map(h => h.streak)))
function barWidth(streak) { return Math.max(8, Math.round((streak / maxStreak.value) * 100)) }

// Actividad este mes
const activeHobbies = computed(() => {
  const now = new Date()
  return props.hobbies.map(h => {
    const ms = props.sessions.filter(s => {
      const d = new Date(s.created_at)
      return s.hobby_id === h.id && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    return { id: h.id, name: h.name, color: h.gradient?.[0] || '#ff6b9d', sessions: ms.length, totalMins: ms.reduce((s,x) => s + (x.minutes||0), 0) }
  })
  .filter(h => h.sessions > 0)
  .sort((a,b) => b.sessions - a.sessions)
})

const maxSessions = computed(() => Math.max(1, ...activeHobbies.value.map(h => h.sessions)))
</script>

<style scoped>
.stats-wrap { display: flex; flex-direction: column; gap: 14px; }

.numbers-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
@media (min-width: 500px) { .numbers-row { grid-template-columns: repeat(4, 1fr); } }

.num-card {
  background: #fff; border-radius: 16px; padding: 16px 12px;
  border: 1px solid rgba(34,40,78,.06); box-shadow: 0 1px 8px rgba(34,40,78,.04);
  display: flex; flex-direction: column; align-items: center; gap: 7px;
  transition: transform .2s, box-shadow .2s;
}
.num-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(34,40,78,.1); }
.num-icon { width: 36px; height: 36px; border-radius: 11px; display: flex; align-items: center; justify-content: center; }
.num-val  { font-size: 22px; font-weight: 900; color: #22284E; line-height: 1; }
.num-lbl  { font-size: 11px; color: rgba(34,40,78,.4); font-weight: 600; text-align: center; }

.section-card {
  background: #fff; border-radius: 18px; padding: 18px 20px;
  border: 1px solid rgba(34,40,78,.07); box-shadow: 0 2px 12px rgba(34,40,78,.05);
  display: flex; flex-direction: column; gap: 14px;
}
.section-title { font-size: 13px; font-weight: 800; color: #22284E; margin: 0; }
.empty-msg     { font-size: 13px; color: rgba(34,40,78,.35); text-align: center; padding: 6px 0; }

/* Rachas */
.streaks-list { display: flex; flex-direction: column; gap: 12px; }
.streak-row   { display: flex; align-items: center; gap: 10px; }
.sr-left      { display: flex; align-items: center; gap: 7px; min-width: 90px; }
.sr-dot       { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.sr-name      { font-size: 13px; font-weight: 600; color: #22284E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sr-bar-wrap  { flex: 1; }
.sr-bar       { height: 6px; background: rgba(34,40,78,.07); border-radius: 99px; overflow: hidden; }
.sr-fill      { height: 100%; border-radius: 99px; transition: width .8s cubic-bezier(.4,0,.2,1); }
.sr-num       { font-size: 13px; font-weight: 800; color: #22284E; min-width: 32px; text-align: right; }

/* Hobbies mes */
.hobbies-list { display: flex; flex-direction: column; gap: 14px; }
.ha-item      { display: flex; flex-direction: column; gap: 6px; }
.ha-top       { display: flex; justify-content: space-between; align-items: center; }
.ha-name-row  { display: flex; align-items: center; gap: 7px; }
.ha-dot       { width: 8px; height: 8px; border-radius: 50%; }
.ha-name      { font-size: 13px; font-weight: 600; color: #22284E; }
.ha-count     { font-size: 11px; color: rgba(34,40,78,.45); font-weight: 600; }
.ha-track     { height: 6px; background: rgba(34,40,78,.07); border-radius: 99px; overflow: hidden; }
.ha-fill      { height: 100%; border-radius: 99px; transition: width .8s cubic-bezier(.4,0,.2,1); }
</style>