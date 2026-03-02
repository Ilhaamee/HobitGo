<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Titulo from './Titulo.vue'
import Button from './Button.vue'
import logo from '../assets/logo.png'

defineEmits(['signin', 'start'])

const isScrolled = ref(false)
const isMenuOpen = ref(false)

function handleScroll() {
  isScrolled.value = window.scrollY > 50
  // Close menu on scroll
  if (isMenuOpen.value) {
    isMenuOpen.value = false
  }
}

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <nav class="navbar" :class="{ scrolled: isScrolled }" role="navigation" aria-label="Main navigation">
    <div class="brand">
      <img :src="logo" alt="HobitGo Logo" class="logo-img" />
      <Titulo :size="28" :light="!isScrolled" />
    </div>

    <!-- Desktop buttons -->
    <div class="nav-buttons desktop-only">
      <Button :type="isScrolled ? 'outline' : 'outline-light'" @click="$emit('signin')">Sign in</Button>
      <Button type="primary" @click="$emit('start')">Start planning for free</Button>
    </div>

    <!-- Mobile menu button -->
    <button class="menu-toggle" @click="toggleMenu" aria-label="Toggle menu" aria-expanded="isMenuOpen">
      <span class="hamburger" :class="{ open: isMenuOpen }">
        <span></span>
        <span></span>
        <span></span>
      </span>
    </button>

    <!-- Mobile dropdown menu -->
    <div class="mobile-menu" :class="{ open: isMenuOpen }">
      <Button :type="isScrolled ? 'outline' : 'outline-light'" @click="$emit('signin'); isMenuOpen = false">Sign in</Button>
      <Button type="primary" @click="$emit('start'); isMenuOpen = false">Start planning for free</Button>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 20px 40px;
  align-items: center;
  z-index: 100;
  background: transparent;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

.navbar.scrolled {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}
.nav-buttons {
  display: flex;
  gap: 20px;
}

/* Mobile menu toggle */
.menu-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  z-index: 110;
}

.hamburger {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 24px;
}

.hamburger span {
  display: block;
  height: 2px;
  background: #333;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.navbar:not(.scrolled) .hamburger span {
  background: #fff;
}

.navbar.scrolled .hamburger span {
  background: #333;
}

.hamburger.open span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.hamburger.open span:nth-child(2) {
  opacity: 0;
}

.hamburger.open span:nth-child(3) {
  transform: rotate(-45deg) translate(5px, -5px);
}

/* Mobile dropdown menu */
.mobile-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  padding: 20px;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.mobile-menu.open {
  display: flex;
}

.mobile-menu :deep(.btn) {
  width: 100%;
  justify-content: center;
  background: transparent !important;
  border: none !important;
  color: #E08E6B !important;
  font-size: 18px !important;
  padding: 14px 24px !important;
}

.mobile-menu :deep(.btn:hover) {
  background: transparent !important;
  color: #22284E !important;
}

.mobile-menu :deep(.btn-primary) {
  background: transparent !important;
  border: none !important;
  color: #E08E6B !important;
  font-size: 18px !important;
  padding: 14px 24px !important;
}

.mobile-menu :deep(.btn-primary:hover) {
  background: transparent !important;
  color: #22284E !important;
}

.mobile-menu :deep(.btn-outline) {
  border-color: #E08E6B;
  color: #E08E6B;
  background: transparent;
}

.mobile-menu :deep(.btn-outline:hover) {
  background: #E08E6B;
  color: #fff;
}

/* Responsive */
@media (max-width: 768px) {
  .navbar {
    padding: 16px 20px;
  }
  
  .desktop-only {
    display: none;
  }
  
  .menu-toggle {
    display: block;
  }
}

@media (max-width: 480px) {
  .nav-buttons {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>