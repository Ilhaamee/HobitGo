<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLogo from '../components/ui/AppLogo.vue'
import { supabase } from '../lib/supabase'

const props = defineProps({
  show: Boolean,
  initialMode: { type: String, default: 'signin' }
})
const emit = defineEmits(['close', 'auth-success'])

const router = useRouter()

const mode         = ref(props.initialMode) // 'signin' | 'login'
const email        = ref('')
const password     = ref('')
const showPassword = ref(false)
const loading      = ref(false)
const error        = ref('')
const message      = ref('')
const showForgot  = ref(false)
const forgotEmail = ref('')
const forgotSent  = ref(false)
const forgotError = ref('')

async function handleForgot() {
  if (!forgotEmail.value) { forgotError.value = 'Introduce tu email'; return }
  const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.value, {
    redirectTo: `${window.location.origin}/auth/callback`
  })
  if (error) { forgotError.value = error.message; return }
  forgotSent.value = true

  // Desaparece a los 4 segundos
  setTimeout(() => {
    forgotSent.value  = false
    showForgot.value  = false
    forgotEmail.value = ''
  }, 4000)
}

// Si el padre cambia initialMode (ej: desde login a signin) lo aplicamos
import { watch } from 'vue'
watch(() => props.initialMode, val => { 
  mode.value = val 
  showForgot.value = false  
  forgotSent.value = false
  forgotError.value = ''
})

watch(mode, () => {
  showForgot.value  = false
  forgotSent.value  = false
  forgotError.value = ''
})

async function handleSubmit() {
  if (!email.value)    { error.value = 'Por favor, introduce tu email';      return }
  if (!password.value) { error.value = 'Por favor, introduce una contraseña'; return }

  loading.value = true
  error.value   = ''
  message.value = ''

  try {
    if (mode.value === 'signin') {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email: email.value,
        password: password.value
      })
      if (signUpError) {
        error.value = (signUpError.message.includes('already been registered') || signUpError.message.includes('already exists'))
          ? 'Ya existe una cuenta con este email. Prueba a iniciar sesión.'
          : 'No se pudo crear la cuenta: ' + signUpError.message
      } else if (data?.user) {
        // Siempre redirigir al onboarding si se creó el usuario
        // (con o sin confirmación de email, el usuario existe)
        emit('close')
        router.push('/onboarding')
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value
      })
      if (signInError) throw signInError

      // Consultar Supabase como fuente de verdad
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_done')
        .eq('id', user.id)
        .single()

      const done = !!data?.onboarding_done
      if (done) localStorage.setItem('onboarding_done', 'true')

      emit('close')
      router.push(done ? '/dashboard' : '/onboarding')
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleGoogleLogin() {
  loading.value = true
  error.value   = ''
  try {
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (googleError) throw googleError
  } catch (err) {
    error.value   = err.message
    loading.value = false
  }
}
</script>

