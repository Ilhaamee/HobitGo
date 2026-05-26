<script setup>
import { computed, ref, onMounted } from 'vue'

const props = defineProps({
  profile: { type: Object, default: null },
  streak:  { type: Number, default: 0 },
})

const visible     = ref(false)
const showRabbit  = ref(false)
const rabbitGone  = ref(false)
const typedText   = ref('')

const fullText = computed(() => `¡Hola ${props.profile?.username || 'amigo'}! 🌟`)

onMounted(() => {
  setTimeout(() => visible.value = true, 100)
  setTimeout(() => {
    showRabbit.value = true
    // Typewriter effect
    let i = 0
    const interval = setInterval(() => {
      typedText.value = fullText.value.slice(0, ++i)
      if (i >= fullText.value.length) clearInterval(interval)
    }, 55)
  }, 700)
  setTimeout(() => {
    rabbitGone.value = true
    setTimeout(() => showRabbit.value = false, 900)
  }, 4500)
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

    <!-- Fondo -->
    <div class="arc-bg" aria-hidden="true">
      <div class="arc-wave wave-1"></div>
      <div class="arc-wave wave-2"></div>
      <div class="arc-glow"></div>
    </div>

    <Transition name="rabbit">
      <div v-if="showRabbit" class="rabbit-popup" :class="{ 'rabbit-leave': rabbitGone }">
        <div class="rabbit-container">

          <!-- Burbuja con typewriter -->
          <div class="rabbit-bubble">
            <span class="rabbit-text">{{ typedText }}<span class="cursor" :class="{ hidden: typedText.length >= fullText.length }">|</span></span>
            <div class="rabbit-bubble-tail"></div>
          </div>

          <!-- Conejo gif -->
          <img src="@/assets/pixel-cat.gif" alt="conejo" class="rabbit-gif" />

          <!-- Partículas de brillo -->
          <div class="sparkles">
            <span class="sp sp1">✦</span>
            <span class="sp sp2">✦</span>
            <span class="sp sp3">·</span>
            <span class="sp sp4">✦</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Contenido principal -->
    <div class="arc-content">
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
      </div>

      <!-- Avatar -->
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
  box-shadow: 0 4px 20px rgba(34,40,78,.06), 0 1px 3px rgba(34,40,78,.04);
}

.welcome-arc::after {
  content: '';
  position: absolute;
  top: 0; left: 5%; right: 5%;
  height: 3px;
  background: linear-gradient(90deg,
    transparent 0%,
    #fff59e 10%, #ffb3c6 25%, #ff6b9d 40%,
    #e91e63 55%, #ADD8E6 75%, #22284E 90%,
    transparent 100%
  );
  border-radius: 0 0 3px 3px;
  opacity: 0.6;
  z-index: 1;
}

.arc-bg { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; pointer-events: none; z-index: 0; }
.arc-wave { position: absolute; bottom: 0; left: 0; right: 0; height: 60px; opacity: 0.07; }
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
@keyframes waveMove { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-20px); } }

.arc-glow {
  position: absolute; top: -40px; right: -40px;
  width: 180px; height: 180px;
  background: radial-gradient(circle, rgba(255,245,158,.2) 0%, rgba(255,179,198,.1) 50%, transparent 70%);
  border-radius: 50%;
  animation: glowFloat 6s ease-in-out infinite;
}
@keyframes glowFloat { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-10px,10px) scale(1.1); } }

.rabbit-popup {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  pointer-events: none;
}

.rabbit-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: rabbitSlideUp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes rabbitSlideUp {
  0%   { transform: translateY(100%); opacity: 0; }
  100% { transform: translateY(0);    opacity: 1; }
}

.rabbit-leave .rabbit-container {
  animation: rabbitSlideDown 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes rabbitSlideDown {
  0%   { transform: translateY(0);    opacity: 1; }
  100% { transform: translateY(110%); opacity: 0; }
}

.rabbit-gif {
  width: 130px;
  height: auto;
  filter: drop-shadow(0 -6px 20px rgba(255,107,157,.18));
  animation: rabbitBob 2.5s ease-in-out infinite;
}
@keyframes rabbitBob {
  0%,100% { transform: translateY(0) rotate(-1deg); }
  50%      { transform: translateY(-6px) rotate(1deg); }
}

.rabbit-bubble {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-20%);
  background: #fff;
  padding: 10px 18px;
  border-radius: 20px 20px 20px 4px;
  box-shadow: 0 4px 20px rgba(34,40,78,.12), 0 0 0 1.5px rgba(255,107,157,.15);
  white-space: nowrap;
  animation: bubblePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.4s both;
}
@keyframes bubblePop {
  0%   { transform: translateX(-20%) scale(0); opacity: 0; }
  100% { transform: translateX(-20%) scale(1); opacity: 1; }
}

.rabbit-text {
  font-size: 14px;
  font-weight: 800;
  color: #22284E;
  letter-spacing: -0.3px;
}

