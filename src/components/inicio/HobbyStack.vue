<script setup>
import { ref } from 'vue'

const props = defineProps({
  hobbies: { type: Array, default: () => [] },
})

const emit = defineEmits(['quick-session'])

const confirmingId = ref(null)

function getProgress(hobby) {
  const total = (hobby.total_days || 30) * (hobby.daily_minutes || 20)
  return Math.min(100, Math.round(((hobby.total_minutes || 0) / total) * 100))
}

async function confirmQuick(hobbyId, mins) {
  confirmingId.value = hobbyId
  emit('quick-session', hobbyId, mins)
  setTimeout(() => {
    confirmingId.value = null
  }, 1000)
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

    <!-- Empty state -->
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

    <!-- Stack horizontal -->
    <div v-else class="stack-scroll">
      <div 
        v-for="hobby in hobbies.slice(0, 6)" 
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
          
          <!-- Progress overlay -->
          <div class="stack-progress">
            <div class="stack-progress-bar" :style="{ width: getProgress(hobby) + '%' }"></div>
          </div>
          
          <!-- Quick confirm button -->
          <button 
            class="stack-quick-btn"
            :class="{ confirming: confirmingId === hobby.id }"
            @click.stop="confirmQuick(hobby.id, 20)"
            :disabled="confirmingId === hobby.id"
          >
            <svg v-if="confirmingId === hobby.id" viewBox="0 0 24 24" fill="none" width="14" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" width="14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
        
        <div class="stack-info">
          <span class="stack-name">{{ hobby.name }}</span>
          <span class="stack-meta">{{ getProgress(hobby) }}% · {{ hobby.total_minutes || 0 }}min</span>
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
  gap: 8px;
  width: 130px;
}

.stack-image-wrap {
  position: relative;
  width: 130px;
  height: 160px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(34,40,78,.1);
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

/* Progress bar at bottom */
.stack-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(0,0,0,.3);
}
.stack-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #ff6b9d, #ffb3c6);
  transition: width 0.5s ease;
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
  gap: 2px;
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
  font-size: 11px;
  color: rgba(34,40,78,.4);
  font-weight: 500;
}

/* ═══ MÓVIL: Cards más pequeñas ═══ */
@media (max-width: 768px) {
  .hobby-stack-section {
    padding: 16px;
  }
  .stack-item {
    width: 110px;
  }
  .stack-image-wrap {
    width: 110px;
    height: 135px;
    border-radius: 14px;
  }
  .stack-image.fallback {
    font-size: 24px;
  }
  .stack-quick-btn {
    width: 28px;
    height: 28px;
    top: 6px;
    right: 6px;
  }
  .stack-name {
    font-size: 12px;
  }
  .stack-meta {
    font-size: 10px;
  }
  .stack-scroll {
    gap: 10px;
    margin: 0 -2px;
    padding: 0 2px;
  }
}

@media (max-width: 380px) {
  .stack-item {
    width: 100px;
  }
  .stack-image-wrap {
    width: 100px;
    height: 125px;
  }
}
</style>