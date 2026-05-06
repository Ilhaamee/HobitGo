<script setup>
defineProps({
  hobbies: { type: Array, default: () => [] },
  active:  { type: String, default: null },
})
const emit = defineEmits(['change'])

function color(h) {
  return Array.isArray(h.gradient) ? h.gradient[0] : '#ff6b9d'
}
</script>

<template>
  <div class="cf-wrap">
    <button
      class="cf-pill"
      :class="{ active: active === null }"
      @click="emit('change', null)"
    >Todo</button>

    <button
      v-for="h in hobbies" :key="h.id"
      class="cf-pill"
      :class="{ active: active === h.id }"
      :style="active === h.id ? { background: color(h), borderColor: color(h), color: '#fff' } : { borderColor: color(h) + '55' }"
      @click="emit('change', active === h.id ? null : h.id)"
    >
      <span class="cf-dot" :style="{ background: color(h) }"></span>
      {{ h.name }}
    </button>
  </div>
</template>

<style scoped>
.cf-wrap {
  display: flex; gap: 7px; overflow-x: auto; padding-bottom: 12px;
  scrollbar-width: none;
}
.cf-wrap::-webkit-scrollbar { display: none; }

.cf-pill {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 13px; border-radius: 99px; white-space: nowrap; flex-shrink: 0;
  border: 1.5px solid rgba(34,40,78,.12);
  background: transparent; color: rgba(34,40,78,.6);
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: all .18s;
}
.cf-pill:hover { border-color: rgba(34,40,78,.3); color: #22284E; }
.cf-pill.active { background: #22284E; border-color: #22284E; color: #fff59e; }

.cf-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
</style>