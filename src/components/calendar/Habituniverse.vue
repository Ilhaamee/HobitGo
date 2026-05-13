<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  hobbies:  { type: Array, default: () => [] },
  sessions: { type: Array, default: () => [] },
})

const open = ref(false)
const isDark = ref(true)
const hoveredPlanet = ref(null)
const mousePos = ref({ x: 250, y: 190 })
const time = ref(0)
const audioContext = ref(null)

let animFrame

function sd(n) { 
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

// ===== SONIDOS ESPACIALES =====
function initAudio() {
  if (!audioContext.value) {
    audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
  }
}

function playOpenSound() {
  if (!audioContext.value) initAudio()
  const ctx = audioContext.value
  
  // Sonido de "despertar del universo" - acorde etéreo
  const frequencies = [261.63, 329.63, 392.00, 523.25] // Do Mayor
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)
    osc.frequency.exponentialRampToValueAtTime(freq * 2, ctx.currentTime + 2)
    
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(200, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 1.5)
    
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1)
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.1 + 0.3)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 2.5)
    
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    
    osc.start(ctx.currentTime + i * 0.1)
    osc.stop(ctx.currentTime + i * 0.1 + 3)
  })
}

function playHoverSound() {
  if (!audioContext.value) return
  const ctx = audioContext.value
  
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  osc.type = 'sine'
  osc.frequency.setValueAtTime(440, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1)
  
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
  
  osc.connect(gain)
  gain.connect(ctx.destination)
  
  osc.start()
  osc.stop(ctx.currentTime + 0.3)
}

function handleOpen() {
  open.value = true
  playOpenSound()
}

// ===== DATOS DE HOBBIES =====
const hobbyData = computed(() => {
  const now = new Date(), month = now.getMonth(), year = now.getFullYear()
  
  return props.hobbies.map((h, idx) => {
    const ms = props.sessions.filter(s => {
      const d = new Date(s.created_at)
      return s.hobby_id === h.id && d.getMonth() === month && d.getFullYear() === year
    })
    
    const dates = [...new Set(ms.map(s => new Date(s.created_at).toDateString()))]
      .map(d => new Date(d)).sort((a,b) => b-a)
    
    let streak = 0, cur = new Date(); cur.setHours(0,0,0,0)
    for (const d of dates) {
      if (Math.round((cur-d)/86400000) <= 1) { streak++; cur = d } else break
    }
    
    const seed = h.name.split('').reduce((a,c) => a + c.charCodeAt(0), idx * 999)
    const rarity = streak >= 14 ? 'legendary' : streak >= 7 ? 'epic' : 'common'
    
    // Paletas de colores tipo Pinterest - gradientes suaves y vibrantes
    const palettes = {
      common: [
        ['#60a5fa', '#3b82f6', '#1d4ed8'],
        ['#34d399', '#10b981', '#059669'],
        ['#f87171', '#ef4444', '#dc2626'],
        ['#fbbf24', '#f59e0b', '#d97706'],
        ['#a78bfa', '#8b5cf6', '#7c3aed'],
      ],
      epic: [
        ['#c084fc', '#a855f7', '#9333ea'],
        ['#f472b6', '#ec4899', '#db2777'],
        ['#22d3ee', '#06b6d4', '#0891b2'],
      ],
      legendary: [
        ['#fde047', '#fbbf24', '#f59e0b'],
        ['#fb923c', '#f97316', '#ea580c'],
        ['#ffffff', '#fde047', '#fbbf24'],
      ]
    }
    
    const paletteGroup = palettes[rarity]
    const palette = paletteGroup[Math.floor(sd(seed * 13) * paletteGroup.length)]
    
    const baseColor = Array.isArray(h.gradient) ? h.gradient[0] : palette[0]
    const midColor = Array.isArray(h.gradient) ? (h.gradient[1] || h.gradient[0]) : palette[1]
    const darkColor = Array.isArray(h.gradient) ? (h.gradient[2] || h.gradient[0]) : palette[2]
    
    // Órbita única
    const orbitRadius = 70 + sd(seed * 17) * 130
    const orbitSpeed = 0.0002 + sd(seed * 31) * 0.0004
    const orbitOffset = sd(seed * 47) * Math.PI * 2
    const orbitInclination = (sd(seed * 23) - 0.5) * 0.4
    
    const size = Math.min(36, 16 + ms.length * 1.8)
    
    const hasRing = rarity !== 'common' || sd(seed * 13) > 0.6
    const ringTilt = sd(seed * 19) * 40 - 20
    const hasMoons = ms.length > 3 || rarity === 'legendary'
    const moonCount = hasMoons ? Math.floor(sd(seed * 41) * 2) + 1 : 0
    
    // Tipo de superficie del planeta
    const surfaceType = Math.floor(sd(seed * 67) * 3) // 0: liso, 1: rayado, 2: moteado
    
    return {
      id: h.id,
      name: h.name,
      color: baseColor,
      midColor,
      darkColor,
      sessions: ms.length,
      streak,
      rarity,
      size,
      orbitRadius,
      orbitSpeed,
      orbitOffset,
      orbitInclination,
      hasRing,
      ringTilt,
      hasMoons,
      moonCount,
      surfaceType,
      seed,
      x: 250,
      y: 190,
      pulsePhase: sd(seed * 7) * Math.PI * 2
    }
  }).filter(h => h.sessions > 0)
})

