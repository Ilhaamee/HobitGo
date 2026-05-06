<template>
  <div class="dashboard-layout">
    <aside class="sidebar" :class="{ collapsed: !isSidebarOpen }">
      <div class="sidebar-header">
        <img src="../assets/logo.png" alt="Logo" class="logo" />
        <span v-if="isSidebarOpen" class="brand-name">HobitGo</span>
        <button class="toggle-btn" @click="isSidebarOpen = !isSidebarOpen">
          <font-awesome-icon :icon="isSidebarOpen ? 'chevron-left' : 'chevron-right'" />
        </button>
      </div>

      <nav class="sidebar-nav">
        <router-link v-for="item in menuItems" :key="item.path" :to="item.path" class="nav-item" :class="{ active: route.path === item.path }">
          <div class="nav-icon-wrap">
            <font-awesome-icon :icon="item.icon" class="nav-icon" />
            <span v-if="item.path === '/dashboard/chat' && unreadCount > 0" class="badge">{{ unreadCount }}</span>
            <span v-if="item.path === '/dashboard/notifications' && notifCount > 0" class="badge">{{ notifCount }}</span>
          </div>
          <span v-if="isSidebarOpen" class="nav-label">{{ item.name }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <button class="logout-btn" @click="handleLogout">
          <font-awesome-icon icon="sign-out-alt" />
          <span v-if="isSidebarOpen">Cerrar sesión</span>
        </button>
      </div>
    </aside>

    <!-- Toast notificación -->
    <div v-if="notification" class="toast" @click="goToChat">
      <div class="toast-avatar">
        <img v-if="notification.avatar" :src="notification.avatar" />
        <div v-else class="toast-avatar-placeholder">{{ notification.username[0].toUpperCase() }}</div>
      </div>
      <div class="toast-content">
        <span class="toast-name">{{ notification.username }}</span>
        <span class="toast-msg">{{ notification.message }}</span>
      </div>
      <button class="toast-close" @click.stop="notification = null">✕</button>
    </div>

    <!-- Toast de logro desbloqueado -->
    <div v-if="achievementToast" class="toast achievement-toast">
      <div class="toast-avatar">
        <div class="achievement-icon-toast">{{ achievementToast.icon }}</div>
      </div>
      <div class="toast-content">
        <span class="toast-name">¡Logro desbloqueado!</span>
        <span class="toast-msg">{{ achievementToast.name }}</span>
      </div>
      <button class="toast-close" @click="achievementToast = null">✕</button>
    </div>

    <main class="main-content" :class="{ expanded: !isSidebarOpen }">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useTheme } from '../composables/useTheme'

const route = useRoute()
const router = useRouter()
const { loadTheme } = useTheme()

const menuItems = [
  { name: 'Home', icon: 'home', path: '/dashboard' },
  { name: 'Hobbies', icon: 'heart', path: '/dashboard/hobbies' },
  { name: 'Retos', icon: 'trophy', path: '/dashboard/leaderboard' },
  { name: 'Comunidad', icon: 'users', path: '/dashboard/community' },
  { name: 'Recompensas', icon: 'medal', path: '/dashboard/rewards' },
  { name: 'Consejos', icon: 'lightbulb', path: '/dashboard/tips' },
  { name: 'Calendario', icon: 'calendar', path: '/dashboard/calendar' },
  { name: 'Chat', icon: 'comments', path: '/dashboard/chat' },
  { name: 'Admin', icon: 'cog', path: '/dashboard/admin' },
  { name: 'Perfil', icon: 'user', path: '/dashboard/profile' },
]

const isSidebarOpen = ref(true)
const unreadCount = ref(0)
const notifCount = ref(0)
const notification = ref(null)
const achievementToast = ref(null)
const currentUserId = ref(null)
let notifSubscription = null
let notifTimeout = null
let achieveTimeout = null

async function handleLogout() {
  await supabase.auth.signOut()
  router.push('/')
}

function goToChat() {
  notification.value = null
  unreadCount.value = 0
  router.push('/dashboard/chat')
}

watch(() => route.path, (path) => {
  if (path === '/dashboard/chat') unreadCount.value = 0
})

