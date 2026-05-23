<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
})

const hovered = ref(null)

const CX = 130, CY = 130
const R = 90
const STROKE = 22
const GAP_DEG = 5

const SEG_DEG = (360 - GAP_DEG * 4) / 4  // 85deg each

const segmentDefs = [
  {
    key: 'hobbies',
    label: 'Hobbies',
    desc: 'activos en tu lista',
    color: '#ff6b9d',
    iconColor: '#22284E',
    icon: `<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>`,
    max: 10,
    startAngle: -180 + GAP_DEG / 2,
  },
  {
    key: 'sessions',
    label: 'Sesiones',
    desc: 'registradas en total',
    color: '#fff59e',
    iconColor: '#22284E',
    icon: `<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" stroke-linecap="round"/>`,
    max: 50,
    startAngle: -180 + SEG_DEG + GAP_DEG * 1.5,
  },
  {
    key: 'minutes',
    label: 'Horas',
    desc: 'practicadas en total',
    color: '#C1E899',
    iconColor: '#22284E',
    icon: `<circle cx="12" cy="12" r="10"/><path d="M12 6v6l3 3" stroke-linecap="round"/>`,
    max: 300,
    startAngle: -180 + SEG_DEG * 2 + GAP_DEG * 2.5,
  },
  {
    key: 'today',
    label: 'Hoy',
    desc: 'minutos practicados hoy',
    color: '#ADD8E6',
    iconColor: '#22284E',
    icon: `<path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke-linecap="round"/><polyline points="22 4 12 14.01 9 11.01" stroke-linecap="round" stroke-linejoin="round"/>`,
    max: 60,
    startAngle: -180 + SEG_DEG * 3 + GAP_DEG * 3.5,
  },
]

const segments = computed(() =>
  segmentDefs.map(s => ({
    ...s,
    value: props.stats[s.key] || 0,
    endAngle: s.startAngle + SEG_DEG,
  }))
)

function formatMins(mins, key) {
  if (key === 'minutes') {
    if (mins < 60) return mins + 'min'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? h + 'h ' + m + 'm' : h + 'h'
  }
  return mins.toLocaleString()
}

function toRad(deg) { return (deg * Math.PI) / 180 }

