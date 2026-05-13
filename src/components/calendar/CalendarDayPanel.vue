<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  date:     { type: String, required: true },
  sessions: { type: Array,  default: () => [] },
  events:   { type: Array,  default: () => [] },
  hobbies:  { type: Array,  default: () => [] },
})
const emit = defineEmits(['add-event', 'delete-event', 'toggle-session'])

/* ── formato fecha ─────────────────────────────────── */
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DAY_NAMES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

const formattedDate = computed(() => {
  const d = new Date(props.date + 'T12:00:00')
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`
})

/* ── añadir evento ─────────────────────────────────── */
const showForm  = ref(false)
const newTitle  = ref('')
const newTime   = ref('')
const newEnd    = ref('')
const newDesc   = ref('')
const saving    = ref(false)
const formError = ref('')

async function submitEvent() {
  if (!newTitle.value.trim()) { formError.value = 'El título es obligatorio'; return }
  saving.value = true; formError.value = ''
  await emit('add-event', {
    title: newTitle.value.trim(),
    description: newDesc.value.trim() || null,
    date: props.date,
    start_time: newTime.value || null,
    end_time: newEnd.value || null,
  })
  newTitle.value = ''; newTime.value = ''; newEnd.value = ''; newDesc.value = ''
  showForm.value = false; saving.value = false
}

/* ── color del hobby ───────────────────────────────── */
function hobbyColor(h) {
  return Array.isArray(h.gradient) ? h.gradient[0] : '#ff6b9d'
}

function formatMins(m) {
  if (!m) return '0 min'
  return m < 60 ? `${m} min` : `${Math.floor(m/60)}h ${m%60 ? m%60+'min':''}`
}

// Hobbies con estado de cumplimiento del día
const hobbyStatus = computed(() => {
  const dayEnd = new Date(props.date + 'T23:59:59')
  return props.hobbies
    .filter(h => new Date(h.created_at) <= dayEnd)
    .map(h => {
      const daySessions = props.sessions.filter(s => s.hobby_id === h.id)
      const totalMin = daySessions.reduce((sum, s) => sum + (s.minutes || 0), 0)
      const goal = h.daily_minutes || 20
      const done = totalMin >= goal
      return { ...h, totalMin, goal, done, sessionCount: daySessions.length }
    })
})
</script>

<template>
  <div class="dp-wrap">

    <div class="dp-header">
      <div>
        <h3 class="dp-date">{{ formattedDate }}</h3>
        <p class="dp-count">
          {{ hobbyStatus.filter(h => h.done).length }}/{{ hobbyStatus.length }} hobbies completados
          · {{ events.length }} evento{{ events.length !== 1 ? 's' : '' }}
        </p>
      </div>
      <button class="dp-add-btn" @click="showForm = true">
        <svg viewBox="0 0 14 14" fill="none" width="12">
          <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Evento
      </button>
    </div>

    <!-- Sesiones de hobbies -->
    <div class="dp-section">
      <p class="dp-section-label">Hobbies del día</p>
      <div class="dp-sessions">
        <div v-for="h in hobbyStatus" :key="h.id" class="dp-session"
          :style="{ borderLeftColor: hobbyColor(h) }"
        >
          <div class="ds-left">
            <span class="ds-dot" :style="{ background: hobbyColor(h) }"></span>
            <div>
              <p class="ds-name">{{ h.name }}</p>
              <p class="ds-time">
                {{ formatMins(h.totalMin) }} / {{ formatMins(h.goal) }}
                <span v-if="h.sessionCount > 0"> · {{ h.sessionCount }} sesión{{ h.sessionCount > 1 ? 'es' : '' }}</span>
              </p>
            </div>
          </div>
          <!-- Check solo visual, sin click -->
          <div class="ds-check" :class="{ done: h.done }">
            <svg viewBox="0 0 14 14" fill="none" width="12">
              <path d="M2 7l4 4 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Eventos -->
    <div v-if="events.length > 0" class="dp-section">
      <p class="dp-section-label">Eventos</p>
      <div class="dp-events">
        <div v-for="e in events" :key="e.id" class="dp-event">
          <div class="de-time" v-if="e.start_time">
            {{ e.start_time.slice(0,5) }}
            <span v-if="e.end_time">→ {{ e.end_time.slice(0,5) }}</span>
          </div>
          <div class="de-info">
            <p class="de-title">{{ e.title }}</p>
            <p v-if="e.description" class="de-desc">{{ e.description }}</p>
          </div>
          <button class="de-del" @click="emit('delete-event', e.id)">
            <svg viewBox="0 0 14 14" fill="none" width="11">
              <path d="M1 3h12M4 3V2h6v1M5 6v5M9 6v5M2 3l1 9h8l1-9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="sessions.length === 0 && events.length === 0 && !showForm" class="dp-empty">
      <svg viewBox="0 0 24 24" fill="none" width="32" stroke="rgba(34,40,78,.15)" stroke-width="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
      <p>Sin actividad este día</p>
    </div>

    <!-- Formulario nuevo evento -->
    <Transition name="ev-modal">
      <div v-if="showForm" class="ev-overlay" @click.self="showForm = false">
        <div class="ev-sheet">
          <div class="ev-sheet-head">
            <h4>Nuevo evento</h4>
            <button class="ev-close" @click="showForm = false">
              <svg viewBox="0 0 14 14" fill="none" width="10">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <input v-model="newTitle" type="text" class="f-input" placeholder="Título del evento" />
          <div class="f-row">
            <div class="f-time-field">
              <label>Inicio</label>
              <input v-model="newTime" type="time" class="f-input" />
            </div>
            <div class="f-time-field">
              <label>Fin</label>
              <input v-model="newEnd" type="time" class="f-input" />
            </div>
          </div>
          <textarea v-model="newDesc" class="f-input f-textarea" placeholder="Descripción (opcional)"></textarea>
          <p v-if="formError" class="f-error">{{ formError }}</p>
          <div class="f-actions">
            <button class="f-btn-save" @click="submitEvent" :disabled="saving">
              {{ saving ? 'Guardando...' : 'Guardar evento' }}
            </button>
            <button class="f-btn-cancel" @click="showForm = false">Cancelar</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dp-wrap {
  background: #fff; border-radius: 20px; padding: 20px;
  box-shadow: 0 2px 16px rgba(34,40,78,.07);
  border: 1px solid rgba(34,40,78,.05);
  animation: slideUp .25s ease;
}
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } }

.dp-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; margin-bottom: 16px;
}
.dp-date  { font-size: 16px; font-weight: 800; color: #22284E; margin: 0 0 3px; }
.dp-count { font-size: 12px; color: rgba(34,40,78,.4); margin: 0; }

.dp-add-btn {
  display: flex; align-items: center; gap: 5px;
  background: #22284E; color: #fff59e; border: none;
  font-size: 12px; font-weight: 700; padding: 8px 14px;
  border-radius: 10px; cursor: pointer; white-space: nowrap;
  transition: opacity .2s;
}
.dp-add-btn:hover { opacity: .88; }

.dp-section { margin-bottom: 14px; }
.dp-section-label {
  font-size: 10px; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; color: rgba(34,40,78,.35);
  margin: 0 0 8px;
}

/* Sesiones */
.dp-sessions { display: flex; flex-direction: column; gap: 7px; }
.dp-session {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-radius: 12px;
  background: rgba(34,40,78,.03);
  border-left: 3px solid #ff6b9d;
}
.ds-left { display: flex; align-items: center; gap: 10px; }
.ds-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ds-name { font-size: 13px; font-weight: 700; color: #22284E; margin: 0 0 2px; }
.ds-time { font-size: 11px; color: rgba(34,40,78,.45); margin: 0; }

.ds-check {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid rgba(34,40,78,.15);
  background: transparent; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(34,40,78,.3); transition: all .2s;
}
.ds-check:hover { border-color: #22c55e; color: #22c55e; }
.ds-check.done  { background: #22c55e; border-color: #22c55e; color: #fff; }

/* Eventos */
.dp-events { display: flex; flex-direction: column; gap: 7px; }
.dp-event {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px; border-radius: 12px;
  background: rgba(245,158,11,.06);
  border-left: 3px solid #f59e0b;
}
.de-time { font-size: 11px; font-weight: 700; color: #f59e0b; white-space: nowrap; padding-top: 1px; min-width: 50px; }
.de-info { flex: 1; }
.de-title { font-size: 13px; font-weight: 700; color: #22284E; margin: 0 0 2px; }
.de-desc  { font-size: 11px; color: rgba(34,40,78,.45); margin: 0; }
.de-del {
  background: none; border: none; cursor: pointer;
  color: rgba(34,40,78,.25); padding: 2px; transition: color .2s;
}
.de-del:hover { color: #ef4444; }

/* Empty */
.dp-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; padding: 24px 0; text-align: center;
}
.dp-empty p { font-size: 13px; color: rgba(34,40,78,.35); margin: 0; }

/* Formulario */
.f-input {
  width: 100%; padding: 10px 12px; box-sizing: border-box;
  border: 1.5px solid rgba(34,40,78,.1); border-radius: 10px;
  font-size: 13px; color: #22284E; background: #fafafa;
  font-family: inherit; margin-bottom: 8px; transition: border-color .2s;
}
.f-input:focus { outline: none; border-color: #ff6b9d; background: #fff; }
.f-textarea { resize: none; min-height: 60px; }
.f-row { display: flex; gap: 8px; }
.f-row .f-input { flex: 1; }
.f-error { font-size: 12px; color: #ef4444; margin: 0 0 8px; }

.f-actions { display: flex; gap: 8px; }
.f-btn-save {
  flex: 1; padding: 11px; border: none; border-radius: 10px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
  transition: opacity .2s;
}
.f-btn-save:hover { opacity: .9; }
.f-btn-save:disabled { opacity: .5; cursor: not-allowed; }
.f-btn-cancel {
  padding: 11px 16px; border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 10px; background: transparent;
  font-size: 13px; color: rgba(34,40,78,.5); cursor: pointer;
}
.f-btn-cancel:hover { background: rgba(34,40,78,.04); }

.ev-overlay {
  position: fixed; inset: 0; z-index: 1500;
  background: rgba(34,40,78,.5); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.ev-sheet {
  background: #fff;
  width: 100%; max-width: 540px;
  padding: 24px 20px calc(24px + env(safe-area-inset-bottom));
  display: flex; flex-direction: column; gap: 10px;
  border-radius: 20px; 
  max-height: 90vh; overflow-y: auto;
}
.ev-sheet-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 4px;
}
.ev-sheet-head h4 { font-size: 16px; font-weight: 800; color: #22284E; margin: 0; }
.ev-close {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(34,40,78,.06); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(34,40,78,.5);
}
.f-time-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.f-time-field label { font-size: 11px; font-weight: 600; color: rgba(34,40,78,.45); }

.ev-modal-enter-active, .ev-modal-leave-active { transition: opacity .25s ease; }
.ev-modal-enter-active .ev-sheet, .ev-modal-leave-active .ev-sheet { transition: transform .25s ease; }
.ev-modal-enter-from, .ev-modal-leave-to { opacity: 0; }
.ev-modal-enter-from .ev-sheet, .ev-modal-leave-to .ev-sheet { transform: translateY(40px); }

/* Transición formulario */
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>