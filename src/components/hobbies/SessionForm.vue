<script setup>
import { ref } from 'vue'

const props = defineProps({
  hobbyId: { type: String, required: true },
  color:   { type: String, default: '#ff6b9d' },
})
const emit = defineEmits(['add'])

const minutes = ref(null)
const note    = ref('')

function submit() {
  if (!minutes.value || minutes.value < 1) return
  emit('add', { hobbyId: props.hobbyId, minutes: minutes.value, note: note.value.trim() || null })
  minutes.value = null
  note.value    = ''
}
</script>

<template>
  <div class="session-form">
    <input
      v-model.number="minutes"
      type="number" min="1"
      class="sf-input sf-min"
      placeholder="Min"
      @keyup.enter="submit"
    />
    <input
      v-model="note"
      type="text"
      class="sf-input sf-note"
      placeholder="Nota (opcional)"
      @keyup.enter="submit"
    />
    <button
      class="sf-btn"
      :style="{ background: color }"
      @click="submit"
      :disabled="!minutes || minutes < 1"
    >
      <svg viewBox="0 0 14 14" fill="none" width="12">
        <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Añadir
    </button>
  </div>
</template>

<style scoped>
.session-form {
  display: flex; gap: 7px; align-items: center;
  padding: 12px 16px;
  border-top: 1px solid rgba(34,40,78,.06);
}
.sf-input {
  padding: 8px 10px;
  border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 8px; font-size: 13px;
  color: #22284E; background: #fafafa;
  font-family: inherit; box-sizing: border-box;
  transition: border-color .2s;
}
.sf-input:focus { outline: none; border-color: #ff6b9d; background: #fff; }
.sf-min  { width: 62px; flex-shrink: 0; }
.sf-note { flex: 1; }
.sf-btn {
  display: flex; align-items: center; gap: 5px;
  color: #fff; border: none; border-radius: 8px;
  font-size: 12px; font-weight: 700;
  padding: 8px 12px; cursor: pointer;
  white-space: nowrap; flex-shrink: 0;
  transition: opacity .2s;
}
.sf-btn:hover:not(:disabled) { opacity: .88; }
.sf-btn:disabled { opacity: .35; cursor: not-allowed; }
</style>