async function setupNotifications() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  currentUserId.value = user.id

  notifSubscription = supabase.channel('notifications')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, async (payload) => {
      const msg = payload.new
      if (msg.receiver_id !== currentUserId.value) return
      if (route.path === '/dashboard/chat') return
      unreadCount.value++
      const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', msg.sender_id).single()
      const msgText = msg.content
        ? (msg.content.length > 40 ? msg.content.slice(0, 40) + '...' : msg.content)
        : '📷 Imagen'
      notification.value = {
        username: profile?.username || 'Alguien',
        avatar: profile?.avatar_url || null,
        message: msgText
      }
      if (notifTimeout) clearTimeout(notifTimeout)
      notifTimeout = setTimeout(() => notification.value = null, 4000)

      // Notificación push nativa si está permitida
      if (Notification?.permission === 'granted') {
        new Notification(`💬 ${profile?.username || 'Alguien'}`, {
          body: msgText,
          icon: '/favicon.ico'
        })
      }
    })
    // Escuchar nuevos posts en comunidad
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, async (payload) => {
      const post = payload.new
      if (post.user_id === currentUserId.value) return
      notifCount.value++
    })
    .subscribe()

  // Solicitar permiso para notificaciones push
  if (Notification && Notification.permission === 'default') {
    setTimeout(() => Notification.requestPermission(), 3000)
  }
}

// Función global para mostrar logros (usada por otras páginas)
window.showAchievement = (achievement) => {
  achievementToast.value = achievement
  if (achieveTimeout) clearTimeout(achieveTimeout)
  achieveTimeout = setTimeout(() => achievementToast.value = null, 5000)
}

onMounted(async () => {
  await loadTheme()
  await setupNotifications()
})

onUnmounted(() => {
  if (notifSubscription) supabase.removeChannel(notifSubscription)
  if (notifTimeout) clearTimeout(notifTimeout)
  if (achieveTimeout) clearTimeout(achieveTimeout)
})
</script>

<style scoped>
.dashboard-layout { display: flex; min-height: 100vh; background: var(--bg-secondary); }

.sidebar { width: 220px; background: linear-gradient(180deg, #22284E 0%, #1a1a2e 100%); color: #fff; display: flex; flex-direction: column; transition: width 0.3s ease; position: fixed; height: 100vh; z-index: 100; overflow-y: auto; }
.sidebar.collapsed { width: 70px; }

.sidebar-header { padding: 16px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.logo { width: 36px; height: 36px; border-radius: 10px; object-fit: contain; background: #fff; padding: 4px; flex-shrink: 0; }
.brand-name { font-size: 18px; font-weight: 700; color: #E08E6B; flex: 1; }
.toggle-btn { background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 4px; font-size: 12px; margin-left: auto; transition: color 0.2s; }
.toggle-btn:hover { color: #fff; }

.sidebar-nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 4px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; color: rgba(255,255,255,0.7); text-decoration: none; transition: all 0.2s; }
.nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
.nav-item.active { background: #E08E6B; color: #fff; }
.nav-icon-wrap { position: relative; width: 22px; display: flex; justify-content: center; flex-shrink: 0; }
.nav-icon { font-size: 17px; }
.badge { position: absolute; top: -6px; right: -8px; background: #e53935; color: #fff; font-size: 9px; font-weight: 700; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.nav-label { font-size: 13px; font-weight: 500; white-space: nowrap; }

.sidebar-footer { padding: 16px; border-top: 1px solid rgba(255,255,255,0.1); }
.logout-btn { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(255,255,255,0.1); border: none; border-radius: 8px; color: #fff; cursor: pointer; width: 100%; font-size: 13px; transition: background 0.2s; }
.logout-btn:hover { background: rgba(255,255,255,0.2); }

.main-content { flex: 1; margin-left: 220px; padding: 24px; transition: margin-left 0.3s ease; }
.main-content.expanded { margin-left: 70px; }

.toast { position: fixed; bottom: 24px; right: 24px; background: var(--bg-card); border-radius: 16px; padding: 14px 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 12px; z-index: 9999; cursor: pointer; max-width: 320px; animation: slideIn 0.3s ease; border-left: 4px solid #E08E6B; }
.achievement-toast { border-left-color: #ff9800; }
@keyframes slideIn { from{transform:translateX(100px);opacity:0} to{transform:translateX(0);opacity:1} }
.toast-avatar { width: 40px; height: 40px; border-radius: 12px; overflow: hidden; flex-shrink: 0; }
.toast-avatar img { width: 100%; height: 100%; object-fit: cover; }
.toast-avatar-placeholder { width: 100%; height: 100%; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; }
.achievement-icon-toast { width: 100%; height: 100%; background: #fff3e0; display: flex; align-items: center; justify-content: center; font-size: 20px; border-radius: 12px; }
.toast-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.toast-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.toast-msg { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.toast-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 16px; padding: 2px; flex-shrink: 0; }

@media (max-width: 768px) {
  .sidebar { width: 70px; }
  .brand-name, .nav-label, .toggle-btn { display: none; }
  .main-content { margin-left: 70px; padding: 16px; }
  .toast { bottom: 12px; right: 12px; left: 12px; max-width: none; }
}
</style>
