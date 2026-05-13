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
  <div class="cf-outer">
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
  </div>
</template>

<style scoped>
.cf-wrap {
  display: flex; gap: 6px;
  overflow-x: auto; overflow-y: visible;
  padding-bottom: 10px;
  scrollbar-width: none; -webkit-overflow-scrolling: touch;
  width: 100%;
  min-width: 0;
}
.cf-wrap::-webkit-scrollbar { display: none; }

.cf-pill {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 11px; border-radius: 99px; white-space: nowrap; flex-shrink: 0;
  border: 1.5px solid rgba(34,40,78,.12);
  background: transparent; color: rgba(34,40,78,.6);
  font-size: 11px; font-weight: 600; cursor: pointer;
  transition: all .18s;
}
.cf-pill:hover { border-color: rgba(34,40,78,.3); color: #22284E; }
.cf-pill.active { background: #22284E; border-color: #22284E; color: #fff59e; }

.cf-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}

.cf-outer {
  width: 100%;
  overflow: hidden;   
  position: relative;
}

.cf-wrap {
  display: flex; gap: 6px;
  overflow-x: auto; overflow-y: hidden;
  padding-bottom: 10px;
  scrollbar-width: none; -webkit-overflow-scrolling: touch;
  width: 100%;
  min-width: 0;
}
.cf-wrap::-webkit-scrollbar { display: none; }
</style>