<template>
  <div class="tabs-bar" ref="barRef">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-btn"
      :class="{ active: modelValue === tab.key }"
      @click="$emit('update:modelValue', tab.key)"
    >
      <span class="tab-icon">{{ tab.icon }}</span>
      <span class="tab-label">{{ tab.label }}</span>
    </button>

    <!-- Indicador deslizante -->
    <div class="tab-ink" :style="inkStyle"></div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  modelValue: { type: String, required: true },
  tabs:       { type: Array,  default: () => [] },
})

defineEmits(['update:modelValue'])

const barRef   = ref(null)
const inkStyle = ref({ left: '0px', width: '0px' })

function moveInk() {
  nextTick(() => {
    if (!barRef.value) return
    const active = barRef.value.querySelector('.tab-btn.active')
    if (!active) return
    inkStyle.value = {
      left:  active.offsetLeft + 'px',
      width: active.offsetWidth + 'px',
    }
  })
}

watch(() => props.modelValue, moveInk)
onMounted(moveInk)
</script>

<style scoped>
.tabs-bar {
  position: relative;
  display: flex;
  background: #fff;
  border-radius: 16px;
  padding: 6px;
  box-shadow: 0 2px 14px rgba(34,40,78,.06);
  border: 1px solid rgba(34,40,78,.06);
  margin-bottom: 16px;
  gap: 2px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 11px 12px;
  border: none;
  background: transparent;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(34,40,78,.4);
  cursor: pointer;
  position: relative;
  z-index: 2;
  transition: color .22s;
  font-family: inherit;
  white-space: nowrap;
}
.tab-btn.active       { color: #22284E; }
.tab-btn:hover:not(.active) { color: rgba(34,40,78,.65); }

.tab-icon  { font-size: 15px; line-height: 1; }
.tab-label { font-size: 13px; }

/* Slider bajo la tab activa */
.tab-ink {
  position: absolute;
  top: 6px;
  bottom: 6px;
  border-radius: 12px;
  background: rgba(34,40,78,.06);
  transition: left .28s cubic-bezier(.4,0,.2,1),
              width .28s cubic-bezier(.4,0,.2,1);
  pointer-events: none;
  z-index: 1;
}

/* Móvil pequeño: solo icono */
@media (max-width: 380px) {
  .tab-label { display: none; }
  .tab-icon  { font-size: 18px; }
  .tab-btn   { padding: 12px 8px; }
}
</style>
