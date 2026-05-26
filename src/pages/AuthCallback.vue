<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()

onMounted(async () => {
  const { data: { session }, error } = await supabase.auth.getSession()

  // Detectar si viene de un reset de contraseña
  const hash = window.location.hash
  const isRecovery = hash.includes('type=recovery') || 
  new URLSearchParams(window.location.search).get('type') === 'recovery'

  if (isRecovery) {
    router.push('/reset-password')
    return
  }

  if (session) {
    await redirect(session)  
    return
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      subscription.unsubscribe()
      await redirect(session) 
    }
  })

  setTimeout(() => {
    subscription.unsubscribe()
    router.push('/')
  }, 5000)
})

async function redirect(session) {
  if (!session) { router.push('/'); return }

  const createdAt = new Date(session.user.created_at).getTime()
  const now       = Date.now()
  const isNew     = (now - createdAt) < 10000

  // Cuenta nueva — siempre al onboarding
  if (isNew) {
    router.push('/onboarding')
    return
  }

  // Cuenta existente — consultar Supabase como fuente de verdad
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', session.user.id)
    .single()

  const done = !!data?.onboarding_done

  if (done) {
    localStorage.setItem('onboarding_done', 'true')
    router.push('/dashboard')
  } else {
    router.push('/onboarding')
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