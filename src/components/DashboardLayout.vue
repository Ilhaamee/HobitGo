<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()

const menuItems = [
  { name: 'Home', icon: 'home', path: '/dashboard' },
  { name: 'Hobbies', icon: 'heart', path: '/dashboard/hobbies' },
  { name: 'Calendar', icon: 'calendar', path: '/dashboard/calendar' },
  { name: 'Chat', icon: 'comments', path: '/dashboard/chat' },
  { name: 'Profile', icon: 'user', path: '/dashboard/profile' }
]

const isSidebarOpen = ref(true)

async function handleLogout() {
  await supabase.auth.signOut()
  router.push('/')
}
</script>

<template>
  <div class="dashboard-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: !isSidebarOpen }">
      <div class="sidebar-header">
        <img src="../assets/logo.png" alt="Logo" class="logo" />
        <span v-if="isSidebarOpen" class="brand-name">HobitGo</span>
      </div>
      
      <nav class="sidebar-nav">
        <router-link 
          v-for="item in menuItems" 
          :key="item.path"
          :to="item.path" 
          class="nav-item"
          :class="{ active: route.path === item.path }"
        >
          <font-awesome-icon :icon="item.icon" class="nav-icon" />
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
    
    <!-- Main Content -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f7fa;
}

.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #22284E 0%, #1a1a2e 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: fixed;
  height: 100vh;
  z-index: 100;
}

.sidebar.collapsed {
  width: 70px;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: contain;
  background: #fff;
  padding: 4px;
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  color: #E08E6B;
}

.sidebar-nav {
  flex: 1;
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.nav-item.active {
  background: #E08E6B;
  color: #fff;
}

.nav-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.nav-label {
  font-size: 15px;
  font-weight: 500;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
  width: 100%;
  font-size: 14px;
  transition: background 0.2s ease;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.main-content {
  flex: 1;
  margin-left: 260px;
  padding: 24px;
  transition: margin-left 0.3s ease;
}

.sidebar.collapsed + .main-content {
  margin-left: 70px;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    width: 70px;
  }
  
  .sidebar .brand-name,
  .sidebar .nav-label,
  .sidebar span:not(.nav-icon) {
    display: none;
  }
  
  .main-content {
    margin-left: 70px;
  }
}
</style>
