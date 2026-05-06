<script setup>
defineProps({
  name:     { type: String,  required: true },
  label:    { type: String,  required: true },
  symbol:   { type: String,  required: true },
  unlocked: { type: Boolean, default: false },
  color:    { type: String,  default: '#ff6b9d' },
})
</script>

<template>
  <div class="badge" :class="{ unlocked }" :title="label">
    <span
      class="badge-symbol"
      :style="unlocked ? { background: `linear-gradient(135deg, ${color}, ${color}99)`, color: '#fff' } : {}"
    >{{ symbol }}</span>
    <span class="badge-name">{{ name }}</span>
    <div v-if="unlocked" class="badge-glow" :style="{ background: color }"></div>
  </div>
</template>

<style scoped>
.badge {
  position: relative;
  display: flex; align-items: center; gap: 5px;
  padding: 5px 11px 5px 5px;
  border-radius: 99px;
  border: 1.5px solid rgba(34,40,78,.1);
  background: rgba(34,40,78,.03);
  color: rgba(34,40,78,.3);
  font-size: 11px; font-weight: 600;
  transition: all .2s; cursor: default;
  overflow: hidden;
}
.badge.unlocked {
  border-color: rgba(255,107,157,.25);
  color: #22284E;
  background: rgba(255,107,157,.06);
}
.badge-symbol {
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(34,40,78,.08);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; flex-shrink: 0;
  transition: background .2s;
}
.badge-name { white-space: nowrap; }
.badge-glow {
  position: absolute; inset: 0;
  opacity: .04; border-radius: inherit;
}
</style>