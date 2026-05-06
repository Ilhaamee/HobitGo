<script setup>
defineProps({
  type: {
    type: String,
    default: "primary"
  }
})
</script>

<template>
  <button :class="['btn', type]">
    <slot />
  </button>
</template>

<style scoped>
.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  font-size: 14px;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.btn:active {
  transform: translateY(0);
}
.primary {
  background: #E08E6B;
  color: #fff;
}
.secondary {
  background: #f2f2f2;
  color: #000;
}
.outline {
  background: transparent;
  border: 1px solid #000;
  color: #000;
}
.outline-light {
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
}
.outline-light:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>