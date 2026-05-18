<script setup>
const props = defineProps({
  src: { type: String, required: true },
})

const emit = defineEmits(['clear'])
</script>

<template>
  <div class="img-preview-bar">
    <img :src="src" />
    <button @click="$emit('clear')" title="Quitar imagen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.img-preview-bar {
  padding: 8px 16px 0;
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}
.img-preview-bar img {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid rgba(255,107,157,.3);
}
.img-preview-bar button {
  position: absolute;
  top: 4px;
  right: 12px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ff6b9d;
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.img-preview-bar button svg { display: block; }
</style>