// Posiciones de planetas
const planetsWithPosition = computed(() => {
  return hobbyData.value.map(h => {
    const angle = time.value * h.orbitSpeed + h.orbitOffset
    const x = 250 + Math.cos(angle) * h.orbitRadius
    const y = 190 + Math.sin(angle) * h.orbitRadius * (1 - Math.abs(h.orbitInclination))
    const z = Math.sin(angle)
    
    return { ...h, x, y, z, angle }
  }).sort((a, b) => a.z - b.z)
})

const totalSessions = computed(() => hobbyData.value.reduce((s,h) => s+h.sessions, 0))
const maxStreak = computed(() => Math.max(0, ...hobbyData.value.map(h => h.streak)))
const epicCount = computed(() => hobbyData.value.filter(h => h.rarity !== 'common').length)

// Estrellas con parallax
const stars = computed(() => {
  return Array.from({ length: 150 }, (_, i) => {
    const s = sd(i * 77)
    const depth = 0.2 + sd(i * 99) * 0.8
    return {
      x: sd(i * 13) * 500,
      y: sd(i * 37) * 380,
      r: 0.5 + sd(i * 55) * 2,
      opacity: 0.2 + sd(i * 71) * 0.8,
      depth,
      twinkleSpeed: 2 + sd(i * 89) * 3,
      twinklePhase: sd(i * 101) * Math.PI * 2
    }
  })
})

const visibleStars = computed(() => {
  const mx = (mousePos.value.x - 250) / 250
  const my = (mousePos.value.y - 190) / 190
  
  return stars.value.map(s => {
    const parallaxX = mx * 40 * s.depth
    const parallaxY = my * 30 * s.depth
    const twinkle = 0.5 + 0.5 * Math.sin(time.value * 0.002 * s.twinkleSpeed + s.twinklePhase)
    
    return {
      ...s,
      x: s.x + parallaxX,
      y: s.y + parallaxY,
      currentOpacity: s.opacity * twinkle
    }
  })
})

// Nebulosas
const nebulas = [
  { cx: 120, cy: 100, r: 200, color: '#6366f1', opacity: 0.12 },
  { cx: 400, cy: 280, r: 220, color: '#a855f7', opacity: 0.1 },
  { cx: 300, cy: 60, r: 180, color: '#ec4899', opacity: 0.08 },
  { cx: 80, cy: 320, r: 170, color: '#3b82f6', opacity: 0.06 }
]

// Sol central suave
const sunGlow = computed(() => {
  const pulse = 1 + Math.sin(time.value * 0.001) * 0.1
  return { pulse }
})

