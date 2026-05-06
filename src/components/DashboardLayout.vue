<template>
  <div class="dash-root">

    <!-- ══ SIDEBAR — escritorio vertical ══════════════ -->
    <aside class="sidebar" :class="{ collapsed: !sidebarOpen }">

      <!-- Logo -->
      <div class="sb-header" :class="{ 'sb-header-collapsed': !sidebarOpen }">

        <!-- Expandido: logo + nombre + botón -->
        <template v-if="sidebarOpen">
          <div class="sb-logo">
            <img src="@/assets/logo.png" alt="HobitGo" class="sb-logo-img" />
            <span class="sb-brand">Hobit<span class="sb-go">GO</span></span>
          </div>
          <button class="sb-toggle" @click="sidebarOpen = false" title="Colapsar">
            <svg viewBox="0 0 16 16" fill="none" width="14">
              <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>

        <!-- Colapsado: solo botón centrado con flecha derecha -->
        <template v-else>
          <button class="sb-toggle sb-toggle-center" @click="sidebarOpen = true" title="Expandir">
            <svg viewBox="0 0 16 16" fill="none" width="14">
              <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>

      </div>

      <!-- Nav items -->
      <nav class="sb-nav">
        <router-link
          v-for="item in menuItems" :key="item.path"
          :to="item.path"
          class="sb-item"
          :class="{ active: route.path === item.path }"
          :title="!sidebarOpen ? item.name : ''"
        >
          <div class="sb-icon-wrap">
            <!-- Iconos SVG propios — sin FontAwesome -->
            <svg viewBox="0 0 20 20" fill="none" width="18" v-html="item.svg"></svg>
            <span v-if="item.path === '/dashboard/chat' && unreadCount > 0" class="sb-badge">{{ unreadCount }}</span>
          </div>
          <span v-if="sidebarOpen" class="sb-label">{{ item.name }}</span>

          <!-- Indicador activo lateral -->
          <div v-if="route.path === item.path" class="sb-active-dot"></div>
        </router-link>
      </nav>

      <!-- Footer sidebar -->
      <div class="sb-footer">
        <button class="sb-logout" @click="handleLogout" :title="!sidebarOpen ? 'Cerrar sesión' : ''">
          <svg viewBox="0 0 20 20" fill="none" width="16">
            <path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3M13 14l3-4-3-4M16 10H7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span v-if="sidebarOpen">Cerrar sesión</span>
        </button>
      </div>

    </aside>

    <!-- ══ CONTENIDO ════════════════════════════════ -->
    <main class="dash-main" :class="{ expanded: !sidebarOpen }">
      <router-view />
    </main>

    <!-- ══ BOTTOMBAR — móvil horizontal ════════════ -->
    <nav class="bottombar">
      <router-link
        v-for="item in menuItems" :key="item.path + '-m'"
        :to="item.path"
        class="bb-item"
        :class="{ active: route.path === item.path }"
      >
        <div class="bb-icon-wrap">
          <svg viewBox="0 0 20 20" fill="none" width="20" v-html="item.svg"></svg>
          <span v-if="item.path === '/dashboard/chat' && unreadCount > 0" class="bb-badge">{{ unreadCount }}</span>
        </div>
        <span class="bb-label">{{ item.name }}</span>
      </router-link>
    </nav>

    <!-- ══ TOAST notificación ════════════════════════ -->
    <Transition name="toast-slide">
      <div v-if="notification" class="toast" @click="goToChat">
        <div class="toast-av">
          <img v-if="notification.avatar" :src="notification.avatar" />
          <span v-else>{{ notification.username[0].toUpperCase() }}</span>
        </div>
        <div class="toast-body">
          <span class="toast-name">{{ notification.username }}</span>
          <span class="toast-msg">{{ notification.message }}</span>
        </div>
        <button class="toast-close" @click.stop="notification = null">
          <svg viewBox="0 0 12 12" fill="none" width="10">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const route  = useRoute()
const router = useRouter()

const sidebarOpen  = ref(true)
const unreadCount  = ref(0)
const notification = ref(null)
const currentUserId = ref(null)
let notifSubscription = null
let notifTimeout = null

