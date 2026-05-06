<script setup>
import { computed } from 'vue'
import { getSpecialMode, getHobbyGradient } from '../../data/hobbiesData.js'
import AchievementBadge from './AchievementBadge.vue'
import WeekChart from './WeekChart.vue'
import SessionForm from './SessionForm.vue'

const props = defineProps({
  hobby:    { type: Object, required: true },
  sessions: { type: Array,  default: () => [] },
})

const emit = defineEmits(['delete', 'add-session', 'open-detail'])

const hobbySessions = computed(() =>
  props.sessions
    .filter(s => s.hobby_id === props.hobby.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)

const sessionCount = computed(() => hobbySessions.value.length)

const streak = computed(() => {
  if (!hobbySessions.value.length) return 0
  const today = new Date(); today.setHours(0,0,0,0)
  const dates = [...new Set(hobbySessions.value.map(s =>
    new Date(s.created_at).toDateString()
  ))].map(d => new Date(d)).sort((a,b) => b - a)
  let count = 0, cur = today
  for (const d of dates) {
    if (Math.round((cur - d) / 86400000) <= 1) { count++; cur = d }
    else break
  }
  return count
})

const achievements = computed(() => {
  const c = sessionCount.value
  const m = props.hobby.total_minutes || 0
  return [
    { name: 'Principiante', symbol: '◌', label: 'Primera sesión',  unlocked: c >= 1   },
    { name: 'Constante',    symbol: '◈', label: '10 sesiones',     unlocked: c >= 10  },
    { name: 'Dedicado',     symbol: '✦', label: '5 horas totales', unlocked: m >= 300 },
    { name: 'Maestro',      symbol: '▲', label: '30 sesiones',     unlocked: c >= 30  },
  ]
})

const cardGradient = computed(() =>
  props.hobby.gradient
    ? `linear-gradient(135deg, ${props.hobby.gradient[0]}, ${props.hobby.gradient[1]})`
    : getHobbyGradient(props.hobby.hobby_id)
)

const cardColor = computed(() =>
  props.hobby.gradient ? props.hobby.gradient[0] : '#ff6b9d'
)

const specialMode = computed(() => getSpecialMode(props.hobby.hobby_id))

function formatTime(mins) {
  if (!mins) return '0 min'
  return mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}h ${mins%60 ? mins%60+'min':''}`
}
function formatDate(ts) {
  return new Date(ts).toLocaleDateString('es-ES', { day:'2-digit', month:'short' })
}
</script>

<template>
  <div class="hobby-card">

    <!-- Portada -->
    <div
      class="card-cover"
      :style="hobby.image_url ? {} : { background: cardGradient }"
      @click="emit('open-detail', hobby)"
    >
      <img v-if="hobby.image_url" :src="hobby.image_url" :alt="hobby.name" />
      <div class="cover-overlay"></div>

      <!-- Botón eliminar -->
      <button class="del-btn" @click.stop="emit('delete', hobby.id)" title="Eliminar">
        <svg viewBox="0 0 14 14" fill="none" width="11">
          <path d="M1 3h12M4 3V2h6v1M5 6v5M9 6v5M2 3l1 9h8l1-9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <!-- Badge modo especial -->
      <div v-if="specialMode" class="special-badge">{{ specialMode.label }}</div>

      <!-- Info -->
      <div class="cover-info">
        <h3>{{ hobby.name }}</h3>
        <p v-if="hobby.description">{{ hobby.description }}</p>
      </div>
    </div>

    <!-- Stats -->
    <div class="card-stats">
      <div class="stat">
        <span class="stat-val">{{ formatTime(hobby.total_minutes) }}</span>
        <span class="stat-lbl">Total</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat">
        <span class="stat-val">{{ sessionCount }}</span>
        <span class="stat-lbl">Sesiones</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat">
        <span class="stat-val" :style="{ color: cardColor }">{{ streak }}</span>
        <span class="stat-lbl">Racha</span>
      </div>
    </div>

    <!-- Logros -->
    <div class="card-achievements">
      <AchievementBadge
        v-for="a in achievements" :key="a.name"
        v-bind="a" :color="cardColor"
      />
    </div>

    <!-- Gráfica -->
    <div class="card-chart">
      <WeekChart :sessions="hobbySessions" :color="cardColor" />
    </div>

    <!-- Sesión -->
    <SessionForm :hobby-id="hobby.id" :color="cardColor" @add="emit('add-session', $event)" />

    <!-- Últimas sesiones -->
    <div v-if="hobbySessions.length" class="card-sessions">
      <div class="session-row" v-for="s in hobbySessions.slice(0,3)" :key="s.id">
        <span class="s-dot" :style="{ background: cardColor }"></span>
        <span class="s-time">{{ formatTime(s.minutes) }}</span>
        <span class="s-note">{{ s.note || '—' }}</span>
        <span class="s-date">{{ formatDate(s.created_at) }}</span>
      </div>
    </div>

  </div>
</template>

<style scoped>
.hobby-card {
  background: #fff; border-radius: 20px; overflow: hidden;
  box-shadow: 0 2px 16px rgba(34,40,78,.07);
  border: 1px solid rgba(34,40,78,.05);
  display: flex; flex-direction: column;
  transition: transform .2s, box-shadow .2s;
}
.hobby-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(34,40,78,.12); }

.card-cover {
  position: relative; height: 155px; cursor: pointer;
  display: flex; flex-direction: column; justify-content: flex-end;
}
.card-cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cover-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(34,40,78,.05) 0%, rgba(34,40,78,.65) 100%);
}

.del-btn {
  position: absolute; top: 10px; right: 10px; z-index: 2;
  width: 28px; height: 28px; border-radius: 8px;
  background: rgba(255,255,255,.2); backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,.3);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #fff; transition: background .2s;
}
.del-btn:hover { background: rgba(239,68,68,.5); }

.special-badge {
  position: absolute; top: 10px; left: 10px; z-index: 2;
  background: rgba(255,107,157,.85); color: #fff;
  font-size: 9px; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; padding: 3px 9px; border-radius: 99px;
}

.cover-info { position: relative; z-index: 2; padding: 10px 14px; }
.cover-info h3 { font-size: 16px; font-weight: 800; color: #fff; margin: 0 0 2px; letter-spacing: -.3px; }
.cover-info p  { font-size: 11px; color: rgba(255,255,255,.7); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.card-stats {
  display: flex; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid rgba(34,40,78,.06);
}
.stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-val { font-size: 16px; font-weight: 800; color: #22284E; line-height: 1; }
.stat-lbl { font-size: 10px; color: rgba(34,40,78,.4); }
.stat-sep { width: 1px; height: 26px; background: rgba(34,40,78,.07); flex-shrink: 0; }

.card-achievements {
  display: flex; gap: 5px; flex-wrap: wrap;
  padding: 10px 14px; border-bottom: 1px solid rgba(34,40,78,.06);
}

.card-chart { padding: 10px 14px; border-bottom: 1px solid rgba(34,40,78,.06); }

.card-sessions { padding: 8px 14px 14px; display: flex; flex-direction: column; gap: 6px; }
.session-row   { display: flex; align-items: center; gap: 7px; font-size: 12px; }
.s-dot  { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.s-time { font-weight: 700; color: #22284E; min-width: 50px; }
.s-note { flex: 1; color: rgba(34,40,78,.4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.s-date { color: rgba(34,40,78,.3); white-space: nowrap; }
</style>