// Partículas flotantes
const particles = computed(() => {
  return Array.from({ length: 20 }, (_, i) => {
    const seed = i * 137
    const angle = time.value * 0.0003 * (i % 3 + 1) + sd(seed) * Math.PI * 2
    const radius = 50 + sd(seed * 17) * 150
    return {
      x: 250 + Math.cos(angle) * radius,
      y: 190 + Math.sin(angle) * radius * 0.6,
      r: 1 + sd(seed * 31) * 2,
      opacity: 0.3 + Math.sin(time.value * 0.002 + i) * 0.2
    }
  })
})

// Texto de misión simplificado
const missionText = computed(() => {
  if (!hobbyData.value.length) return 'Registra tu primera sesión'
  const maxS = Math.max(...hobbyData.value.map(h => h.streak))
  if (maxS >= 14) return '¡Eres una supernova! 🔥'
  if (maxS >= 7) return '¡Modo épico activado! ✨'
  if (maxS >= 3) return '¡Racha en ascenso! 🚀'
  return 'Haz sesiones hoy 🌟'
})

function rarityLabel(r) {
  return r === 'legendary' ? '⭐ Legendaria' : r === 'epic' ? '✦ Épica' : '● Común'
}

function rarityColor(r) {
  return r === 'legendary' ? '#fde047' : r === 'epic' ? '#c084fc' : '#60a5fa'
}

// Animación
function animate() {
  time.value += 16
  animFrame = requestAnimationFrame(animate)
}

