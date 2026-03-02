<script setup>
defineProps({
  show: Boolean,
  title: String
})

defineEmits(['close'])
</script>

<template>
  <div v-if="show" class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <button class="close" @click="$emit('close')">✕</button>

      <h2>{{ title }}</h2>
      <p>Accede a HobitGo y empieza a crear hábitos positivos.</p>

      <div class="actions">
        <button class="google">Continuar con Google</button>
        <button class="email">Continuar con Email</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal {
  background: #fff;
  padding: 40px;
  width: 380px;
  border-radius: 16px;
  position: relative;
  text-align: center;
}

.close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  font-size: 20px;
}

.actions {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.google {
  background: #000;
  color: #fff;
  padding: 12px;
  border-radius: 8px;
}

.email {
  background: #f2f2f2;
  padding: 12px;
  border-radius: 8px;
}
</style>