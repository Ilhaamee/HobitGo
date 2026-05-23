<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../../../lib/supabase'

const props = defineProps({
  hobby: { type: Object, required: true },
  color: { type: String, default: '#8b5cf6' },
})
const emit = defineEmits(['close', 'add-session'])

// ── Estado ───────────────────────────────────────────
const sessions = ref([])
const loading = ref(false)
const saving = ref(false)
const activeView = ref('history') // 'history' | 'timer' | 'add'
const showSearch = ref(false)
const searchQuery = ref('')
const showImageLightbox = ref(false)
const lightboxImage = ref(null)

// Paginación del historial
const visibleCount = ref(7)
const showAllSessions = ref(false)

// Nota inline (solo se puede editar la nota, no fecha ni duración)
const editingNoteId = ref(null)
const editingNoteText = ref('')

// Timer integrado
const isRunning = ref(false)
const elapsedSeconds = ref(0)
const timerInterval = ref(null)
const timerStartTime = ref(null)
const timerNote = ref('')

// Formulario nueva sesión
const formDate = ref(new Date().toISOString().split('T')[0])
const formDuration = ref('')
const formNote = ref('')
const fileInput = ref(null)
const previewUrl = ref(null)

// ── Computed ─────────────────────────────────────────
const filteredSessions = computed(() => {
  if (!searchQuery.value.trim()) return sessions.value
  const q = searchQuery.value.toLowerCase()
  return sessions.value.filter(s => s.note?.toLowerCase().includes(q))
})

const displayedSessions = computed(() => {
  if (showAllSessions.value) return filteredSessions.value
  return filteredSessions.value.slice(0, visibleCount.value)
})

const hasMoreSessions = computed(() => filteredSessions.value.length > visibleCount.value)

const totalMinutes = computed(() => sessions.value.reduce((sum, s) => sum + (s.minutes || 0), 0))
const totalHours = computed(() => (totalMinutes.value / 60).toFixed(1))
const sessionCount = computed(() => sessions.value.length)

const thisWeekMinutes = computed(() => {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  return sessions.value.filter(s => new Date(s.created_at) >= weekAgo).reduce((sum, s) => sum + (s.minutes || 0), 0)
})

const thisMonthMinutes = computed(() => {
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)
  return sessions.value.filter(s => new Date(s.created_at) >= monthAgo).reduce((sum, s) => sum + (s.minutes || 0), 0)
})

const currentStreak = computed(() => {
  if (sessions.value.length === 0) return 0
  const dates = [...new Set(sessions.value.map(s => new Date(s.created_at).toISOString().split('T')[0]))].sort().reverse()
  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diff = (prev - curr) / (1000 * 60 * 60 * 24)
    if (diff === 1) streak++
    else break
  }
  return streak
})

const longestStreak = computed(() => {
  if (sessions.value.length === 0) return 0
  const dates = [...new Set(sessions.value.map(s => new Date(s.created_at).toISOString().split('T')[0]))].sort()
  let maxStreak = 1, current = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diff = (curr - prev) / (1000 * 60 * 60 * 24)
    if (diff === 1) { current++; maxStreak = Math.max(maxStreak, current) }
    else current = 1
  }
  return maxStreak
})