function handleMouseMove(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  mousePos.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

function handlePlanetHover(planet) {
  hoveredPlanet.value = planet
  playHoverSound()
}

onMounted(() => { animate() })
onUnmounted(() => { cancelAnimationFrame(animFrame) })
</script>

<template>
  <!-- FAB -->
  <div class="cosmos-fab-wrap">
    <div class="cosmos-pulse r1"></div>
    <div class="cosmos-pulse r2"></div>
    <div class="cosmos-pulse r3"></div>
    <button class="cosmos-fab" @click="handleOpen">
      <div class="cosmos-fab-core">
        <div class="cosmos-fab-glow"></div>
      </div>
      <svg class="cosmos-fab-ring" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1" stroke-dasharray="3 6"/>
      </svg>
    </button>
  </div>

  <!-- Modal -->
  <Transition name="cosmos-fade">
    <div v-if="open" class="cosmos-backdrop" @click.self="open = false">
      <div class="cosmos-modal" :class="{ 'cosmos-light': !isDark }">
        
        <!-- Header minimalista -->
        <div class="cosmos-header">
          <div>
            <h2 class="cosmos-title">Tu Universo</h2>
          </div>
          <div class="cosmos-controls">
            <button class="cosmos-mode-btn" @click="isDark = !isDark">
              <span v-if="isDark">☀️</span>
              <span v-else>🌙</span>
            </button>
            <button class="cosmos-close" @click="open = false">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Stats compactos -->
        <div class="cosmos-stats">
          <div class="cosmos-stat">
            <span class="cosmos-stat-num">{{ totalSessions }}</span>
            <span class="cosmos-stat-label">sesiones</span>
          </div>
          <div class="cosmos-stat">
            <span class="cosmos-stat-num">{{ maxStreak }}d</span>
            <span class="cosmos-stat-label">racha</span>
          </div>
          <div class="cosmos-stat">
            <span class="cosmos-stat-num">{{ epicCount }}</span>
            <span class="cosmos-stat-label">épicas</span>
          </div>
        </div>

        <!-- Misión ultra-compacta -->
        <div class="cosmos-mission">
          {{ missionText }}
        </div>

        <!-- UNIVERSO -->
        <div class="cosmos-universe" @mousemove="handleMouseMove">
          <svg viewBox="0 0 500 380" class="cosmos-svg" preserveAspectRatio="xMidYMid slice">
            <defs>
              <!-- Fondos -->
              <radialGradient id="bgDark" cx="50%" cy="50%">
                <stop offset="0%" stop-color="#1e1b4b"/>
                <stop offset="50%" stop-color="#0f172a"/>
                <stop offset="100%" stop-color="#020617"/>
              </radialGradient>
              <radialGradient id="bgLight" cx="50%" cy="30%">
                <stop offset="0%" stop-color="#fef3c7"/>
                <stop offset="50%" stop-color="#fde68a"/>
                <stop offset="100%" stop-color="#fbbf24"/>
              </radialGradient>
              
              <!-- Filtros -->
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="planetGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              <!-- Gradiente de planeta tipo Pinterest -->
              <radialGradient v-for="h in hobbyData" :key="'pg-'+h.id" :id="'planet-'+h.id" cx="25%" cy="25%" r="75%">
                <stop offset="0%" :stop-color="h.color" stop-opacity="1"/>
                <stop offset="40%" :stop-color="h.midColor" stop-opacity="1"/>
                <stop offset="100%" :stop-color="h.darkColor" stop-opacity="0.9"/>
              </radialGradient>
              
              <!-- Atmósfera exterior -->
              <radialGradient v-for="h in hobbyData" :key="'atm-'+h.id" :id="'atm-'+h.id" cx="50%" cy="50%" r="50%">
                <stop offset="30%" :stop-color="h.color" stop-opacity="0"/>
                <stop offset="100%" :stop-color="h.color" stop-opacity="0.25"/>
              </radialGradient>
              
              <!-- Sol suave -->
              <radialGradient id="sunGrad" cx="50%" cy="50%">
                <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.9"/>
                <stop offset="30%" stop-color="#fbbf24" stop-opacity="0.6"/>
                <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
              </radialGradient>
            </defs>

            <!-- Fondo -->
            <rect width="500" height="380" :fill="isDark ? 'url(#bgDark)' : 'url(#bgLight)'"/>
            
            <!-- Nebulosas -->
            <circle v-for="(n, i) in nebulas" :key="'neb'+i"
              :cx="n.cx" :cy="n.cy" :r="n.r" 
              :fill="n.color" :opacity="isDark ? n.opacity : n.opacity * 0.3"
              filter="url(#glow)"/>

            <!-- Estrellas -->
            <circle v-for="(s, i) in visibleStars" :key="'star'+i"
              :cx="s.x" :cy="s.y" :r="s.r"
              fill="white" :opacity="s.currentOpacity"/>

            <!-- Partículas flotantes -->
            <circle v-for="(p, i) in particles" :key="'part'+i"
              :cx="p.x" :cy="p.y" :r="p.r"
              fill="white" :opacity="p.opacity"/>

            <!-- Órbitas sutiles -->
            <ellipse v-for="h in hobbyData" :key="'orb'+h.id"
              :cx="250" :cy="190" 
              :rx="h.orbitRadius" 
              :ry="h.orbitRadius * (1 - Math.abs(h.orbitInclination))"
              fill="none" 
              :stroke="isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)'"
              stroke-width="0.8"
              stroke-dasharray="2 6"/>

            <!-- Sol central suave (sin rayos) -->
            <g transform="translate(250, 190)">
              <circle :r="35 * sunGlow.pulse" fill="url(#sunGrad)" opacity="0.4" filter="url(#strongGlow)"/>
              <circle :r="20 * sunGlow.pulse" fill="#fef3c7" opacity="0.3" filter="url(#glow)"/>
              <circle r="8" fill="#fff" opacity="0.8"/>
            </g>

            <!-- Planetas -->
            <g v-for="h in planetsWithPosition" :key="h.id"
              class="cosmos-planet"
              :class="{ 'cosmos-planet-hovered': hoveredPlanet?.id === h.id }"
              @mouseenter="handlePlanetHover(h)"
              @mouseleave="hoveredPlanet = null"
              @touchstart.prevent="hoveredPlanet = hoveredPlanet?.id === h.id ? null : h"
              :style="{ transform: `translate(${h.x}px, ${h.y}px)` }">
              
              <!-- Aura legendaria -->
              <circle v-if="h.rarity === 'legendary'"
                :r="h.size * 3.5"
                :fill="h.color" opacity="0.06"
                class="cosmos-aura"/>
              
              <!-- Anillo -->
              <ellipse v-if="h.hasRing"
                :rx="h.size * 2.5" :ry="h.size * 0.5"
                fill="none" :stroke="h.color" stroke-width="1.2" opacity="0.35"
                :transform="`rotate(${h.ringTilt})`"
                class="cosmos-ring"/>
              
              <!-- Atmósfera glow -->
              <circle :r="h.size * 1.6" :fill="'url(#atm-'+h.id+')'"/>
              
              <!-- Planeta principal -->
              <circle :r="h.size" :fill="'url(#planet-'+h.id+')'" filter="url(#planetGlow)"/>
              
              <!-- Textura de superficie - rayas -->
              <g v-if="h.surfaceType === 1" opacity="0.15">
                <line v-for="i in 3" :key="'line'+i"
                  :x1="-h.size * 0.7" :y1="(i - 2) * h.size * 0.3"
                  :x2="h.size * 0.7" :y2="(i - 2) * h.size * 0.3"
                  stroke="white" stroke-width="1"/>
              </g>
              
              <!-- Textura de superficie - motas -->
              <g v-if="h.surfaceType === 2" opacity="0.2">
                <circle v-for="i in 4" :key="'dot'+i"
                  :cx="(sd(h.seed * i * 17) - 0.5) * h.size"
                  :cy="(sd(h.seed * i * 31) - 0.5) * h.size"
                  :r="sd(h.seed * i * 47) * h.size * 0.3"
                  fill="white"/>
              </g>
              
              <!-- Brillo especular (efecto 3D) -->
              <ellipse :cx="-h.size * 0.25" :cy="-h.size * 0.25" 
                :rx="h.size * 0.35" :ry="h.size * 0.2"
                fill="white" opacity="0.35" transform="rotate(-35)"/>
              
              <!-- Sombra para efecto 3D -->
              <path :d="`M 0,0 m -${h.size},0 a ${h.size},${h.size} 0 0,1 ${h.size * 2},0`"
                fill="black" opacity="0.15"
                transform="rotate(140)"/>
              
              <!-- Lunas orbitando -->
              <g v-for="m in h.moonCount" :key="'moon'+m"
                :transform="`rotate(${time * 0.001 * (m + 1) * 30 + m * 90})`">
                <circle :cx="h.size + 10 + m * 6" r="2.5" 
                  :fill="isDark ? '#e2e8f0' : '#475569'" opacity="0.8"/>
              </g>
              
              <!-- Nombre (solo en hover) -->
              <text v-if="hoveredPlanet?.id === h.id"
                :y="-h.size - 14"
                text-anchor="middle" 
                :fill="isDark ? 'rgba(255,255,255,.95)' : 'rgba(0,0,0,.85)'"
                font-size="12" font-weight="700"
                style="pointer-events: none;">
                {{ h.name }}
              </text>
              
              <!-- Badge racha minimal -->
              <g v-if="h.streak > 0" transform="translate(0, h.size + 12)">
                <rect :x="-14" :y="-5" width="28" height="12" rx="6"
                  :fill="rarityColor(h.rarity)" opacity="0.2"/>
                <text text-anchor="middle" y="2.5"
                  :fill="rarityColor(h.rarity)"
                  font-size="7" font-weight="800">
                  {{ h.streak }}d
                </text>
              </g>
            </g>

            <!-- Tooltip flotante elegante -->
            <g v-if="hoveredPlanet" 
              :transform="`translate(${hoveredPlanet.x}, ${hoveredPlanet.y - hoveredPlanet.size - 50})`"
              style="pointer-events: none;">
              <rect :x="-55" :y="-28" width="110" height="42" rx="14"
                :fill="isDark ? 'rgba(15,23,42,.92)' : 'rgba(255,255,255,.92)'"
                :stroke="hoveredPlanet.color" stroke-width="1" stroke-opacity="0.3"
                filter="url(#glow)"/>
              <text y="-14" text-anchor="middle" 
                :fill="isDark ? '#fff' : '#0f172a'"
                font-size="12" font-weight="800">{{ hoveredPlanet.name }}</text>
              <text y="-2" text-anchor="middle"
                :fill="rarityColor(hoveredPlanet.rarity)"
                font-size="10" font-weight="700">{{ rarityLabel(hoveredPlanet.rarity) }}</text>
              <text y="10" text-anchor="middle"
                :fill="isDark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.5)'"
                font-size="9">{{ hoveredPlanet.sessions }} ses · {{ hoveredPlanet.streak }}d 🔥</text>
            </g>
          </svg>
        </div>

        <!-- Legend minimal -->
        <div class="cosmos-legend">
          <div class="cosmos-legend-item">
            <div class="cosmos-legend-dot" style="background: #60a5fa;"></div>
            <span>Común</span>
          </div>
          <div class="cosmos-legend-item">
            <div class="cosmos-legend-dot" style="background: #c084fc;"></div>
            <span>Épica</span>
          </div>
          <div class="cosmos-legend-item">
            <div class="cosmos-legend-dot" style="background: #fde047;"></div>
            <span>Legendaria</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ── Variables ───────────────────────── */
.cosmos-fab-wrap {
  --primary: #6366f1;
  --primary-glow: rgba(99,102,241,.4);
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 900;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── FAB ─────────────────────────────── */
.cosmos-pulse {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  background: var(--primary-glow);
}

.r1 { width: 64px; height: 64px; animation: cosmosPulse 3s ease-out infinite; }
.r2 { width: 80px; height: 80px; animation: cosmosPulse 3s ease-out infinite 1s; }
.r3 { width: 96px; height: 96px; animation: cosmosPulse 3s ease-out infinite 2s; }

@keyframes cosmosPulse {
  0% { transform: scale(0.8); opacity: 0.5; }
  100% { transform: scale(1.8); opacity: 0; }
}

.cosmos-fab {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #4f46e5 0%, #1e1b4b 100%);
  box-shadow: 
    0 4px 20px var(--primary-glow),
    0 0 0 1px rgba(255,255,255,.1) inset,
    0 -2px 10px rgba(255,255,255,.08) inset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: visible;
}

.cosmos-fab:hover {
  transform: scale(1.12) rotate(8deg);
  box-shadow: 
    0 6px 30px var(--primary-glow),
    0 0 0 1px rgba(255,255,255,.2) inset;
}

.cosmos-fab-core {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
  position: relative;
  z-index: 2;
  box-shadow: 0 0 16px #fbbf24, 0 0 32px rgba(251,191,36,.4);
}

.cosmos-fab-glow {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(251,191,36,.25) 0%, transparent 70%);
  animation: cosmosCorePulse 2.5s ease-in-out infinite;
}

@keyframes cosmosCorePulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.4); opacity: 0.2; }
}

