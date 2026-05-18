<script setup>
import { computed } from 'vue'

const props = defineProps({
  streak: { type: Number, default: 0 },
  sessions: { type: Array, default: () => [] },
})

const weekDays = computed(() => {
  const days = []
  const today = new Date()
  const dayNames = ['D','L','M','X','J','V','S']
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toDateString()
    const hasSession = props.sessions.some(s => new Date(s.created_at).toDateString() === dateStr)
    days.push({
      label: dayNames[d.getDay()],
      active: hasSession,
      isToday: i === 0,
    })
  }
  return days
})

const streakMessage = computed(() => {
  if (props.streak === 0) return 'Empieza hoy'
  if (props.streak < 3) return '¡Buen comienzo!'
  if (props.streak < 7) return '¡Vas muy bien!'
  if (props.streak < 30) return '¡Increíble!'
  return '¡Leyenda!'
})
</script>

<template>
  <section class="streak-section">
    <!-- Versión Desktop: Card grande vertical -->
    <div class="streak-card desktop">
      <div class="streak-header">
        <div class="streak-icon">
          <svg viewBox="0 0 24 24" fill="none" width="24" stroke="#22284E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
          </svg>
        </div>
        <div>
          <h2>Racha actual</h2>
          <p class="streak-sub">Días consecutivos</p>
        </div>
      </div>

      <div class="streak-number">{{ streak }}</div>

      <div class="streak-days">
        <div 
          v-for="(day, i) in weekDays" 
          :key="i" 
          class="streak-day" 
          :class="{ active: day.active, today: day.isToday }"
        >
          <div class="streak-dot">
            <svg v-if="day.active" viewBox="0 0 16 16" fill="none" width="10" stroke="#22284E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 8l3 3 7-7"/>
            </svg>
          </div>
          <span class="streak-label">{{ day.label }}</span>
        </div>
      </div>

      <p class="streak-msg">{{ streakMessage }}</p>
    </div>

    <!-- Versión Móvil: Barra horizontal compacta -->
    <div class="streak-bar mobile">
      <div class="streak-bar-left">
        <div class="streak-bar-icon">
          <svg viewBox="0 0 24 24" fill="none" width="18" stroke="#22284E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
          </svg>
        </div>
        <div class="streak-bar-info">
          <span class="streak-bar-count">{{ streak }} <span class="streak-bar-unit">días</span></span>
          <span class="streak-bar-msg">{{ streakMessage }}</span>
        </div>
      </div>
      <div class="streak-bar-days">
        <div 
          v-for="(day, i) in weekDays" 
          :key="i" 
          class="streak-bar-day" 
          :class="{ active: day.active, today: day.isToday }"
        >
          <div class="streak-bar-dot">
            <svg v-if="day.active" viewBox="0 0 16 16" fill="none" width="10" stroke="#22284E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 8l3 3 7-7"/>
            </svg>
          </div>
          <span class="streak-bar-label">{{ day.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ═══ BASE ═══ */
.streak-section {
  margin-bottom: 0;
}

/* ═══ DESKTOP: Card grande vertical ═══ */
.streak-card.desktop {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(34,40,78,.06);
  border: 1px solid rgba(34,40,78,.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.streak-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  width: 100%;
  text-align: center;
}
.streak-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fff59e, #ADD8E6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.streak-header h2 {
  font-size: 16px;
  color: #22284E;
  margin: 0 0 2px;
  font-weight: 700;
}
.streak-sub {
  font-size: 12px;
  color: #8b92a8;
  margin: 0;
}
.streak-number {
  font-size: 56px;
  font-weight: 900;
  color: #22284E;
  text-align: center;
  line-height: 1;
  margin-bottom: 20px;
  width: 100%;
}
.streak-days {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 14px;
  width: 100%;
  box-sizing: border-box;
}
.streak-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.streak-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f0f1f5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.streak-day.active .streak-dot {
  background: linear-gradient(135deg, #fff59e, #ADD8E6);
}
.streak-day.today .streak-dot {
  border: 2px solid #ff6b9d;
}
.streak-day.active.today .streak-dot {
  background: linear-gradient(135deg, #fff59e, #ADD8E6);
  border-color: #ff6b9d;
}
.streak-label {
  font-size: 11px;
  color: #8b92a8;
  font-weight: 500;
}
.streak-msg {
  text-align: center;
  font-size: 13px;
  color: #8b92a8;
  margin: 0;
  font-weight: 500;
  width: 100%;
}
/* ═══ MÓVIL: Barra horizontal compacta ═══ */
.streak-bar.mobile {
  display: none;
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 1100px) {
  .streak-card.desktop {
    display: none;
  }
  .streak-bar.mobile {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: #fff;
    border-radius: 16px;
    padding: 12px 14px;
    box-shadow: 0 2px 12px rgba(34,40,78,.06);
    border: 1px solid rgba(34,40,78,.06);
    overflow: hidden;
  }
  .streak-bar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .streak-bar-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #fff59e, #ADD8E6);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .streak-bar-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .streak-bar-count {
    font-size: 20px;
    font-weight: 900;
    color: #22284E;
    line-height: 1.2;
  }
  .streak-bar-unit {
    font-size: 12px;
    font-weight: 600;
    color: #8b92a8;
  }
  .streak-bar-msg {
    font-size: 11px;
    color: rgba(34,40,78,.4);
    font-weight: 500;
  }
  .streak-bar-days {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-shrink: 0;
  }
  .streak-bar-day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .streak-bar-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #f0f1f5;
    transition: all 0.3s ease;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .streak-bar-day.active .streak-bar-dot {
    background: linear-gradient(135deg, #fff59e, #ADD8E6);
  }
  .streak-bar-day.today .streak-bar-dot {
    border: 2px solid #ff6b9d;
    box-sizing: border-box;
  }
  .streak-bar-day.active.today .streak-bar-dot {
    background: linear-gradient(135deg, #fff59e, #ADD8E6);
    border-color: #ff6b9d;
  }
  .streak-bar-label {
    font-size: 8px;
    color: #8b92a8;
    font-weight: 600;
  }
}

@media (min-width: 1024px) {
  .streak-card.desktop { padding: 28px; }
  .streak-number { font-size: 64px; }
}
</style>