const formattedTimer = computed(() => {
  const h = Math.floor(elapsedSeconds.value / 3600)
  const m = Math.floor((elapsedSeconds.value % 3600) / 60)
  const s = elapsedSeconds.value % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

const chartData = computed(() => {
  const days = 7
  const data = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const mins = sessions.value
      .filter(s => new Date(s.created_at).toISOString().split('T')[0] === dateStr)
      .reduce((sum, s) => sum + (s.minutes || 0), 0)
    data.push({
      day: d.toLocaleDateString('es-ES', { weekday: 'short' }),
      minutes: mins,
      date: dateStr
    })
  }
  return data
})

const maxChartValue = computed(() => Math.max(...chartData.value.map(d => d.minutes), 1))

// ── API ──────────────────────────────────────────────
async function loadSessions() {
  loading.value = true
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { loading.value = false; return }
  const { data } = await supabase
    .from('hobby_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('hobby_id', props.hobby.id)
    .order('created_at', { ascending: false })
  if (data) sessions.value = data
  loading.value = false
}

async function saveSession() {
  if (!formDuration.value || formDuration.value <= 0) {
    alert('Introduce una duración válida')
    return
  }
  saving.value = true
  let imageUrl = null
  if (fileInput.value?.files?.[0]) {
    const file = fileInput.value.files[0]
    const ext = file.name.split('.').pop()
    const { data: { user: u } } = await supabase.auth.getUser()
    const path = `sessions/${u?.id || 'unknown'}/${Date.now()}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('hobbies').upload(path, file)
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('hobbies').getPublicUrl(uploadData.path)
      imageUrl = publicUrl
    }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase.from('hobby_sessions').insert({
    user_id: user.id,
    hobby_id: props.hobby.id,
    minutes: parseInt(formDuration.value),
    note: formNote.value || null,
    image_url: imageUrl,
    created_at: (() => { const d = new Date(formDate.value); const now = new Date(); d.setHours(now.getHours(), now.getMinutes(), now.getSeconds()); return d.toISOString(); })(),
  }).select()
  if (data?.[0]) {
    sessions.value.unshift(data[0])
    resetForm()
    activeView.value = 'history'
    showAllSessions.value = false
    visibleCount.value = 7
    emit('add-session', data[0])
  }
  saving.value = false
}

async function saveTimerSession() {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  if (minutes < 1) {
    alert('La sesión debe durar al menos 1 minuto')
    return
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase.from('hobby_sessions').insert({
    user_id: user.id,
    hobby_id: props.hobby.id,
    minutes: minutes,
    note: timerNote.value || null,
    created_at: new Date().toISOString(),
  }).select()
  if (data?.[0]) {
    sessions.value.unshift(data[0])
    resetTimer()
    activeView.value = 'history'
    showAllSessions.value = false
    visibleCount.value = 7
    emit('add-session', data[0])
  }
}

// ── Editar nota inline ───────────────────────────────
function startEditNote(session) {
  editingNoteId.value = session.id
  editingNoteText.value = session.note || ''
}

async function saveNoteInline(session) {
  if (!editingNoteText.value.trim()) {
    editingNoteId.value = null
    return
  }
  const { data } = await supabase.from('hobby_sessions')
    .update({ note: editingNoteText.value.trim() })
    .eq('id', session.id)
    .select()
  if (data?.[0]) {
    const idx = sessions.value.findIndex(s => s.id === session.id)
    if (idx !== -1) sessions.value[idx].note = data[0].note
  }
  editingNoteId.value = null
}

function cancelEditNote() {
  editingNoteId.value = null
  editingNoteText.value = ''
}

// ── Timer functions ──────────────────────────────────
function startTimer() {
  if (isRunning.value) return
  isRunning.value = true
  timerStartTime.value = Date.now() - (elapsedSeconds.value * 1000)
  timerInterval.value = setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - timerStartTime.value) / 1000)
  }, 1000)
}

function pauseTimer() {
  isRunning.value = false
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

function resetTimer() {
  pauseTimer()
  elapsedSeconds.value = 0
  timerNote.value = ''
}

// ── Helpers ──────────────────────────────────────────
function resetForm() {
  formDate.value = new Date().toISOString().split('T')[0]
  formDuration.value = ''
  formNote.value = ''
  previewUrl.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (file) previewUrl.value = URL.createObjectURL(file)
}

function openLightbox(url) {
  lightboxImage.value = url
  showImageLightbox.value = true
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'Ahora'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} d`
  return formatDate(dateStr)
}

function loadMore() {
  visibleCount.value += 7
}

onMounted(() => { loadSessions() })
onUnmounted(() => { if (timerInterval.value) clearInterval(timerInterval.value) })
</script>

<<template>
<div class="standard-page">

  <!-- ══ HEADER ═══════════════════════════════════════ -->
  <div class="sm-header">
    <div class="sm-header-left">
      <button class="sm-btn-close" @click="emit('close')">
        <svg viewBox="0 0 16 16" fill="none" width="16"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
      <div class="sm-tabs">
        <button class="sm-tab" :class="{ active: activeView === 'history' }" @click="activeView = 'history'">Sesiones</button>
        <button class="sm-tab" :class="{ active: activeView === 'timer' }" @click="activeView = 'timer'">⏱ Timer</button>
        <button class="sm-tab" :class="{ active: activeView === 'add' }" @click="activeView = 'add'">+ Añadir</button>
      </div>
    </div>
    <div class="sm-header-right">
      <button v-if="activeView === 'history'" class="sm-btn-search" @click="showSearch = !showSearch">
        <svg viewBox="0 0 20 20" fill="none" width="16"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.8"/><path d="M15 15l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
    </div>
  </div>

  <!-- ══ SEARCH BAR ════════════════════════════════════ -->
  <Transition name="sd">
    <div v-if="showSearch && activeView === 'history'" class="sm-search-wrap">
      <div class="sm-search-inner">
        <svg viewBox="0 0 20 20" fill="none" width="14" class="sm-search-ico"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.7"/><path d="M15 15l3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
        <input v-model="searchQuery" class="sm-search-inp" placeholder="Buscar en notas..." autofocus />
        <button class="sm-search-close" @click="showSearch = false; searchQuery = ''">✕</button>
      </div>
    </div>
  </Transition>

  <!-- ══ SESIONES VIEW ═════════════════════════════════ -->
  <div v-if="activeView === 'history'" class="sm-history-view">

    <!-- Hero Stats -->
    <div class="sm-hero-stats">
      <div class="sm-hero-card" :style="{ background: 'linear-gradient(135deg, ' + color + ', ' + color + 'dd)' }">
        <div class="sm-hero-icon"><svg viewBox="0 0 24 24" fill="none" width="28"><circle cx="12" cy="12" r="9" stroke="#fff" stroke-width="2" opacity="0.4"/><path d="M12 7v5l3 3" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></div>
        <div class="sm-hero-info">
          <span class="sm-hero-value">{{ totalHours }}h</span>
          <span class="sm-hero-label">Tiempo total</span>
        </div>
        <div class="sm-hero-streak" v-if="currentStreak > 0">
          <span class="streak-fire">🔥</span>
          <span class="streak-num">{{ currentStreak }}</span>
          <span class="streak-label">días</span>
        </div>
      </div>
      <div class="sm-hero-grid">
        <div class="sm-hero-mini">
          <span class="sm-mini-value">{{ sessionCount }}</span>
          <span class="sm-mini-label">Sesiones</span>
        </div>
        <div class="sm-hero-mini">
          <span class="sm-mini-value">{{ Math.round(thisWeekMinutes / 60 * 10) / 10 }}h</span>
          <span class="sm-mini-label">Esta semana</span>
        </div>
        <div class="sm-hero-mini">
          <span class="sm-mini-value">{{ longestStreak }}</span>
          <span class="sm-mini-label">Mejor racha</span>
        </div>
        <div class="sm-hero-mini">
          <span class="sm-mini-value">{{ Math.round(thisMonthMinutes / 60 * 10) / 10 }}h</span>
          <span class="sm-mini-label">Este mes</span>
        </div>
      </div>
    </div>

    <!-- Gráfica -->
    <div v-if="sessions.length > 0" class="sm-chart-section">
      <div class="sm-chart-header">
        <h3 class="sm-chart-title">Últimos 7 días</h3>
        <div class="sm-chart-legend"><span class="sm-chart-dot" :style="{ background: color }"></span><span>min</span></div>
      </div>
      <div class="sm-chart-bars">
        <div v-for="(bar, i) in chartData" :key="i" class="sm-chart-bar-wrap">
          <div class="sm-chart-bar-track">
            <div class="sm-chart-bar" :style="{ height: (bar.minutes / maxChartValue * 100) + '%', background: bar.minutes > 0 ? 'linear-gradient(to top, ' + color + ', ' + color + '88)' : 'transparent' }"></div>
          </div>
          <span class="sm-chart-day">{{ bar.day }}</span>
          <span v-if="bar.minutes > 0" class="sm-chart-val">{{ bar.minutes }}m</span>
        </div>
      </div>
    </div>

    <!-- Lista de sesiones (paginada) -->
    <div class="sm-sessions-area">
      <div v-if="loading" class="sm-loading">
        <div class="sm-spinner" :style="{ borderTopColor: color }"></div>
        <span>Cargando sesiones...</span>
      </div>
      <div v-else-if="filteredSessions.length === 0" class="sm-empty">
        <div class="sm-empty-illustration">
          <svg viewBox="0 0 64 64" fill="none" width="64"><circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="2" opacity="0.2"/><path d="M32 20v16l8 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        </div>
        <p>{{ searchQuery ? 'No se encontraron resultados' : 'Aún no hay sesiones. ¡Empieza a practicar!' }}</p>
        <button class="sm-empty-btn" :style="{ background: color }" @click="activeView = 'timer'">Iniciar timer</button>
      </div>
      <div v-else class="sm-sessions-list">
        <div v-for="session in displayedSessions" :key="session.id" class="sm-session-card">
          <div class="sm-session-left">
            <div class="sm-session-date" :style="{ background: color + '12' }">
              <span class="sm-session-day" :style="{ color: color }">{{ new Date(session.created_at).getDate() }}</span>
              <span class="sm-session-month" :style="{ color: color }">{{ new Date(session.created_at).toLocaleDateString('es-ES', { month: 'short' }) }}</span>
            </div>
            <div class="sm-session-info">
              <div class="sm-session-time">
                <svg viewBox="0 0 24 24" fill="none" width="14"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                <span>{{ formatDuration(session.minutes) }}</span>
              </div>
              <!-- Nota editable inline -->
              <div v-if="editingNoteId === session.id" class="sm-note-edit">
                <input 
                  v-model="editingNoteText" 
                  @keyup.enter="saveNoteInline(session)"
                  @keyup.esc="cancelEditNote"
                  class="sm-note-input"
                  placeholder="Añade una nota..."
                  ref="noteInput"
                />
                <div class="sm-note-edit-actions">
                  <button class="sm-note-save" @click="saveNoteInline(session)">✓</button>
                  <button class="sm-note-cancel" @click="cancelEditNote">✕</button>
                </div>
              </div>
              <p v-else-if="session.note" class="sm-session-note" @click="startEditNote(session)">{{ session.note }}</p>
              <p v-else class="sm-session-note empty" @click="startEditNote(session)">Añadir nota...</p>
              <span class="sm-session-ago">{{ formatTimeAgo(session.created_at) }}</span>
            </div>
          </div>
          <div class="sm-session-right">
            <img v-if="session.image_url" :src="session.image_url" class="sm-session-img" @click="openLightbox(session.image_url)" />
          </div>
        </div>
        
        <!-- Ver más -->
        <button v-if="hasMoreSessions && !showAllSessions" class="sm-load-more" @click="loadMore">
          Ver más sesiones
        </button>
        <button v-if="showAllSessions && filteredSessions.length > visibleCount" class="sm-load-more" @click="showAllSessions = false; visibleCount = 7">
          Mostrar menos
        </button>
      </div>
    </div>
  </div>

  <!-- ══ TIMER VIEW ════════════════════════════════════ -->
  <div v-if="activeView === 'timer'" class="sm-timer-view">
    <div class="sm-timer-stats">
      <div class="sm-timer-stat">
        <span class="sm-timer-stat-value">{{ totalHours }}h</span>
        <span class="sm-timer-stat-label">Total</span>
      </div>
      <div class="sm-timer-stat">
        <span class="sm-timer-stat-value" :class="{ 'has-streak': currentStreak > 0 }">{{ currentStreak > 0 ? currentStreak + '🔥' : '—' }}</span>
        <span class="sm-timer-stat-label">Racha</span>
      </div>
      <div class="sm-timer-stat">
        <span class="sm-timer-stat-value">{{ Math.round(thisWeekMinutes / 60 * 10) / 10 }}h</span>
        <span class="sm-timer-stat-label">Semana</span>
      </div>
    </div>
    <div class="sm-timer-circle-wrap">
      <div class="sm-timer-circle" :class="{ running: isRunning }">
        <svg class="sm-timer-ring" viewBox="0 0 200 200">
          <circle class="sm-timer-ring-bg" cx="100" cy="100" r="90"/>
          <circle class="sm-timer-ring-progress" cx="100" cy="100" r="90" :stroke-dasharray="565.48" :stroke-dashoffset="565.48 - (565.48 * Math.min(elapsedSeconds / 3600, 1))" :style="{ stroke: color }"/>
        </svg>
        <div class="sm-timer-display">
          <span class="sm-timer-time">{{ formattedTimer }}</span>
          <span class="sm-timer-status">{{ isRunning ? 'En progreso...' : elapsedSeconds > 0 ? 'Pausado' : 'Listo' }}</span>
        </div>
      </div>
    </div>
    <div class="sm-timer-controls">
      <button v-if="!isRunning && elapsedSeconds === 0" class="sm-timer-btn start" :style="{ background: color }" @click="startTimer">
        <svg viewBox="0 0 24 24" fill="none" width="24"><path d="M5 3l14 9-14 9V3z" fill="currentColor"/></svg>
        <span>Iniciar</span>
      </button>
      <button v-else-if="isRunning" class="sm-timer-btn pause" @click="pauseTimer">
        <svg viewBox="0 0 24 24" fill="none" width="24"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>
        <span>Pausar</span>
      </button>
      <template v-else>
        <button class="sm-timer-btn resume" :style="{ background: color }" @click="startTimer">
          <svg viewBox="0 0 24 24" fill="none" width="24"><path d="M5 3l14 9-14 9V3z" fill="currentColor"/></svg>
          <span>Continuar</span>
        </button>
        <button class="sm-timer-btn stop" @click="resetTimer">
          <svg viewBox="0 0 24 24" fill="none" width="20"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/></svg>
          <span>Reiniciar</span>
        </button>
      </template>
    </div>
    <div v-if="elapsedSeconds > 0 && !isRunning" class="sm-timer-save">
      <input v-model="timerNote" class="sm-timer-note-input" placeholder="¿Cómo fue esta sesión? (opcional)" />
      <button class="sm-timer-save-btn" :style="{ background: color }" @click="saveTimerSession">
        <svg viewBox="0 0 24 24" fill="none" width="18"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>Guardar {{ Math.floor(elapsedSeconds / 60) }} min</span>
      </button>
    </div>
  </div>

  <!-- ══ ADD VIEW ══════════════════════════════════════ -->
  <div v-if="activeView === 'add'" class="sm-add">
    <div class="sm-add-card">
      <h3 class="sm-add-title">Registrar sesión de {{ hobby.name }}</h3>
      <div class="sm-form">
        <div class="sm-field"><label>Fecha</label><input type="date" v-model="formDate" /></div>
        <div class="sm-field">
          <label>Duración (minutos)</label>
          <input type="number" v-model="formDuration" placeholder="Ej: 45" min="1" />
          <div class="sm-quick-durations">
            <button v-for="min in [15, 30, 45, 60, 90, 120]" :key="min" @click="formDuration = min" :class="{ active: formDuration == min }" :style="formDuration == min ? { background: color, borderColor: color } : {}">{{ min }}m</button>
          </div>
        </div>
        <div class="sm-field"><label>Nota / Descripción</label><textarea v-model="formNote" placeholder="¿Cómo fue la sesión?..." rows="3"></textarea></div>
        <div class="sm-field">
          <label>Foto (opcional)</label>
          <div class="sm-upload-zone" @click="fileInput?.click()" :class="{ hasPreview: previewUrl }">
            <input ref="fileInput" type="file" accept="image/*" @change="onFileChange" hidden />
            <img v-if="previewUrl" :src="previewUrl" class="sm-preview" />
            <template v-else>
              <svg viewBox="0 0 24 24" fill="none" width="32"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              <span>Añadir foto</span>
            </template>
          </div>
        </div>
      </div>
      <button class="sm-submit-btn" :style="{ background: color }" @click="saveSession" :disabled="!formDuration || saving">
        <div v-if="saving" class="sm-spinner-small"></div>
        <span v-else>Guardar sesión</span>
      </button>
    </div>
  </div>

  <!-- ══ LIGHTBOX ══════════════════════════════════════ -->
  <Transition name="sd">
    <div v-if="showImageLightbox" class="sm-lightbox" @click="showImageLightbox = false">
      <button class="sm-lightbox-close" @click.stop="showImageLightbox = false">✕</button>
      <img :src="lightboxImage" @click.stop />
    </div>
  </Transition>

</div>
</template>

<style scoped>
/* ════════════════════════════════════════════════════════════════════════
   STANDARDMODE — Estilo KitchenMode unificado
   ════════════════════════════════════════════════════════════════════════ */

.standard-page {
  background: #ffffff;
  min-height: 100vh;
  padding: 0;
  padding-bottom: 80px;
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #1a1a2e;
  -webkit-font-smoothing: antialiased;
}

/* ── Header (igual que KitchenMode) ── */
.sm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  background: #faf8f5;
  border-bottom: 1px solid rgba(34,40,78,.08);
  position: sticky;
  top: 0;
  z-index: 10;
}
.sm-header-left { display: flex; align-items: center; gap: 10px; }
.sm-header-right { display: flex; align-items: center; gap: 8px; }

.sm-tabs {
  display: flex;
  background: rgba(34,40,78,.07);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}
.sm-tab {
  padding: 7px 14px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(34,40,78,.5);
  cursor: pointer;
  transition: all .18s;
  white-space: nowrap;
}
.sm-tab.active {
  background: #fff;
  color: #22284E;
  box-shadow: 0 2px 6px rgba(34,40,78,.1);
}

.sm-btn-close {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(34,40,78,.08);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(34,40,78,.6);
  flex-shrink: 0;
}
.sm-btn-close:hover { background: rgba(34,40,78,.14); }

.sm-btn-search {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(34,40,78,.08);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(34,40,78,.6);
}
.sm-btn-search:hover { background: rgba(34,40,78,.14); }

/* ── Search ── */
.sm-search-wrap {
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.sm-search-inner { position: relative; }
.sm-search-ico {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}
.sm-search-inp {
  width: 100%;
  padding: 12px 44px;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  font-size: 15px;
  color: #1a1a2e;
  font-family: inherit;
  box-sizing: border-box;
  background: #f9fafb;
  transition: all 0.2s ease;
}
.sm-search-inp:focus {
  outline: none;
  border-color: v-bind(color);
  background: #ffffff;
  box-shadow: 0 0 0 3px v-bind(color + '20');
}
.sm-search-close {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: #e5e7eb;
  border: none;
  cursor: pointer;
  color: #6b7280;
  font-size: 14px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.sm-search-close:hover {
  background: #d1d5db;
  color: #374151;
}

/* ════════════════════════════════════════════════════════════════════════
   HERO STATS — Premium como KitchenMode
   ════════════════════════════════════════════════════════════════════════ */
.sm-hero-stats {
  padding: 20px 0;
}
.sm-hero-card {
  border-radius: 24px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: #fff;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px v-bind(color + '30');
}
.sm-hero-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200px;
  height: 200px;
  background: rgba(255,255,255,.08);
  border-radius: 50%;
}
.sm-hero-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(255,255,255,.15);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sm-hero-info { flex: 1; }
.sm-hero-value {
  display: block;
  font-size: 36px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
}
.sm-hero-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  opacity: .75;
  margin-top: 4px;
}
.sm-hero-streak {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255,255,255,.15);
  backdrop-filter: blur(8px);
  border-radius: 16px;
  padding: 12px 16px;
  flex-shrink: 0;
}
.streak-fire { font-size: 24px; line-height: 1; }
.streak-num { font-size: 20px; font-weight: 800; line-height: 1; }
.streak-label { font-size: 10px; font-weight: 600; opacity: .7; text-transform: uppercase; }

.sm-hero-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.sm-hero-mini {
  background: #f9fafb;
  border-radius: 16px;
  padding: 14px 8px;
  text-align: center;
  border: 1.5px solid #f3f4f6;
  transition: all .2s;
}
.sm-hero-mini:hover {
  border-color: v-bind(color + '30');
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,.06);
}
.sm-mini-value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: #1a1a2e;
  line-height: 1;
}
.sm-mini-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 4px;
}