// Iconos SVG inline — sin FontAwesome
const menuItems = [
  {
    name: 'Inicio', path: '/dashboard',
    svg: '<path d="M3 8l7-5 7 5v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 18V12h4v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
  },
  {
    name: 'Hobbies', path: '/dashboard/hobbies',
    svg: '<path d="M10 17s-7-4.35-7-8a4 4 0 018-1.17A4 4 0 0117 9c0 3.65-7 8-7 8z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    name: 'Calendario', path: '/dashboard/calendar',
    svg: '<rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M14 2v4M6 2v4M2 9h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
  },
  {
    name: 'Chat', path: '/dashboard/chat',
    svg: '<path d="M17 10c0 3.87-3.13 7-7 7a6.97 6.97 0 01-3.5-.94L3 17l.94-3.5A6.97 6.97 0 013 10c0-3.87 3.13-7 7-7s7 3.13 7 7z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    name: 'Ranking', path: '/dashboard/leaderboard',
    svg: '<path d="M8 15V9M12 15V5M16 15v-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M3 18h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
  },
  {
    name: 'Perfil', path: '/dashboard/profile',
    svg: '<circle cx="10" cy="7" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M3 18a7 7 0 0114 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
  },
]

async function handleLogout() {
  await supabase.auth.signOut()
  localStorage.removeItem('onboarding_done')
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

      notification.value = {
        username: profile?.username || 'Alguien',
        avatar:   profile?.avatar_url || null,
        message:  (msg.content || '').length > 40 ? msg.content.slice(0, 40) + '...' : (msg.content || '📷 Imagen')
      }

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
/* ─── Colores ─────────────────────────────────────────
   navy:  #22284E  |  pink: #ff6b9d  |  yellow: #fff59e
   bg:    #f4f5f9  |  card: #ffffff
────────────────────────────────────────────────────── */

.dash-root {
  display: flex;
  min-height: 100vh;
  background: #f4f5f9;
  font-family: inherit;
}

/* ══ SIDEBAR ════════════════════════════════════════ */
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #22284E 0%, #1a1f3a 100%);
  display: flex; flex-direction: column;
  position: fixed; top: 0; left: 0; bottom: 0;
  z-index: 100;
  transition: width .35s cubic-bezier(.4,0,.2,1);
  overflow: hidden;
  border-right: 1px solid rgba(255,255,255,.04);
}
.sidebar.collapsed { width: 72px; }

