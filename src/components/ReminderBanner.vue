<template>
  <Transition name="banner-slide">
    <div v-if="show && pendingHobbies.length" class="reminder-banner">
      <div class="banner-content">
        <span class="banner-icon">⏰</span>
        <div class="banner-text">
          <strong>¡Hora de practicar!</strong>
          <span>{{ pendingHobbies.map(h => h.name).join(', ') }}</span>
        </div>
      </div>
      <div class="banner-actions">
        <button class="banner-btn primary" @click="goToDashboard">Ver</button>
        <button class="banner-btn close" @click="dismiss">✕</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications } from '../funciones/useNotifications.js'

const router = useRouter()
const { checkTodayReminders } = useNotifications()

const show          = ref(false)
const pendingHobbies = ref([])

const SESSION_KEY = 'reminder_banner_shown_' + new Date().toDateString()

onMounted(async () => {
  if (sessionStorage.getItem(SESSION_KEY)) return

  await new Promise(r => setTimeout(r, 3000))

  pendingHobbies.value = await checkTodayReminders()
  if (pendingHobbies.value.length) {
    show.value = true
    sessionStorage.setItem(SESSION_KEY, '1')
  }
})

function dismiss() {
  show.value = false
}

function goToDashboard() {
  show.value = false
  router.push('/dashboard')
}
</script>

<style scoped>
.reminder-banner {
  position: fixed;
  top: max(16px, env(safe-area-inset-top));
  left: 12px;
  right: 12px;
  z-index: 500;
  background: #22284E;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(34,40,78,.35);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.banner-icon { font-size: 22px; flex-shrink: 0; }

.banner-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.banner-text strong {
  font-size: 13px;
  font-weight: 800;
  color: #fff;
}
.banner-text span {
  font-size: 12px;
  color: rgba(255,255,255,.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.banner-btn {
  border: none; cursor: pointer; border-radius: 10px;
  font-size: 12px; font-weight: 700; transition: all .2s;
  padding: 7px 14px;
}
.banner-btn.primary {
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
}
.banner-btn.primary:hover { transform: scale(1.04); }
.banner-btn.close {
  background: rgba(255,255,255,.12);
  color: rgba(255,255,255,.7);
  padding: 7px 10px;
}
.banner-btn.close:hover { background: rgba(255,255,255,.2); }

.banner-slide-enter-active, .banner-slide-leave-active {
  transition: all .3s cubic-bezier(.34,1.56,.64,1);
}
.banner-slide-enter-from, .banner-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(.96);
}
</style>