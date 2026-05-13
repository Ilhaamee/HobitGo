<script setup>
import { computed } from 'vue'

const props = defineProps({
  hobbies:  { type: Array, default: () => [] },
  sessions: { type: Array, default: () => [] },
  events:   { type: Array, default: () => [] },
})

/* ── Datos del día ── */
const todayStr = new Date().toISOString().split('T')[0]

const todayEvents = computed(() =>
  props.events.filter(e => e.date === todayStr)
)

const hobbyProgress = computed(() => {
  const today = new Date().toDateString()
  return props.hobbies.map(h => {
    const mins = props.sessions
      .filter(s =>
        s.hobby_id === h.id &&
        new Date(s.created_at).toDateString() === today
      )
      .reduce((sum, s) => sum + (s.minutes || 0), 0)
    const goal  = h.daily_minutes || 20
    const done  = mins >= goal
    const color = Array.isArray(h.gradient) ? h.gradient[0] : '#ff6b9d'
    return { ...h, mins, goal, done, color }
  })
})

const totalDone  = computed(() => hobbyProgress.value.filter(h => h.done).length)
const totalMins  = computed(() => hobbyProgress.value.reduce((sum, h) => sum + h.mins, 0))
const allDone    = computed(() =>
  hobbyProgress.value.length > 0 &&
  totalDone.value === hobbyProgress.value.length
)

