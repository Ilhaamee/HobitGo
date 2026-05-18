<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue:   { type: String, default: '' },
  placeholder:  { type: String, default: 'Escribe un mensaje...' },
  imagePreview: { type: String, default: null },
  uploading:    { type: Boolean, default: false },
  disabled:     { type: Boolean, default: false },
  sendColor:    { type: String, default: '' },
  showAttach:   { type: Boolean, default: true },
})

const emit = defineEmits([
  'update:modelValue', 'send', 'attach', 'clear-image'
])

const fileInputRef = ref(null)

function onAttachClick() {
  fileInputRef.value?.click()
}

function onFileChange(e) {
  emit('attach', e)
}

function onSend() {
  emit('send')
}
</script>

<template>
  <div class="msg-input-bar">
    <input
      v-if="showAttach"
      type="file"
      ref="fileInputRef"
      accept="image/*"
      style="display:none"
      @change="onFileChange"
    />

    <button
      v-if="showAttach"
      class="input-icon-btn attach-btn"
      @click="onAttachClick"
      title="Adjuntar imagen"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
      </svg>
    </button>

    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      type="text"
      class="msg-input"
      :placeholder="imagePreview ? 'Añade un texto (opcional)...' : placeholder"
      @keyup.enter="onSend"
      :disabled="uploading || disabled"
    />

    <button
      class="send-btn"
      @click="onSend"
      :disabled="(!modelValue.trim() && !imagePreview) || uploading || disabled"
      :style="sendColor ? { background: sendColor } : {}"
    >
      <svg v-if="!uploading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
      </svg>
      <span v-else class="spinner"></span>
    </button>
  </div>
</template>

<style scoped>
.msg-input-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(34,40,78,.06);
  flex-shrink: 0;
  background: #fff;
}

.input-icon-btn {
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(34,40,78,.05); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(34,40,78,.4);
  transition: all .2s; flex-shrink: 0;
}
.input-icon-btn svg { display: block; }
.attach-btn:hover {
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  transform: scale(1.05);
}

.msg-input {
  flex: 1;
  padding: 12px 16px;
  border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 14px;
  font-size: 14px;
  color: #22284E;
  background: #fafafa;
  font-family: inherit;
  transition: all .2s;
  min-width: 0;
}
.msg-input:focus {
  outline: none;
  border-color: #ff6b9d;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(255,107,157,.1);
}
.msg-input:disabled { opacity: .6; }

.send-btn {
  width: 44px; height: 44px; border-radius: 14px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  border: none; color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all .2s;
  box-shadow: 0 2px 10px rgba(255,107,157,.3);
}
.send-btn svg { display: block; }
.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(255,107,157,.4);
}
.send-btn:disabled { opacity: .4; cursor: not-allowed; }

.spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  animation: spin .7s linear infinite;
  display: block;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .msg-input-bar { padding: 10px 12px; }
  .msg-input { padding: 10px 12px; font-size: 16px; }
  .send-btn { width: 42px; height: 42px; }
}
</style>