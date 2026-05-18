<script setup>
import { computed, ref, onMounted } from 'vue'

const props = defineProps({
  profile: { type: Object, default: null },
  streak:  { type: Number, default: 0 },
})

const visible = ref(false)
const showRabbit = ref(false)
const rabbitGone = ref(false)

onMounted(() => {
  setTimeout(() => visible.value = true, 100)
  setTimeout(() => showRabbit.value = true, 600)
  setTimeout(() => {
    rabbitGone.value = true
    setTimeout(() => showRabbit.value = false, 800)
  }, 4100)
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6)  return 'Buenas noches'
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
})

const quote = computed(() => {
  const quotes = [
    'Cada día es una nueva oportunidad',
    'La constancia crea hábitos sólidos',
    'El progreso es mejor que la perfección',
    'Pequeños pasos, grandes cambios',
    'Tu futuro se construye con lo que haces hoy',
    'La disciplina vence al talento',
  ]
  return quotes[new Date().getDate() % quotes.length]
})

const initial = computed(() => (props.profile?.username || '?')[0].toUpperCase())
</script>

<template>
  <header class="welcome-arc" :class="{ visible }">

    <!-- Fondo con gradiente suave y ondas -->
    <div class="arc-bg" aria-hidden="true">
      <div class="arc-wave wave-1"></div>
      <div class="arc-wave wave-2"></div>
      <div class="arc-glow"></div>
    </div>

    <!-- Conejito animado que aparece y DESAPARECE -->
    <Transition name="rabbit">
      <div v-if="showRabbit" class="rabbit-popup" :class="{ 'rabbit-leave': rabbitGone }">
        <div class="rabbit-container">
          <!-- Conejo SVG estilo Lop (orejas caídas) blanco/gris -->
          <svg class="rabbit-svg" viewBox="0 0 100 120">
            <!-- Orejas caídas tipo Lop -->
            <path d="M28 30 Q20 55 25 70 Q30 80 35 70 Q38 55 35 30 Q32 20 28 30Z" fill="#f5f5f0" stroke="#d4d4d4" stroke-width="1"/>
            <path d="M72 30 Q80 55 75 70 Q70 80 65 70 Q62 55 65 30 Q68 20 72 30Z" fill="#f5f5f0" stroke="#d4d4d4" stroke-width="1"/>
            <!-- Interior orejas -->
            <path d="M30 35 Q26 55 29 65 Q32 70 34 65 Q36 55 33 35Z" fill="#e8e8e8"/>
            <path d="M70 35 Q74 55 71 65 Q68 70 66 65 Q64 55 67 35Z" fill="#e8e8e8"/>

            <!-- Cabeza -->
            <ellipse cx="50" cy="58" rx="30" ry="26" fill="#fafafa" stroke="#e0e0e0" stroke-width="1"/>

            <!-- Manchas marrones suaves -->
            <ellipse cx="35" cy="48" rx="4" ry="3" fill="#c4a882" opacity="0.4"/>
            <ellipse cx="72" cy="52" rx="3" ry="2.5" fill="#c4a882" opacity="0.3"/>
            <ellipse cx="30" cy="65" rx="3" ry="2" fill="#c4a882" opacity="0.3"/>

            <!-- Mejillas -->
            <circle cx="30" cy="62" r="5" fill="#f0e0d0" opacity="0.5"/>
            <circle cx="70" cy="62" r="5" fill="#f0e0d0" opacity="0.5"/>

            <!-- Ojos grandes y brillantes -->
            <ellipse cx="40" cy="55" rx="4" ry="6" fill="#22284E"/>
            <ellipse cx="60" cy="55" rx="4" ry="6" fill="#22284E"/>
            <circle cx="42" cy="52" r="2" fill="#fff"/>
            <circle cx="62" cy="52" r="2" fill="#fff"/>
            <circle cx="38" cy="57" r="1.2" fill="#fff" opacity="0.5"/>
            <circle cx="58" cy="57" r="1.2" fill="#fff" opacity="0.5"/>

            <!-- Nariz -->
            <ellipse cx="50" cy="64" rx="2.5" ry="1.8" fill="#c4a882"/>

            <!-- Boca -->
            <path d="M46 68 Q50 73 54 68" fill="none" stroke="#22284E" stroke-width="1.2" stroke-linecap="round"/>

            <!-- Bigotes -->
            <line x1="22" y1="62" x2="32" y2="64" stroke="#999" stroke-width="0.6" opacity="0.4"/>
            <line x1="22" y1="66" x2="32" y2="65" stroke="#999" stroke-width="0.6" opacity="0.4"/>
            <line x1="78" y1="62" x2="68" y2="64" stroke="#999" stroke-width="0.6" opacity="0.4"/>
            <line x1="78" y1="66" x2="68" y2="65" stroke="#999" stroke-width="0.6" opacity="0.4"/>

            <!-- Cuerpo -->
            <ellipse cx="50" cy="95" rx="20" ry="16" fill="#fafafa" stroke="#e0e0e0" stroke-width="1"/>
            <ellipse cx="50" cy="95" rx="10" ry="8" fill="#f5f5f0" opacity="0.6"/>

            <!-- Patas -->
            <ellipse cx="36" cy="108" rx="5" ry="3.5" fill="#f5f5f0" stroke="#ddd" stroke-width="0.8"/>
            <ellipse cx="64" cy="108" rx="5" ry="3.5" fill="#f5f5f0" stroke="#ddd" stroke-width="0.8"/>

            <!-- Cola esponjosa -->
            <circle cx="72" cy="98" r="6" fill="#f5f5f0" stroke="#e0e0e0" stroke-width="0.8"/>
            <circle cx="70" cy="96" r="3" fill="#fff"/>

            <!-- Manos que saludan -->
            <g class="rabbit-paws">
              <ellipse cx="30" cy="85" rx="4" ry="6" fill="#fafafa" stroke="#e0e0e0" stroke-width="0.8" transform="rotate(-15 30 85)"/>
              <ellipse cx="70" cy="85" rx="4" ry="6" fill="#fafafa" stroke="#e0e0e0" stroke-width="0.8" transform="rotate(15 70 85)"/>
            </g>
          </svg>

          <!-- Burbuja de diálogo del conejo -->
          <div class="rabbit-bubble">
            <span class="rabbit-text">¡Hola {{ profile?.username || 'amigo' }}!</span>
            <div class="rabbit-bubble-tail"></div>
          </div>

          <!-- Estrellitas alrededor -->
          <div class="rabbit-stars">
            <span class="star s1">✨</span>
            <span class="star s2">⭐</span>
            <span class="star s3">✨</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Contenido principal -->
    <div class="arc-content">
      <!-- Izquierda: Info -->
      <div class="arc-left">
        <div class="arc-meta">
          <span class="arc-time">{{ greeting }}</span>
          <span class="arc-divider">·</span>
          <span class="arc-date">{{ new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) }}</span>
        </div>

        <h1 class="arc-title">
          <span class="arc-greeting">Hola,</span>
          <span class="arc-name">{{ profile?.username || 'explorador' }}</span>
        </h1>

        <p class="arc-quote">{{ quote }}</p>

        <div v-if="streak > 0" class="arc-streak">
          <div class="streak-icon">
            <!-- Icono de racha con gradiente amarillo-rosa-azul -->
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <defs>
                <linearGradient id="streakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#fff59e"/>
                  <stop offset="40%" style="stop-color:#ffb3c6"/>
                  <stop offset="70%" style="stop-color:#ff6b9d"/>
                  <stop offset="100%" style="stop-color:#ADD8E6"/>
                </linearGradient>
              </defs>
              <path d="M12 2L14.5 9H22L16 13.5L18.5 21L12 16.5L5.5 21L8 13.5L2 9H9.5L12 2Z" fill="url(#streakGrad)" stroke="#22284E" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="streak-count">{{ streak }}</span>
          <span class="streak-label">días seguidos</span>
          <div class="streak-dots">
            <span v-for="n in Math.min(streak, 7)" :key="n" class="dot" :style="{ animationDelay: `${n * 0.1}s` }"></span>
          </div>
        </div>
      </div>

      <!-- Derecha: Avatar con anillo -->
      <div class="arc-right">
        <div class="avatar-orbit">
          <div class="orbit-ring"></div>
          <div class="orbit-ring-2"></div>
          <div class="avatar-main">
            <img v-if="profile?.avatar_url" :src="profile.avatar_url" alt="avatar" />
            <span v-else>{{ initial }}</span>
          </div>
        </div>
      </div>
    </div>

  </header>
