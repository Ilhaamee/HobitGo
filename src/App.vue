<script setup>
import AICoach from './components/Aicoach.vue'
import ReminderBanner from './components/ReminderBanner.vue'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showCoach = computed(() => route.path.startsWith('/dashboard') && !route.path.includes('/chat'))

watch(() => route.path, () => {
  window.scrollTo({ top: 0, behavior: 'instant' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  const main = document.querySelector('.dash-main')
  if (main) main.scrollTop = 0
})
</script>

<template>
  <router-view />
  <AICoach v-if="showCoach" />
  <ReminderBanner v-if="showCoach" />
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button {
  font-family: inherit;
}

input {
  font-family: inherit;
}

/* Fix zoom en iOS al enfocar inputs */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  input,
  textarea,
  select {
    font-size: 16px !important;
  }
}
</style>