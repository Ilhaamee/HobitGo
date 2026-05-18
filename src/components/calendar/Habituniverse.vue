<script setup>
import { ref, computed, onMounted, onUnmounted, watch, toRefs } from 'vue'

const props = defineProps({
  hobbies:  { type: Array, default: () => [] },
  sessions: { type: Array, default: () => [] },
  inline:   { type: Boolean, default: false },
})

const { hobbies, sessions } = toRefs(props)
const open = ref(false)
const isDark = ref(true)
const hoveredPlanet = ref(null)
const mousePos = ref({ x: 250, y: 190 })
const time = ref(0)
const audioContext = ref(null)

// Animación de celebración por planeta
const celebratingPlanet = ref(null)  // { id, startTime, progress }

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
  const frequencies = [261.63, 329.63, 392.00, 523.25]
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

// ===== CELEBRACIÓN: detectar hobbies completados =====
const prevCompletedIds = ref(new Set())

watch(hobbies, (newHobbies) => {
  const currentCompleted = new Set(
    newHobbies.filter(h => h.completed_at).map(h => h.id)
  )
  
  // Detectar nuevos completados
  for (const id of currentCompleted) {
    if (!prevCompletedIds.value.has(id)) {
      const hobby = newHobbies.find(h => h.id === id)
      startPlanetCelebration(id, hobby?.name || '')
    }
  }
  
  prevCompletedIds.value = currentCompleted
}, { immediate: true, deep: true })

function startPlanetCelebration(planetId, name) {
  celebratingPlanet.value = { id: planetId, name, startTime: Date.now() }
  
  // Auto-limpiar después de 4 segundos
  setTimeout(() => {
    if (celebratingPlanet.value?.id === planetId) {
      celebratingPlanet.value = null
    }
  }, 4000)
}

// ===== DATOS DE HOBBIES =====
const hobbyData = computed(() => {
  return hobbies.value.map((h, idx) => {
    const ms = sessions.value.filter(s => s.hobby_id === h.id)  

    // Fechas únicas ordenadas
    const dates = [...new Set(ms.map(s => new Date(s.created_at).toDateString()))]
      .map(d => new Date(d)).sort((a,b) => b-a)

    // Racha activa
    let activeStreak = 0
    let cur = new Date(); cur.setHours(0,0,0,0)
    for (const d of dates) {
      const diff = Math.round((cur - d) / 86400000)
      if (diff <= 1) { activeStreak++; cur = d }
      else break
    }

    // Racha máxima histórica
    let maxStreak = 0, tempStreak = 0, prevDate = null
    const sortedDates = [...dates].sort((a,b) => a-b)
    for (const d of sortedDates) {
      if (!prevDate || Math.round((d - prevDate) / 86400000) === 1) tempStreak++
      else tempStreak = 1
      maxStreak = Math.max(maxStreak, tempStreak)
      prevDate = d
    }

    // TODAS las sesiones (no solo del mes) para el tamaño del planeta
    const allSessions = ms.length

    const seed = h.name.split('').reduce((a,c) => a + c.charCodeAt(0), idx * 999)
    const rarity = activeStreak >= 14 ? 'legendary' : activeStreak >= 7 ? 'epic' : 'common'

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

    const orbitRadius = 70 + sd(seed * 17) * 130
    const orbitSpeed = 0.0002 + sd(seed * 31) * 0.0004
    const orbitOffset = sd(seed * 47) * Math.PI * 2
    const orbitInclination = (sd(seed * 23) - 0.5) * 0.4

    // Tamaño basado en TODAS las sesiones (más grande con más práctica)
    const size = Math.min(40, 14 + allSessions * 1.2)

    const hasRing = rarity !== 'common' || sd(seed * 13) > 0.6
    const ringTilt = sd(seed * 19) * 40 - 20
    const hasMoons = allSessions > 3 || rarity === 'legendary'
    const moonCount = hasMoons ? Math.floor(sd(seed * 41) * 2) + 1 : 0

    const surfaceType = Math.floor(sd(seed * 67) * 3)

    // Usar completed_at de la BD (fuente de verdad)
    const isCompleted = !!h.completed_at
    const uniqueDates = [...new Set(ms.map(s => new Date(s.created_at).toDateString()))]

    return {
      id: h.id,
      name: h.name,
      color: baseColor,
      midColor,
      darkColor,
      sessions: allSessions,           // ← CORREGIDO: todas las sesiones
      totalSessions: allSessions,       // ← consistente
      activeStreak,
      maxStreak,
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
      isCompleted,
      completionPercent: Math.min(100, Math.round(uniqueDates.length / Math.max(1, h.total_days || 30) * 100)),
      x: 250,
      y: 190,
      pulsePhase: sd(seed * 7) * Math.PI * 2
    }
  })
})

