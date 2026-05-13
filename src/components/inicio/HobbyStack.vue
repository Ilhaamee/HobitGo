<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  hobbies:  { type: Array, default: () => [] },
  sessions: { type: Array, default: () => [] },
})

const emit = defineEmits(['quick-checkin'])

const isVisible = ref(false)
onMounted(() => {
  setTimeout(() => isVisible.value = true, 300)
})

/* ── Calcular progreso ── */
const hobbyCards = computed(() => {
  const today = new Date().toDateString()
  return props.hobbies.map((h, i) => {
    const todaySessions = props.sessions.filter(s =>
      s.hobby_id === h.id &&
      new Date(s.created_at).toDateString() === today
    )
    const totalMin = todaySessions.reduce((sum, s) => sum + (s.minutes || 0), 0)
    const goal     = h.daily_minutes || 20
    const progress = Math.min(100, Math.round((totalMin / goal) * 100))
    const done     = totalMin >= goal
    const color    = Array.isArray(h.gradient) ? h.gradient[0] : '#ff6b9d'
    const color2   = Array.isArray(h.gradient) ? h.gradient[1] : '#ffb3c6'
    
    // Icon mapping
    const icons = {
      'lectura': '📚', 'libro': '📖', 'leer': '📚',
      'ejercicio': '💪', 'gym': '🏋️', 'fitness': '🏃',
      'música': '🎵', 'guitarra': '🎸', 'piano': '🎹',
      'cocina': '👨‍🍳', 'cocinar': '🍳',
      'arte': '🎨', 'dibujo': '✏️', 'pintura': '🖌️',
      'meditación': '🧘', 'yoga': '🧘‍♀️',
      'programación': '💻', 'código': '👨‍💻',
      'fotografía': '📷', 'foto': '📸',
      'escritura': '✍️', 'escribir': '📝',
      'idioma': '🌍', 'inglés': '🇬🇧', 'español': '🇪🇸',
      'default': '✨'
    }
    const icon = Object.entries(icons).find(([k]) => 
      h.name?.toLowerCase().includes(k)
    )?.[1] || icons.default
    
    return { ...h, totalMin, goal, progress, done, color, color2, icon, index: i }
  })
})

/* ── Stack logic ── */
const cards = ref([])
const dragging    = ref(false)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)
const startX      = ref(0)
const startY      = ref(0)
const activeIndex = ref(0)

watch(hobbyCards, val => {
  cards.value = val.map((h, i) => ({ ...h, _key: h.id + '-' + i }))
  activeIndex.value = 0
}, { immediate: true })

const topCard = computed(() => cards.value[activeIndex.value])

/* ── Drag ── */
function onPointerDown(e) {
  dragging.value   = true
  startX.value     = e.touches ? e.touches[0].clientX : e.clientX
  startY.value     = e.touches ? e.touches[0].clientY : e.clientY
  dragOffsetX.value = 0
  dragOffsetY.value = 0
}

function onPointerMove(e) {
  if (!dragging.value) return
  const cx = e.touches ? e.touches[0].clientX : e.clientX
  const cy = e.touches ? e.touches[0].clientY : e.clientY
  dragOffsetX.value = cx - startX.value
  dragOffsetY.value = cy - startY.value
}

function onPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  if (Math.abs(dragOffsetX.value) > 80 || Math.abs(dragOffsetY.value) > 80) {
    nextCard()
  } else {
    dragOffsetX.value = 0
    dragOffsetY.value = 0
  }
}

function nextCard() {
  if (cards.value.length <= 1) return
  activeIndex.value = (activeIndex.value + 1) % cards.value.length
  dragOffsetX.value = 0
  dragOffsetY.value = 0
}

function prevCard() {
  if (cards.value.length <= 1) return
  activeIndex.value = (activeIndex.value - 1 + cards.value.length) % cards.value.length
}

/* ── Card styles ── */
function cardStyle(index) {
  const relativeIndex = (index - activeIndex.value + cards.value.length) % cards.value.length
  
  if (relativeIndex === 0) {
    const rotate = dragging.value ? dragOffsetX.value * 0.06 : 0
    return {
      transform: `translate(${dragOffsetX.value}px, ${dragOffsetY.value}px) rotate(${rotate}deg)`,
      transition: dragging.value ? 'none' : 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
      zIndex: 10,
      cursor: dragging.value ? 'grabbing' : 'grab',
    }
  }
  
  const offset = Math.min(relativeIndex, 3)
  const scale = 1 - offset * 0.04
  const translateY = offset * -12
  const opacity = 1 - offset * 0.15
  
  return {
    transform: `translateY(${translateY}px) scale(${scale})`,
    opacity,
    zIndex: 10 - relativeIndex,
    transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'default',
    pointerEvents: 'none',
  }
}

/* ── Quick check-in ── */
const QUICK_TIMES = [15, 30, 45, 60]
const justChecked = ref(null)