/* ════════════════════════════════════════════════════════════════════════
   GRÁFICA DE BARRAS
   ════════════════════════════════════════════════════════════════════════ */
.sm-chart-section {
  padding: 0 0 20px;
}
.sm-chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.sm-chart-title {
  font-size: 15px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0;
}
.sm-chart-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
}
.sm-chart-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.sm-chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  height: 140px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 20px;
  border: 1.5px solid #f3f4f6;
}
.sm-chart-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
}
.sm-chart-bar-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  border-radius: 8px;
  overflow: hidden;
}
.sm-chart-bar {
  width: 70%;
  border-radius: 8px 8px 4px 4px;
  min-height: 4px;
  transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.sm-chart-day {
  font-size: 11px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
}
.sm-chart-val {
  font-size: 10px;
  font-weight: 700;
  color: v-bind(color);
}

/* ── Sessions Area ── */
.sm-sessions-area {
  padding: 0 0 20px;
}

/* Loading / Empty */
.sm-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 20px;
  color: #9ca3af;
  font-size: 15px;
  font-weight: 500;
}
.sm-spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid #f3f4f6;
  border-top-color: v-bind(color);
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.sm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 60px 20px;
  text-align: center;
}
.sm-empty-illustration {
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}
.sm-empty p {
  color: #9ca3af;
  font-size: 15px;
  font-weight: 500;
  margin: 0;
}
.sm-empty-btn {
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.sm-empty-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Sessions List */
.sm-sessions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sm-session-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 16px;
  border: 1.5px solid #f3f4f6;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.sm-session-card:hover {
  border-color: #e5e7eb;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}
.sm-session-left {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  flex: 1;
  min-width: 0;
}
.sm-session-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  flex-shrink: 0;
  margin-top: 2px;
}
.sm-session-day {
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
}
.sm-session-month {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}
.sm-session-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}
.sm-session-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 800;
  color: #1a1a2e;
}
.sm-session-time svg { color: v-bind(color); }

