<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])
</script>

<template>
  <div class="edit-bar">
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      type="text"
      class="edit-input"
      @keyup.enter="$emit('save')"
    />
    <button class="edit-save" @click="$emit('save')">Guardar</button>
    <button class="edit-cancel" @click="$emit('cancel')">Cancelar</button>
  </div>
</template>

<style scoped>
.edit-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px;
  background: rgba(34,40,78,.03);
  border-top: 1px solid rgba(34,40,78,.06);
  flex-shrink: 0;
}
.edit-input {
  flex: 1; padding: 8px 12px;
  border: 1.5px solid rgba(34,40,78,.1); border-radius: 10px;
  font-size: 14px; color: #22284E; background: #fff; font-family: inherit;
}
.edit-input:focus { outline: none; border-color: #ff6b9d; }
.edit-save {
  padding: 8px 14px; border: none; border-radius: 8px;
  background: #22284E; color: #fff;
  font-size: 12px; font-weight: 700; cursor: pointer;
}
.edit-cancel {
  padding: 8px 14px; border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 8px; background: transparent;
  font-size: 12px; color: rgba(34,40,78,.5); cursor: pointer;
}
</style>