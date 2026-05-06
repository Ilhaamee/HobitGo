<script setup>
defineProps({
  size: { type: [String, Number], default: 32 },
  light: { type: Boolean, default: false }
})
</script>

<template>
  <div class="logo" :class="{ light }" :style="{ fontSize: size + 'px' }">
    <span class="logo-hobit">Hobit</span><span class="logo-go">GO</span>
  </div>
</template>

<style scoped>
.logo {
  font-weight: 800;
  line-height: 1;
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  letter-spacing: -0.5px;
  user-select: none;
}

/* Por defecto (fondo blanco/claro): Hobit en navy, GO en rosa */
.logo-hobit { color: #22284E; }
.logo-go    { color: #ff6b9d; }

/* light=true (fondo oscuro como footer navy): Hobit en amarillo, GO en rosa */
.logo.light .logo-hobit { color: #fff59e; }
.logo.light .logo-go    { color: #ff6b9d; }
</style>