<template>
  <Transition name="modal-fade">
    <div
      v-if="props.show"
      class="overlay"
      @click.self="emit('close')"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <div class="modal">

        <!-- Línea decorativa arriba -->
        <div class="modal-top-line"></div>

        <!-- Cerrar -->
        <button class="close-btn" @click="emit('close')" aria-label="Cerrar modal">
          <svg viewBox="0 0 14 14" fill="none" width="11">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- Logo -->
        <div class="modal-logo">
          <AppLogo :size="28" />
        </div>

        <!-- Toggle Sign in / Log in -->
        <div class="toggle">
          <button :class="{ active: mode === 'signin' }" @click="mode = 'signin'">Sign in</button>
          <button :class="{ active: mode === 'login'  }" @click="mode = 'login'">Log in</button>
        </div>

        <!-- Título -->
        <h2 id="auth-title" class="subtitle">
          {{ mode === 'signin' ? 'Crear una cuenta' : 'Iniciar sesión' }}
        </h2>
        <p class="instruction">
          {{ mode === 'signin' ? 'Introduce tu email para registrarte' : 'Introduce tu email para acceder' }}
        </p>

        <!-- Email -->
        <div class="field">
          <label class="field-label">Email</label>
          <input
            type="email"
            placeholder="email@dominio.com"
            class="field-input"
            v-model="email"
            @keyup.enter="handleSubmit"
            autocomplete="email"
          />
        </div>

        <!-- Password -->
        <div class="field">
          <label class="field-label">Contraseña</label>
          <div class="password-wrap">
            <input
              :type="showPassword ? 'text' : 'password'"
              placeholder="Contraseña"
              class="field-input"
              v-model="password"
              @keyup.enter="handleSubmit"
              autocomplete="current-password"
            />
            <button type="button" class="eye-btn" @click="showPassword = !showPassword" :aria-label="showPassword ? 'Ocultar' : 'Mostrar'">
              <!-- Ojo abierto -->
              <svg v-if="!showPassword" viewBox="0 0 20 20" fill="none" width="17">
                <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" stroke-width="1.5"/>
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <!-- Ojo cerrado -->
              <svg v-else viewBox="0 0 20 20" fill="none" width="17">
                <path d="M3 3l14 14M8.5 8.7A2.5 2.5 0 0013.3 13M6.2 5.4C4 6.8 2 10 2 10s3 5 8 5c1.5 0 2.8-.4 4-1M10 4c5 0 8 6 8 6s-.7 1.3-2 2.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Olvidaste contraseña -->
          <div v-if="mode === 'login'" class="forgot-wrap">
            <button class="forgot-btn" @click="showForgot = !showForgot">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <Transition name="slide">
            <div v-if="showForgot" class="forgot-box">
              <template v-if="!forgotSent">
                <p>Te enviaremos un enlace para restablecer tu contraseña.</p>
                <input
                  v-model="forgotEmail"
                  type="email"
                  class="field-input"
                  placeholder="Tu email"
                />
                <p v-if="forgotError" class="msg error">{{ forgotError }}</p>
                <button class="btn-primary" @click="handleForgot">
                  Enviar enlace
                </button>
              </template>
              <p v-else class="msg success">
                ✓ Revisa tu correo — te hemos enviado el enlace
              </p>
            </div>
          </Transition>

        <!-- Mensajes -->
        <div v-if="error"   class="msg error">{{ error }}</div>
        <div v-if="message" class="msg success">{{ message }}</div>

        <!-- Botón principal -->
        <button class="btn-primary" @click="handleSubmit" :disabled="loading">
          {{ loading ? 'Cargando...' : (mode === 'signin' ? 'Crear cuenta' : 'Entrar') }}
        </button>

        <!-- Separador -->
        <div class="divider"><span>o continúa con</span></div>

        <!-- Google -->
        <button class="btn-google" @click="handleGoogleLogin" :disabled="loading">
          <svg viewBox="0 0 24 24" width="18" height="18" style="flex-shrink:0">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        <!-- Términos -->
        <p class="terms">
          Al continuar aceptas nuestros
          <strong>Términos de Servicio</strong> y <strong>Política de Privacidad</strong>
        </p>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ─── Transición ─────────────────────────────────────── */
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity .25s ease; }
.modal-fade-enter-active .modal,
.modal-fade-leave-active .modal { transition: opacity .25s ease, transform .25s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal,
.modal-fade-leave-to .modal { opacity: 0; transform: scale(.96) translateY(14px); }

/* ─── Overlay ────────────────────────────────────────── */
.overlay {
  position: fixed; inset: 0;
  background: rgba(34,40,78,.45);
  backdrop-filter: blur(8px);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000; padding: 20px;
}

/* ─── Modal ──────────────────────────────────────────── */
.modal {
  background: #fff;
  width: 100%; max-width: 400px;
  border-radius: 22px;
  padding: 36px 36px 28px;
  position: relative; text-align: center;
  box-shadow: 0 24px 60px rgba(34,40,78,.16), 0 0 0 1px rgba(34,40,78,.06);
  max-height: 92vh; overflow-y: auto;
}

/* Línea rosa decorativa arriba */
.modal-top-line {
  position: absolute;
  top: 0; left: 12%; right: 12%; height: 3px;
  background: linear-gradient(90deg, transparent, #ff6b9d, #ffb3c6, transparent);
  border-radius: 0 0 4px 4px;
}

/* ─── Cerrar ─────────────────────────────────────────── */
.close-btn {
  position: absolute; top: 14px; right: 14px;
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(34,40,78,.06); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(34,40,78,.5);
  transition: background .2s, color .2s;
}
.close-btn:hover { background: rgba(255,107,157,.12); color: #ff6b9d; }

/* ─── Logo ───────────────────────────────────────────── */
.modal-logo { margin-bottom: 20px; display: flex; justify-content: center; }

/* ─── Toggle ─────────────────────────────────────────── */
.toggle {
  display: flex; justify-content: center;
  background: rgba(34,40,78,.06);
  border-radius: 99px; padding: 5px;
  width: fit-content; margin: 0 auto 22px; gap: 4px;
}
.toggle button {
  padding: 10px 24px; border: none;
  background: transparent; color: rgba(34,40,78,.5);
  font-weight: 600; font-size: 14px;
  cursor: pointer; border-radius: 99px;
  transition: all .22s ease;
}
.toggle .active {
  background: #22284E;
  color: #fff59e;
  box-shadow: 0 3px 10px rgba(34,40,78,.22);
}

/* ─── Título ─────────────────────────────────────────── */
.subtitle {
  font-size: 19px; font-weight: 700;
  color: #22284E; margin-bottom: 4px;
}
.instruction {
  font-size: 13px; color: rgba(34,40,78,.5);
  margin-bottom: 22px;
}

/* ─── Campos ─────────────────────────────────────────── */
.field {
  text-align: left; margin-bottom: 14px;
}
.field-label {
  display: block; font-size: 12px; font-weight: 600;
  color: rgba(34,40,78,.55); margin-bottom: 6px;
  letter-spacing: .02em;
}
.field-input {
  width: 100%; padding: 11px 14px;
  border: 1.5px solid rgba(34,40,78,.14);
  border-radius: 10px; font-size: 14px;
  color: #22284E; background: #fafafa;
  box-sizing: border-box; font-family: inherit;
  transition: border-color .2s, background .2s;
}
.field-input:focus {
  outline: none;
  border-color: #ff6b9d;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(255,107,157,.1);
}

.password-wrap { position: relative; }
.password-wrap .field-input { padding-right: 42px; }
.eye-btn {
  position: absolute; right: 12px; top: 50%;
  transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  color: rgba(34,40,78,.4); padding: 4px;
  transition: color .2s;
}
.eye-btn:hover { color: #ff6b9d; }

/* ─── Mensajes ───────────────────────────────────────── */
.msg {
  padding: 10px 14px; border-radius: 10px;
  font-size: 13px; margin-bottom: 12px; text-align: left;
}
.msg.error   { background: rgba(255,107,157,.1); color: #c0294a; border: 1px solid rgba(255,107,157,.2); }
.msg.success { background: rgba(34,197,94,.1);   color: #166534; border: 1px solid rgba(34,197,94,.2); }

/* ─── Botón principal ────────────────────────────────── */
.btn-primary {
  width: 100%;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff; border: none;
  font-size: 15px; font-weight: 800;
  padding: 13px 20px; border-radius: 12px;
  cursor: pointer; margin-bottom: 16px;
  box-shadow: 0 6px 20px rgba(255,107,157,.28);
  transition: transform .18s, box-shadow .18s, opacity .18s;
}
.btn-primary:hover  { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(255,107,157,.36); }
.btn-primary:active { transform: translateY(0); }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; transform: none; }

/* ─── Separador ──────────────────────────────────────── */
.divider {
  display: flex; align-items: center; gap: 10px;
  font-size: 12px; color: rgba(34,40,78,.35);
  margin-bottom: 14px;
}
.divider::before, .divider::after {
  content: ''; flex: 1; height: 1px;
  background: rgba(34,40,78,.1);
}

/* ─── Google ─────────────────────────────────────────── */
.btn-google {
  width: 100%; display: flex;
  align-items: center; justify-content: center; gap: 10px;
  background: #fff;
  border: 1.5px solid rgba(34,40,78,.14);
  color: #22284E; font-size: 14px; font-weight: 600;
  padding: 12px 20px; border-radius: 12px;
  cursor: pointer; margin-bottom: 18px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  transition: box-shadow .2s, border-color .2s;
}
.btn-google:hover { box-shadow: 0 4px 14px rgba(0,0,0,.1); border-color: rgba(34,40,78,.24); }
.btn-google:disabled { opacity: .6; cursor: not-allowed; }

/* ─── Términos ───────────────────────────────────────── */
.terms {
  font-size: 11px; color: rgba(34,40,78,.38);
  line-height: 1.6; margin: 0;
}
.terms strong {
  color: #22284E; cursor: pointer; font-weight: 600;
}
.terms strong:hover { color: #ff6b9d; text-decoration: underline; }
.forgot-wrap { text-align: right; margin-top: -8px; margin-bottom: 14px; }
.forgot-btn {
  background: none; border: none; cursor: pointer;
  font-size: 12px; color: rgba(34,40,78,.45);
  transition: color .2s;
}
.forgot-btn:hover { color: #ff6b9d; }
.forgot-box {
  background: rgba(34,40,78,.03);
  border: 1.5px solid rgba(34,40,78,.08);
  border-radius: 12px; padding: 14px;
  display: flex; flex-direction: column; gap: 10px;
  margin-bottom: 6px;
}
.forgot-box p { font-size: 13px; color: rgba(34,40,78,.55); margin: 0; }
.slide-enter-active, .slide-leave-active { transition: all .25s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>