<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Titulo from '../components/Titulo.vue'
import { supabase } from '../lib/supabase'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

const props = defineProps({
  show: Boolean
})
const emit = defineEmits(['close', 'auth-success'])

const router = useRouter()

const mode = ref('signin') // 'signin' o 'login'
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const message = ref('')

async function handleSubmit() {
  if (!email.value) {
    error.value = 'Por favor, introduce tu email'
    return
  }
  
  if (!password.value) {
    error.value = 'Por favor, introduce una contraseña'
    return
  }
  
  loading.value = true
  error.value = ''
  message.value = ''
  
  try {
    if (mode.value === 'signin') {
      // Sign up with email and password
      const { error: signUpError, data } = await supabase.auth.signUp({
        email: email.value,
        password: password.value
      })
      
      if (signUpError) {
        // Check if user already exists
        if (signUpError.message.includes('already been registered') || signUpError.message.includes('already exists')) {
          error.value = 'Ya existe una cuenta con este email. Prueba a iniciar sesión.'
        } else {
          throw signUpError
        }
      } else if (data?.user) {
        message.value = '¡Revisa tu email para confirmar tu cuenta!'
      }
    } else {
      // Log in with email and password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value
      })
      
      if (signInError) throw signInError
      emit('close')
      // Redirect to dashboard
      router.push('/dashboard')
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleGoogleLogin() {
  loading.value = true
  error.value = ''
  
  try {
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (googleError) throw googleError
  } catch (err) {
    error.value = err.message
    loading.value = false
  }
}
</script>

<template>
  <div v-if="props.show" class="overlay" @click.self="emit('close')" role="dialog" aria-modal="true" aria-labelledby="signin-title">
    <div class="modal">
      <button class="close" @click="emit('close')" aria-label="Cerrar modal">✕</button>

      <!-- Logo desde Titulo.vue -->
      <Titulo :size="28" />

      <!-- Toggle Sign in / Log in -->
      <div class="toggle">
        <button :class="{ active: mode === 'signin' }" @click="mode = 'signin'">Sign in</button>
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">Log in</button>
      </div>

      <h2 id="signin-title" class="subtitle">
        {{ mode === 'signin' ? 'Crear una cuenta' : 'Iniciar sesión' }}
      </h2>
      <p class="instruction">
        {{ mode === 'signin' ? 'Introduce tu email para registrarte' : 'Introduce tu email para acceder' }}
      </p>

      <input 
        type="email" 
        placeholder="email@dominio.com" 
        class="email-input" 
        v-model="email"
        @keyup.enter="handleSubmit"
      />
      
      <div class="password-container">
        <input 
          :type="showPassword ? 'text' : 'password'" 
          placeholder="Contraseña" 
          class="email-input" 
          v-model="password"
          @keyup.enter="handleSubmit"
        />
        <button type="button" class="toggle-password" @click="showPassword = !showPassword">
          <font-awesome-icon :icon="showPassword ? 'eye-slash' : 'eye'" />
        </button>
      </div>
      
      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="message" class="success-message">{{ message }}</div>
      
      <button class="btn-primary" @click="handleSubmit" :disabled="loading">
        {{ loading ? 'Cargando...' : (mode === 'signin' ? 'Continuar' : 'Entrar') }}
      </button>

      <!-- Línea decorativa -->
      <div class="divider"><span>- o -</span></div>

      <button class="btn-google" @click="handleGoogleLogin" :disabled="loading">Continuar con Google</button>

      <p class="terms">
        Al hacer click en continuar estás aceptando nuestros<br />
        <strong>Términos de Servicio</strong> y nuestra <strong>Política de Privacidad</strong>
      </p>
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
  z-index: 1000;
}

.modal {
  background: #fff;
  padding: 40px;
  width: 400px;
  max-width: 90vw;
  border-radius: 16px;
  position: relative;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  max-height: 90vh;
  overflow-y: auto;
}

.close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.close:hover {
  opacity: 0.7;
}

.toggle {
  display: flex;
  justify-content: center;
  background: #f2f2f2;
  border-radius: 50px;
  padding: 6px;
  width: fit-content;
  margin: 20px auto;
}

.toggle button {
  padding: 12px 26px;
  border: none;
  background: transparent;
  color: #222;
  font-weight: 600;
  cursor: pointer;
  border-radius: 40px;
  font-size: 15px;
  transition: all 0.25s ease;
}

.toggle .active {
  background: #22284E;
  color: #fff;
  padding: 12px 32px; 
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
}

.subtitle {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 6px;
}

.instruction {
  font-size: 14px;
  color: #555;
  margin-bottom: 20px;
}

.email-input {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
  margin-bottom: 16px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.email-input:focus {
  outline: none;
  border-color: #E08E6B;
}

.password-container {
  position: relative;
  width: 100%;
}

.password-container .email-input {
  padding-right: 40px;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #888;
  padding: 4px;
}

.toggle-password:hover {
  color: #E08E6B;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
}

.success-message {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
}

.btn-primary {
  background: #E08E6B;
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  width: 100%;
  font-weight: 600;
  margin-bottom: 16px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s ease;
}

.btn-primary:hover {
  opacity: 0.9;
}

.divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px 0;
  font-size: 14px;
  color: #999;
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: #ccc;
  margin: 0 8px;
}

.btn-google,
.btn-apple {
  background: #f2f2f2;
  padding: 12px;
  border-radius: 8px;
  width: 100%;
  font-weight: 500;
  margin-bottom: 10px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.btn-google:hover,
.btn-apple:hover {
  background: #e5e5e5;
}

.terms {
  font-size: 12px;
  color: #777;
  margin-top: 10px;
  line-height: 1.5;
}

.terms strong {
  cursor: pointer;
  color: #22284E;
}

.terms strong:hover {
  text-decoration: underline;
}
</style>