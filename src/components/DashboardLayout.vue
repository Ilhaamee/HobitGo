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

    <!-- Notificación toast -->
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

    <main class="main-content" :class="{ expanded: !isSidebarOpen }">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()

const menuItems = [
  { name: 'Home', icon: 'home', path: '/dashboard' },
  { name: 'Hobbies', icon: 'heart', path: '/dashboard/hobbies' },
  { name: 'Calendar', icon: 'calendar', path: '/dashboard/calendar' },
  { name: 'Chat', icon: 'comments', path: '/dashboard/chat' },
  { name: 'Clasificación', icon: 'trophy', path: '/dashboard/leaderboard' },
  { name: 'Perfil', icon: 'user', path: '/dashboard/profile' },
]

const isSidebarOpen = ref(true)
const unreadCount = ref(0)
const notification = ref(null)
const currentUserId = ref(null)
let notifSubscription = null
let notifTimeout = null

async function handleLogout() {
  await supabase.auth.signOut()
  router.push('/')
}

function goToChat() {
  notification.value = null
  unreadCount.value = 0
  router.push('/dashboard/chat')
}

// Limpiar badge cuando entramos al chat
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

      // Incrementar badge
      unreadCount.value++

      // Cargar info del remitente
      const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', msg.sender_id).single()

      notification.value = {
        username: profile?.username || 'Alguien',
        avatar: profile?.avatar_url || null,
        message: msg.content.length > 40 ? msg.content.slice(0, 40) + '...' : msg.content
      }

      // Auto-ocultar después de 4 segundos
      if (notifTimeout) clearTimeout(notifTimeout)
      notifTimeout = setTimeout(() => notification.value = null, 4000)
    })
    .subscribe()
}

onMounted(setupNotifications)
onUnmounted(() => {
  if (notifSubscription) supabase.removeChannel(notifSubscription)
  if (notifTimeout) clearTimeout(notifTimeout)
})
</script>

<style scoped>
.dashboard-layout { display: flex; min-height: 100vh; background: #f5f7fa; }

.sidebar { width: 260px; background: linear-gradient(180deg, #22284E 0%, #1a1a2e 100%); color: #fff; display: flex; flex-direction: column; transition: width 0.3s ease; position: fixed; height: 100vh; z-index: 100; }
.sidebar.collapsed { width: 70px; }

.sidebar-header { padding: 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.logo { width: 40px; height: 40px; border-radius: 10px; object-fit: contain; background: #fff; padding: 4px; flex-shrink: 0; }
.brand-name { font-size: 20px; font-weight: 700; color: #E08E6B; flex: 1; }
.toggle-btn { background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 4px; font-size: 12px; margin-left: auto; transition: color 0.2s; }
.toggle-btn:hover { color: #fff; }

.sidebar-nav { flex: 1; padding: 20px 12px; display: flex; flex-direction: column; gap: 8px; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; color: rgba(255,255,255,0.7); text-decoration: none; transition: all 0.2s; }
.nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
.nav-item.active { background: #E08E6B; color: #fff; }
.nav-icon-wrap { position: relative; width: 24px; display: flex; justify-content: center; flex-shrink: 0; }
.nav-icon { font-size: 20px; }
.badge { position: absolute; top: -6px; right: -8px; background: #e53935; color: #fff; font-size: 10px; font-weight: 700; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.nav-label { font-size: 15px; font-weight: 500; }

.sidebar-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); }
.logout-btn { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,0.1); border: none; border-radius: 10px; color: #fff; cursor: pointer; width: 100%; font-size: 14px; transition: background 0.2s; }
.logout-btn:hover { background: rgba(255,255,255,0.2); }

.main-content { flex: 1; margin-left: 260px; padding: 24px; transition: margin-left 0.3s ease; }
.main-content.expanded { margin-left: 70px; }

/* Toast notificación */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #fff;
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 9999;
  cursor: pointer;
  max-width: 320px;
  animation: slideIn 0.3s ease;
  border-left: 4px solid #E08E6B;
}

@keyframes slideIn {
  from { transform: translateX(100px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.toast-avatar { width: 40px; height: 40px; border-radius: 12px; overflow: hidden; flex-shrink: 0; }
.toast-avatar img { width: 100%; height: 100%; object-fit: cover; }
.toast-avatar-placeholder { width: 100%; height: 100%; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; }

.toast-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.toast-name { font-size: 13px; font-weight: 700; color: #1a1a2e; }
.toast-msg { font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }

.toast-close { background: none; border: none; color: #ccc; cursor: pointer; font-size: 16px; padding: 2px; flex-shrink: 0; }
.toast-close:hover { color: #888; }

@media (max-width: 768px) {
  .sidebar { width: 70px; }
  .brand-name, .nav-label, .toggle-btn { display: none; }
  .main-content { margin-left: 70px; }
  .toast { bottom: 12px; right: 12px; left: 12px; max-width: none; }
}
</style>