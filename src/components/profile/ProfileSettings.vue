<template>
  <div class="settings-wrap">

    <!-- ── Identidad ──────────────────────── -->
    <div class="card">
      <div class="card-head">
        <div class="head-icon pink">
          <svg viewBox="0 0 18 18" fill="none" width="16" stroke="#ff6b9d" stroke-width="1.5">
            <circle cx="9" cy="6" r="3.2"/>
            <path d="M2 17a7 7 0 0114 0" stroke-linecap="round"/>
          </svg>
        </div>
        <div>
          <h3>Identidad</h3>
          <p>Tu nombre y bio públicos</p>
        </div>
      </div>

      <div class="field">
        <label>Nombre de usuario</label>
        <input
          v-model="localUsername"
          type="text"
          class="input"
          :class="{ 'input-error': nameError }"
          placeholder="Tu nombre..."
          maxlength="30"
          @input="nameError = ''"
        />
        <span v-if="nameError" class="err-msg">{{ nameError }}</span>
      </div>

      <div class="field">
        <label>Email</label>
        <input :value="email" type="email" class="input input-disabled" disabled/>
      </div>

      <div class="field">
        <label>Biografía</label>
        <textarea
          v-model="localBio"
          class="input input-textarea"
          placeholder="Cuéntanos algo sobre ti..."
          maxlength="150"
          rows="3"
        ></textarea>
        <span class="char-count">{{ localBio.length }}/150</span>
      </div>

      <Transition name="slide">
        <div v-if="profileSuccess" class="msg msg-ok">
          <svg viewBox="0 0 14 14" fill="none" width="13"
            stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M2 7l3.5 3.5 6.5-7"/>
          </svg>
          Guardado correctamente
        </div>
      </Transition>
      <div v-if="profileError" class="msg msg-err">{{ profileError }}</div>

      <button class="btn-save" @click="handleSaveProfile" :disabled="savingProfile">
        <span v-if="savingProfile" class="dots"><i></i><i></i><i></i></span>
        <span v-else>Guardar cambios</span>
      </button>
    </div>

    <!-- ── Privacidad ─────────────────────── -->
      <div class="card">
        <div class="card-head">
          <div class="head-icon pink">
            <svg viewBox="0 0 18 18" fill="none" width="16" stroke="#ff6b9d" stroke-width="1.5">
              <path d="M9 2a5 5 0 00-5 5v2a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2v-2a2 2 0 00-2-2V7a5 5 0 00-5-5z" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 14v3M6 17h6" stroke-linecap="round"/>
            </svg>
          </div>
          <div>
            <h3>Privacidad</h3>
            <p>Controla quién ve tu perfil</p>
          </div>
        </div>

        <div class="privacy-row">
          <div class="privacy-info">
            <span class="privacy-label">Perfil público</span>
            <span class="privacy-hint">{{ isPublic ? 'Cualquiera puede ver tus posts' : 'Solo tú ves tus posts' }}</span>
          </div>
          <button 
            class="toggle-btn" 
            :class="{ active: isPublic }"
            @click="$emit('toggle-privacy')"
            :disabled="savingPrivacy"
          >
            <div class="toggle-knob"></div>
          </button>
        </div>
      </div>

    <!-- ── Contraseña ─────────────────────── -->
    <div class="card">
      <div class="card-head">
        <div class="head-icon navy">
          <svg viewBox="0 0 18 18" fill="none" width="16" stroke="#22284E" stroke-width="1.5">
            <rect x="3" y="8" width="12" height="9" rx="2"/>
            <path d="M6 8V5.5a3 3 0 016 0V8" stroke-linecap="round"/>
          </svg>
        </div>
        <div>
          <h3>Contraseña</h3>
          <p>Actualiza tu clave de acceso</p>
        </div>
      </div>

      <div v-if="!showPwdForm" class="closed-row">
        <p>Tu contraseña es privada.</p>
        <button class="btn-outline" @click="showPwdForm = true">Cambiar contraseña</button>
      </div>

      <template v-else>
        <div class="field">
          <label>Nueva contraseña</label>
          <div class="pwd-wrap">
            <input
              v-model="pwd"
              :type="showPwd ? 'text' : 'password'"
              class="input"
              placeholder="Mínimo 6 caracteres"
            />
            <button class="eye-btn" type="button" @click="showPwd = !showPwd">
              <svg viewBox="0 0 16 16" fill="none" width="14">
                <path v-if="!showPwd"
                  d="M1 8s2.8-5 7-5 7 5 7 5-2.8 5-7 5-7-5-7-5z"
                  stroke="currentColor" stroke-width="1.3"/>
                <circle v-if="!showPwd" cx="8" cy="8" r="2.2" stroke="currentColor" stroke-width="1.3"/>
                <path v-else
                  d="M2 2l12 12M6.5 6.7A2 2 0 0010.3 10M5 4.5A7 7 0 002 8s2.8 5 6 5c.8 0 1.6-.2 2.3-.5"
                  stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="strength-bar">
            <div v-for="i in 4" :key="i" class="seg"
              :class="{ on: pwdStrength >= i }"
              :style="pwdStrength >= i ? { background: pwdColor } : {}">
            </div>
            <span v-if="pwd" class="strength-lbl" :style="{ color: pwdColor }">
              {{ pwdLabel }}
            </span>
          </div>
        </div>

        <div class="field">
          <label>Confirmar contraseña</label>
          <input
            v-model="confirm"
            :type="showPwd ? 'text' : 'password'"
            class="input"
            :class="{ 'input-error': confirm && pwd !== confirm }"
            placeholder="Repite la contraseña"
          />
          <span v-if="confirm && pwd !== confirm" class="err-msg">Las contraseñas no coinciden</span>
        </div>

        <Transition name="slide">
          <div v-if="passwordSuccess" class="msg msg-ok">
            <svg viewBox="0 0 14 14" fill="none" width="13"
              stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M2 7l3.5 3.5 6.5-7"/>
            </svg>
            Contraseña actualizada
          </div>
        </Transition>
        <div v-if="passwordError" class="msg msg-err">{{ passwordError }}</div>

        <div class="btn-row">
          <button class="btn-save" @click="handleSavePwd" :disabled="savingPassword">
            <span v-if="savingPassword" class="dots"><i></i><i></i><i></i></span>
            <span v-else>Guardar</span>
          </button>
          <button class="btn-ghost" @click="cancelPwd">Cancelar</button>
        </div>
      </template>
    </div>

    <!-- ── Cerrar sesión ───────────────────── -->
    <div class="card card-danger">
      <div class="card-head">
        <div class="head-icon red">
          <svg viewBox="0 0 18 18" fill="none" width="16" stroke="#ef4444" stroke-width="1.5">
            <path d="M7 3H4a1 1 0 00-1 1v10a1 1 0 001 1h3M11 12l3-3-3-3M14 9H7"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <h3>Cerrar sesión</h3>
          <p>Salir de tu cuenta en este dispositivo</p>
        </div>
      </div>
      <button class="btn-danger" @click="$emit('logout')">Cerrar sesión</button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  username:        { type: String,  default: '' },
  bio:             { type: String,  default: '' },
  email:           { type: String,  default: '' },
  savingProfile:   { type: Boolean, default: false },
  profileSuccess:  { type: Boolean, default: false },
  profileError:    { type: String,  default: '' },
  savingPassword:  { type: Boolean, default: false },
  passwordSuccess: { type: Boolean, default: false },
  passwordError:   { type: String,  default: '' },
  isPublic: { type: Boolean, default: true },
  savingPrivacy: { type: Boolean, default: false },
})

