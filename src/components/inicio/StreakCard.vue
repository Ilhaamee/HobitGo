<script setup>
import { computed, ref, onMounted } from 'vue'

const props = defineProps({
  streak:   { type: Number, default: 0 },
  sessions: { type: Array,  default: () => [] },
})

const isVisible = ref(false)
onMounted(() => {
  setTimeout(() => isVisible.value = true, 400)
})

const last7 = computed(() => {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toDateString()
    const active  = props.sessions.some(s =>
      new Date(s.created_at).toDateString() === dateStr
    )
    const labels = ['D','L','M','X','J','V','S']
    return {
      label:   labels[d.getDay()],
      active,
      isToday: i === 6,
    }
  })
})

const streakMessage = computed(() => {
  if (props.streak === 0)  return 'Empieza hoy tu racha'
  if (props.streak < 3)   return 'Buen comienzo, sigue así 🔥'
  if (props.streak < 7)   return 'Vas muy bien, no pares 💪'
  if (props.streak < 14)  return 'Una semana seguida, increíble 🚀'
  if (props.streak < 30)  return 'Racha épica, eres imparable ⚡'
  return 'Racha legendaria 🏆'
})

const flameColor = computed(() => {
  if (props.streak >= 30) return '#fde047'
  if (props.streak >= 14) return '#f97316'
  if (props.streak >= 7)  return '#ff6b9d'
  return '#f59e0b'
})

const flameGradient = computed(() => {
  if (props.streak >= 30) return 'linear-gradient(135deg, #fde047, #fbbf24)'
  if (props.streak >= 14) return 'linear-gradient(135deg, #f97316, #fb923c)'
  if (props.streak >= 7)  return 'linear-gradient(135deg, #ff6b9d, #ffb3c6)'
  return 'linear-gradient(135deg, #f59e0b, #fbbf24)'
})

const streakLevel = computed(() => {
  if (props.streak >= 30) return 'legendary'
  if (props.streak >= 14) return 'epic'
  if (props.streak >= 7)  return 'hot'
  if (props.streak >= 3)  return 'warm'
  return 'starter'
})
</script>

<template>
  <div class="sc-wrap" :class="{ visible: isVisible, [streakLevel]: true }">
    <!-- Background glow -->
    <div class="sc-glow" :style="{ background: flameGradient }"></div>
    
    <div class="sc-content">
      <!-- Left: Streak number -->
      <div class="sc-left">
        <div class="sc-flame-row">
          <div class="sc-flame-icon" :class="streakLevel">
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
              <path
                d="M12 2c0 0-3 4-3 7s2 4 3 7c1-3 3-4 3-7s-3-7-3-7z"
                :fill="flameColor"
                :stroke="flameColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M8 10c0 0-2 2.5-2 4.5S8 19 8 19s1.5-2 1.5-3.5S8 10 8 10z"
                :fill="flameColor"
                opacity="0.6"
              />
              <path
                d="M16 10c0 0 2 2.5 2 4.5S16 19 16 19s-1.5-2-1.5-3.5S16 10 16 10z"
                :fill="flameColor"
                opacity="0.6"
              />
            </svg>
          </div>
          <div class="sc-number-block">
            <span class="sc-num" :style="{ color: flameColor }">{{ streak }}</span>
            <span class="sc-unit">días</span>
          </div>
        </div>
        <p class="sc-msg">{{ streakMessage }}</p>
      </div>

      <!-- Right: 7 days -->
      <div class="sc-days">
        <div
          v-for="(day, i) in last7"
          :key="i"
          class="sc-day"
          :class="{ active: day.active, today: day.isToday }"
          :style="{ animationDelay: `${0.5 + i * 0.06}s` }"
        >
          <div
            class="sc-dot"
            :class="{ active: day.active, today: day.isToday }"
            :style="day.active ? { background: flameGradient, boxShadow: `0 3px 12px ${flameColor}40` } : {}"
          >
            <svg v-if="day.active" viewBox="0 0 12 12" fill="none" width="8" height="8">
              <path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="sc-label" :class="{ today: day.isToday }">{{ day.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sc-wrap {
  position: relative;
  border-radius: var(--radius-xl);
  padding: 22px 24px;
  margin-bottom: 24px;
  overflow: hidden;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  box-shadow: var(--shadow-md);
  opacity: 0;
  transform: translateY(15px);
  transition: all 0.6s var(--ease-out);
}

.sc-wrap.visible {
  opacity: 1;
  transform: translateY(0);
}

.sc-wrap:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

/* Glow effect */
.sc-glow {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0;
  transition: opacity 0.8s ease;
  pointer-events: none;
}

.sc-wrap.visible .sc-glow {
  opacity: 0.12;
}

.sc-wrap.starter .sc-glow { opacity: 0.08; }
.sc-wrap.warm .sc-glow { opacity: 0.1; }
.sc-wrap.hot .sc-glow { opacity: 0.14; }
.sc-wrap.epic .sc-glow { opacity: 0.16; }
.sc-wrap.legendary .sc-glow { opacity: 0.2; }

.sc-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

/* Left */
.sc-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.sc-flame-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sc-flame-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s var(--ease-spring);
}

.sc-flame-icon.starter { background: rgba(245, 158, 11, 0.1); }
.sc-flame-icon.warm { background: rgba(245, 158, 11, 0.12); }
.sc-flame-icon.hot { background: rgba(255, 107, 157, 0.12); }
.sc-flame-icon.epic { background: rgba(249, 115, 22, 0.12); }
.sc-flame-icon.legendary { background: rgba(253, 224, 71, 0.15); }

.sc-flame-icon svg {
  animation: float 2.5s ease-in-out infinite;
}

.sc-number-block {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.sc-num {
  font-size: 42px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -2px;
  transition: color 0.5s ease;
  animation: numberPop 0.6s var(--ease-spring) both;
}

.sc-unit {
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text-muted);
  align-self: flex-end;
  padding-bottom: 6px;
}

.sc-msg {
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text-muted);
  margin: 0;
  line-height: 1.4;
}

/* Days */
.sc-days {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.sc-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transform: scale(0.8);
  animation: scaleIn 0.4s var(--ease-spring) forwards;
}

.sc-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(26, 29, 46, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.35s var(--ease-spring);
  position: relative;
}

.sc-dot.active {
  transform: scale(1.1);
}

.sc-dot.today:not(.active) {
  border: 2px solid var(--c-primary);
  background: transparent;
}

.sc-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  transition: color 0.3s;
}

.sc-label.today {
  color: var(--c-primary);
  font-weight: 800;
}

/* Responsive */
@media (max-width: 480px) {
  .sc-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .sc-days {
    width: 100%;
    justify-content: space-between;
  }
  .sc-num { font-size: 36px; }
}

@media (max-width: 360px) {
  .sc-num { font-size: 30px; }
  .sc-dot { width: 26px; height: 26px; }
  .sc-days { gap: 4px; }
}
</style>