function onCheckin(minutes) {
  if (!topCard.value) return
  justChecked.value = minutes
  emit('quick-checkin', { hobbyId: topCard.value.id, minutes })
  setTimeout(() => { justChecked.value = null }, 800)
}

function formatMins(m) {
  if (!m) return '0m'
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? m % 60 + 'm' : ''}`
}

function getRingStyle(pct, color) {
  const circumference = 2 * Math.PI * 28
  const offset = circumference - (pct / 100) * circumference
  return {
    strokeDasharray: `${circumference}`,
    strokeDashoffset: offset,
    stroke: color
  }
}
</script>

<template>
  <div class="hs-wrap" :class="{ visible: isVisible }">
    <!-- Header -->
    <div class="hs-header">
      <div class="hs-header-left">
        <h2 class="hs-title">Mis hobbies</h2>
        <span class="hs-count">{{ cards.length }} activos</span>
      </div>
      <div class="hs-nav">
        <button class="hs-nav-btn" @click="prevCard" :disabled="cards.length <= 1">
          <svg viewBox="0 0 16 16" fill="none" width="14">
            <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="hs-dots">
          <div
            v-for="(c, i) in cards"
            :key="c._key"
            class="hs-dot"
            :class="{ active: i === activeIndex }"
            :style="i === activeIndex ? { background: topCard?.color } : {}"
            @click="activeIndex = i"
          ></div>
        </div>
        <button class="hs-nav-btn" @click="nextCard" :disabled="cards.length <= 1">
          <svg viewBox="0 0 16 16" fill="none" width="14">
            <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="cards.length === 0" class="hs-empty">
      <div class="hs-empty-icon">🎯</div>
      <p class="hs-empty-title">Añade hobbies</p>
      <p class="hs-empty-sub">Empieza a construir hábitos positivos</p>
    </div>

    <!-- Stack -->
    <div v-else class="hs-stack-area">
      <div class="hs-stack">
        <div
          v-for="(card, i) in cards"
          :key="card._key"
          class="hs-card"
          :class="{ 
            active: i === activeIndex,
            done: card.done && i === activeIndex
          }"
          :style="[cardStyle(i), {
            backgroundImage: card.image_url
              ? `url(${card.image_url})`
              : `linear-gradient(145deg, ${card.color}, ${card.color2})`,
          }]"
          @mousedown="i === activeIndex && onPointerDown($event)"
          @mousemove="i === activeIndex && onPointerMove($event)"
          @mouseup="i === activeIndex && onPointerUp()"
          @mouseleave="i === activeIndex && onPointerUp()"
          @touchstart.prevent="i === activeIndex && onPointerDown($event)"
          @touchmove.prevent="i === activeIndex && onPointerMove($event)"
          @touchend="i === activeIndex && onPointerUp()"
        >
          <!-- Overlay -->
          <div class="hs-overlay"></div>

          <!-- Active card content -->
          <template v-if="i === activeIndex">
            <!-- Done badge -->
            <div v-if="card.done" class="hs-done-badge">
              <svg viewBox="0 0 14 14" fill="none" width="12">
                <path d="M2 7l3.5 3.5 6.5-7" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Completado</span>
            </div>

            <!-- Top: Icon + Name -->
            <div class="hs-card-top">
              <div class="hs-card-icon">{{ card.icon }}</div>
              <div class="hs-card-info">
                <p class="hs-card-name">{{ card.name }}</p>
                <p class="hs-card-sub">{{ formatMins(card.totalMin) }} / {{ formatMins(card.goal) }}</p>
              </div>
            </div>

            <!-- Center: Big ring progress -->
            <div class="hs-ring-area">
              <div class="hs-big-ring">
                <svg viewBox="0 0 64 64" width="64" height="64">
                  <circle class="hs-ring-track-big" cx="32" cy="32" r="28"/>
                  <circle 
                    class="hs-ring-progress-big" 
                    cx="32" cy="32" r="28"
                    :style="getRingStyle(card.progress, '#fff')"
                  />
                </svg>
                <div class="hs-ring-center">
                  <span class="hs-ring-pct">{{ card.progress }}%</span>
                  <span class="hs-ring-label">progreso</span>
                </div>
              </div>
            </div>

            <!-- Quick check-in ON the card -->
            <div class="hs-checkin-area">
              <p class="hs-checkin-label">⏱️ Registrar sesión</p>
              <div class="hs-checkin-btns">
                <button
                  v-for="mins in QUICK_TIMES"
                  :key="mins"
                  class="hs-checkin-btn"
                  :class="{ checked: justChecked === mins }"
                  :style="{ '--btn-color': card.color }"
                  @click.stop="onCheckin(mins)"
                >
                  <span class="hs-btn-plus">+</span>
                  <span class="hs-btn-mins">{{ mins }}m</span>
                </button>
              </div>
            </div>

            <!-- Swipe hint -->
            <div class="hs-swipe-hint">
              <svg viewBox="0 0 20 20" fill="none" width="14">
                <path d="M3 10h14M13 6l4 4-4 4" stroke="rgba(255,255,255,.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Desliza para cambiar</span>
            </div>
          </template>

          <!-- Background cards: just name -->
          <template v-else>
            <div class="hs-back-content">
              <span class="hs-back-icon">{{ card.icon }}</span>
              <span class="hs-back-name">{{ card.name }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hs-wrap {
  margin-bottom: 24px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s var(--ease-out);
}

.hs-wrap.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Header */
.hs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.hs-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hs-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--c-text);
  margin: 0;
  letter-spacing: -0.5px;
}

.hs-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--c-text-muted);
  background: var(--c-border);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Navigation */
.hs-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hs-nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--c-border);
  background: var(--c-bg-card);
  color: var(--c-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.hs-nav-btn:hover:not(:disabled) {
  background: var(--c-text);
  color: #fff;
  border-color: var(--c-text);
  transform: scale(1.1);
}

.hs-nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.hs-dots {
  display: flex;
  gap: 5px;
  align-items: center;
}

.hs-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-border);
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
}

.hs-dot.active {
  width: 20px;
  border-radius: 3px;
}

/* Empty */
.hs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 50px 20px;
  text-align: center;
  background: var(--c-bg-card);
  border: 2px dashed var(--c-border);
  border-radius: var(--radius-xl);
}

.hs-empty-icon {
  font-size: 36px;
  line-height: 1;
  animation: float 3s ease-in-out infinite;
}

.hs-empty-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--c-text);
  margin: 0;
}

.hs-empty-sub {
  font-size: 12px;
  color: var(--c-text-muted);
  margin: 0;
}

/* Stack area */
.hs-stack-area {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hs-stack {
  position: relative;
  width: 100%;
  max-width: 360px;
  height: 420px;
  perspective: 1000px;
}

/* Card */
.hs-card {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-xl);
  background-size: cover;
  background-position: center;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 24px;
  user-select: none;
  -webkit-user-drag: none;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  will-change: transform;
}

.hs-card.active {
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.hs-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.1) 0%,
    rgba(0, 0, 0, 0.05) 30%,
    rgba(0, 0, 0, 0.4) 70%,
    rgba(0, 0, 0, 0.6) 100%
  );
  border-radius: inherit;
  pointer-events: none;
}

/* Done badge */
.hs-done-badge {
  position: relative;
  z-index: 2;
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(34, 197, 94, 0.9);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  margin-bottom: 12px;
  animation: scaleIn 0.4s var(--ease-spring) both;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
}

/* Card top */
.hs-card-top {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.hs-card-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: transform 0.3s var(--ease-spring);
}

.hs-card:hover .hs-card-icon {
  transform: scale(1.1) rotate(-5deg);
}

.hs-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hs-card-name {
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  margin: 0;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.hs-card-sub {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

/* Ring area */
.hs-ring-area {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.hs-big-ring {
  position: relative;
  width: 64px;
  height: 64px;
}

.hs-big-ring svg {
  transform: rotate(-90deg);
  width: 64px;
  height: 64px;
}

.hs-ring-track-big {
  fill: none;
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 4;
}

.hs-ring-progress-big {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s var(--ease-out);
}

.hs-ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.hs-ring-pct {
  font-size: 14px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
}

.hs-ring-label {
  font-size: 8px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* Check-in area ON the card */
.hs-checkin-area {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-lg);
  padding: 14px;
  margin-top: auto;
  margin-bottom: 8px;
}

.hs-checkin-label {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 10px;
  text-align: center;
}

.hs-checkin-btns {
  display: flex;
  gap: 8px;
}

.hs-checkin-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
  transition: all 0.25s var(--ease-spring);
  font-family: inherit;
  position: relative;
  overflow: hidden;
}

.hs-checkin-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--btn-color);
  opacity: 0;
  transition: opacity 0.25s;
}

.hs-checkin-btn:hover {
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.hs-checkin-btn:hover::before {
  opacity: 0.3;
}

.hs-checkin-btn.checked {
  animation: checkBounce 0.5s var(--ease-spring);
  background: rgba(34, 197, 94, 0.5);
  border-color: rgba(34, 197, 94, 0.6);
}

.hs-btn-plus {
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  position: relative;
  z-index: 1;
}

.hs-btn-mins {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.8;
  position: relative;
  z-index: 1;
}

/* Swipe hint */
.hs-swipe-hint {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 10px;
  font-weight: 600;
  margin-top: 4px;
}

/* Back card content */
.hs-back-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  text-align: center;
}

.hs-back-icon {
  font-size: 32px;
  opacity: 0.5;
}

.hs-back-name {
  font-size: 16px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: -0.3px;
}

/* Responsive */
@media (min-width: 480px) {
  .hs-stack { height: 460px; }
  .hs-card-name { font-size: 26px; }
}

@media (max-width: 380px) {
  .hs-stack { height: 380px; }
  .hs-card { padding: 18px; }
  .hs-card-name { font-size: 18px; }
  .hs-checkin-area { padding: 10px; }
}
</style>