/* Nota editable */
.sm-session-note {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.2s;
  border: 1.5px solid transparent;
}
.sm-session-note:hover {
  background: #f9fafb;
  border-color: #e5e7eb;
}
.sm-session-note.empty {
  color: #9ca3af;
  font-style: italic;
}
.sm-note-edit {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sm-note-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid v-bind(color);
  border-radius: 10px;
  font-size: 13px;
  color: #1a1a2e;
  font-family: inherit;
  background: #ffffff;
  box-sizing: border-box;
  transition: all 0.2s;
}
.sm-note-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px v-bind(color + '15');
}
.sm-note-edit-actions {
  display: flex;
  gap: 6px;
}
.sm-note-save,
.sm-note-cancel {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}
.sm-note-save {
  background: v-bind(color);
  color: #fff;
}
.sm-note-save:hover { opacity: 0.9; }
.sm-note-cancel {
  background: #f3f4f6;
  color: #6b7280;
}
.sm-note-cancel:hover { background: #e5e7eb; }

.sm-session-ago {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
}
.sm-session-right {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-shrink: 0;
}
.sm-session-img {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  object-fit: cover;
  cursor: zoom-in;
  transition: transform 0.2s;
}
.sm-session-img:hover {
  transform: scale(1.05);
}

/* Ver más */
.sm-load-more {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: 2px solid #e5e7eb;
  background: #ffffff;
  color: #6b7280;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;
}
.sm-load-more:hover {
  border-color: v-bind(color);
  color: v-bind(color);
  background: v-bind(color + '05');
}

/* ════════════════════════════════════════════════════════════════════════
   TIMER VIEW
   ════════════════════════════════════════════════════════════════════════ */
.sm-timer-view {
  padding: 24px 0;
}

.sm-timer-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 32px;
}
.sm-timer-stat {
  background: #f9fafb;
  border-radius: 16px;
  padding: 16px 8px;
  text-align: center;
  border: 1.5px solid #f3f4f6;
  transition: all .2s;
}
.sm-timer-stat:hover {
  border-color: v-bind(color + '30');
}
.sm-timer-stat-value {
  display: block;
  font-size: 22px;
  font-weight: 800;
  color: #1a1a2e;
  line-height: 1;
}
.sm-timer-stat-value.has-streak {
  color: #f59e0b;
}
.sm-timer-stat-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 4px;
}

