<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()

onMounted(async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    router.push('/')
    return
  }
  
  // El trigger ya creó el usuario automáticamente, ir directo al dashboard
  router.push('/dashboard')
})
</script>

<template>
  <div class="auth-callback">
    <div class="loading">
      <div class="spinner"></div>
      <p>Iniciando sesión...</p>
    </div>
  </div>
</template>

<style scoped>
.auth-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f5f7fa;
}

.loading {
  text-align: center;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #E08E6B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

p {
  color: #666;
  font-size: 16px;
}
</style>
