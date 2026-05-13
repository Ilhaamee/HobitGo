<script setup>
import { computed, ref, onMounted } from 'vue'

const props = defineProps({
  username:        { type: String,  default: 'Usuario' },
  hobbiesTotal:    { type: Number,  default: 0 },
  hobbiesDone:     { type: Number,  default: 0 },
  streak:          { type: Number,  default: 0 },
})

const isVisible = ref(false)

onMounted(() => {
  setTimeout(() => isVisible.value = true, 100)
})

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_NAMES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

const now = new Date()

const greeting = computed(() => {
  const h = now.getHours()
  if (h < 6)  return 'Buenas noches'
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
})

const greetingEmoji = computed(() => {
  const h = now.getHours()
  if (h < 6)  return '🌙'
  if (h < 12) return '☀️'
  if (h < 20) return '🌤️'
  return '🌙'
})

const dayLabel   = DAY_NAMES[now.getDay()]
const dayNum     = now.getDate()
const monthLabel = MONTH_NAMES[now.getMonth()]

const allDone = computed(() =>
  props.hobbiesTotal > 0 && props.hobbiesDone >= props.hobbiesTotal
)

const progressPct = computed(() => {
  if (props.hobbiesTotal === 0) return 0
  return Math.round((props.hobbiesDone / props.hobbiesTotal) * 100)
})

const summaryText = computed(() => {
  if (props.hobbiesTotal === 0) return 'Sin hobbies activos'
  if (allDone.value)             return '¡Todo completado! 🎉'
  if (props.hobbiesDone === 0)   return `${props.hobbiesTotal} hobbies pendientes`
  return `${props.hobbiesDone}/${props.hobbiesTotal} completados`
})
</script>

<template>
  <div class="gh-wrap" :class="{ visible: isVisible }">
    <!-- Background decorative elements -->
    <div class="gh-bg-decor">
      <div class="gh-blob gh-blob-1"></div>
      <div class="gh-blob gh-blob-2"></div>
      <div class="gh-blob gh-blob-3"></div>
    </div>

    <div class="gh-content">
      <!-- Left: Greeting -->
      <div class="gh-left">
        <div class="gh-greeting-row">
          <span class="gh-emoji">{{ greetingEmoji }}</span>
          <p class="gh-greeting">{{ greeting }},</p>
        </div>
        <h1 class="gh-name">{{ username }}</h1>

        <!-- Progress pill -->
        <div class="gh-progress-pill" :class="{ done: allDone }">
          <div class="gh-progress-icon">
            <svg v-if="allDone" viewBox="0 0 16 16" fill="none" width="12">
              <path d="M3 8l3 3 7-7" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else viewBox="0 0 16 16" fill="none" width="12">
              <path d="M8 1v6l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="gh-progress-text">{{ summaryText }}</span>
          <div class="gh-progress-bar">
            <div class="gh-progress-fill" :style="{ width: progressPct + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Right: Date + Streak -->
      <div class="gh-right">
        <div class="gh-date-card">
          <span class="gh-day-name">{{ dayLabel }}</span>
          <span class="gh-day-num">{{ dayNum }}</span>
          <span class="gh-month">{{ monthLabel }}</span>
        </div>

        <div v-if="streak > 0" class="gh-streak-badge" :class="{ hot: streak >= 7 }">
          <div class="gh-streak-icon">
            <svg viewBox="0 0 24 24" fill="none" width="16">
              <path d="M12 2c0 0-2 3-2 5s1.5 3 2 5c.5-2 2-3 2-5s-2-5-2-5zM7 8c0 0-1.5 2-1.5 3.5S7 14 7.5 16c.5-2 2-2.5 2-4S7 8 7 8zM17 8c0 0-1.5 2-1.5 3.5S15 14 15.5 16c.5-2 2-2.5 2-4S17 8 17 8zM12 14c-2.5 0-5 2-5 5s2.5 5 5 5 5-2 5-5-2.5-5-5-5z" 
                :fill="streak >= 7 ? '#ff6b9d' : '#f59e0b'" 
                :stroke="streak >= 7 ? '#ff6b9d' : '#f59e0b'" 
                stroke-width="1.5"/>
            </svg>
          </div>
          <div class="gh-streak-info">
            <span class="gh-streak-num">{{ streak }}</span>
            <span class="gh-streak-label">días</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gh-wrap {
  position: relative;
  border-radius: var(--radius-xl);
  padding: 28px;
  margin-bottom: 24px;
  overflow: hidden;
  background: linear-gradient(135deg, #fff 0%, #faf8f5 100%);
  border: 1px solid var(--c-border);
  box-shadow: var(--shadow-md);
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s var(--ease-out);
}

.gh-wrap.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Background blobs */
.gh-bg-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.gh-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0;
  transition: opacity 1s ease;
}