.cosmos-fab-ring {
  position: absolute;
  inset: -10px;
  width: calc(100% + 20px);
  height: calc(100% + 20px);
  animation: cosmosSpin 15s linear infinite;
}

@keyframes cosmosSpin {
  to { transform: rotate(360deg); }
}

/* ── Backdrop & Modal ────────────────── */
.cosmos-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0,0,0,.5);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}

.cosmos-modal {
  width: 100%;
  max-width: 480px;
  height: 92vh;
  max-height: 850px;
  background: #0a0e27;
  border-radius: 32px 32px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  box-shadow: 0 -20px 60px rgba(0,0,0,.6);
  transition: background 0.5s ease;
}

.cosmos-modal.cosmos-light {
  background: #fef9e7;
}

@media (min-width: 640px) {
  .cosmos-backdrop {
    align-items: center;
    padding: 20px;
  }
  .cosmos-modal {
    border-radius: 32px;
    height: 88vh;
  }
}

/* ── Header ──────────────────────────── */
.cosmos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 12px;
  flex-shrink: 0;
}

.cosmos-title {
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  margin: 0;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #fff 0%, #c7d2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.cosmos-light .cosmos-title {
  background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%);
  -webkit-background-clip: text;
}

.cosmos-controls {
  display: flex;
  gap: 8px;
}

