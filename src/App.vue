<script setup>
import AICoach from './components/Aicoach.vue'
</script>

<template>
  <router-view />
  <AICoach />
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
</style>