.gh-wrap.visible .gh-blob {
  opacity: 1;
}

.gh-blob-1 {
  width: 200px; height: 200px;
  background: rgba(255, 107, 157, 0.12);
  top: -60px; right: -40px;
  transition-delay: 0.2s;
}

.gh-blob-2 {
  width: 150px; height: 150px;
  background: rgba(125, 211, 192, 0.1);
  bottom: -40px; left: 30%;
  transition-delay: 0.4s;
}

.gh-blob-3 {
  width: 100px; height: 100px;
  background: rgba(245, 200, 66, 0.08);
  top: 20px; left: -20px;
  transition-delay: 0.6s;
}

.gh-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

/* Left side */
.gh-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.gh-greeting-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gh-emoji {
  font-size: 20px;
  line-height: 1;
  animation: float 3s ease-in-out infinite;
}

.gh-greeting {
  font-size: 14px;
  font-weight: 500;
  color: var(--c-text-muted);
  margin: 0;
  letter-spacing: 0.02em;
}

.gh-name {
  font-size: 32px;
  font-weight: 900;
  color: var(--c-text);
  letter-spacing: -1.5px;
  margin: 0 0 12px;
  line-height: 1.1;
}

/* Progress pill */
.gh-progress-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid var(--c-border);
  padding: 8px 16px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-secondary);
  width: fit-content;
  transition: all 0.3s var(--ease-smooth);
  box-shadow: var(--shadow-sm);
}

.gh-progress-pill.done {
  background: linear-gradient(135deg, #22c55e, #4ade80);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.25);
}

.gh-progress-icon {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(255, 107, 157, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s;
}

.gh-progress-pill.done .gh-progress-icon {
  background: rgba(255, 255, 255, 0.25);
}

.gh-progress-text {
  white-space: nowrap;
}

.gh-progress-bar {
  width: 60px;
  height: 5px;
  background: rgba(26, 29, 46, 0.08);
  border-radius: 99px;
  overflow: hidden;
  flex-shrink: 0;
}

.gh-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--c-primary), var(--c-primary-light));
  border-radius: 99px;
  transition: width 0.8s var(--ease-out);
}

.gh-progress-pill.done .gh-progress-bar {
  background: rgba(255, 255, 255, 0.3);
}

.gh-progress-pill.done .gh-progress-fill {
  background: #fff;
}

/* Right side */
.gh-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.gh-date-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #1a1d2e, #2d3250);
  border-radius: var(--radius-lg);
  padding: 14px 20px;
  min-width: 72px;
  gap: 2px;
  box-shadow: 0 8px 24px rgba(26, 29, 46, 0.2);
  transition: transform 0.3s var(--ease-spring);
}

.gh-date-card:hover {
  transform: translateY(-3px) scale(1.02);
}

.gh-day-name {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

.gh-day-num {
  font-size: 32px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  letter-spacing: -1.5px;
}

.gh-month {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

/* Streak badge */
.gh-streak-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
  border: 1.5px solid rgba(245, 158, 11, 0.2);
  border-radius: var(--radius-full);
  padding: 6px 14px;
  transition: all 0.3s var(--ease-spring);
}

.gh-streak-badge.hot {
  background: linear-gradient(135deg, rgba(255, 107, 157, 0.1), rgba(255, 107, 157, 0.05));
  border-color: rgba(255, 107, 157, 0.25);
  animation: pulse-glow 2s ease-in-out infinite;
}

.gh-streak-icon {
  display: flex;
  align-items: center;
}

.gh-streak-info {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.gh-streak-num {
  font-size: 16px;
  font-weight: 900;
  color: #b45309;
  line-height: 1;
}

.gh-streak-badge.hot .gh-streak-num {
  color: var(--c-primary);
}

.gh-streak-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(180, 83, 9, 0.7);
}

.gh-streak-badge.hot .gh-streak-label {
  color: rgba(255, 107, 157, 0.7);
}

/* Responsive */
@media (max-width: 480px) {
  .gh-wrap { padding: 20px; }
  .gh-name { font-size: 26px; }
  .gh-content { flex-direction: column; align-items: stretch; }
  .gh-right { flex-direction: row; align-items: center; justify-content: space-between; }
  .gh-date-card { flex-direction: row; gap: 8px; padding: 10px 16px; min-width: auto; }
  .gh-day-num { font-size: 20px; }
}
</style>