<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  hobbies: { type: Array, default: () => [] },
  sessions: { type: Array, default: () => [] },
})

const emit = defineEmits(['quick-session'])

const confirmingId = ref(null)

const todayStr = computed(() => new Date().toDateString())

const activeHobbies = computed(() => {
  return props.hobbies.filter(hobby => {
    // Si el reto está completado Y no se ha extendido → ocultar
    if (isCompleted(hobby)) return false

    // Siempre mostrar hobbies con días pendientes
    const completed = completedDays(hobby.id)
    const total = hobby.total_days || 30
    return completed < total
  }).slice(0, 6)  // máximo 6 visibles
})

// Sesiones agrupadas por hobby_id y por día
const sessionsByHobbyDay = computed(() => {
  const map = {}
  props.sessions.forEach(s => {
    const day = new Date(s.created_at).toDateString()
    const key = `${s.hobby_id}__${day}`
    if (!map[key]) map[key] = 0
    map[key] += s.minutes
  })
  return map
})

// Días únicos con sesión por hobby
const activeDaysByHobby = computed(() => {
  const map = {}
  props.sessions.forEach(s => {
    const day = new Date(s.created_at).toDateString()
    if (!map[s.hobby_id]) map[s.hobby_id] = new Set()
    map[s.hobby_id].add(day)
  })
  const counts = {}
  for (const [hobbyId, daysSet] of Object.entries(map)) {
    counts[hobbyId] = daysSet.size
  }
  return counts
})

function didToday(hobbyId) {
  const key = `${hobbyId}__${todayStr.value}`
  return !!sessionsByHobbyDay.value[key]
}

function todayMinutes(hobbyId) {
  const key = `${hobbyId}__${todayStr.value}`
  return sessionsByHobbyDay.value[key] || 0
}

function completedDays(hobbyId) {
  // Solo cuenta días donde se alcanzó el objetivo de minutos
  const hobby  = props.hobbies.find(h => h.id === hobbyId)
  const goal   = hobby?.daily_minutes || 20
  let count    = 0
  props.sessions.forEach(s => {
    if (s.hobby_id !== hobbyId) return
    const day = new Date(s.created_at).toDateString()
    // Suma todos los minutos de ese día para ese hobby
    const dayTotal = props.sessions
      .filter(x => x.hobby_id === hobbyId && new Date(x.created_at).toDateString() === day)
      .reduce((sum, x) => sum + (x.minutes || 0), 0)
    if (dayTotal >= goal) count++  
  })
  
  const daysDone = new Set()
  props.sessions.forEach(s => {
    if (s.hobby_id !== hobbyId) return
    const day = new Date(s.created_at).toDateString()
    const dayTotal = props.sessions
      .filter(x => x.hobby_id === hobbyId && new Date(x.created_at).toDateString() === day)
      .reduce((sum, x) => sum + (x.minutes || 0), 0)
    if (dayTotal >= goal) daysDone.add(day)
  })
  return daysDone.size
}

function daysLeft(hobby) {
  const total = hobby.total_days || 30
  const completed = completedDays(hobby.id)
  return Math.max(0, total - completed)
}

function isCompleted(hobby) {
  if (hobby.completed_at) return true
  const total = hobby.total_days || 30
  return completedDays(hobby.id) >= total && completedDays(hobby.id) > 0
}

function getProgress(hobby) {
  const total = hobby.total_days || 30
  const completed = completedDays(hobby.id)
  return Math.min(100, Math.round((completed / total) * 100))
}

function getStatusText(hobby) {
  const todayMins = todayMinutes(hobby.id)
  const dailyGoal = hobby.daily_minutes || 20

  if (todayMins > 0) {
    if (todayMins >= dailyGoal) {
      return `✓ ${todayMins}min`
    } else {
      return `⏱ ${todayMins}/${dailyGoal}min`
    }
  } else {
    return `📌 ${dailyGoal}min`
  }
}

function getStatusColor(hobby) {
  const todayMins = todayMinutes(hobby.id)
  const dailyGoal = hobby.daily_minutes || 20
  if (todayMins >= dailyGoal) return '#22c55e'
  if (todayMins > 0) return '#f59e0b'
  return '#ff6b9d'
}

async function confirmQuick(hobby) {
  confirmingId.value = hobby.id

  const todayMins = todayMinutes(hobby.id)
  const dailyGoal = hobby.daily_minutes || 20

  let minsToAdd
  if (todayMins >= dailyGoal) {
    // Ya cumplió: añade los minutos objetivo del hobby
    minsToAdd = dailyGoal
  } else {
    // Añade lo que falta para cumplir el objetivo
    minsToAdd = dailyGoal - todayMins
  }

  emit('quick-session', hobby.id, minsToAdd)

  setTimeout(() => {
    confirmingId.value = null
  }, 1200)
}
</script>