const emit = defineEmits(['save-profile', 'save-password', 'logout', 'toggle-privacy'])

/* ── Identidad ──────────────────────────── */
const localUsername = ref(props.username)
const localBio      = ref(props.bio)
const nameError     = ref('')

watch(() => props.username, v => localUsername.value = v)
watch(() => props.bio,      v => localBio.value      = v)

function handleSaveProfile() {
  if (!localUsername.value.trim()) { nameError.value = 'El nombre es obligatorio'; return }
  emit('save-profile', { username: localUsername.value.trim(), bio: localBio.value.trim() })
}

/* ── Contraseña ─────────────────────────── */
const showPwdForm = ref(false)
const showPwd     = ref(false)
const pwd         = ref('')
const confirm     = ref('')

const pwdStrength = computed(() => {
  const p = pwd.value; if (!p) return 0
  let s = 0
  if (p.length >= 6)           s++
  if (p.length >= 10)          s++
  if (/[A-Z0-9]/.test(p))     s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})
const pwdColor = computed(() => ['','#ef4444','#f59e0b','#3b82f6','#22c55e'][pwdStrength.value] || '')
const pwdLabel = computed(() => ['','Débil','Regular','Buena','Fuerte'][pwdStrength.value] || '')

function handleSavePwd() {
  emit('save-password', { password: pwd.value, confirm: confirm.value })
}

function cancelPwd() {
  showPwdForm.value = false
  pwd.value         = ''
  confirm.value     = ''
  showPwd.value     = false
}
</script>

<style scoped>
.settings-wrap { display: flex; flex-direction: column; gap: 14px; }

/* Card */
.card {
  background: #fff;
  border-radius: 20px; padding: 22px;
  border: 1px solid rgba(34,40,78,.07);
  box-shadow: 0 2px 14px rgba(34,40,78,.05);
  display: flex; flex-direction: column; gap: 16px;
}
.card-danger { border-color: rgba(239,68,68,.12); }

