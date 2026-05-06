<script setup>
defineProps({
  size: {
    type: [String, Number],
    default: 32
  },
  light: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <h1 class="titulo" :class="{ light }" :style="{ fontSize: size + 'px' }">
    <span class="hobbit">Hobbit</span>
    <span class="go">GO</span>
  </h1>
</template>

<style scoped>
.titulo {
  font-weight: 700;
  text-align: center;
  margin: 0;
  transition: color 0.3s ease;
}
.hobbit {
  color: #22284E;
  transition: color 0.3s ease;
}
.go {
  color: #E08E6B;
}

/* Light mode for dark backgrounds */
.titulo.light .hobbit {
  color: #fff;
}
</style>