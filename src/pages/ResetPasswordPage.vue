<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router   = useRouter()
const password = ref('')
const confirm  = ref('')
const loading  = ref(false)
const error    = ref('')
const success  = ref(false)
const showPass = ref(false)

async function handleReset() {
  if (!password.value)               { error.value = 'Introduce una contraseña'; return }
  if (password.value.length < 6)     { error.value = 'Mínimo 6 caracteres'; return }
  if (password.value !== confirm.value) { error.value = 'Las contraseñas no coinciden'; return }

  loading.value = true
  error.value   = ''

  const { error: err } = await supabase.auth.updateUser({ password: password.value })

  if (err) { error.value = err.message; loading.value = false; return }

  success.value = true
  setTimeout(() => router.push('/dashboard'), 2000)
}
</script>

<template>
  <div class="reset-page">
    <div class="reset-card">
      <h2>Nueva contraseña</h2>
      <p>Introduce tu nueva contraseña para continuar.</p>

      <template v-if="!success">
        <div class="input-wrap">
            <input
            v-model="password"
            :type="showPass ? 'text' : 'password'"
            class="input"
            placeholder="Nueva contraseña"
            />
            <button type="button" class="eye-btn" @click="showPass = !showPass">
            <svg v-if="!showPass" viewBox="0 0 20 20" fill="none" width="17">
                <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" stroke-width="1.5"/>
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <svg v-else viewBox="0 0 20 20" fill="none" width="17">
                <path d="M3 3l14 14M8.5 8.7A2.5 2.5 0 0013.3 13M6.2 5.4C4 6.8 2 10 2 10s3 5 8 5c1.5 0 2.8-.4 4-1M10 4c5 0 8 6 8 6s-.7 1.3-2 2.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            </button>
        </div>

        <div class="input-wrap">
            <input
            v-model="confirm"
            :type="showPass ? 'text' : 'password'"
            class="input"
            placeholder="Confirmar contraseña"
            @keyup.enter="handleReset"
            />
        </div>

        <p v-if="error" class="msg error">{{ error }}</p>
        <button class="btn" @click="handleReset" :disabled="loading">
            {{ loading ? 'Guardando...' : 'Guardar contraseña' }}
        </button>
        </template>

      <p v-else class="msg success">
        ✓ Contraseña actualizada — redirigiendo...
      </p>
    </div>
  </div>
</template>

<style scoped>
.reset-page {
  min-height: 100svh; background: #fff59e;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.reset-card {
  background: #fff; border-radius: 22px;
  padding: 36px; width: 100%; max-width: 380px;
  box-shadow: 0 24px 60px rgba(34,40,78,.12);
  display: flex; flex-direction: column; gap: 14px;
  text-align: center;
}
.reset-card h2 { font-size: 22px; font-weight: 800; color: #22284E; margin: 0; }
.reset-card p  { font-size: 13px; color: rgba(34,40,78,.5); margin: 0; }
.input {
  width: 100%; padding: 12px 14px; box-sizing: border-box;
  border: 1.5px solid rgba(34,40,78,.14); border-radius: 10px;
  font-size: 14px; color: #22284E; background: #fafafa; font-family: inherit;
}
.input:focus { outline: none; border-color: #ff6b9d; }
.btn {
  width: 100%; padding: 13px; border: none; border-radius: 12px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff; font-size: 15px; font-weight: 800; cursor: pointer;
}
.btn:disabled { opacity: .6; cursor: not-allowed; }
.msg { padding: 10px 14px; border-radius: 10px; font-size: 13px; text-align: left; }
.msg.error   { background: rgba(255,107,157,.1); color: #c0294a; border: 1px solid rgba(255,107,157,.2); }
.msg.success { background: rgba(34,197,94,.1);   color: #166534; border: 1px solid rgba(34,197,94,.2); }
.input-wrap { position: relative; }
.input-wrap .input { padding-right: 42px; }
.eye-btn {
  position: absolute; right: 12px; top: 50%;
  transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  color: rgba(34,40,78,.4); padding: 4px; transition: color .2s;
}
.eye-btn:hover { color: #ff6b9d; }
</style>