.sm-timer-circle-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}
.sm-timer-circle {
  position: relative;
  width: 260px;
  height: 260px;
}
.sm-timer-circle.running .sm-timer-ring-progress {
  animation: pulse-ring 2s ease-in-out infinite;
}
@keyframes pulse-ring {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.sm-timer-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.sm-timer-ring-bg {
  fill: none;
  stroke: #f3f4f6;
  stroke-width: 8;
}
.sm-timer-ring-progress {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
}
.sm-timer-display {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.sm-timer-time {
  font-size: 52px;
  font-weight: 800;
  color: #1a1a2e;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.02em;
}
.sm-timer-status {
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
  margin-top: 8px;
}

.sm-timer-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
}
.sm-timer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 14px;
  border: none;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: #fff;
}
.sm-timer-btn.start,
.sm-timer-btn.resume {
  min-width: 160px;
  box-shadow: 0 4px 16px v-bind(color + '40');
}
.sm-timer-btn.start:hover,
.sm-timer-btn.resume:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px v-bind(color + '50');
}
.sm-timer-btn.pause {
  background: #f59e0b;
  min-width: 160px;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
}
.sm-timer-btn.pause:hover {
  background: #d97706;
  transform: translateY(-2px);
}
.sm-timer-btn.stop {
  background: #f3f4f6;
  color: #6b7280;
  min-width: 120px;
}
.sm-timer-btn.stop:hover {
  background: #e5e7eb;
  transform: translateY(-2px);
}