function arcPath(cx, cy, r, startDeg, endDeg) {
  const s = toRad(startDeg), e = toRad(endDeg)
  const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
  const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

function fillPath(seg) {
  const pct = Math.min(1, seg.value / seg.max)
  if (pct <= 0) return ''
  const fillEnd = seg.startAngle + SEG_DEG * pct
  return arcPath(CX, CY, R, seg.startAngle, fillEnd)
}

function iconPos(seg) {
  const mid = toRad((seg.startAngle + seg.endAngle) / 2)
  const r = R + STROKE / 2 + 20
  return {
    x: CX + r * Math.cos(mid),
    y: CY + r * Math.sin(mid),
  }
}

const activeSegment = computed(() =>
  hovered.value ? segments.value.find(s => s.key === hovered.value) : null
)

const totalScore = computed(() => {
  const segs = segments.value
  if (!segs.length) return '0.0'
  const avg = segs.reduce((sum, s) => sum + Math.min(1, s.value / s.max), 0) / segs.length
  return (avg * 10).toFixed(1)
})
</script>

<template>
  <div class="sg-root">
    <div class="sg-chart-wrap">

      <svg :viewBox="`0 0 ${CX * 2} ${CY * 2}`" class="sg-svg">

        <!-- Track background per segment -->
        <path
          v-for="seg in segments" :key="seg.key + '-track'"
          :d="arcPath(CX, CY, R, seg.startAngle, seg.endAngle)"
          fill="none"
          :stroke="seg.color"
          :stroke-width="STROKE"
          stroke-linecap="round"
          opacity="0.25"
        />

        <!-- Filled arc (progress) -->
        <path
          v-for="seg in segments" :key="seg.key + '-fill'"
          :d="fillPath(seg)"
          fill="none"
          :stroke="seg.color"
          stroke-linecap="round"
          style="transition: opacity .25s, stroke-width .2s"
          :stroke-width="hovered === seg.key ? STROKE + 4 : STROKE"
          :opacity="hovered && hovered !== seg.key ? 0.35 : 1"
        />

        <!-- Invisible hit zone -->
        <path
          v-for="seg in segments" :key="seg.key + '-hit'"
          :d="arcPath(CX, CY, R, seg.startAngle, seg.endAngle)"
          fill="none"
          stroke="transparent"
          :stroke-width="STROKE + 24"
          stroke-linecap="round"
          style="cursor: pointer"
          @mouseenter="hovered = seg.key"
          @mouseleave="hovered = null"
          @touchstart.prevent="hovered = hovered === seg.key ? null : seg.key"
        />

        <!-- Icon bubbles outside ring -->
        <g
          v-for="seg in segments"
          :key="seg.key + '-icon'"
          :transform="`translate(${iconPos(seg).x}, ${iconPos(seg).y})`"
          style="pointer-events: none"
        >
          <circle
            cx="0" cy="0" r="15"
            :fill="seg.color"
            :opacity="hovered && hovered !== seg.key ? 0.35 : 1"
            style="transition: opacity .25s"
          />
          <g transform="translate(-10, -10)">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
              :stroke="seg.iconColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"
              v-html="seg.icon"
            />
          </g>
        </g>

      </svg>

      <!-- Center display -->
      <div class="sg-center">
        <template v-if="activeSegment">
          <span class="sg-center-num" :style="{ color: activeSegment.iconColor }">
            {{ formatMins(activeSegment.value, activeSegment.key) }}
          </span>
          <span class="sg-center-label" :style="{ color: activeSegment.iconColor }">{{ activeSegment.label }}</span>
          <span class="sg-center-desc">{{ activeSegment.desc }}</span>
        </template>
        <template v-else>
          <span class="sg-center-score">{{ totalScore }}</span>
          <span class="sg-center-hint">tu progreso</span>
        </template>
      </div>

    </div>

    <!-- Legend -->
    <div class="sg-legend">
      <div
        v-for="seg in segments" :key="seg.key"
        class="sg-legend-item"
        :class="{ active: hovered === seg.key }"
        @mouseenter="hovered = seg.key"
        @mouseleave="hovered = null"
      >
        <span class="sg-legend-dot" :style="{ background: seg.color }"></span>
        <span class="sg-legend-text">
          <b :style="{ color: seg.iconColor }">{{ formatMins(seg.value, seg.key) }}</b> {{ seg.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sg-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.sg-chart-wrap {
  position: relative;
  width: 260px;
  height: 260px;
  flex-shrink: 0;
}

.sg-svg {
  width: 260px;
  height: 260px;
  overflow: visible;
}

.sg-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
  gap: 2px;
}

.sg-center-score {
  font-size: 52px;
  font-weight: 900;
  color: #22284E;
  line-height: 1;
  letter-spacing: -3px;
}

.sg-center-num {
  font-size: 26px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -2px;
  transition: color .2s;
}

.sg-center-label {
  font-size: 13px;
  font-weight: 800;
  transition: color .2s;
}

.sg-center-hint {
  font-size: 12px;
  color: rgba(34,40,78,.4);
  font-weight: 600;
}

.sg-center-desc {
  font-size: 10px;
  color: rgba(34,40,78,.4);
  font-weight: 600;
  max-width: 90px;
  line-height: 1.3;
}

.sg-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 14px;
  width: 100%;
  padding: 0 4px;
}

.sg-legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  padding: 5px 8px;
  border-radius: 10px;
  transition: background .15s;
}

.sg-legend-item:hover,
.sg-legend-item.active {
  background: rgba(34,40,78,.05);
}

.sg-legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sg-legend-text {
  font-size: 11px;
  color: rgba(34,40,78,.55);
  font-weight: 600;
}

.sg-legend-text b {
  font-weight: 900;
}

@media (min-width: 1024px) {
  .sg-chart-wrap { width: 240px; height: 240px; }
  .sg-svg { width: 240px; height: 240px; }
  .sg-center-score { font-size: 36px; }
  .sg-legend { gap: 4px 10px; }
}
</style>