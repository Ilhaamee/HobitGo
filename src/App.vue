<template>
  <router-view />
</template>

<style>
@import './styles/dark-mode.css';

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-secondary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: background 0.3s ease, color 0.3s ease;
}

button { font-family: inherit; }
input  { font-family: inherit; }
</style>
