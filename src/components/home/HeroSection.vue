<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import FallingText from '@/components/home/FallingText.vue'
import { HOBBIES_LIST } from '@/data/hobbiesData.js'

defineEmits(['start', 'signin'])

const fallingTextContent = HOBBIES_LIST.map(h => h.name).join(' ')
const highlightedHobbies = ['Yoga', 'Correr', 'Lectura', 'Música', 'Fotografía', 'Cocina']

const isVisible    = ref(false)
const activeWord   = ref(0)
const words        = ['hábitos', 'retos', 'progreso', 'resultados']
const plasmaCanvas = ref(null)

let wordTimer = null
let rafId     = null
let ctx       = null
let mouseX    = 0
let mouseY    = 0
let targetX   = 0
let targetY   = 0

function initPlasma() {
  const canvas = plasmaCanvas.value
  if (!canvas) return
  ctx = canvas.getContext('2d')
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
  drawPlasma()
}

function drawPlasma() {
  if (!ctx) return
  autoMove()
  const w = ctx.canvas.width
  const h = ctx.canvas.height

  mouseX += (targetX - mouseX) * 0.04
  mouseY += (targetY - mouseY) * 0.04

  ctx.clearRect(0, 0, w, h)

  const blobs = [
    { x: mouseX,                                    y: mouseY,                                    r: w * 0.45, color: 'rgba(255,107,157,0.50)' },
    { x: w - mouseX,                                y: h - mouseY,                                r: w * 0.40, color: 'rgba(197,202,233,0.45)' },
    { x: w * 0.5 + (mouseX - w * 0.5) * 0.3,       y: h * 0.5 + (mouseY - h * 0.5) * 0.3,       r: w * 0.30, color: 'rgba(255,179,198,0.40)' },
    { x: w * 0.1,                                   y: h * 0.1,                                   r: w * 0.35, color: 'rgba(255,245,158,0.35)' },
  ]

  blobs.forEach(({ x, y, r, color }) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0,   color)
    g.addColorStop(0.6, color.replace(/[\d.]+\)$/, '0.12)'))
    g.addColorStop(1,   'transparent')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })

  rafId = requestAnimationFrame(drawPlasma)
}

function onResize() {
  if (!plasmaCanvas.value) return
  plasmaCanvas.value.width  = window.innerWidth
  plasmaCanvas.value.height = window.innerHeight
}

function onMouseMove(e) {
  targetX = e.clientX
  targetY = e.clientY
}

// Detectar si es móvil
const isMobile = () => window.innerWidth <= 768

// Movimiento automático para móvil
let autoAngle = 0
function autoMove() {
  if (!isMobile()) return
  autoAngle += 0.008
  targetX = window.innerWidth  * (0.5 + 0.4 * Math.sin(autoAngle))
  targetY = window.innerHeight * (0.5 + 0.4 * Math.cos(autoAngle * 0.7))
}

onMounted(() => {
  targetX = window.innerWidth  / 2
  targetY = window.innerHeight / 2
  mouseX  = targetX
  mouseY  = targetY

  initPlasma()

  if (!isMobile()) {
    window.addEventListener('mousemove', onMouseMove)
  }
  window.addEventListener('resize',    onResize)

  setTimeout(() => { isVisible.value = true }, 100)
  wordTimer = setInterval(() => {
    activeWord.value = (activeWord.value + 1) % words.length
  }, 2600)
})

onUnmounted(() => {
  if (wordTimer) clearInterval(wordTimer)
  if (rafId)     cancelAnimationFrame(rafId)
  if (!isMobile()) {
    window.removeEventListener('mousemove', onMouseMove)
  }
  window.removeEventListener('resize',    onResize)
  ctx = null
})
</script>

<template>
  <section class="hero" role="banner">

    <!-- Fondo degradado animado -->
    <canvas ref="plasmaCanvas" class="plasma-canvas" aria-hidden="true"></canvas>

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
        <button class="btn-sec" @click="$emit('signin', 'login')">
          Ya tengo cuenta
        </button>
      </div>
    </div>

    <!-- Falling Text en la parte baja del hero -->
    <div class="falling-text-wrap">
      <FallingText
        :text="fallingTextContent"
        :highlight-words="highlightedHobbies"
        highlight-class="highlighted"
        trigger="auto"
        background-color="transparent"
        :gravity="1.2"
        :mouse-constraint-stiffness="0.2"
        font-size="0.95rem"
      />
    </div>
  </section>
</template>

<style scoped>
:root {
  --navy:      #22284E;
  --pink:      #ff6b9d;
  --pink-light:#ffb3c6;
  --yellow:    #fff59e;
  --bg:        #fafafa;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

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

.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.plasma-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

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

.hero-desc {
  font-size: clamp(14px, 1.5vw, 17px);
  color: rgba(34,40,78,.62);
  line-height: 1.75;
  margin: 0 0 36px;
}

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

@media (max-width: 600px) {
  .hero { padding: 90px 20px 48px; }
  .hero-btns { flex-direction: column; align-items: center; }
  .btn-main, .btn-sec { width: 100%; max-width: 300px; }
}

.falling-text-wrap {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 55%;
  pointer-events: all;
  z-index: 5;
  pointer-events: none;
}

.b1, .b2, .b3 {
  will-change: left, top;
}

@media (max-width: 768px) {
  .falling-text-wrap { display: none; }
}
</style>