// Posiciones de planetas
const planetsWithPosition = computed(() => {
  return hobbyData.value.map(h => {
    const angle = time.value * h.orbitSpeed + h.orbitOffset
    const x = 250 + Math.cos(angle) * h.orbitRadius
    const y = 190 + Math.sin(angle) * h.orbitRadius * (1 - Math.abs(h.orbitInclination))
    const z = Math.sin(angle)
    
    // Si está celebrando, aplicar efecto visual
    const isCelebrating = celebratingPlanet.value?.id === h.id
    const celebrationProgress = isCelebrating 
      ? Math.min(1, (Date.now() - celebratingPlanet.value.startTime) / 3000)
      : 0

    return { 
      ...h, x, y, z, angle, 
      isCelebrating, 
      celebrationProgress,
      celebrationScale: isCelebrating ? 1 + Math.sin(celebrationProgress * Math.PI) * 0.4 : 1
    }
  }).sort((a, b) => a.z - b.z)
})

const totalSessions = computed(() => sessions.value.length)
const maxStreak = computed(() => Math.max(0, ...hobbyData.value.map(h => h.activeStreak)))
const epicCount = computed(() => hobbyData.value.filter(h => h.rarity === 'epic' || h.rarity === 'legendary').length)
const legendaryCount = computed(() => hobbyData.value.filter(h => h.rarity === 'legendary').length)

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

const nebulas = [
  { cx: 120, cy: 100, r: 200, color: '#6366f1', opacity: 0.12 },
  { cx: 400, cy: 280, r: 220, color: '#a855f7', opacity: 0.1 },
  { cx: 300, cy: 60, r: 180, color: '#ec4899', opacity: 0.08 },
  { cx: 80, cy: 320, r: 170, color: '#3b82f6', opacity: 0.06 }
]

const sunGlow = computed(() => {
  const pulse = 1 + Math.sin(time.value * 0.001) * 0.1
  return { pulse }
})

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

const shootingStars = computed(() => {
  return Array.from({ length: 3 }, (_, i) => {
    const seed = i * 73 + Math.floor(time.value / 3000) * 17
    return {
      x1: sd(seed * 13) * 500,
      y1: sd(seed * 37) * 200,
      length: 30 + sd(seed * 59) * 70,
      angle: sd(seed * 71) * 60 + 15,
      opacity: Math.max(0, 1 - (time.value % 3000) / 2500),
      active: (time.value % 3000) > 200 && (time.value % 3000) < 2800
    }
  }).filter(s => s.active)
})

const nebulaPulse = computed(() => {
  const pulse = 0.8 + Math.sin(time.value * 0.0008) * 0.2
  return { pulse }
})

const dustParticles = computed(() => {
  return Array.from({ length: 40 }, (_, i) => {
    const seed = i * 199
    const t = time.value * 0.00015
    return {
      x: (sd(seed * 13) * 500 + t * 20 * (sd(seed * 29) - 0.5)) % 500,
      y: (sd(seed * 37) * 380 + t * 15 * (sd(seed * 43) - 0.5)) % 380,
      r: 0.3 + sd(seed * 59) * 1.2,
      opacity: 0.1 + sd(seed * 71) * 0.3,
      twinkle: 0.5 + 0.5 * Math.sin(time.value * 0.001 * (1 + sd(seed * 89) * 2))
    }
  })
})