</template>

<style scoped>
/* ═══ CONTENEDOR PRINCIPAL ═══ */
.welcome-arc {
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.welcome-arc.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Forma con arco superior - amarillo dominante con toques de todos los colores */
.welcome-arc::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(165deg, 
    #fffef0 0%, 
    #fff9c4 10%,
    #fff59e 25%,
    #fff3e0 40%,
    #ffe4ec 55%,
    #e0f2fe 75%, 
    #f8fafc 90%,
    #fafafa 100%
  );
  border-radius: 24px 24px 40px 40px;
  z-index: 0;
  box-shadow: 
    0 4px 20px rgba(34, 40, 78, 0.06),
    0 1px 3px rgba(34, 40, 78, 0.04);
}

/* Línea decorativa superior - amarillo dominante con todos los colores */
.welcome-arc::after {
  content: '';
  position: absolute;
  top: 0;
  left: 5%;
  right: 5%;
  height: 3px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    #fff59e 10%,
    #ffb3c6 25%,
    #ff6b9d 40%,
    #e91e63 55%,
    #ADD8E6 75%,
    #22284E 90%,
    transparent 100%
  );
  border-radius: 0 0 3px 3px;
  opacity: 0.6;
  z-index: 1;
}

/* ═══ FONDO CON ONDAS ═══ */
.arc-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
}