function formatMins(m) {
  if (!m) return '0m'
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? m % 60 + 'm' : ''}`
}

function formatTime(t) {
  if (!t) return ''
  return t.slice(0, 5)
}
</script>

<template>
  <div class="ts-wrap">

    <h2 class="ts-title">Resumen de hoy</h2>

    <!-- Banner completado -->
    <div v-if="allDone" class="ts-banner">
      <svg viewBox="0 0 20 20" fill="none" width="18">
        <path d="M4 10l4 4 8-8" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Todos los hobbies completados</span>
    </div>

    <!-- Stats rápidos -->
    <div class="ts-stats">
      <div class="ts-stat">
        <span class="ts-stat-val">{{ totalDone }}/{{ hobbyProgress.length }}</span>
        <span class="ts-stat-lbl">completados</span>
      </div>
      <div class="ts-divider"></div>
      <div class="ts-stat">
        <span class="ts-stat-val">{{ formatMins(totalMins) }}</span>
        <span class="ts-stat-lbl">practicados</span>
      </div>
      <div class="ts-divider"></div>
      <div class="ts-stat">
        <span class="ts-stat-val">{{ todayEvents.length }}</span>
        <span class="ts-stat-lbl">evento{{ todayEvents.length !== 1 ? 's' : '' }}</span>
      </div>
    </div>

    <!-- Progreso por hobby -->
    <div v-if="hobbyProgress.length > 0" class="ts-hobbies">
      <div
        v-for="h in hobbyProgress"
        :key="h.id"
        class="ts-hobby-row"
      >
        <div class="ts-hobby-left">
          <div class="ts-dot" :style="{ background: h.color }"></div>
          <span class="ts-hobby-name">{{ h.name }}</span>
        </div>
        <div class="ts-hobby-right">
          <div class="ts-bar-track">
            <div
              class="ts-bar-fill"
              :style="{
                width: Math.min(100, Math.round(h.mins / h.goal * 100)) + '%',
                background: h.color,
              }"
            ></div>
          </div>
          <span class="ts-hobby-mins" :style="h.done ? { color: h.color } : {}">
            {{ formatMins(h.mins) }}
          </span>
          <div class="ts-check" :class="{ done: h.done }" :style="h.done ? { background: h.color } : {}">
            <svg viewBox="0 0 10 10" fill="none" width="8">
              <path d="M2 5l2.5 2.5L8 2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Eventos de hoy -->
    <div v-if="todayEvents.length > 0" class="ts-events">
      <p class="ts-events-label">Eventos de hoy</p>
      <div
        v-for="ev in todayEvents"
        :key="ev.id"
        class="ts-event"
      >
        <div class="ts-event-dot"></div>
        <div class="ts-event-info">
          <span class="ts-event-title">{{ ev.title }}</span>
          <span v-if="ev.start_time" class="ts-event-time">
            {{ formatTime(ev.start_time) }}
            <template v-if="ev.end_time"> — {{ formatTime(ev.end_time) }}</template>
          </span>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="hobbyProgress.length === 0 && todayEvents.length === 0" class="ts-empty">
      <p>Sin actividad registrada hoy</p>
    </div>

  </div>
</template>

<style scoped>
.ts-wrap {
  background: #fff;
  border: 1px solid rgba(34,40,78,.07);
  border-radius: 20px;
  padding: 18px 18px 20px;
  box-shadow: 0 2px 12px rgba(34,40,78,.05);
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: tsFadeUp .55s ease .15s both;
}

@keyframes tsFadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ts-title {
  font-size: 16px; font-weight: 800;
  color: #22284E; margin: 0;
  letter-spacing: -.3px;
}

/* Banner */
.ts-banner {
  display: flex; align-items: center; gap: 8px;
  background: #22c55e;
  color: #fff; font-size: 13px; font-weight: 700;
  padding: 10px 14px; border-radius: 12px;
}

/* Stats */
.ts-stats {
  display: flex; align-items: center;
  background: rgba(34,40,78,.03);
  border: 1px solid rgba(34,40,78,.06);
  border-radius: 14px;
  padding: 12px 0;
}
.ts-stat {
  flex: 1; display: flex;
  flex-direction: column; align-items: center; gap: 2px;
}
.ts-stat-val {
  font-size: 20px; font-weight: 900;
  color: #22284E; line-height: 1;
  letter-spacing: -.5px;
}
.ts-stat-lbl {
  font-size: 10px; font-weight: 600;
  color: rgba(34,40,78,.38);
  text-transform: uppercase; letter-spacing: .05em;
}
.ts-divider {
  width: 1px; height: 32px;
  background: rgba(34,40,78,.08);
  flex-shrink: 0;
}

/* Hobbies */
.ts-hobbies {
  display: flex; flex-direction: column; gap: 10px;
}
.ts-hobby-row {
  display: flex; align-items: center;
  justify-content: space-between; gap: 10px;
}
.ts-hobby-left {
  display: flex; align-items: center;
  gap: 8px; min-width: 0; flex: 1;
}
.ts-dot {
  width: 8px; height: 8px;
  border-radius: 50%; flex-shrink: 0;
}
.ts-hobby-name {
  font-size: 13px; font-weight: 600;
  color: #22284E;
  white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis;
}
.ts-hobby-right {
  display: flex; align-items: center;
  gap: 8px; flex-shrink: 0;
}
.ts-bar-track {
  width: 70px; height: 5px;
  background: rgba(34,40,78,.08);
  border-radius: 99px; overflow: hidden;
}
.ts-bar-fill {
  height: 100%; border-radius: 99px;
  min-width: 4px;
  transition: width .6s cubic-bezier(.4,0,.2,1);
}
.ts-hobby-mins {
  font-size: 12px; font-weight: 700;
  color: rgba(34,40,78,.4);
  min-width: 28px; text-align: right;
  transition: color .3s;
}
.ts-check {
  width: 20px; height: 20px;
  border-radius: 50%;
  border: 1.5px solid rgba(34,40,78,.15);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background .25s, border-color .25s;
}
.ts-check.done {
  border-color: transparent;
}

/* Eventos */
.ts-events {
  display: flex; flex-direction: column; gap: 8px;
  padding-top: 4px;
  border-top: 1px solid rgba(34,40,78,.06);
}
.ts-events-label {
  font-size: 10px; font-weight: 700;
  color: rgba(34,40,78,.35);
  text-transform: uppercase; letter-spacing: .07em;
  margin: 0;
}
.ts-event {
  display: flex; align-items: center; gap: 10px;
}
.ts-event-dot {
  width: 6px; height: 6px;
  border-radius: 50%; background: #f59e0b;
  flex-shrink: 0;
}
.ts-event-info {
  display: flex; align-items: baseline; gap: 6px;
  flex: 1; min-width: 0;
}
.ts-event-title {
  font-size: 13px; font-weight: 600;
  color: #22284E;
  white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis;
}
.ts-event-time {
  font-size: 11px; color: #f59e0b;
  font-weight: 600; flex-shrink: 0;
}

/* Empty */
.ts-empty {
  text-align: center; padding: 10px 0;
}
.ts-empty p {
  font-size: 13px; color: rgba(34,40,78,.35);
  margin: 0;
}
</style>