.cosmos-mode-btn,
.cosmos-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 16px;
}

.cosmos-light .cosmos-mode-btn,
.cosmos-light .cosmos-close {
  background: rgba(0,0,0,.05);
  color: rgba(0,0,0,.5);
}

.cosmos-mode-btn:hover,
.cosmos-close:hover {
  background: rgba(255,255,255,.15);
  transform: scale(1.1);
}

/* ── Stats ───────────────────────────── */
.cosmos-stats {
  display: flex;
  gap: 10px;
  padding: 0 24px 12px;
  flex-shrink: 0;
}

.cosmos-stat {
  flex: 1;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 16px;
  padding: 10px 8px;
  text-align: center;
  transition: all 0.3s;
}

.cosmos-light .cosmos-stat {
  background: rgba(255,255,255,.5);
  border-color: rgba(0,0,0,.04);
}

.cosmos-stat:hover {
  transform: translateY(-2px);
  background: rgba(255,255,255,.08);
}

.cosmos-stat-num {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}

.cosmos-light .cosmos-stat-num {
  color: #1e1b4b;
}

.cosmos-stat-label {
  font-size: 9px;
  color: rgba(255,255,255,.35);
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.cosmos-light .cosmos-stat-label {
  color: rgba(0,0,0,.35);
}

/* ── Misión compacta ─────────────────── */
.cosmos-mission {
  margin: 0 24px 12px;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(99,102,241,.12) 0%, rgba(168,85,247,.08) 100%);
  border: 1px solid rgba(99,102,241,.15);
  border-radius: 14px;
  font-size: 12px;
  color: rgba(255,255,255,.8);
  font-weight: 600;
  text-align: center;
  flex-shrink: 0;
}

