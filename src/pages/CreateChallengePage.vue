<script setup>
import inicioImage from '../assets/inicio.png'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

defineProps({ show: Boolean })
defineEmits(['close', 'signin'])

const activeTab = ref('browser')

const habits = [
  { label: 'Yoga', color: '#ff6b9d' },
  { label: 'Lectura', color: '#8b5cf6' },
  { label: 'Running', color: '#f59e0b' },
  { label: 'Meditación', color: '#22c55e' },
  { label: 'Guitarra', color: '#22284E' },
  { label: 'Dibujo', color: '#ff6b9d' },
]

function handleCreateChallengeSignin() {
  showCreateChallenge.value = false
  openAuth('login')
}

async function handleGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  })
  if (error) console.error(error)
}
</script>

<template>
  <Transition name="modal-fade">
    <div
      v-if="show"
      class="overlay"
      @click.self="$emit('close')"
      role="dialog"
      aria-modal="true"
    >
      <div class="modal">

        <!-- Cerrar -->
        <button class="close-btn" @click="$emit('close')" aria-label="Cerrar">
          <svg viewBox="0 0 14 14" fill="none" width="11">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- ══ COLUMNA IZQUIERDA ══════════════════════════ -->
        <div class="modal-left">

          <!-- Decoración fondo izquierda -->
          <div class="left-glow g1" aria-hidden="true"></div>
          <div class="left-glow g2" aria-hidden="true"></div>

          <!-- Tag -->
          <div class="modal-tag">
            <span class="tag-dot"></span>
            100% gratuito
          </div>

          <h2>Tu primer hábito<br>empieza <span class="accent">hoy</span></h2>

          <p class="modal-desc">
            Organiza tu día, crea hábitos y empieza tu reto de 30 días con HobitGo.
          </p>

          <!-- Progreso animado -->
          <div class="mini-card">
            <div class="mc-row">
              <span class="mc-label">Racha actual</span>
              <span class="mc-val">Día 14 / 30</span>
            </div>
            <div class="mc-bar">
              <div class="mc-fill"></div>
            </div>
            <!-- Pills de hábitos con color en vez de emojis -->
            <div class="mc-habits">
              <span
                v-for="(h, i) in habits"
                :key="i"
                class="mc-habit"
                :style="{ '--hc': h.color, animationDelay: i * 0.08 + 's' }"
              >{{ h.label }}</span>
            </div>
          </div>

          <!-- Imagen app — transparente con máscara gradiente -->
          <div class="app-img-wrap">
            <img :src="inicioImage" alt="HobitGo app" class="app-img" />
          </div>

        </div>

        <!-- ══ COLUMNA DERECHA ════════════════════════════ -->
        <div class="modal-right">

          <div class="right-header">
            <h3>Empieza ahora</h3>
            <p>Elige cómo quieres acceder</p>
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button class="tab" :class="{ active: activeTab === 'browser' }" @click="activeTab = 'browser'">
              <svg viewBox="0 0 20 20" fill="none" width="14">
                <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/>
                <line x1="2" y1="7" x2="18" y2="7" stroke="currentColor" stroke-width="1.6"/>
              </svg>
              Navegador
            </button>
            <button class="tab" :class="{ active: activeTab === 'mobile' }" @click="activeTab = 'mobile'">
              <svg viewBox="0 0 20 20" fill="none" width="14">
                <rect x="6" y="1" width="8" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/>
                <circle cx="10" cy="16" r="1" fill="currentColor"/>
              </svg>
              Móvil
            </button>
          </div>

          <!-- ── Tab Web ── -->
          <div v-if="activeTab === 'browser'" class="tab-content">

            <button class="btn-primary" @click="$emit('signin', 'signin')">
              <!-- Icono persona -->
              <svg viewBox="0 0 20 20" fill="none" width="18" style="flex-shrink:0">
                <path d="M10 10a4 4 0 100-8 4 4 0 000 8zM3 18a7 7 0 0114 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
              Crear cuenta gratis
            </button>

            <button class="btn-ghost" @click="$emit('signin', 'login')">
              Ya tengo cuenta — entrar
            </button>

            <div class="or-line"><span>o continúa con</span></div>

            <button class="btn-google" @click="handleGoogle">
              <!-- Logo Google real en SVG -->
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>

          </div>

          <!-- ── Tab Móvil ── -->
          <div v-if="activeTab === 'mobile'" class="tab-content">

            <div class="store-row">
              <button class="btn-store">
                <!-- Apple icon -->
                <svg viewBox="0 0 24 24" fill="currentColor" width="18">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                App Store
              </button>
              <button class="btn-store">
                <!-- Play icon -->
                <svg viewBox="0 0 24 24" fill="currentColor" width="18">
                  <path d="M3.18 23.76c.3.17.64.24.99.19l12.6-7.27-2.7-2.7-10.89 9.78zM20.49 10.34L17.6 8.68l-3.03 3.03 3.03 3.03 2.91-1.68c.83-.48.83-1.73-.02-2.72zM2.01 1.05C1.68 1.36 1.5 1.84 1.5 2.48v19.04c0 .64.18 1.12.52 1.43l.08.07 10.66-10.66v-.25L2.09.98l-.08.07zM8.45 14.37l2.98-2.98 2.98 2.98-2.98 2.98-2.98-2.98z"/>
                </svg>
                Google Play
              </button>
            </div>

            <div class="qr-card">
              <div class="qr-img-wrap">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=22284E&bgcolor=ffffff&data=https://hobitgo.com/app"
                  alt="QR HobitGo"
                  width="90" height="90"
                />
              </div>
              <div class="qr-text">
                <strong>Escanea con tu cámara</strong>
                <p>Descarga directa sin buscar en la tienda</p>
              </div>
            </div>

          </div>

          <!-- Garantía -->
          <p class="guarantee">
            <svg viewBox="0 0 16 16" fill="none" width="14" style="flex-shrink:0">
              <path d="M8 1l1.8 3.6L14 5.2l-3 2.9.7 4.1L8 10.3l-3.7 1.9.7-4.1-3-2.9 4.2-.6L8 1z" stroke="#22c55e" stroke-width="1.3" stroke-linejoin="round"/>
            </svg>
            Sin tarjeta · Sin compromisos · 100% gratuito
          </p>

        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ─── Transición ─────────────────────────────────────── */
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity .28s ease; }
.modal-fade-enter-active .modal,
.modal-fade-leave-active .modal { transition: transform .28s ease, opacity .28s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal,
.modal-fade-leave-to .modal { transform: scale(.96) translateY(16px); opacity: 0; }

/* ─── Overlay ────────────────────────────────────────── */
.overlay {
  position: fixed; inset: 0;
  background: rgba(34,40,78,.5);
  backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}

/* ─── Modal ──────────────────────────────────────────── */
.modal {
  background: #fff;
  border-radius: 28px;
  width: 100%; max-width: 800px;
  display: grid; grid-template-columns: 1fr 1fr;
  overflow: hidden; position: relative;
  box-shadow: 0 40px 100px rgba(34,40,78,.25), 0 0 0 1px rgba(34,40,78,.06);
  max-height: 92vh;
}

/* ─── Botón cerrar ───────────────────────────────────── */
.close-btn {
  position: absolute; top: 14px; right: 14px; z-index: 20;
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.3);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #ff6b9d;
  transition: background .2s;
}
.close-btn:hover { background: #ffb3c6;  color: #fff;}

/* ─── IZQUIERDA ──────────────────────────────────────── */
.modal-left {
  background: #22284E;
  padding: 40px 32px 32px;
  display: flex; flex-direction: column; gap: 18px;
  position: relative; overflow: hidden;
}

/* Glows decorativos fondo izq */
.left-glow {
  position: absolute; border-radius: 50%;
  filter: blur(60px); pointer-events: none;
}
.g1 {
  width: 280px; height: 280px;
  background: rgba(255,107,157,.2);
  top: -80px; right: -60px;
  animation: glow-drift 10s ease-in-out infinite;
}
.g2 {
  width: 200px; height: 200px;
  background: rgba(255,245,158,.1);
  bottom: -60px; left: -40px;
  animation: glow-drift 14s ease-in-out infinite reverse;
}
@keyframes glow-drift {
  0%,100% { transform: translate(0,0); }
  50%      { transform: translate(20px,-15px); }
}

/* Tag */
.modal-tag {
  display: inline-flex; align-items: center; gap: 7px;
  background: rgba(255,245,158,.1);
  border: 1px solid rgba(255,245,158,.2);
  color: #fff59e; font-size: 11px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase;
  padding: 5px 13px; border-radius: 99px; width: fit-content;
}
.tag-dot { width: 5px; height: 5px; border-radius: 50%; background: #ff6b9d; }

/* Título izq */
.modal-left h2 {
  font-size: clamp(20px, 2.2vw, 28px); font-weight: 900;
  letter-spacing: -.8px; color: #fff; line-height: 1.15; margin: 0;
}
.accent {
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

.modal-desc {
  font-size: 13px; color: rgba(255,255,255,.5);
  line-height: 1.7; margin: 0;
}

/* Mini card progreso */
.mini-card {
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 16px; padding: 14px;
  display: flex; flex-direction: column; gap: 10px;
}
.mc-row { display: flex; justify-content: space-between; align-items: center; }
.mc-label { font-size: 12px; color: rgba(255,255,255,.45); }
.mc-val { font-size: 13px; font-weight: 700; color: #fff59e; }
.mc-bar {
  height: 5px; background: rgba(255,255,255,.1);
  border-radius: 99px; overflow: hidden;
}
.mc-fill {
  height: 100%; width: 47%;
  background: linear-gradient(90deg, #ff6b9d, #ffb3c6);
  border-radius: 99px;
  animation: fillbar 1.1s ease .2s both;
}
@keyframes fillbar { from { width: 0; } to { width: 47%; } }

.mc-habits { display: flex; flex-wrap: wrap; gap: 5px; }
.mc-habit {
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.12);
  color: rgba(255,255,255,.75);
  font-size: 11px; font-weight: 600;
  padding: 3px 10px; border-radius: 99px;
  border-left: 2px solid var(--hc);
  animation: popIn .35s ease both;
}
@keyframes popIn {
  from { opacity: 0; transform: scale(.85); }
  to   { opacity: 1; transform: scale(1); }
}

/* Imagen app con máscara gradiente — no cubre nada */
.app-img-wrap {
  position: relative; margin-top: auto;
  /* La máscara hace que la imagen se desvanezca abajo */
  mask-image: linear-gradient(to bottom, black 0%, black 55%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 55%, transparent 100%);
}
.app-img {
  width: 130px; display: block;
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(0,0,0,.35);
  transform: rotate(-5deg) translateX(20px);
}

/* ─── DERECHA ────────────────────────────────────────── */
.modal-right {
  padding: 40px 32px 32px;
  display: flex; flex-direction: column; gap: 18px;
}

.right-header h3 {
  font-size: 22px; font-weight: 800;
  color: #22284E; letter-spacing: -.5px; margin: 0 0 4px;
}
.right-header p { font-size: 13px; color: rgba(34,40,78,.45); margin: 0; }

/* Tabs */
.tabs {
  display: flex;
  background: rgba(34,40,78,.05);
  border-radius: 12px; padding: 4px; gap: 4px;
}
.tab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 12px; border: none;
  background: transparent; border-radius: 10px;
  font-size: 13px; font-weight: 600;
  color: rgba(34,40,78,.4); cursor: pointer;
  transition: all .2s;
}
.tab.active {
  background: #fff; color: #22284E;
  box-shadow: 0 2px 8px rgba(34,40,78,.1);
}

/* Contenido tab */
.tab-content { display: flex; flex-direction: column; gap: 10px; }

.btn-primary {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%;
  background: linear-gradient(135deg, #ff6b9d 0%, #ffb3c6 100%);
  color: #fff; border: none;
  font-size: 15px; font-weight: 800;
  padding: 14px 20px; border-radius: 14px; cursor: pointer;
  box-shadow: 0 8px 24px rgba(255,107,157,.28);
  transition: transform .18s, box-shadow .18s;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(255,107,157,.38); }

.btn-ghost {
  width: 100%;
  background: rgba(34,40,78,.04);
  border: 1.5px solid rgba(34,40,78,.1);
  color: #22284E; font-size: 14px; font-weight: 600;
  padding: 13px 20px; border-radius: 14px; cursor: pointer;
  transition: background .2s, border-color .2s;
}
.btn-ghost:hover { background: rgba(34,40,78,.07); border-color: rgba(34,40,78,.18); }

.or-line {
  display: flex; align-items: center; gap: 10px;
  font-size: 12px; color: rgba(34,40,78,.3);
}
.or-line::before, .or-line::after {
  content: ''; flex: 1; height: 1px; background: rgba(34,40,78,.08);
}

.btn-google {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; background: #fff;
  border: 1.5px solid rgba(34,40,78,.12);
  color: #22284E; font-size: 14px; font-weight: 600;
  padding: 13px 20px; border-radius: 14px; cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,.05);
  transition: box-shadow .2s, border-color .2s;
}
.btn-google:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); border-color: rgba(34,40,78,.2); }

/* Stores */
.store-row { display: flex; gap: 10px; }
.btn-store {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: #22284E; color: #fff59e;
  border: none; font-size: 13px; font-weight: 700;
  padding: 13px 14px; border-radius: 12px; cursor: pointer;
  transition: opacity .2s;
}
.btn-store:hover { opacity: .88; }

/* QR card */
.qr-card {
  display: flex; align-items: center; gap: 14px;
  background: rgba(34,40,78,.04);
  border: 1.5px solid rgba(34,40,78,.07);
  border-radius: 16px; padding: 14px;
}
.qr-img-wrap {
  padding: 8px; background: #fff;
  border-radius: 10px; flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(34,40,78,.08);
}
.qr-text strong { font-size: 13px; color: #22284E; display: block; margin-bottom: 3px; }
.qr-text p { font-size: 12px; color: rgba(34,40,78,.45); margin: 0; line-height: 1.5; }

/* Garantía */
.guarantee {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 12px; color: rgba(34,40,78,.4);
  margin-top: auto; padding-top: 4px;
}

/* ─── Responsive ─────────────────────────────────────── */
@media (max-width: 620px) {
  .modal { grid-template-columns: 1fr; max-height: 90vh; overflow-y: auto; }
  .modal-left { padding: 28px 24px 20px; }
  .modal-right { padding: 24px 24px 28px; }
  .app-img-wrap { display: none; }
  .close-btn { color: #ff6b9d; background: rgba(34,40,78,.08); border-color: rgba(34,40,78,.12); }
}
</style>