.sm-timer-save {
  background: #f9fafb;
  border-radius: 20px;
  padding: 20px;
  border: 1.5px solid #f3f4f6;
}
.sm-timer-note-input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  color: #1a1a2e;
  font-family: inherit;
  background: #ffffff;
  margin-bottom: 12px;
  box-sizing: border-box;
  transition: all 0.2s;
}
.sm-timer-note-input:focus {
  outline: none;
  border-color: v-bind(color);
  box-shadow: 0 0 0 3px v-bind(color + '15');
}
.sm-timer-save-btn {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 16px v-bind(color + '30');
}
.sm-timer-save-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px v-bind(color + '40');
}

/* ════════════════════════════════════════════════════════════════════════
   ADD VIEW
   ════════════════════════════════════════════════════════════════════════ */
.sm-add {
  padding: 20px 0;
}
.sm-add-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 28px;
  border: 1.5px solid #f3f4f6;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  width: 100%;
}
.sm-add-title {
  font-size: 20px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0 0 24px;
}

.sm-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}
.sm-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sm-field label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(34,40,78,.5);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.sm-field input,
.sm-field textarea {
  padding: 14px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  font-size: 15px;
  color: #1a1a2e;
  font-family: inherit;
  background: #ffffff;
  transition: all 0.2s;
  box-sizing: border-box;
  width: 100%;
}
.sm-field input:focus,
.sm-field textarea:focus {
  outline: none;
  border-color: v-bind(color);
  box-shadow: 0 0 0 4px v-bind(color + '12');
}
.sm-field textarea { resize: vertical; }