.cursor {
  display: inline-block;
  color: #ff6b9d;
  font-weight: 400;
  animation: blink 0.7s step-end infinite;
}
.cursor.hidden { opacity: 0; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

.rabbit-bubble-tail {
  position: absolute;
  bottom: -7px; left: 16px;
  width: 14px; height: 14px;
  background: #fff;
  transform: rotate(45deg);
  border-radius: 2px;
  box-shadow: 2px 2px 4px rgba(34,40,78,.06);
}

/* Partículas */
.sparkles { position: absolute; inset: -20px; pointer-events: none; }
.sp {
  position: absolute;
  color: #ff6b9d;
  font-size: 14px;
  animation: sparkFloat 2s ease-in-out infinite;
  opacity: 0;
}
.sp1 { top: 10%; left: 5%;  animation-delay: 0s;    font-size: 12px; }
.sp2 { top: 20%; right: 5%; animation-delay: 0.6s;  color: #fff59e; }
.sp3 { bottom: 30%; left: 8%; animation-delay: 1.1s; font-size: 8px; color: #22284E; }
.sp4 { top: 5%;  right: 15%; animation-delay: 1.6s; font-size: 10px; }
@keyframes sparkFloat {
  0%   { opacity: 0; transform: translateY(0) scale(0.5); }
  40%  { opacity: 1; transform: translateY(-10px) scale(1.2); }
  100% { opacity: 0; transform: translateY(-20px) scale(0.8); }
}

.rabbit-enter-active, .rabbit-leave-active { transition: all 0.5s ease; }
.rabbit-enter-from, .rabbit-leave-to { opacity: 0; }

.arc-content {
  position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: space-between;
  padding: 28px 32px 32px; gap: 20px;
}

.arc-left { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }

.arc-meta {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; font-weight: 600;
  color: rgba(34,40,78,.35);
  text-transform: capitalize; margin-bottom: 2px;
}
.arc-time {
  font-weight: 700;
  background: linear-gradient(135deg, #ADD8E6 30%, #ffb3c6 60%, #ff6b9d 85%, #ADD8E6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.arc-divider { opacity: 0.4; }

.arc-title {
  display: flex; align-items: baseline; gap: 8px;
  margin: 0; line-height: 1.1; flex-wrap: wrap;
}
.arc-greeting { font-size: 26px; font-weight: 400; color: rgba(34,40,78,.45); letter-spacing: -0.5px; }
.arc-name {
  font-size: 28px; font-weight: 900; color: #22284E;
  letter-spacing: -1px; position: relative;
}
.arc-name::after {
  content: '';
  position: absolute; bottom: 2px; left: 0; right: 0; height: 6px;
  background: linear-gradient(90deg, rgba(255,245,158,.5), rgba(255,179,198,.4), rgba(173,216,230,.3));
  border-radius: 3px; z-index: -1;
}
.arc-quote { font-size: 13px; color: rgba(34,40,78,.4); margin: 4px 0 0; font-weight: 500; line-height: 1.5; max-width: 280px; }

.arc-right { flex-shrink: 0; }
.avatar-orbit { position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; }
.orbit-ring {
  position: absolute; inset: -4px; border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: #fff59e; border-right-color: #ffb3c6;
  animation: orbitSpin 4s linear infinite;
}
.orbit-ring-2 {
  position: absolute; inset: -8px; border-radius: 50%;
  border: 1.5px solid transparent;
  border-bottom-color: #ff6b9d; border-left-color: #ADD8E6;
  animation: orbitSpin 6s linear infinite reverse;
}
@keyframes orbitSpin { to { transform: rotate(360deg); } }

.avatar-main {
  position: relative; width: 56px; height: 56px; border-radius: 50%; overflow: hidden;
  background: linear-gradient(135deg, #fff59e, #ffb3c6, #22284E);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 900; color: #fff;
  border: 3px solid #fff; box-shadow: 0 2px 12px rgba(34,40,78,.1);
}
.avatar-main img { width: 100%; height: 100%; object-fit: cover; }

@media (max-width: 768px) {
  .arc-content { padding: 22px 20px 26px; }
  .arc-greeting { font-size: 20px; }
  .arc-name { font-size: 22px; }
  .arc-quote { font-size: 12px; max-width: 200px; }
  .avatar-orbit { width: 52px; height: 52px; }
  .avatar-main { width: 44px; height: 44px; font-size: 16px; }
  .rabbit-gif { width: 100px; }
  .rabbit-bubble { padding: 8px 14px; }
  .rabbit-text { font-size: 12px; }
}
@media (max-width: 480px) {
  .arc-content { padding: 18px 16px 22px; }
  .arc-greeting { font-size: 18px; }
  .arc-name { font-size: 20px; }
  .arc-quote { display: none; }
  .arc-meta { font-size: 10px; }
  .rabbit-gif { width: 80px; }
  .rabbit-bubble { padding: 6px 12px; top: -12px; }
  .rabbit-text { font-size: 11px; }
}
@media (min-width: 1024px) {
  .arc-content { padding: 32px 40px 36px; }
  .arc-greeting { font-size: 30px; }
  .arc-name { font-size: 32px; }
  .avatar-orbit { width: 72px; height: 72px; }
  .avatar-main { width: 60px; height: 60px; font-size: 22px; }
}
</style>