// Partículas de celebración (confeti dorado)
const celebrationParticles = computed(() => {
  if (!celebratingPlanet.value) return []
  
  const planet = planetsWithPosition.value.find(p => p.id === celebratingPlanet.value.id)
  if (!planet) return []
  
  const progress = Math.min(1, (Date.now() - celebratingPlanet.value.startTime) / 3000)
  
  return Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2 + time.value * 0.005
    const dist = 20 + progress * 60
    return {
      x: planet.x + Math.cos(angle) * dist,
      y: planet.y + Math.sin(angle) * dist,
      r: 2 + Math.sin(i * 3) * 1.5,
      opacity: Math.max(0, 1 - progress),
      color: ['#fde047', '#fbbf24', '#f59e0b', '#fff'][i % 4]
    }
  })
})

const missionText = computed(() => {
  if (!hobbyData.value.length) return 'Crea tu primer hobby y despega 🚀'

  const completed = hobbyData.value.filter(h => h.isCompleted).length
  const legendaries = legendaryCount.value
  const epics = epicCount.value
  const activeStreaks = hobbyData.value.filter(h => h.activeStreak > 0).length

  if (completed > 0 && completed === hobbyData.value.length) {
    return `¡${completed} hobbies completados! Eres una leyenda 🏆`
  }
  if (legendaries > 0) {
    return `¡${legendaries} en modo legendario! ${maxStreak.value} días máx 🔥`
  }
  if (epics > 0) {
    return `¡${epics} hobby${epics > 1 ? 's' : ''} épico${epics > 1 ? 's' : ''}! Racha de ${maxStreak.value} días ✨`
  }
  if (activeStreaks > 0) {
    return `¡${activeStreaks} con racha activa! Sigue construyendo tu cosmos 🚀`
  }
  if (completed > 0) {
    return `¡${completed} completado${completed > 1 ? 's' : ''}! El universo crece 🌟`
  }

  return 'Haz una sesión hoy para encender una estrella 🪐'
})

function rarityLabel(r) {
  return r === 'legendary' ? '⭐ Legendaria' : r === 'epic' ? '✦ Épica' : '● Común'
}

function rarityColor(r) {
  return r === 'legendary' ? '#fde047' : r === 'epic' ? '#c084fc' : '#60a5fa'
}

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

onMounted(() => { 
  animate() 
})

onUnmounted(() => { 
  cancelAnimationFrame(animFrame) 
})
</script>