.sm-quick-durations {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.sm-quick-durations button {
  padding: 8px 16px;
  border-radius: 10px;
  border: 2px solid #e5e7eb;
  background: #ffffff;
  font-size: 13px;
  font-weight: 700;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}
.sm-quick-durations button:hover {
  border-color: v-bind(color);
  color: v-bind(color);
  transform: translateY(-1px);
}
.sm-quick-durations button.active {
  background: v-bind(color);
  border-color: v-bind(color);
  color: #fff;
  box-shadow: 0 4px 12px v-bind(color + '30');
  transform: translateY(-1px);
}

.sm-upload-zone {
  width: 100%;
  aspect-ratio: 16/9;
  max-height: 200px;
  border: 2px dashed #e5e7eb;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  position: relative;
  background: #f9fafb;
}
.sm-upload-zone:hover {
  border-color: v-bind(color);
  background: v-bind(color + '05');
}
.sm-upload-zone.hasPreview {
  border-style: solid;
  border-color: v-bind(color);
}
.sm-upload-zone span {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
}
.sm-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 14px;
}

.sm-submit-btn {
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  border: none;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 16px v-bind(color + '30');
}
.sm-submit-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px v-bind(color + '40');
}
.sm-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.sm-spinner-small {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

/* ── Lightbox ── */
.sm-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  cursor: zoom-out;
}
.sm-lightbox img {
  max-width: 100%;
  max-height: 90vh;
  border-radius: 12px;
  object-fit: contain;
  cursor: default;
}
.sm-lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,.15);
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  z-index: 1002;
}
.sm-lightbox-close:hover {
  background: rgba(255,255,255,.3);
}