.arc-wave {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  opacity: 0.07;
}

.wave-1 {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23fff59e' d='M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E") no-repeat bottom;
  background-size: cover;
  animation: waveMove 8s ease-in-out infinite;
}

.wave-2 {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23ffb3c6' d='M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,90.7C672,85,768,107,864,128C960,149,1056,171,1152,165.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E") no-repeat bottom;
  background-size: cover;
  opacity: 0.05;
  animation: waveMove 10s ease-in-out infinite reverse;
}

@keyframes waveMove {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-20px); }
}

.arc-glow {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(255, 245, 158, 0.2) 0%, rgba(255, 179, 198, 0.1) 50%, transparent 70%);
  border-radius: 50%;
  animation: glowFloat 6s ease-in-out infinite;
}

@keyframes glowFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-10px, 10px) scale(1.1); }
}

/* ═══ CONEJITO POPUP - APARECE Y DESAPARECE ═══ */
.rabbit-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  pointer-events: none;
}

.rabbit-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: rabbitBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes rabbitBounce {
  0% { transform: scale(0) translateY(50px); opacity: 0; }
  60% { transform: scale(1.1) translateY(-10px); opacity: 1; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

.rabbit-leave .rabbit-container {
  animation: rabbitExit 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes rabbitExit {
  0% { transform: scale(1) translateY(0); opacity: 1; }
  40% { transform: scale(1.1) translateY(-20px); opacity: 1; }
  100% { transform: scale(0) translateY(-100px); opacity: 0; }
}

.rabbit-svg {
  width: 100px;
  height: 120px;
  filter: drop-shadow(0 8px 20px rgba(34, 40, 78, 0.12));
  animation: rabbitWiggle 2s ease-in-out infinite;
}

@keyframes rabbitWiggle {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}

.rabbit-paws {
  transform-origin: 50px 85px;
  animation: pawWave 0.8s ease-in-out infinite;
}

@keyframes pawWave {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-8deg); }
  75% { transform: rotate(8deg); }
}

/* Burbuja del conejo */
.rabbit-bubble {
  position: absolute;
  top: -20px;
  background: #fff;
  padding: 10px 18px;
  border-radius: 20px 20px 20px 4px;
  box-shadow: 0 4px 20px rgba(34, 40, 78, 0.12);
  white-space: nowrap;
  animation: bubblePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
}

@keyframes bubblePop {
  0% { transform: scale(0) translateY(10px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

.rabbit-text {
  font-size: 14px;
  font-weight: 800;
  color: #22284E;
  letter-spacing: -0.3px;
}

.rabbit-bubble-tail {
  position: absolute;
  bottom: -8px;
  left: 16px;
  width: 16px;
  height: 16px;
  background: #fff;
  transform: rotate(45deg);
  border-radius: 3px;
}

/* Estrellas alrededor del conejo */
.rabbit-stars {
  position: absolute;
  inset: -30px;
  pointer-events: none;
}

.star {
  position: absolute;
  font-size: 16px;
  animation: starTwinkle 1.5s ease-in-out infinite;
}

.s1 { top: 0; left: 20%; animation-delay: 0s; }
.s2 { top: 30%; right: 10%; animation-delay: 0.5s; font-size: 12px; }
.s3 { bottom: 20%; left: 10%; animation-delay: 1s; font-size: 14px; }

@keyframes starTwinkle {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* Transiciones Vue */
.rabbit-enter-active,
.rabbit-leave-active {
  transition: all 0.5s ease;
}

.rabbit-enter-from,
.rabbit-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.5);
}

/* ═══ CONTENIDO PRINCIPAL ═══ */
.arc-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 32px 32px;
  gap: 20px;
}

/* Izquierda */
.arc-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.arc-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(34, 40, 78, 0.35);
  text-transform: capitalize;
  margin-bottom: 2px;
}

/* Saludo con gradiente amarillo-rosa-azul */
.arc-time {
  font-weight: 700;
  background: linear-gradient(135deg, #ADD8E6 30%, #ffb3c6 60%, #ff6b9d 85%, #ADD8E6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.arc-divider {
  opacity: 0.4;
}

.arc-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0;
  line-height: 1.1;
  flex-wrap: wrap;
}

.arc-greeting {
  font-size: 26px;
  font-weight: 400;
  color: rgba(34, 40, 78, 0.45);
  letter-spacing: -0.5px;
}

.arc-name {
  font-size: 28px;
  font-weight: 900;
  color: #22284E;
  letter-spacing: -1px;
  position: relative;
}

/* Subrayado con gradiente amarillo-rosa-azul */
.arc-name::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(90deg, rgba(255, 245, 158, 0.5), rgba(255, 179, 198, 0.4), rgba(173, 216, 230, 0.3));
  border-radius: 3px;
  z-index: -1;
}