/* Header */
.sb-header {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 20px 16px 16px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0;
  min-height: 68px;
}
/* Colapsado: centrar el botón */
.sb-header-collapsed {
  justify-content: center;
  padding: 20px 0 16px;
}
.sb-logo-img {
  width: 32px; height: 32px;
  object-fit: contain;
  border-radius: 8px;
  flex-shrink: 0;
  background: #fff;
  padding: 2px;
}
/* Botón centrado cuando está colapsado */
.sb-toggle-center {
  margin: 0 auto;
}
.sb-logo {
  display: flex; align-items: center; gap: 10px;
  overflow: hidden;
}
.sb-brand {
  font-size: 18px; font-weight: 800;
  color: #fff59e; white-space: nowrap;
  letter-spacing: -.3px;
}
.sb-go { color: #ff6b9d; }

.sb-toggle {
  background: rgba(255,255,255,.08); border: none;
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(255,255,255,.5);
  flex-shrink: 0;
  transition: background .2s, color .2s;
}
.sb-toggle:hover { background: rgba(255,255,255,.14); color: #fff; }

/* Nav */
.sb-nav {
  flex: 1; padding: 16px 10px;
  display: flex; flex-direction: column; gap: 4px;
  overflow-y: auto; overflow-x: hidden;
}

.sb-item {
  display: flex; align-items: center; gap: 14px;
  padding: 13px 14px; border-radius: 12px;
  color: rgba(255,255,255,.55); text-decoration: none;
  position: relative; white-space: nowrap;
  transition: background .2s, color .2s;
  overflow: hidden;
}
/* Línea lateral que crece en hover/active — del estilo del documento */
.sb-item::before {
  content: '';
  position: absolute;
  left: 0; top: 50%;
  width: 3px; height: 0;
  background: #ff6b9d;
  border-radius: 0 4px 4px 0;
  transition: height .25s ease, top .25s ease;
  transform: translateY(-50%);
}
.sb-item:hover {
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.9);
}
.sb-item:hover::before { height: 20px; }
.sb-item.active {
  background: rgba(255,107,157,.12);
  color: #ff6b9d;
}
.sb-item.active::before { height: 60%; }

.sb-icon-wrap { position: relative; flex-shrink: 0; width: 20px; display: flex; justify-content: center; }
.sb-badge {
  position: absolute; top: -5px; right: -8px;
  background: #ff6b9d; color: #fff;
  font-size: 9px; font-weight: 800;
  min-width: 16px; height: 16px; border-radius: 99px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 3px;
}

.sb-label { font-size: 14px; font-weight: 600; }

.sb-active-dot {
  position: absolute; right: 10px; top: 50%;
  transform: translateY(-50%);
  width: 6px; height: 6px; border-radius: 50%;
  background: #ff6b9d;
}

/* Footer sidebar */
.sb-footer {
  padding: 12px 10px 20px;
  border-top: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0;
}
.sb-logout {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 12px; width: 100%;
  background: rgba(255,255,255,.06); border: none;
  border-radius: 12px; color: rgba(255,255,255,.45);
  font-size: 14px; font-weight: 500;
  cursor: pointer; white-space: nowrap;
  transition: background .2s, color .2s;
}
.sb-logout:hover { background: rgba(255,107,157,.15); color: #ffb3c6; }

/* ══ MAIN ═══════════════════════════════════════════ */
.dash-main {
  flex: 1;
  margin-left: 240px;
  padding: 28px;
  transition: margin-left .28s cubic-bezier(.4,0,.2,1);
  min-height: 100vh;
  padding-bottom: 100px; /* espacio para bottombar en móvil */
}
.dash-main.expanded { margin-left: 68px; }

/* ══ BOTTOMBAR — solo móvil ════════════════════════ */
.bottombar {
  display: none;
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #22284E;
  z-index: 100;
  padding: 8px 4px calc(8px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,.08);
}

.bb-item {
  display: flex; flex-direction: column;
  align-items: center; gap: 3px;
  color: rgba(255,255,255,.4); text-decoration: none;
  padding: 6px 4px; border-radius: 10px; flex: 1;
  position: relative;
  transition: color .18s;
}
.bb-item.active { color: #ff6b9d; }
.bb-item.active::before {
  content: '';
  position: absolute; top: -8px; left: 50%;
  transform: translateX(-50%);
  width: 28px; height: 3px;
  background: #ff6b9d; border-radius: 0 0 4px 4px;
}

.bb-icon-wrap { position: relative; }
.bb-badge {
  position: absolute; top: -4px; right: -6px;
  background: #ff6b9d; color: #fff;
  font-size: 8px; font-weight: 800;
  min-width: 14px; height: 14px; border-radius: 99px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 2px;
}
.bb-label { font-size: 9px; font-weight: 600; letter-spacing: .02em; }

/* ══ TOAST ══════════════════════════════════════════ */
.toast {
  position: fixed; bottom: 24px; right: 24px;
  background: #fff; border-radius: 16px;
  padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
  box-shadow: 0 8px 32px rgba(34,40,78,.15);
  z-index: 9999; cursor: pointer; max-width: 320px;
  border-left: 3px solid #ff6b9d;
}
.toast-slide-enter-active, .toast-slide-leave-active { transition: transform .3s ease, opacity .3s ease; }
.toast-slide-enter-from, .toast-slide-leave-to { transform: translateX(80px); opacity: 0; }

.toast-av {
  width: 38px; height: 38px; border-radius: 10px;
  overflow: hidden; flex-shrink: 0;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 15px;
}
.toast-av img { width: 100%; height: 100%; object-fit: cover; }

.toast-body { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.toast-name { font-size: 13px; font-weight: 700; color: #22284E; }
.toast-msg  { font-size: 12px; color: rgba(34,40,78,.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.toast-close {
  background: none; border: none; cursor: pointer;
  color: rgba(34,40,78,.3); padding: 4px; flex-shrink: 0;
  transition: color .2s;
}
.toast-close:hover { color: #ff6b9d; }

/* ══ RESPONSIVE ═════════════════════════════════════ */
@media (max-width: 768px) {
  .sidebar { display: none; }
  .dash-main { margin-left: 0; padding: 20px 16px; }
  .bottombar { display: flex; }
}
</style>