/* Head */
.card-head {
  display: flex; align-items: flex-start; gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(34,40,78,.06);
}
.head-icon {
  width: 36px; height: 36px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.pink  { background: rgba(255,107,157,.1); }
.navy  { background: rgba(34,40,78,.08);   }
.red   { background: rgba(239,68,68,.08);  }
.card-head h3 { font-size: 15px; font-weight: 800; color: #22284E; margin: 0 0 2px; }
.card-head p  { font-size: 12px; color: rgba(34,40,78,.45); margin: 0; }

/* Fields */
.field { display: flex; flex-direction: column; gap: 6px; }
.field label {
  font-size: 11px; font-weight: 700;
  color: rgba(34,40,78,.45);
  text-transform: uppercase; letter-spacing: .06em;
}
.input {
  width: 100%; padding: 11px 14px;
  border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 12px; font-size: 14px;
  color: #22284E; background: #fafafa;
  font-family: inherit; box-sizing: border-box;
  transition: border-color .2s, background .2s, box-shadow .2s;
}
.input:focus {
  outline: none; border-color: #ff6b9d;
  background: #fff; box-shadow: 0 0 0 3px rgba(255,107,157,.1);
}
.input-error    { border-color: #ef4444 !important; }
.input-disabled { opacity: .5; cursor: not-allowed; }
.input-textarea { resize: none; line-height: 1.6; }
.err-msg    { font-size: 12px; color: #ef4444; }
.char-count { font-size: 11px; color: rgba(34,40,78,.3); text-align: right; }

/* Password */
.pwd-wrap { position: relative; }
.pwd-wrap .input { padding-right: 44px; }
.eye-btn {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  color: rgba(34,40,78,.4); transition: color .2s;
}
.eye-btn:hover { color: #ff6b9d; }

.strength-bar { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
.seg {
  flex: 1; height: 3px; border-radius: 99px;
  background: rgba(34,40,78,.08); transition: background .3s;
}
.strength-lbl { font-size: 11px; font-weight: 700; min-width: 44px; text-align: right; }

/* Messages */
.msg {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 11px; font-size: 13px;
}
.msg-ok  { background: rgba(34,197,94,.09);  color: #166534; border: 1px solid rgba(34,197,94,.18); }
.msg-err { background: rgba(239,68,68,.08);  color: #dc2626; border: 1px solid rgba(239,68,68,.15); }
.slide-enter-active, .slide-leave-active { transition: all .25s; }
.slide-enter-from,   .slide-leave-to    { opacity: 0; transform: translateY(-6px); }

/* Closed row */
.closed-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.closed-row p { font-size: 13px; color: rgba(34,40,78,.5); margin: 0; }

/* Buttons */
.btn-row { display: flex; gap: 10px; align-items: center; }

.btn-save {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: linear-gradient(135deg, #22284E, #3d4570);
  color: #fff59e; border: none;
  font-size: 14px; font-weight: 700; font-family: inherit;
  padding: 12px 24px; border-radius: 12px; cursor: pointer;
  box-shadow: 0 4px 14px rgba(34,40,78,.22);
  transition: transform .18s, box-shadow .18s, opacity .2s;
}
.btn-save:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(34,40,78,.32); }
.btn-save:disabled { opacity: .6; cursor: not-allowed; transform: none; }

.btn-outline {
  background: rgba(34,40,78,.06); border: 1.5px solid rgba(34,40,78,.12);
  color: #22284E; font-size: 13px; font-weight: 700; font-family: inherit;
  padding: 10px 18px; border-radius: 11px; cursor: pointer;
  transition: background .2s; white-space: nowrap;
}
.btn-outline:hover { background: rgba(34,40,78,.1); }

.btn-ghost {
  background: none; border: none; font-size: 13px; font-weight: 600;
  font-family: inherit; color: rgba(34,40,78,.5); cursor: pointer; transition: color .2s;
}
.btn-ghost:hover { color: #ff6b9d; }

.btn-danger {
  background: rgba(239,68,68,.08); border: 1.5px solid rgba(239,68,68,.18);
  color: #dc2626; font-size: 14px; font-weight: 700; font-family: inherit;
  padding: 11px 20px; border-radius: 12px; cursor: pointer; transition: background .2s;
}
.btn-danger:hover { background: rgba(239,68,68,.15); }

/* Dots loader */
.dots { display: flex; gap: 3px; align-items: center; }
.dots i { display: block; width: 5px; height: 5px; border-radius: 50%; background: currentColor; animation: dot .8s ease-in-out infinite; }
.dots i:nth-child(2) { animation-delay: .15s; }
.dots i:nth-child(3) { animation-delay: .30s; }
@keyframes dot { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
.privacy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.privacy-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.privacy-label {
  font-size: 15px;
  font-weight: 700;
  color: #22284E;
}

.privacy-hint {
  font-size: 13px;
  color: rgba(34,40,78,.4);
}

.toggle-btn {
  width: 52px;
  height: 28px;
  border-radius: 99px;
  background: rgba(34,40,78,.15);
  border: none;
  position: relative;
  cursor: pointer;
  transition: background .25s;
}

.toggle-btn.active {
  background: #ff6b9d;
}

.toggle-knob {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform .25s;
  box-shadow: 0 1px 4px rgba(0,0,0,.15);
}

.toggle-btn.active .toggle-knob {
  transform: translateX(24px);
}
</style>