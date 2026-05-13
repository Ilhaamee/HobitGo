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
            <span v-if="item.path === '/dashboard/friends' && pendingCount > 0" class="badge">{{ pendingCount }}</span>
          </div>
          <span v-if="isSidebarOpen" class="nav-label">{{ t(item.labelKey) }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <button class="logout-btn" @click="handleLogout">
          <font-awesome-icon icon="sign-out-alt" />
          <span v-if="isSidebarOpen">{{ t('logout') }}</span>
        </button>
      </div>
    </aside>

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

    <div v-if="friendNotification" class="toast friend-toast" @click="goToFriends">
      <div class="toast-avatar">
        <img v-if="friendNotification.avatar" :src="friendNotification.avatar" />
        <div v-else class="toast-avatar-placeholder">{{ friendNotification.username[0].toUpperCase() }}</div>
      </div>
      <div class="toast-content">
        <span class="toast-name">{{ friendNotification.username }}</span>
        <span class="toast-msg">{{ currentLang === 'en' ? 'Sent you a friend request' : 'Te ha enviado una solicitud de amistad' }}</span>
      </div>
      <button class="toast-close" @click.stop="friendNotification = null">✕</button>
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
import { useI18n } from '../composables/useI18n'

const route = useRoute()
const router = useRouter()
const { loadTheme } = useTheme()
const { t, currentLang, loadLanguage } = useI18n()

const menuItems = [
  { labelKey: 'home', icon: 'home', path: '/dashboard' },
  { labelKey: 'hobbies', icon: 'heart', path: '/dashboard/hobbies' },
  { labelKey: 'calendar', icon: 'calendar', path: '/dashboard/calendar' },
  { labelKey: 'chat', icon: 'comments', path: '/dashboard/chat' },
  { labelKey: 'friends', icon: 'user-group', path: '/dashboard/friends' },
  { labelKey: 'leaderboard', icon: 'trophy', path: '/dashboard/leaderboard' },
  { labelKey: 'profile', icon: 'user', path: '/dashboard/profile' },
]

const isSidebarOpen = ref(true)
const unreadCount = ref(0)
const pendingCount = ref(0)
const notification = ref(null)
const friendNotification = ref(null)
const currentUserId = ref(null)
let notifSubscription = null
let friendSubscription = null
let notifTimeout = null
let friendTimeout = null

async function handleLogout() {
  await supabase.auth.signOut()
  router.push('/')
}

function goToChat() { notification.value = null; unreadCount.value = 0; router.push('/dashboard/chat') }
function goToFriends() { friendNotification.value = null; router.push('/dashboard/friends') }

watch(() => route.path, (path) => {
  if (path === '/dashboard/chat') unreadCount.value = 0
  if (path === '/dashboard/friends') pendingCount.value = 0
})

async function loadPendingCount() {
  const { count } = await supabase.from('friendships').select('*', { count: 'exact', head: true })
    .eq('receiver_id', currentUserId.value).eq('status', 'pending')
  pendingCount.value = count || 0
}

async function setupNotifications() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  currentUserId.value = user.id
  await loadPendingCount()

  notifSubscription = supabase.channel(`msg-notifications-${currentUserId.value}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, async (payload) => {
      const msg = payload.new
      if (msg.receiver_id !== currentUserId.value) return
      if (route.path === '/dashboard/chat') return
      unreadCount.value++
      const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', msg.sender_id).single()
      notification.value = { username: profile?.username || '?', avatar: profile?.avatar_url || null, message: msg.content.length > 40 ? msg.content.slice(0, 40) + '...' : msg.content }
      if (notifTimeout) clearTimeout(notifTimeout)
      notifTimeout = setTimeout(() => notification.value = null, 4000)
    })
    .subscribe()

  friendSubscription = supabase.channel(`friend-notifications-${currentUserId.value}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships' }, async (payload) => {
      const f = payload.new
      if (f.receiver_id !== currentUserId.value) return
      pendingCount.value++
      const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', f.sender_id).single()
      friendNotification.value = { username: profile?.username || '?', avatar: profile?.avatar_url || null }
      if (friendTimeout) clearTimeout(friendTimeout)
      friendTimeout = setTimeout(() => friendNotification.value = null, 4000)
    })
    .subscribe()
}

onMounted(async () => {
  await loadTheme()
  await loadLanguage()
  await setupNotifications()
})

onUnmounted(() => {
  if (notifSubscription) supabase.removeChannel(notifSubscription)
  if (friendSubscription) supabase.removeChannel(friendSubscription)
  if (notifTimeout) clearTimeout(notifTimeout)
  if (friendTimeout) clearTimeout(friendTimeout)
})
</script>

<style scoped>
.dashboard-layout { display: flex; min-height: 100vh; background: var(--bg-secondary); }
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
.toast { position: fixed; bottom: 24px; right: 24px; background: var(--bg-card); border-radius: 16px; padding: 14px 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 12px; z-index: 9999; cursor: pointer; max-width: 320px; animation: slideIn 0.3s ease; border-left: 4px solid #E08E6B; }
.friend-toast { bottom: 90px; border-left-color: #4caf50; }
@keyframes slideIn { from{transform:translateX(100px);opacity:0} to{transform:translateX(0);opacity:1} }
.toast-avatar { width: 40px; height: 40px; border-radius: 12px; overflow: hidden; flex-shrink: 0; }
.toast-avatar img { width: 100%; height: 100%; object-fit: cover; }
.toast-avatar-placeholder { width: 100%; height: 100%; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; }
.toast-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.toast-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.toast-msg { font-size: 12px; color: var(--text-muted); }
.toast-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 16px; padding: 2px; }
@media (max-width: 768px) {
  .sidebar { width: 70px; }
  .brand-name, .nav-label, .toggle-btn { display: none; }
  .main-content { margin-left: 70px; }
  .toast { bottom: 12px; right: 12px; left: 12px; max-width: none; }
  .friend-toast { bottom: 80px; }
}
</style>