<template>
  <!-- Botón Inline -->
  <button v-if="inline" class="cosmos-inline-btn" @click="handleOpen" title="Tu Universo">
    <svg class="cosmos-inline-icon" viewBox="0 0 40 40" width="22" height="22">
      <defs>
        <radialGradient id="inlinePlanetGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#8b5cf6"/>
          <stop offset="50%" stop-color="#6366f1"/>
          <stop offset="100%" stop-color="#312e81"/>
        </radialGradient>
        <filter id="inlineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="5" cy="8" r="0.8" fill="white" opacity="0.6"/>
      <circle cx="34" cy="6" r="0.6" fill="white" opacity="0.4"/>
      <circle cx="8" cy="32" r="0.5" fill="white" opacity="0.5"/>
      <circle cx="35" cy="30" r="0.7" fill="white" opacity="0.3"/>
      <circle cx="20" cy="4" r="0.4" fill="white" opacity="0.7"/>
      <g transform="translate(20, 20)">
        <ellipse rx="13" ry="4" fill="none" stroke="#a855f7" stroke-width="1.2" opacity="0.5" transform="rotate(-20)"/>
        <circle r="7" fill="url(#inlinePlanetGrad)" filter="url(#inlineGlow)"/>
        <ellipse cx="-2" cy="-2" rx="3" ry="2.5" fill="white" opacity="0.35"/>
        <path d="M 0,-7 A 7,7 0 0,1 0,7 A 3.5,7 0 0,0 0,-7" fill="black" opacity="0.25"/>
        <ellipse rx="13" ry="4" fill="none" stroke="#c084fc" stroke-width="1" opacity="0.7" transform="rotate(-20)"/>
        <circle cx="10" cy="-3" r="1.5" fill="#fde047" opacity="0.9"/>
      </g>
      <circle class="cosmos-inline-p1" cx="6" cy="20" r="0.8" fill="#fbbf24" opacity="0.8"/>
      <circle class="cosmos-inline-p2" cx="34" cy="18" r="0.6" fill="#c084fc" opacity="0.7"/>
    </svg>
  </button>

  <!-- FAB Grande -->
  <div v-else class="cosmos-fab-wrap">
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

        <!-- Header -->
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

        <!-- Stats -->
        <div class="cosmos-stats">
          <div class="cosmos-stat">
            <span class="cosmos-stat-num">{{ totalSessions }}</span>
            <span class="cosmos-stat-label">sesiones</span>
          </div>
          <div class="cosmos-stat">
            <span class="cosmos-stat-num">{{ maxStreak }}d</span>
            <span class="cosmos-stat-label">racha máx</span>
          </div>
          <div class="cosmos-stat">
            <span class="cosmos-stat-num">{{ epicCount }}</span>
            <span class="cosmos-stat-label">épicas</span>
          </div>
        </div>

        <!-- Misión -->
        <div class="cosmos-mission">
          {{ missionText }}
        </div>

        <!-- UNIVERSO -->
        <div class="cosmos-universe" @mousemove="handleMouseMove">
          <svg viewBox="0 0 500 380" class="cosmos-svg" preserveAspectRatio="xMidYMid slice">
            <defs>
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
              <filter id="celebrationGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="8" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              <radialGradient v-for="h in hobbyData" :key="'pg-'+h.id" :id="'planet-'+h.id" cx="25%" cy="25%" r="75%">
                <stop offset="0%" :stop-color="h.color" stop-opacity="1"/>
                <stop offset="40%" :stop-color="h.midColor" stop-opacity="1"/>
                <stop offset="100%" :stop-color="h.darkColor" stop-opacity="0.9"/>
              </radialGradient>

              <radialGradient v-for="h in hobbyData" :key="'atm-'+h.id" :id="'atm-'+h.id" cx="50%" cy="50%" r="50%">
                <stop offset="30%" :stop-color="h.color" stop-opacity="0"/>
                <stop offset="100%" :stop-color="h.color" stop-opacity="0.25"/>
              </radialGradient>

              <!-- Gradiente dorado para celebración -->
              <radialGradient id="goldGlow" cx="50%" cy="50%">
                <stop offset="0%" stop-color="#fde047" stop-opacity="0.8"/>
                <stop offset="50%" stop-color="#fbbf24" stop-opacity="0.4"/>
                <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
              </radialGradient>

              <radialGradient id="sunGrad" cx="50%" cy="50%">
                <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.9"/>
                <stop offset="30%" stop-color="#fbbf24" stop-opacity="0.6"/>
                <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
              </radialGradient>
            </defs>

            <!-- Fondo -->
            <rect width="500" height="380" :fill="isDark ? 'url(#bgDark)' : 'url(#bgLight)'"/>

            <!-- Nebulosa central -->
            <g :transform="`translate(250, 190) scale(${nebulaPulse.pulse})`" opacity="0.15">
              <circle r="180" :fill="isDark ? '#a855f7' : '#fbbf24'" filter="url(#strongGlow)"/>
              <circle r="120" :fill="isDark ? '#ec4899' : '#f59e0b'" opacity="0.3" filter="url(#glow)"/>
              <circle r="60" :fill="isDark ? '#6366f1' : '#fde047'" opacity="0.4" filter="url(#glow)"/>
            </g>

            <!-- Polvo espacial -->
            <circle v-for="(d, i) in dustParticles" :key="'dust'+i"
              :cx="d.x" :cy="d.y" :r="d.r"
              fill="white" :opacity="d.opacity * d.twinkle"/>

            <!-- Estrellas fugaces -->
            <g v-for="(s, i) in shootingStars" :key="'shoot'+i" :opacity="s.opacity">
              <line :x1="s.x1" :y1="s.y1" 
                :x2="s.x1 - Math.cos(s.angle * Math.PI / 180) * s.length"
                :y2="s.y1 - Math.sin(s.angle * Math.PI / 180) * s.length"
                stroke="white" stroke-width="1.5" stroke-linecap="round"/>
              <circle :cx="s.x1" :cy="s.y1" r="2" fill="white" filter="url(#glow)"/>
            </g>

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

            <!-- Órbitas -->
            <ellipse v-for="h in hobbyData" :key="'orb'+h.id"
              :cx="250" :cy="190" 
              :rx="h.orbitRadius" 
              :ry="h.orbitRadius * (1 - Math.abs(h.orbitInclination))"
              fill="none" 
              :stroke="isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)'"
              stroke-width="0.8"
              stroke-dasharray="2 6"/>

            <!-- Sol central -->
            <g transform="translate(250, 190)">
              <circle :r="50 * sunGlow.pulse" :fill="isDark ? '#a855f7' : '#fbbf24'" opacity="0.08" filter="url(#strongGlow)"/>
              <circle :r="35 * sunGlow.pulse" fill="url(#sunGrad)" opacity="0.4" filter="url(#strongGlow)"/>
              <circle :r="20 * sunGlow.pulse" :fill="isDark ? '#fef3c7' : '#fff'" opacity="0.3" filter="url(#glow)"/>
              <circle r="10" :fill="isDark ? '#fff' : '#fef3c7'" opacity="0.9"/>
            </g>

            <!-- PLANETAS -->
            <g v-for="h in planetsWithPosition" :key="h.id"
              class="cosmos-planet"
              :class="{ 
                'cosmos-planet-hovered': hoveredPlanet?.id === h.id, 
                'cosmos-planet-completed': h.isCompleted,
                'cosmos-planet-celebrating': h.isCelebrating 
              }"
              @mouseenter="handlePlanetHover(h)"
              @mouseleave="hoveredPlanet = null"
              @touchstart.prevent="hoveredPlanet = hoveredPlanet?.id === h.id ? null : h"
              :style="{ 
                transform: `translate(${h.x}px, ${h.y}px) scale(${h.celebrationScale})`,
                filter: h.isCelebrating ? 'brightness(1.5) saturate(1.3)' : ''
              }">

              <!-- Aura legendaria -->
              <circle v-if="h.rarity === 'legendary'"
                :r="h.size * 3.5"
                :fill="h.color" opacity="0.06"
                class="cosmos-aura"/>

              <!-- GLOW DORADO de celebración -->
              <g v-if="h.isCelebrating">
                <circle :r="h.size * 4" fill="url(#goldGlow)" filter="url(#celebrationGlow)" opacity="0.6"/>
                <circle :r="h.size * 2.5" fill="#fde047" opacity="0.3" filter="url(#strongGlow)"/>
              </g>

              <!-- Anillo -->
              <ellipse v-if="h.hasRing"
                :rx="h.size * 2.5" :ry="h.size * 0.5"
                fill="none" :stroke="h.isCelebrating ? '#fde047' : h.color" 
                :stroke-width="h.isCelebrating ? 2 : 1.2" 
                :opacity="h.isCelebrating ? 0.8 : 0.35"
                :transform="`rotate(${h.ringTilt})`"
                class="cosmos-ring"/>

              <!-- Atmósfera glow -->
              <circle :r="h.size * 1.6" :fill="'url(#atm-'+h.id+')'"/>

              <!-- Planeta principal -->
              <circle :r="h.size" :fill="'url(#planet-'+h.id+')'" filter="url(#planetGlow)"/>

              <!-- Textura rayas -->
              <g v-if="h.surfaceType === 1" opacity="0.15">
                <line v-for="i in 3" :key="'line'+i"
                  :x1="-h.size * 0.7" :y1="(i - 2) * h.size * 0.3"
                  :x2="h.size * 0.7" :y2="(i - 2) * h.size * 0.3"
                  stroke="white" stroke-width="1"/>
              </g>

              <!-- Textura motas -->
              <g v-if="h.surfaceType === 2" opacity="0.2">
                <circle v-for="i in 4" :key="'dot'+i"
                  :cx="(sd(h.seed * i * 17) - 0.5) * h.size"
                  :cy="(sd(h.seed * i * 31) - 0.5) * h.size"
                  :r="sd(h.seed * i * 47) * h.size * 0.3"
                  fill="white"/>
              </g>

              <!-- Brillo especular -->
              <ellipse :cx="-h.size * 0.25" :cy="-h.size * 0.25" 
                :rx="h.size * 0.35" :ry="h.size * 0.2"
                fill="white" opacity="0.35" transform="rotate(-35)"/>

              <!-- Sombra -->
              <path :d="`M 0,0 m -${h.size},0 a ${h.size},${h.size} 0 0,1 ${h.size * 2},0`"
                fill="black" opacity="0.15"
                transform="rotate(140)"/>

              <!-- Lunas orbitando -->
              <g v-for="m in h.moonCount" :key="'moon'+m"
                :transform="`rotate(${time * 0.001 * (m + 1) * 30 + m * 90})`">
                <circle :cx="h.size + 10 + m * 6" r="2.5" 
                  :fill="isDark ? '#e2e8f0' : '#475569'" opacity="0.8"/>
              </g>

              <!-- Nombre en hover -->
              <text v-if="hoveredPlanet?.id === h.id"
                :y="-h.size - 14"
                text-anchor="middle" 
                :fill="isDark ? 'rgba(255,255,255,.95)' : 'rgba(0,0,0,.85)'"
                font-size="12" font-weight="700"
                style="pointer-events: none;">
                {{ h.name }}
              </text>

              <!-- Badge racha -->
              <g v-if="h.activeStreak > 0" transform="translate(0, h.size + 12)">
                <rect :x="-14" :y="-5" width="28" height="12" rx="6"
                  :fill="rarityColor(h.rarity)" opacity="0.2"/>
                <text text-anchor="middle" y="2.5"
                  :fill="rarityColor(h.rarity)"
                  font-size="7" font-weight="800">
                  {{ h.activeStreak }}d
                </text>
              </g>

              <!-- Badge completado -->
              <g v-if="h.isCompleted" transform="translate(h.size + 8, -h.size + 4)">
                <circle r="5" fill="#22c55e" opacity="0.9"/>
                <path d="M-2,0 L-0.5,2 L2,-2" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </g>

              <!-- Texto de celebración flotante -->
              <g v-if="h.isCelebrating" :transform="`translate(0, -${h.size + 35})`" style="pointer-events: none;">
                <rect :x="-50" :y="-10" width="100" height="22" rx="11"
                  fill="#fde047" opacity="0.95"/>
                <text text-anchor="middle" y="4"
                  fill="#92400e" font-size="10" font-weight="800">
                  ¡{{ h.name }} completado!
                </text>
              </g>
            </g>

            <!-- Partículas de confeti (encima de todo) -->
            <g v-for="(p, i) in celebrationParticles" :key="'conf'+i">
              <circle :cx="p.x" :cy="p.y" :r="p.r" :fill="p.color" :opacity="p.opacity"/>
            </g>

            <!-- Tooltip flotante -->
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
                font-size="9">{{ hoveredPlanet.sessions }} ses · {{ hoveredPlanet.activeStreak }}d 🔥</text>
            </g>
          </svg>
        </div>

        <!-- Legend -->
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

