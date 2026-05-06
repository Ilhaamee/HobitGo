<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()

onMounted(async () => {
  // Esperamos a que Supabase procese el token de la URL
  // (necesario para OAuth como Google)
  const { data: { session }, error } = await supabase.auth.getSession()

  if (session) {
    redirect(session)
    return
  }

  // Si no hay sesión todavía, escuchamos el evento authStateChange
  // que dispara Supabase cuando termina de procesar el token OAuth
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      subscription.unsubscribe()
      redirect(session)
    }
    // Si tras 5s no hay sesión, mandamos al home
  })

  // Timeout de seguridad — si algo falla no se queda colgado
  setTimeout(() => {
    subscription.unsubscribe()
    router.push('/')
  }, 5000)
})

function redirect(session) {
  if (!session) { router.push('/'); return }

  // Detectar si es cuenta nueva comparando created_at con now
  // Si la cuenta se creó hace menos de 10 segundos → es nueva → onboarding
  const createdAt  = new Date(session.user.created_at).getTime()
  const now        = Date.now()
  const isNew      = (now - createdAt) < 10000   // menos de 10 segundos

  const done = localStorage.getItem('onboarding_done')

  if (isNew && !done) {
    router.push('/onboarding')
  } else {
    router.push('/dashboard')
  }
}
</script>

<template>
  <div class="callback">
    <div class="loading">
      <div class="spinner"></div>
      <p>Iniciando sesión...</p>
    </div>
  </div>
</template>

<style scoped>
.callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #fff59e;
}
.loading { text-align: center; }
.spinner {
  width: 44px; height: 44px;
  border: 3px solid rgba(34,40,78,.12);
  border-top-color: #ff6b9d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
p { color: rgba(34,40,78,.55); font-size: 15px; margin: 0; }
</style>