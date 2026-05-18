<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  show:        { type: Boolean, default: false },
  title:       { type: String, default: 'Confirmar' },
  message:     { type: String, default: '' },
  confirmText: { type: String, default: 'Aceptar' },
  cancelText:  { type: String, default: 'Cancelar' },
  type:        { type: String, default: 'warning' },
  showInput:   { type: Boolean, default: false },
  inputType:   { type: String, default: 'number' },
  inputLabel:  { type: String, default: '' },
  inputValue:  { type: [String, Number], default: '' },
})

const emit = defineEmits(['confirm', 'cancel', 'update:inputValue'])

const localValue = ref(props.inputValue)
const inputRef = ref(null)

watch(() => props.inputValue, (val) => {
  localValue.value = val
})

watch(() => props.show, async (isOpen) => {
  if (isOpen && props.showInput) {
    await nextTick()
    inputRef.value?.focus()
  }
})

function onConfirm() {
  // Si NO hay input, emitir directamente sin validación
  if (!props.showInput) {
    emit('confirm', true)
    return
  }

  // Solo validar cuando showInput=true
  let value = localValue.value
  if (props.inputType === 'number') {
    value = parseInt(value, 10)
    if (isNaN(value) || value < 1) return
  }
  emit('confirm', value)
}
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="modal-overlay" @click.self="emit('cancel')">
      <div class="modal-card">
        <div class="modal-icon" :class="type">
          <span v-if="type === 'danger'">🗑️</span>
          <span v-else-if="type === 'warning'">⚠️</span>
          <span v-else-if="type === 'success'">✅</span>
          <span v-else-if="type === 'info'">ℹ️</span>
          <span v-else-if="type === 'extend'">📅</span>
          <span v-else-if="type === 'restart'">🔄</span>
          <span v-else>❓</span>
        </div>

        <h3 class="modal-title">{{ title }}</h3>
        <p v-if="message" class="modal-message">{{ message }}</p>

        <div v-if="showInput" class="modal-input-wrap">
          <label v-if="inputLabel">{{ inputLabel }}</label>
          <input
            ref="inputRef"
            v-model="localValue"
            :type="inputType"
            class="modal-input"
            min="1"
            @keyup.enter="onConfirm"
          />
        </div>

        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" @click="emit('cancel')">
            {{ cancelText }}
          </button>
          <button class="modal-btn modal-btn-confirm" :class="type" @click="onConfirm">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(34,40,78,.5);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 3000; padding: 20px;
}
.modal-card {
  background: #fff; border-radius: 20px;
  padding: 28px; width: 100%; max-width: 360px;
  box-shadow: 0 24px 60px rgba(34,40,78,.2);
  text-align: center;
  animation: popIn .3s cubic-bezier(.34,1.56,.64,1);
}
@keyframes popIn {
  0% { transform: scale(.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.modal-icon {
  width: 56px; height: 56px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px;
  margin: 0 auto 16px;
}
.modal-icon.danger  { background: rgba(220,38,38,.1); }
.modal-icon.warning { background: rgba(245,158,11,.1); }
.modal-icon.success { background: rgba(34,197,94,.1); }
.modal-icon.info    { background: rgba(59,130,246,.1); }

.modal-title {
  font-size: 18px; font-weight: 800;
  color: #22284E; margin: 0 0 8px;
}
.modal-message {
  font-size: 14px; color: rgba(34,40,78,.6);
  margin: 0 0 20px; line-height: 1.5;
}
.modal-input-wrap {
  margin-bottom: 20px;
  text-align: left;
}
.modal-input-wrap label {
  display: block; font-size: 12px;
  font-weight: 700; color: rgba(34,40,78,.5);
  text-transform: uppercase; letter-spacing: .05em;
  margin-bottom: 8px;
}
.modal-input {
  width: 100%; padding: 12px 14px;
  border: 2px solid #e5e7eb; border-radius: 12px;
  font-size: 16px; color: #22284E;
  font-family: inherit; box-sizing: border-box;
  transition: border-color .2s;
}
.modal-input:focus {
  outline: none; border-color: #ffb3c6;
}
.modal-actions {
  display: flex; gap: 10px;
}
.modal-btn {
  flex: 1; padding: 12px;
  border-radius: 12px; font-size: 14px;
  font-weight: 700; cursor: pointer;
  transition: all .2s; border: none;
}
.modal-btn-cancel {
  background: rgba(34,40,78,.06);
  color: #22284E;
}
.modal-btn-cancel:hover {
  background: rgba(34,40,78,.1);
}
.modal-btn-confirm {
  color: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
}
.modal-btn-confirm.danger {
  background: linear-gradient(135deg, #dc2626, #ef4444);
}
.modal-btn-confirm.warning {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
}
.modal-btn-confirm.success {
  background: linear-gradient(135deg, #22c55e, #4ade80);
}
.modal-btn-confirm.info {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
}
.modal-btn-confirm.extend {
  background: linear-gradient(135deg, #3b82f6, #ffb3c6);
}
.modal-btn-confirm.restart {
  background: linear-gradient(135deg, #60a5fa, #4ade80);
}

.modal-btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0,0,0,.2);
}

.modal-enter-active, .modal-leave-active { transition: all .2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(.95); }
</style>