/* ── Botón Inline ────────────────────── */
.cosmos-inline-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.25);
  vertical-align: middle;
  overflow: visible;
}
.cosmos-inline-btn:hover {
  transform: scale(1.15) rotate(5deg);
  box-shadow: 0 4px 20px rgba(168, 85, 247, 0.4);
}
.cosmos-inline-btn:hover .cosmos-inline-icon {
  transform: scale(1.1);
}
.cosmos-inline-icon {
  transition: transform 0.3s ease;
}

/* Partículas parpadeantes */
.cosmos-inline-p1 {
  animation: inlineTwinkle 2s ease-in-out infinite;
}
.cosmos-inline-p2 {
  animation: inlineTwinkle 2.5s ease-in-out infinite 0.5s;
}

@keyframes inlineTwinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
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

/* ── Misión ─────────────────── */
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

.cosmos-planet-completed {
  filter: drop-shadow(0 0 8px #22c55e);
}

.cosmos-planet-celebrating {
  animation: planetCelebrate 0.6s ease-in-out infinite alternate;
}

@keyframes planetCelebrate {
  from { filter: brightness(1.3) saturate(1.2) drop-shadow(0 0 12px #fde047); }
  to { filter: brightness(1.6) saturate(1.4) drop-shadow(0 0 20px #fbbf24); }
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