/* ── Transitions ── */
.sd-enter-active,
.sd-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.sd-enter-from,
.sd-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ════════════════════════════════════════════════════════════════════════
   RESPONSIVE — Móvil primero, Desktop ocupa todo
   ════════════════════════════════════════════════════════════════════════ */

/* Móvil pequeño */
@media (max-width: 640px) {
  .sm-header,
  .sm-search-wrap,
  .sm-hero-stats,
  .sm-chart-section,
  .sm-sessions-area,
  .sm-timer-view,
  .sm-add {
    padding-left: 16px;
    padding-right: 16px;
  }
}

/* Tablet / Desktop pequeño — ocupa todo el ancho disponible */
@media (min-width: 641px) {
  .sm-add {
    padding: 24px 32px;
  }
  .sm-add-card {
    max-width: 600px;
    margin: 0 auto;
  }
  .sm-sessions-area {
    padding: 0 32px 24px;
  }
  .sm-hero-stats {
    padding: 24px 32px;
  }
  .sm-chart-section {
    padding: 0 32px 24px;
  }
  .sm-timer-view {
    padding: 32px;
    max-width: 500px;
    margin: 0 auto;
  }
  .sm-header {
    padding: 12px 32px;
  }
}

/* Desktop grande — contenido ancho pero sin espacios vacíos laterales */
@media (min-width: 769px) {
  .sm-header {
    padding: 12px 40px;
  }
  .sm-btn-close {
    margin-left: 8px;
  }
  .sm-hero-stats,
  .sm-chart-section,
  .sm-sessions-area,
  .sm-add {
    padding-left: 40px;
    padding-right: 40px;
  }
  .sm-add-card {
    max-width: 640px;
  }
}

/* Desktop muy grande — limitar ancho máximo para no estirar demasiado */
@media (min-width: 1024px) {
  .sm-hero-stats,
  .sm-chart-section,
  .sm-sessions-area {
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
    padding-left: 20px;
    padding-right: 20px;
  }
  .sm-add-card {
    max-width: 640px;
  }
}
</style>