.cosmos-light .cosmos-mission {
  background: linear-gradient(135deg, rgba(99,102,241,.08) 0%, rgba(168,85,247,.05) 100%);
  border-color: rgba(99,102,241,.1);
  color: rgba(0,0,0,.75);
}

/* ── Universe ────────────────────────── */
.cosmos-universe {
  flex: 1;
  min-height: 0;
  position: relative;
  margin: 0 16px;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(0,0,0,.15);
}

.cosmos-light .cosmos-universe {
  background: rgba(255,255,255,.2);
}

.cosmos-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* Planetas */
.cosmos-planet {
  cursor: pointer;
  transition: filter 0.3s ease;
  transform-box: fill-box;
  transform-origin: center;
}

.cosmos-planet:hover {
  filter: brightness(1.25) saturate(1.2);
}

.cosmos-planet-hovered {
  animation: none !important;
}

.cosmos-aura {
  animation: cosmosAuraPulse 4s ease-in-out infinite;
}

@keyframes cosmosAuraPulse {
  0%, 100% { transform: scale(1); opacity: 0.06; }
  50% { transform: scale(1.15); opacity: 0.03; }
}

.cosmos-ring {
  animation: cosmosRingRotate 25s linear infinite;
}

@keyframes cosmosRingRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── Legend ──────────────────────────── */
.cosmos-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 12px 24px 20px;
  flex-shrink: 0;
}

.cosmos-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(255,255,255,.4);
  font-weight: 500;
}

.cosmos-light .cosmos-legend-item {
  color: rgba(0,0,0,.4);
}

.cosmos-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

/* ── Transitions ─────────────────────── */
.cosmos-fade-enter-active,
.cosmos-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.cosmos-fade-enter-from,
.cosmos-fade-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}

/* ── Responsive ──────────────────────── */
@media (max-width: 480px) {
  .cosmos-title { font-size: 20px; }
  .cosmos-stats { padding: 0 16px 10px; gap: 8px; }
  .cosmos-stat { padding: 8px 6px; }
  .cosmos-mission { margin: 0 16px 10px; font-size: 11px; }
  .cosmos-universe { margin: 0 12px; }
  .cosmos-legend { padding: 10px 16px 16px; gap: 16px; }
}
</style>