<template>
  <section class="hobby-stack-section">
    <div class="stack-header">
      <h2>Tus hobbies</h2>
      <button class="btn-see-all" @click="$router.push('/dashboard/hobbies')">
        Ver todos
        <svg viewBox="0 0 24 24" fill="none" width="14" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
    </div>

    <!-- Empty state: sin hobbies creados -->
    <div v-if="hobbies.length === 0" class="stack-empty">
      <div class="empty-icon">
        <svg viewBox="0 0 48 48" fill="none" width="40">
          <circle cx="24" cy="24" r="20" stroke="#e8eaf0" stroke-width="2"/>
          <path d="M24 14v10l8 4" stroke="#ff6b9d" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <p>Aún no tienes hobbies</p>
      <button class="btn-start" @click="$router.push('/dashboard/hobbies')">Empezar ahora</button>
    </div>

    <!-- Empty state: todos los hobbies completados -->
    <div v-else-if="activeHobbies.length === 0" class="stack-empty all-done">
      <div class="empty-icon">
        <svg viewBox="0 0 48 48" fill="none" width="44">
          <circle cx="24" cy="24" r="20" stroke="#22c55e" stroke-width="2"/>
          <path d="M14 24l6 6 14-14" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p class="done-title">¡Todo completado!</p>
      <p class="done-sub">Has terminado todos tus retos de hoy</p>
      <button class="btn-start btn-extend" @click="$router.push('/dashboard/hobbies')">
        Ir a Hobbies
        <svg viewBox="0 0 24 24" fill="none" width="14" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
    </div>

    <!-- Stack horizontal -->
    <div v-else class="stack-scroll">
      <div 
        v-for="hobby in activeHobbies" 
        :key="hobby.id"
        class="stack-item"
      >
        <div class="stack-image-wrap">
          <img 
            v-if="hobby.image_url" 
            :src="hobby.image_url" 
            class="stack-image"
            alt=""
          />
          <div v-else class="stack-image fallback" :style="{ background: hobby.gradient?.[0] || '#ff6b9d' }">
            {{ hobby.name[0].toUpperCase() }}
          </div>

          <!-- Badge de estado: solo pendiente o hecho-hoy -->
          <div 
            class="status-badge"
            :style="{ background: getStatusColor(hobby) }"
          >
            <svg v-if="todayMinutes(hobby.id) >= (hobby.daily_minutes || 20)" viewBox="0 0 16 16" fill="none" width="10" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 8l3 3 7-7"/>
            </svg>
            <svg v-else viewBox="0 0 16 16" fill="none" width="10" stroke="#fff" stroke-width="2" stroke-linecap="round">
              <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2" stroke-linecap="round"/>
            </svg>
          </div>

          <!-- Progress overlay -->
          <div class="stack-progress">
            <div 
              class="stack-progress-bar" 
              :class="{ completed: isCompleted(hobby) }"
              :style="{ 
                width: getProgress(hobby) + '%',
                background: isCompleted(hobby) 
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' 
                  : `linear-gradient(90deg, ${hobby.gradient?.[0] || '#ff6b9d'}, ${hobby.gradient?.[1] || '#ffb3c6'})`
              }"
            ></div>
          </div>

          <!-- Quick action button: añadir sesión -->
          <button 
            class="stack-quick-btn"
            :class="{ confirming: confirmingId === hobby.id }"
            @click.stop="confirmQuick(hobby)"
            :disabled="confirmingId === hobby.id"
          >
            <svg v-if="confirmingId === hobby.id" viewBox="0 0 24 24" fill="none" width="14" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <svg v-else-if="todayMinutes(hobby.id) >= (hobby.daily_minutes || 20)" viewBox="0 0 24 24" fill="none" width="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" width="14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>

        <div class="stack-info">
          <span class="stack-name">{{ hobby.name }}</span>
          <span class="stack-meta" :style="{ color: getStatusColor(hobby) }">
            {{ getStatusText(hobby) }}
          </span>
          <div class="days-track">
            <span class="days-text">{{ completedDays(hobby.id) }}/{{ hobby.total_days || 30 }} días</span>
            <div class="days-bar">
              <div 
                class="days-fill"
                :style="{ 
                  width: getProgress(hobby) + '%',
                  background: isCompleted(hobby) ? '#f59e0b' : (hobby.gradient?.[0] || '#ff6b9d')
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hobby-stack-section {
  background: #fff;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(34,40,78,.06);
  border: 1px solid rgba(34,40,78,.06);
}

