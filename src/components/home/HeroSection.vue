<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineEmits(['start', 'signin'])

const isVisible  = ref(false)
const activeWord = ref(0)
const words      = ['hábitos', 'retos', 'progreso', 'resultados']

let wordTimer = null

onMounted(() => {
  setTimeout(() => { isVisible.value = true }, 100)
  wordTimer = setInterval(() => {
    activeWord.value = (activeWord.value + 1) % words.length
  }, 2600)
})

onUnmounted(() => {
  if (wordTimer) clearInterval(wordTimer)
})
</script>

<template>
  <section class="hero" role="banner">

    <!-- Fondo degradado animado -->
    <div class="hero-bg" aria-hidden="true">
      <div class="blob b1"></div>
      <div class="blob b2"></div>
      <div class="blob b3"></div>
    </div>

    <!-- Contenido central -->
    <div class="hero-center" :class="{ visible: isVisible }">

      <!-- Pill etiqueta -->
      <div class="hero-pill">
        <span class="pdot"></span>
        Tu app de hábitos
        <span class="pdot"></span>
      </div>

      <!-- Título con palabra animada -->
      <h1 class="hero-h1">
        <span class="h-navy">Construye</span>

        <span class="h-switch" aria-live="polite">
          <span
            v-for="(w, i) in words" :key="w"
            class="h-word"
            :class="{ active: activeWord === i }"
          >{{ w }}.</span>
        </span>

        <span class="h-faded">en 30 días.</span>
      </h1>

      <!-- Descripción corta -->
      <p class="hero-desc">
        Convierte lo que amas en rutinas que se quedan.<br>
        Sigue tu progreso. Mantén tu racha. Llega más lejos.
      </p>

      <!-- Botones principales -->
      <div class="hero-btns">
        <button class="btn-main" @click="$emit('start')">
          Empezar gratis
        </button>
        <button class="btn-sec" @click="$emit('signin')">
          Ya tengo cuenta
        </button>
      </div>

    </div>
  </section>
</template>

<style scoped>
/* ─── Variables de color de la app ───────────────────── */
:root {
  --navy:      #22284E;
  --pink:      #ff6b9d;
  --pink-light:#ffb3c6;
  --yellow:    #fff59e;
  --bg:        #fafafa;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ─── HERO ───────────────────────────────────────────── */
.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 24px 60px;
  overflow: hidden;
  background: var(--yellow, #fff59e);
}

/* ─── FONDO con blobs animados ───────────────────────── */
.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.55;
}

.b1 {
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, #ff6b9d, #ffb3c6);
  top: -180px;
  right: -140px;
  animation: drift 14s ease-in-out infinite;
}

.b2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #fff59e, #ffe0ec);
  bottom: -120px;
  left: -100px;
  animation: drift 18s ease-in-out infinite reverse;
}

.b3 {
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, #c5cae9, #fff59e);
  top: 40%;
  left: 25%;
  animation: drift 11s ease-in-out infinite 4s;
}

@keyframes drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%       { transform: translate(28px, -22px) scale(1.08); }
}

/* ─── CENTRO ─────────────────────────────────────────── */
.hero-center {
  position: relative;
  z-index: 10;
  text-align: center;
  max-width: 560px;
  width: 100%;
  opacity: 0;
  transform: translateY(28px);
  transition: opacity .7s ease, transform .7s ease;
}
.hero-center.visible {
  opacity: 1;
  transform: none;
}

/* ─── PILL ───────────────────────────────────────────── */
.hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #22284E;
  color: #fff59e;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
  padding: 8px 20px;
  border-radius: 99px;
  margin-bottom: 28px;
  box-shadow: 0 4px 18px rgba(34,40,78,.28);
}
.pdot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff6b9d;
  display: inline-block;
}

/* ─── TÍTULO ─────────────────────────────────────────── */
.hero-h1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin: 0 0 24px;
}

.h-navy {
  font-size: clamp(46px, 6vw, 72px);
  font-weight: 900;
  letter-spacing: -2.5px;
  color: #22284E;
  line-height: .95;
}

.h-faded {
  font-size: clamp(46px, 6vw, 72px);
  font-weight: 900;
  letter-spacing: -2.5px;
  color: #22284E;
  opacity: .22;
  line-height: .95;
}

/* Palabra animada */
.h-switch {
  position: relative;
  display: block;
  height: clamp(52px, 6.2vw, 76px);
  width: 100%;
  overflow: hidden;
}

.h-word {
  position: absolute;
  left: 50%;
  top: 0;
  color: #ff6b9d;
  font-size: clamp(46px, 6vw, 72px);
  font-weight: 900;
  letter-spacing: -2.5px;
  line-height: .95;
  opacity: 0;
  transform: translateX(-50%) translateY(18px);
  transition: opacity .45s ease, transform .45s ease;
  white-space: nowrap;
}
.h-word.active {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ─── DESCRIPCIÓN ────────────────────────────────────── */
.hero-desc {
  font-size: clamp(14px, 1.5vw, 17px);
  color: rgba(34,40,78,.62);
  line-height: 1.75;
  margin: 0 0 36px;
}

/* ─── BOTONES ────────────────────────────────────────── */
.hero-btns {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-main {
  background: #22284E;
  color: #fff59e;
  border: none;
  font-size: 15px;
  font-weight: 800;
  padding: 16px 34px;
  border-radius: 14px;
  cursor: pointer;
  box-shadow: 0 8px 28px rgba(34,40,78,.28);
  transition: transform .2s, box-shadow .2s;
}
.btn-main:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 34px rgba(34,40,78,.38);
}

.btn-sec {
  background: rgba(255,255,255,.7);
  color: #22284E;
  border: 2px solid rgba(34,40,78,.16);
  font-size: 15px;
  font-weight: 700;
  padding: 16px 28px;
  border-radius: 14px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: background .2s;
}
.btn-sec:hover {
  background: rgba(255,255,255,.92);
}

/* ─── RESPONSIVE ─────────────────────────────────────── */
@media (max-width: 600px) {
  .hero { padding: 90px 20px 48px; }
  .hero-btns { flex-direction: column; align-items: center; }
  .btn-main, .btn-sec { width: 100%; max-width: 300px; }
}
</style>