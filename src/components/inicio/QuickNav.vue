<script setup>
import { useRouter, useRoute } from 'vue-router'
const router = useRouter()
const route = useRoute()

const items = [
  {
    label: 'Hobbies',
    to: '/dashboard/hobbies',
    color: '#ff6b9d',
    bg: 'rgba(255,107,157,.12)',
    icon: `<svg viewBox="0 0 24 24" fill="none" width="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`
  },
  {
    label: 'Calendario',
    to: '/dashboard/calendar',
    color: '#22284E',
    bg: 'rgba(34,40,78,.08)',
    icon: `<svg viewBox="0 0 24 24" fill="none" width="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
  },
  {
    label: 'Chat',
    to: '/dashboard/chat',
    color: '#b8a800',
    bg: 'rgba(255,245,158,.45)',
    icon: `<svg viewBox="0 0 24 24" fill="none" width="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>`
  },
  {
    label: 'Perfil',
    to: '/dashboard/profile',
    color: '#ff6b9d',
    bg: 'rgba(255,107,157,.12)',
    icon: `<svg viewBox="0 0 24 24" fill="none" width="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
  },
]
</script>

<template>
  <nav class="quicknav-card">
    <p class="quicknav-title">Navegación rápida</p>
    <div class="quicknav-list">
      <button
        v-for="item in items"
        :key="item.to"
        class="quicknav-item"
        :class="{ active: route.path === item.to }"
        :style="route.path === item.to ? { background: item.bg, color: item.color } : {}"
        @click="router.push(item.to)"
      >
        <span
          class="quicknav-icon"
          v-html="item.icon"
          :style="{ color: route.path === item.to ? item.color : 'rgba(34,40,78,.4)' }"
        ></span>
        <span class="quicknav-label" :style="route.path === item.to ? { color: item.color, fontWeight: 800 } : {}">
          {{ item.label }}
        </span>
        <svg class="quicknav-arrow" viewBox="0 0 24 24" fill="none" width="14" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.quicknav-card {
  background: #fff;
  border-radius: 20px;
  padding: 18px 16px;
  box-shadow: 0 2px 12px rgba(34,40,78,.06);
  border: 1px solid rgba(34,40,78,.06);
}

.quicknav-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: rgba(34,40,78,.35);
  margin: 0 0 12px 4px;
}

.quicknav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quicknav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  color: rgba(34,40,78,.6);
}

.quicknav-item:hover:not(.active) {
  background: rgba(34,40,78,.04);
  color: #22284E;
}

.quicknav-item:hover:not(.active) .quicknav-icon {
  color: #22284E !important;
}

.quicknav-item:hover .quicknav-arrow {
  transform: translateX(3px);
  opacity: 1;
}

.quicknav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.2s;
}

.quicknav-label {
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  flex: 1;
  text-align: left;
}

.quicknav-arrow {
  color: rgba(34,40,78,.2);
  flex-shrink: 0;
  transition: transform 0.2s, opacity 0.2s;
  opacity: 0;
}

.quicknav-item.active .quicknav-arrow {
  opacity: 1;
}

@media (max-width: 1100px) {
  .quicknav-card {
    display: none;
  }
}
</style>