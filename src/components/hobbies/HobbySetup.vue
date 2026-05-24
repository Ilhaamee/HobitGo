<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useNotifications } from '../../funciones/useNotifications.js'

const props = defineProps({
  hobby: { type: Object, required: true }
})
const emit = defineEmits(['confirm', 'back', 'close'])

const customName    = ref(props.hobby.name || '')
const customColor1  = ref(props.hobby.gradient?.[0] || '#ff6b9d')
const customColor2  = ref(props.hobby.gradient?.[1] || '#ffb3c6')
const customImage   = ref(null)
const previewUrl    = ref(null)
const days          = ref(30)
const dailyMinutes  = ref(20)

const { subscribe, unsubscribe, supported: pushSupported } = useNotifications()

const reminder      = ref(false)
const reminderTime  = ref('08:00')

// Al activar reminder, pedir permiso de notificaciones
watch(reminder, async (val) => {
  if (val && pushSupported.value) {
    const result = await subscribe()
    if (result.ok === false && result.reason === 'denied') {
      reminder.value = false
      alert('Activa las notificaciones en los ajustes del navegador para recibir recordatorios.')
    }
  } else if (!val) {
    await unsubscribe()
  }
})

const motivation    = ref('')
const difficulty    = ref('media')
const isPublic      = ref(true)

function syncFromProps() {
  const h = props.hobby || {}
  customName.value   = h.name || ''
  customColor1.value = h.gradient?.[0] || '#ff6b9d'
  customColor2.value = h.gradient?.[1] || '#ffb3c6'
  previewUrl.value   = h.img || h.imagePreview || null
  customImage.value  = null
  days.value         = h.totalDays ?? 30
  dailyMinutes.value = h.dailyMinutes ?? 20
  reminder.value     = h.reminder ?? false
  reminderTime.value = h.reminderTime || '08:00'
  motivation.value   = h.motivation || ''
  difficulty.value   = h.difficulty || 'media'
  isPublic.value     = h.isPublic ?? true
}

onMounted(syncFromProps)
watch(() => props.hobby, syncFromProps, { deep: true, immediate: true })

const displayName     = computed(() => customName.value.trim() || props.hobby.name || 'Mi hobby')
const previewImage    = computed(() => previewUrl.value || props.hobby.img || null)
const currentGradient = computed(() => `linear-gradient(135deg, ${customColor1.value}, ${customColor2.value})`)

const palettes = [
  ['#ff6b9d','#ffb3c6'], ['#8b5cf6','#a78bfa'], ['#3b82f6','#60a5fa'],
  ['#22c55e','#4ade80'], ['#f59e0b','#fbbf24'], ['#06b6d4','#22d3ee'],
  ['#f97316','#fb923c'], ['#ec4899','#f472b6'], ['#14b8a6','#2dd4bf'],
  ['#22284E','#3d4570'],
]
const difficulties = [
  { key: 'facil',   label: 'Fácil',   desc: 'Sin presión, a mi ritmo' },
  { key: 'media',   label: 'Media',   desc: 'Reto equilibrado' },
  { key: 'dificil', label: 'Difícil', desc: 'Máximo compromiso' },
]

function selectPalette(p) { customColor1.value = p[0]; customColor2.value = p[1] }

function onImageUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  customImage.value = file
  previewUrl.value  = URL.createObjectURL(file)
}
function removeImage() { customImage.value = null; previewUrl.value = null }

function clampDays(e) {
  let v = parseInt(e.target.value)
  if (isNaN(v) || v < 1) v = 1
  if (v > 365) v = 365
  days.value = v
}
function clampMinutes(e) {
  let v = parseInt(e.target.value)
  if (isNaN(v) || v < 1) v = 1
  if (v > 480) v = 480
  dailyMinutes.value = v
}