.arc-quote {
  font-size: 13px;
  color: rgba(34, 40, 78, 0.4);
  margin: 4px 0 0;
  font-weight: 500;
  line-height: 1.5;
  max-width: 280px;
}

/* ═══ STREAK CON GRADIENTE AMARILLO-ROSA-AZUL ═══ */
.arc-streak {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 6px 14px;
  background: linear-gradient(135deg, rgba(255, 245, 158, 0.25), rgba(255, 179, 198, 0.15), rgba(173, 216, 230, 0.1));
  border: 1.5px solid rgba(255, 245, 158, 0.35);
  border-radius: 99px;
  width: fit-content;
}

.streak-icon {
  display: flex;
  align-items: center;
  animation: flamePulse 1.5s ease-in-out infinite;
}

@keyframes flamePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.streak-count {
  font-size: 15px;
  font-weight: 900;
  color: #22284E;
}

.streak-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(34, 40, 78, 0.4);
}

.streak-dots {
  display: flex;
  gap: 3px;
  margin-left: 4px;
}

/* Dots con gradiente amarillo-rosa-azul */
.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff59e, #ffb3c6, #ADD8E6);
  opacity: 0.4;
  animation: dotPulse 1.5s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}

/* ═══ AVATAR CON ÓRBITA ═══ */
.arc-right {
  flex-shrink: 0;
}

.avatar-orbit {
  position: relative;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orbit-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: #fff59e;
  border-right-color: #ffb3c6;
  animation: orbitSpin 4s linear infinite;
}

.orbit-ring-2 {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1.5px solid transparent;
  border-bottom-color: #ff6b9d;
  border-left-color: #ADD8E6;
  animation: orbitSpin 6s linear infinite reverse;
}

@keyframes orbitSpin {
  to { transform: rotate(360deg); }
}

/* Avatar con gradiente amarillo-navy */
.avatar-main {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #fff59e, #ffb3c6, #22284E);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 900;
  color: #fff;
  border: 3px solid #fff;
  box-shadow: 0 2px 12px rgba(34, 40, 78, 0.1);
}

.avatar-main img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 768px) {
  .arc-content {
    padding: 22px 20px 26px;
  }

  .arc-greeting {
    font-size: 20px;
  }

  .arc-name {
    font-size: 22px;
  }

  .arc-quote {
    font-size: 12px;
    max-width: 200px;
  }

  .avatar-orbit {
    width: 52px;
    height: 52px;
  }

  .avatar-main {
    width: 44px;
    height: 44px;
    font-size: 16px;
  }

  /* Conejo más pequeño en tablet */
  .rabbit-svg {
    width: 70px;
    height: 84px;
  }

  .rabbit-bubble {
    padding: 8px 14px;
  }

  .rabbit-text {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .arc-content {
    padding: 18px 16px 22px;
  }

  .arc-greeting {
    font-size: 18px;
  }

  .arc-name {
    font-size: 20px;
  }

  .arc-quote {
    display: none;
  }

  .arc-meta {
    font-size: 10px;
  }

  /* Conejo mucho más pequeño en móvil */
  .rabbit-svg {
    width: 55px;
    height: 66px;
  }

  .rabbit-bubble {
    padding: 6px 12px;
    top: -15px;
  }

  .rabbit-text {
    font-size: 11px;
  }

  .rabbit-stars .star {
    font-size: 12px;
  }
}

@media (min-width: 1024px) {
  .arc-content {
    padding: 32px 40px 36px;
  }

  .arc-greeting {
    font-size: 30px;
  }

  .arc-name {
    font-size: 32px;
  }

  .avatar-orbit {
    width: 72px;
    height: 72px;
  }

  .avatar-main {
    width: 60px;
    height: 60px;
    font-size: 22px;
  }
}
</style>