.stack-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.stack-header h2 {
  font-size: 16px;
  font-weight: 800;
  color: #22284E;
  margin: 0;
}
.btn-see-all {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #ff6b9d;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-see-all:hover {
  transform: translateX(2px);
}

/* Empty */
.stack-empty {
  text-align: center;
  padding: 32px 20px;
}
.empty-icon {
  margin-bottom: 12px;
}
.stack-empty p {
  font-size: 14px;
  color: rgba(34,40,78,.4);
  margin: 0 0 12px;
  font-weight: 500;
}
.btn-start {
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(255,107,157,.25);
  transition: all 0.2s;
}
.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255,107,157,.35);
}

/* Empty state: todo completado */
.stack-empty.all-done .empty-icon svg circle {
  stroke: #22c55e;
}
.done-title {
  font-size: 15px;
  font-weight: 800;
  color: #22c55e;
  margin: 0 0 4px;
}
.done-sub {
  font-size: 12px;
  color: rgba(34,40,78,.4);
  margin: 0 0 14px;
  font-weight: 500;
}
.btn-extend {
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #22c55e, #4ade80);
  box-shadow: 0 4px 16px rgba(34,197,94,.25);
}
.btn-extend:hover {
  box-shadow: 0 6px 20px rgba(34,197,94,.35);
}

/* Stack horizontal scroll */
.stack-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  margin: 0 -4px;
  padding: 0 4px;
}
.stack-scroll::-webkit-scrollbar {
  display: none;
}

.stack-item {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 135px;
  transition: transform 0.2s;
}

.stack-image-wrap {
  position: relative;
  width: 135px;
  height: 160px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(34,40,78,.1);
  transition: box-shadow 0.3s, border-color 0.3s;
}

.stack-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.stack-image.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32px;
  font-weight: 900;
}

/* Status badge */
.status-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
  transition: all 0.3s;
}

/* Progress bar at bottom */
.stack-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(0,0,0,.25);
  z-index: 2;
}
.stack-progress-bar {
  height: 100%;
  transition: width 0.5s ease;
  border-radius: 0 2px 2px 0;
}
.stack-progress-bar.completed {
  box-shadow: 0 0 8px rgba(245,158,11,.4);
}

/* Quick button */
.stack-quick-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,.95);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff6b9d;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
  transition: all 0.2s;
  backdrop-filter: blur(4px);
  z-index: 3;
}
.stack-quick-btn:hover {
  background: #ff6b9d;
  color: #fff;
  transform: scale(1.1);
}
.stack-quick-btn.confirming {
  background: #22c55e;
  color: #fff;
  animation: confirmPop 0.4s ease;
}
.stack-quick-btn:disabled {
  cursor: default;
}
@keyframes confirmPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.stack-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 4px;
}
.stack-name {
  font-size: 13px;
  font-weight: 700;
  color: #22284E;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stack-meta {
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
}

/* Days mini tracker */
.days-track {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.days-text {
  font-size: 9px;
  font-weight: 600;
  color: rgba(34,40,78,.35);
}
.days-bar {
  height: 3px;
  background: rgba(34,40,78,.08);
  border-radius: 99px;
  overflow: hidden;
}
.days-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.5s ease;
}

@media (max-width: 768px) {
  .hobby-stack-section {
    padding: 14px 12px;
  }
  .stack-item {
    width: 110px;
  }
  .stack-image-wrap {
    width: 110px;
    height: 135px;
    border-radius: 12px;
  }
  .stack-image.fallback {
    font-size: 22px;
  }
  .stack-quick-btn {
    width: 26px;
    height: 26px;
    top: 5px;
    right: 5px;
  }
  .stack-quick-btn svg {
    width: 12px;
    height: 12px;
  }
  .status-badge {
    width: 18px;
    height: 18px;
    top: 5px;
    left: 5px;
  }
  .status-badge svg {
    width: 8px;
    height: 8px;
  }
  .stack-name {
    font-size: 11px;
  }
  .stack-meta {
    font-size: 9px;
  }
  .days-text {
    font-size: 8px;
  }
  .stack-scroll {
    gap: 8px;
    margin: 0 -2px;
    padding: 0 2px;
  }
  .stack-progress {
    height: 3px;
  }
}

@media (max-width: 380px) {
  .stack-item {
    width: 100px;
  }
  .stack-image-wrap {
    width: 100px;
    height: 120px;
    border-radius: 10px;
  }
  .stack-name {
    font-size: 10px;
  }
  .stack-meta {
    font-size: 8px;
  }
}
</style>