function toggleReminder() {
  reminder.value = !reminder.value
  if (reminder.value) {
    // Scroll al campo de hora para que se vea
    setTimeout(() => {
      const el = document.querySelector('.reminder-field')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
  }
}

function confirm() {
  if (props.hobby.custom && !customName.value.trim()) return
  emit('confirm', {
    ...props.hobby,
    name:         displayName.value,
    gradient:     [customColor1.value, customColor2.value],
    customImage:  customImage.value,
    imagePreview: previewUrl.value || props.hobby.img,
    totalDays:    days.value,
    dailyMinutes: dailyMinutes.value,
    reminder:     reminder.value,
    reminderTime: reminder.value ? reminderTime.value : null,
    motivation:   motivation.value.trim(),
    difficulty:   difficulty.value,
    isPublic:     isPublic.value,
  })
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="setup">
      <div class="setup-header">
        <button class="back-btn" @click="emit('back')">
          <svg viewBox="0 0 16 16" fill="none" width="14">
            <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Volver
        </button>
        <h3>Personaliza tu hobby</h3>
        <button class="close-btn" @click="emit('close')">
          <svg viewBox="0 0 14 14" fill="none" width="11">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="setup-body">
        <!-- Preview -->
        <div class="preview-card" :style="{ background: previewImage ? 'transparent' : currentGradient }">
          <img v-if="previewImage" :src="previewImage" class="preview-img" :alt="displayName" />
          <div class="preview-overlay"></div>
          <div class="preview-info">
            <span class="preview-name">{{ displayName }}</span>
            <span class="preview-meta">
              {{ days }} días · {{ dailyMinutes }} min/día ·
              <span class="diff-badge" :class="difficulty">{{ difficulties.find(d=>d.key===difficulty)?.label }}</span>
            </span>
          </div>
        </div>

        <!-- Nombre solo si es personalizado -->
        <div v-if="hobby.custom" class="field">
          <label>Nombre del hobby</label>
          <input v-model="customName" type="text" class="input" placeholder="Ej: Pintura acuarela..." maxlength="40" />
        </div>

        <!-- Imagen -->
        <div class="field">
          <label>Imagen de portada</label>
          <div class="img-options">
            <div v-if="hobby.img && !previewUrl" class="img-opt active">
              <img :src="hobby.img" :alt="hobby.name" />
              <span class="img-opt-label">Estándar</span>
            </div>
            <div v-if="previewUrl" class="img-opt active">
              <img :src="previewUrl" alt="Tu imagen" />
              <button class="remove-img" @click="removeImage">
                <svg viewBox="0 0 12 12" fill="none" width="10">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </button>
              <span class="img-opt-label">Tu foto</span>
            </div>
            <label class="img-upload-btn" v-if="!previewUrl">
              <svg viewBox="0 0 20 20" fill="none" width="20">
                <path d="M3 17l4-4 3 3 4-5 4 6H3z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M16 3v6M13 6h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span>Subir foto</span>
              <input type="file" accept="image/*" hidden @change="onImageUpload" />
            </label>
          </div>
        </div>

        <!-- Color -->
        <div class="field">
          <label>Color del hobby</label>
          <div class="palettes">
            <button
              v-for="(p, i) in palettes" :key="i"
              class="palette-btn" :class="{ active: customColor1 === p[0] }"
              :style="{ background: `linear-gradient(135deg, ${p[0]}, ${p[1]})` }"
              @click="selectPalette(p)"
            >
              <svg v-if="customColor1 === p[0]" viewBox="0 0 12 12" fill="none" width="10">
                <path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Duración -->
        <div class="field">
          <label>Duración del reto</label>
          <div class="counter-row full">
            <button class="counter-btn" @click="days = Math.max(1, days - 1)">−</button>
            <input type="number" class="counter-input" v-model.number="days" min="1" max="365" @blur="clampDays" />
            <span class="counter-unit">días</span>
            <button class="counter-btn" @click="days = Math.min(365, days + 1)">+</button>
          </div>
          <div class="presets">
            <button v-for="d in [7,14,21,30,60,90,180,365]" :key="d"
              class="preset-btn" :class="{ active: days === d }"
              @click="days = d">{{ d }}d</button>
          </div>
        </div>

        <!-- Tiempo diario -->
        <div class="field">
          <label>Tiempo diario</label>
          <div class="counter-row full">
            <button class="counter-btn" @click="dailyMinutes = Math.max(1, dailyMinutes - 5)">−</button>
            <input type="number" class="counter-input" v-model.number="dailyMinutes" min="1" max="480" @blur="clampMinutes" />
            <span class="counter-unit">min</span>
            <button class="counter-btn" @click="dailyMinutes = Math.min(480, dailyMinutes + 5)">+</button>
          </div>
          <div class="presets">
            <button v-for="m in [10,15,20,30,45,60,90,120]" :key="m"
              class="preset-btn" :class="{ active: dailyMinutes === m }"
              @click="dailyMinutes = m">{{ m }}m</button>
          </div>
        </div>

        <!-- Dificultad -->
        <div class="field">
          <label>Nivel de compromiso</label>
          <div class="diff-options">
            <button
              v-for="d in difficulties" :key="d.key"
              class="diff-btn" :class="[d.key, { active: difficulty === d.key }]"
              @click="difficulty = d.key"
            >
              <span class="diff-label">{{ d.label }}</span>
              <span class="diff-desc">{{ d.desc }}</span>
            </button>
          </div>
        </div>

        <!-- Motivación -->
        <div class="field">
          <label>Motivación (opcional)</label>
          <textarea
            v-model="motivation"
            class="input textarea"
            placeholder="Ej: Quiero leer 30 libros este año para desconectar del trabajo..."
            maxlength="200"
            rows="2"
          ></textarea>
          <span class="char-count">{{ motivation.length }}/200</span>
        </div>

        <!-- Visibilidad -->
        <div class="field">
          <label>¿Mostrar en tu perfil público?</label>
          <div class="visibility-row">
            <button class="vis-btn" :class="{ active: isPublic }" @click="isPublic = true">
              <svg viewBox="0 0 20 20" fill="none" width="16">
                <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.6"/>
                <path d="M2 10h16M10 2a14 14 0 010 16M10 2a14 14 0 000 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
              <span class="vis-label">Público</span>
              <span class="vis-desc">Otros usuarios pueden ver este hobby en tu perfil</span>
            </button>
            <button class="vis-btn" :class="{ active: !isPublic }" @click="isPublic = false">
              <svg viewBox="0 0 20 20" fill="none" width="16">
                <rect x="3" y="9" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/>
                <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
              <span class="vis-label">Privado</span>
              <span class="vis-desc">Solo tú verás este hobby</span>
            </button>
          </div>
        </div>

        <!-- Recordatorio -->
        <div class="field reminder-field" :class="{ active: reminder }">
          <div class="reminder-row">
            <div>
              <span class="reminder-title">Recordatorio diario</span>
              <span class="reminder-desc">
                {{ pushSupported ? 'Te avisamos para que no te olvides' : 'No disponible en este navegador' }}
              </span>
            </div>
            <button
              class="toggle-btn"
              :class="{ on: reminder }"
              :disabled="!pushSupported"
              @click="toggleReminder"
            >
              <div class="toggle-knob"></div>
            </button>
          </div>
          <Transition name="fade">
            <input v-if="reminder" v-model="reminderTime" type="time" class="input time-input" />
          </Transition>
        </div>
      </div>

      <div class="setup-footer">
        <button class="btn-confirm" :disabled="hobby.custom && !customName.trim()" @click="confirm">
          <svg viewBox="0 0 16 16" fill="none" width="16">
            <path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Añadir hobby
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0;
  background: rgba(34,40,78,.55); backdrop-filter: blur(12px);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 1001;
}
.setup {
  background: #fff; border-radius: 24px 24px 0 0;
  width: 100%; max-width: 520px; max-height: 92vh; max-height: 92dvh;
  display: flex; flex-direction: column;
  box-shadow: 0 -12px 48px rgba(34,40,78,.2); overflow: hidden;
}
.setup-header {
  display: flex; align-items: center; gap: 10px;
  padding: 16px 16px 0; flex-shrink: 0; margin-bottom: 12px;
}
.setup-header h3 { flex: 1; text-align: center; font-size: 16px; font-weight: 800; color: #22284E; margin: 0; }
.back-btn {
  display: flex; align-items: center; gap: 4px;
  background: none; border: none; cursor: pointer;
  color: rgba(34,40,78,.5); font-size: 13px; font-weight: 600;
  padding: 4px 8px; border-radius: 8px; transition: color .2s;
}
.back-btn:hover { color: #22284E; }
.close-btn {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(34,40,78,.06); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(34,40,78,.5); transition: background .2s;
}
.close-btn:hover { background: rgba(255,107,157,.12); color: #ff6b9d; }
.setup-body { flex: 1; overflow-y: auto; padding: 0 16px; display: flex; flex-direction: column; gap: 14px; }

.preview-card { position: relative; height: 130px; border-radius: 16px; overflow: hidden; flex-shrink: 0; }
.preview-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.preview-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 30%, rgba(20,22,50,.75) 100%); }
.preview-info { position: absolute; bottom: 14px; left: 16px; right: 16px; z-index: 2; display: flex; flex-direction: column; gap: 4px; }
.preview-name { font-size: 18px; font-weight: 800; color: #fff; letter-spacing: -.3px; }
.preview-meta { font-size: 12px; color: rgba(255,255,255,.75); display: flex; align-items: center; gap: 6px; }
.diff-badge { padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
.diff-badge.facil   { background: rgba(34,197,94,.25); color: #22c55e; }
.diff-badge.media   { background: rgba(245,158,11,.25); color: #f59e0b; }
.diff-badge.dificil { background: rgba(239,68,68,.25);  color: #ef4444; }

.field { display: flex; flex-direction: column; gap: 8px; }
.field label { font-size: 12px; font-weight: 700; color: rgba(34,40,78,.5); text-transform: uppercase; letter-spacing: .05em; }
.input {
  padding: 11px 14px; border: 1.5px solid rgba(34,40,78,.1); border-radius: 12px;
  font-size: 16px; color: #22284E; background: #fafafa;
  font-family: inherit; box-sizing: border-box; transition: border-color .2s; width: 100%;
}
.input:focus { outline: none; border-color: #ff6b9d; background: #fff; }
.textarea { resize: none; line-height: 1.6; }
.char-count { font-size: 11px; color: rgba(34,40,78,.3); text-align: right; margin-top: -4px; }

.img-options { display: flex; gap: 10px; flex-wrap: wrap; }
.img-opt { position: relative; width: 80px; height: 64px; border-radius: 10px; overflow: hidden; border: 2px solid #ff6b9d; }
.img-opt img { width: 100%; height: 100%; object-fit: cover; }
.img-opt-label { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(20,22,50,.65); color: #fff; font-size: 9px; font-weight: 700; text-align: center; padding: 2px; }
.remove-img { position: absolute; top: 4px; right: 4px; width: 18px; height: 18px; border-radius: 50%; background: rgba(239,68,68,.85); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; }
.img-upload-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; width: 80px; height: 64px; border-radius: 10px; border: 1.5px dashed rgba(34,40,78,.2); cursor: pointer; color: rgba(34,40,78,.4); font-size: 11px; font-weight: 600; transition: border-color .2s, color .2s; }
.img-upload-btn:hover { border-color: #ff6b9d; color: #ff6b9d; }

.palettes { display: flex; flex-wrap: wrap; gap: 8px; }
.palette-btn { width: 36px; height: 36px; border-radius: 10px; border: 2px solid transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform .15s, border-color .15s; }
.palette-btn:hover { transform: scale(1.1); }
.palette-btn.active { border-color: #22284E; transform: scale(1.12); }

.counter-row { display: flex; align-items: center; gap: 10px; }
.counter-row.full { width: 100%; }
.counter-btn { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; background: rgba(34,40,78,.06); border: 1.5px solid rgba(34,40,78,.1); font-size: 20px; font-weight: 700; cursor: pointer; color: #22284E; display: flex; align-items: center; justify-content: center; transition: background .2s, border-color .2s; }
.counter-btn:hover { background: rgba(255,107,157,.1); border-color: #ff6b9d; color: #ff6b9d; }
.counter-input { flex: 1; min-width: 0; padding: 8px 10px; text-align: center; border: 1.5px solid rgba(34,40,78,.1); border-radius: 10px; font-size: 20px; font-weight: 800; color: #22284E; background: #fafafa; font-family: inherit; -moz-appearance: textfield; }
.counter-input::-webkit-inner-spin-button, .counter-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.counter-input:focus { outline: none; border-color: #ff6b9d; background: #fff; }
.counter-unit { font-size: 13px; font-weight: 600; color: rgba(34,40,78,.4); flex-shrink: 0; white-space: nowrap; }

.presets { display: flex; gap: 5px; flex-wrap: wrap; }
.preset-btn { padding: 5px 10px; border-radius: 99px; border: 1.5px solid rgba(34,40,78,.1); background: transparent; font-size: 12px; font-weight: 600; color: rgba(34,40,78,.5); cursor: pointer; transition: all .15s; }
.preset-btn:hover { border-color: #ff6b9d; color: #ff6b9d; }
.preset-btn.active { background: #22284E; border-color: #22284E; color: #fff59e; }

.diff-options { display: flex; gap: 6px; }
.diff-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 5px; border-radius: 14px; cursor: pointer; border: 2px solid rgba(34,40,78,.1); background: #fafafa; transition: all .18s; }
.diff-btn:hover { border-color: rgba(34,40,78,.25); }
.diff-btn.active.facil   { border-color: #22c55e; background: rgba(34,197,94,.06); }
.diff-btn.active.media   { border-color: #f59e0b; background: rgba(245,158,11,.06); }
.diff-btn.active.dificil { border-color: #ef4444; background: rgba(239,68,68,.06); }
.diff-label { font-size: 13px; font-weight: 700; color: #22284E; }
.diff-desc  { font-size: 9px; color: rgba(34,40,78,.45); text-align: center; line-height: 1.3; }

.visibility-row { display: flex; gap: 10px; }
.vis-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px; border-radius: 14px; cursor: pointer; border: 2px solid rgba(34,40,78,.1); background: #fafafa; color: rgba(34,40,78,.5); transition: all .18s; text-align: center; }
.vis-btn:hover { border-color: rgba(34,40,78,.25); }
.vis-btn.active { border-color: #ff6b9d; background: rgba(255,107,157,.06); color: #22284E; }
.vis-label { font-size: 13px; font-weight: 700; color: inherit; }
.vis-desc { font-size: 10px; color: rgba(34,40,78,.4); line-height: 1.3; word-break: break-word; }

.reminder-field {
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(34,40,78,.03);
  border: 1.5px solid rgba(34,40,78,.08);
  transition: background .3s, border-color .3s;
}
.reminder-field.active {
  background: rgba(255,107,157,.06);
  border-color: rgba(255,107,157,.3);
}
.reminder-row { display: flex; align-items: center; justify-content: space-between; }
.reminder-title { display: block; font-size: 14px; font-weight: 700; color: #22284E; }
.reminder-desc { display: block; font-size: 12px; color: rgba(34,40,78,.45); margin-top: 2px; }
.toggle-btn { width: 46px; height: 26px; border-radius: 99px; background: rgba(34,40,78,.12); border: none; position: relative; cursor: pointer; transition: background .25s; flex-shrink: 0; }
.toggle-btn.on { background: #ff6b9d; }
.toggle-btn:disabled { opacity: .4; cursor: not-allowed; }
.toggle-knob { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.2); transition: transform .25s cubic-bezier(.4,0,.2,1); }
.toggle-btn.on .toggle-knob { transform: translateX(20px); }
.time-input { max-width: 140px; }

.setup-footer { padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid rgba(34,40,78,.06); flex-shrink: 0; }
.btn-confirm { width: 100%; padding: 14px; background: linear-gradient(135deg, #22284E, #3d4570); color: #fff59e; border: none; border-radius: 14px; font-size: 15px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 6px 20px rgba(34,40,78,.28); transition: transform .18s, box-shadow .18s, opacity .2s; }
.btn-confirm:hover { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(34,40,78,.36); }
.btn-confirm:disabled { opacity: .4; cursor: not-allowed; transform: none; }

.fade-enter-active, .fade-leave-active { transition: opacity .2s, transform .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-6px); }

@media (min-width: 600px) {
  .overlay { align-items: center; padding: 20px; }
  .setup { border-radius: 24px; max-height: 88vh; max-height: 88dvh; padding-bottom: 0; }
  .setup-body { padding: 0 20px; gap: 18px; }
  .setup-header { padding: 20px 20px 0; }
  .setup-footer { padding: 16px 20px calc(16px + env(safe-area-inset-bottom)); }
  .preview-card { height: 140px; }
}

@media (max-width: 380px) {
  .setup-body { gap: 12px; }
  .diff-options { gap: 5px; }
  .diff-btn { padding: 10px 5px; }
  .diff-desc { font-size: 9px; }
  .visibility-row { gap: 7px; }
  .vis-btn { padding: 10px 7px; }
  .preset-btn { padding: 4px 8px; font-size: 11px; }
  .palettes { gap: 6px; }
  .palette-btn { width: 30px; height: 30px; border-radius: 8px; }
  .counter-btn { width: 36px; height: 36px; }
  .counter-input { font-size: 18px; }
  .setup-header h3 { font-size: 15px; }
}
</style>