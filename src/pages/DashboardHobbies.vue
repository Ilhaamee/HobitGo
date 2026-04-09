<template>
  <div class="dashboard-hobbies">
    <div class="page-header">
      <div>
        <h1>Mis Hobbies</h1>
        <p class="subtitle">Gestiona tus pasatiempos y actividades</p>
      </div>
      <button class="btn-add" @click="showForm = !showForm">
        <font-awesome-icon icon="plus" /> Añadir hobby
      </button>
    </div>

    <!-- Formulario nuevo hobby -->
    <div v-if="showForm" class="form-card">
      <h3>Nuevo hobby</h3>
      <input v-model="newName" type="text" class="input" placeholder="Nombre del hobby" />
      <textarea v-model="newDescription" class="input textarea" placeholder="Descripción (opcional)"></textarea>

      <!-- Icono -->
      <label class="field-label">Icono</label>
      <div class="icon-grid">
        <button
          v-for="ic in iconOptions" :key="ic.value"
          class="icon-btn"
          :class="{ selected: newIcon === ic.value }"
          @click="newIcon = ic.value"
        >
          <font-awesome-icon :icon="ic.value" />
          <span>{{ ic.label }}</span>
        </button>
      </div>

      <!-- Color -->
      <label class="field-label">Color</label>
      <div class="color-grid">
        <button
          v-for="c in colorOptions" :key="c"
          class="color-btn"
          :class="{ selected: newColor === c }"
          :style="{ background: c }"
          @click="newColor = c"
        ></button>
      </div>

      <div v-if="formError" class="error-message">{{ formError }}</div>
      <div class="form-actions">
        <button class="btn-primary" @click="addHobby" :disabled="saving">{{ saving ? 'Guardando...' : 'Añadir hobby' }}</button>
        <button class="btn-cancel" @click="showForm = false">Cancelar</button>
      </div>
    </div>

    <!-- Grid de hobbies -->
    <div v-if="hobbies.length > 0" class="hobbies-grid">
      <div class="hobby-card" v-for="hobby in hobbies" :key="hobby.id">
        <div class="hobby-header">
          <div class="hobby-icon" :style="{ background: hobby.color }">
            <font-awesome-icon :icon="hobby.icon" />
          </div>
          <div class="hobby-info">
            <h3>{{ hobby.name }}</h3>
            <p v-if="hobby.description">{{ hobby.description }}</p>
          </div>
          <button class="delete-btn" @click="deleteHobby(hobby.id)">
            <font-awesome-icon icon="trash" />
          </button>
        </div>

        <!-- Tiempo total -->
        <div class="hobby-stats">
          <div class="stat">
            <span class="stat-val">{{ formatTime(hobby.total_minutes) }}</span>
            <span class="stat-lbl">Tiempo total</span>
          </div>
          <div class="stat">
            <span class="stat-val">{{ getSessionCount(hobby.id) }}</span>
            <span class="stat-lbl">Sesiones</span>
          </div>
        </div>

        <!-- Registrar sesión -->
        <div class="session-form">
          <input
            v-model.number="sessionMinutes[hobby.id]"
            type="number"
            min="1"
            class="input input-sm"
            placeholder="Minutos"
          />
          <input
            v-model="sessionNote[hobby.id]"
            type="text"
            class="input input-sm"
            placeholder="Nota (opcional)"
          />
          <button class="btn-session" @click="addSession(hobby)" :style="{ background: hobby.color }">
            + Registrar
          </button>
        </div>

        <!-- Últimas sesiones -->
        <div v-if="getHobbySessions(hobby.id).length > 0" class="sessions-list">
          <div class="session-item" v-for="s in getHobbySessions(hobby.id).slice(0,3)" :key="s.id">
            <span class="session-time">{{ formatTime(s.minutes) }}</span>
            <span class="session-note">{{ s.note || 'Sin nota' }}</span>
            <span class="session-date">{{ formatDate(s.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="empty-text">No tienes hobbies aún. ¡Añade uno!</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const currentUser = ref(null)
const hobbies = ref([])
const sessions = ref([])
const showForm = ref(false)
const newName = ref('')
const newDescription = ref('')
const newIcon = ref('book')
const newColor = ref('#E08E6B')
const saving = ref(false)
const formError = ref('')
const sessionMinutes = ref({})
const sessionNote = ref({})

const iconOptions = [
  { value: 'book', label: 'Lectura' },
  { value: 'palette', label: 'Arte' },
  { value: 'dumbbell', label: 'Ejercicio' },
  { value: 'spa', label: 'Meditación' },
  { value: 'music', label: 'Música' },
  { value: 'camera', label: 'Foto' },
  { value: 'heart', label: 'Bienestar' },
  { value: 'star', label: 'Otro' },
]

const colorOptions = [
  '#E08E6B', '#E91E63', '#9C27B0', '#3F51B5',
  '#2196F3', '#009688', '#4CAF50', '#FF9800',
  '#FF5722', '#795548', '#607D8B', '#22284E'
]

function formatTime(mins) {
  if (!mins || mins === 0) return '0 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatDate(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function getHobbySessions(hobbyId) {
  return sessions.value.filter(s => s.hobby_id === hobbyId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function getSessionCount(hobbyId) {
  return sessions.value.filter(s => s.hobby_id === hobbyId).length
}

async function loadHobbies() {
  const { data } = await supabase.from('hobbies').select('*').eq('user_id', currentUser.value.id).order('created_at', { ascending: false })
  if (data) hobbies.value = data
}

async function loadSessions() {
  const { data } = await supabase.from('hobby_sessions').select('*').eq('user_id', currentUser.value.id).order('created_at', { ascending: false })
  if (data) sessions.value = data
}

async function addHobby() {
  if (!newName.value.trim()) { formError.value = 'El nombre es obligatorio'; return }
  saving.value = true
  formError.value = ''

  const { data, error } = await supabase.from('hobbies').insert({
    user_id: currentUser.value.id,
    name: newName.value.trim(),
    description: newDescription.value.trim(),
    icon: newIcon.value,
    color: newColor.value,
    total_minutes: 0
  }).select()

  if (error) { formError.value = 'Error al guardar' }
  else {
    hobbies.value.unshift(data[0])
    newName.value = ''; newDescription.value = ''
    newIcon.value = 'book'; newColor.value = '#E08E6B'
    showForm.value = false

    // Registrar en activity_log
    await supabase.from('activity_log').insert({
      user_id: currentUser.value.id,
      type: 'hobby',
      title: `Nuevo hobby: "${data[0].name}"`,
      points: 100,
      activity_date: new Date().toISOString().split('T')[0]
    })
  }
  saving.value = false
}

async function addSession(hobby) {
  const mins = sessionMinutes.value[hobby.id]
  if (!mins || mins < 1) return

  const { data, error } = await supabase.from('hobby_sessions').insert({
    hobby_id: hobby.id,
    user_id: currentUser.value.id,
    minutes: mins,
    note: sessionNote.value[hobby.id] || null
  }).select()

  if (!error) {
    sessions.value.unshift(data[0])

    // Actualizar total_minutes
    const newTotal = hobby.total_minutes + mins
    await supabase.from('hobbies').update({ total_minutes: newTotal }).eq('id', hobby.id)
    hobby.total_minutes = newTotal

    sessionMinutes.value[hobby.id] = null
    sessionNote.value[hobby.id] = ''

    // Registrar en activity_log
    await supabase.from('activity_log').insert({
      user_id: currentUser.value.id,
      type: 'hobby',
      title: `${formatTime(mins)} de "${hobby.name}"`,
      points: 10,
      activity_date: new Date().toISOString().split('T')[0]
    })
  }
}

async function deleteHobby(id) {
  await supabase.from('hobbies').delete().eq('id', id)
  hobbies.value = hobbies.value.filter(h => h.id !== id)
  sessions.value = sessions.value.filter(s => s.hobby_id !== id)
}

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  currentUser.value = user
  await loadHobbies()
  await loadSessions()
})
</script>

<style scoped>
.dashboard-hobbies { max-width: 1000px; margin: 0 auto; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; }
h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 8px; }
.subtitle { color: #666; }

.btn-add { display: flex; align-items: center; gap: 6px; background: #E08E6B; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; white-space: nowrap; }
.btn-add:hover { opacity: 0.9; }

.form-card { background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.form-card h3 { font-size: 16px; color: #1a1a2e; margin-bottom: 16px; }
.field-label { font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px; margin-top: 12px; }

.icon-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
.icon-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 14px; border: 2px solid #eee; border-radius: 10px; background: #fff; cursor: pointer; font-size: 18px; color: #666; transition: all 0.2s; min-width: 60px; }
.icon-btn span { font-size: 10px; color: #888; }
.icon-btn.selected { border-color: #E08E6B; color: #E08E6B; background: #fff5f0; }
.icon-btn:hover { border-color: #E08E6B; }

.color-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.color-btn { width: 32px; height: 32px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; transition: transform 0.2s; }
.color-btn:hover { transform: scale(1.1); }
.color-btn.selected { border-color: #1a1a2e; transform: scale(1.1); }

.form-actions { display: flex; gap: 10px; margin-top: 16px; }

.hobbies-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }

.hobby-card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 14px; }

.hobby-header { display: flex; align-items: flex-start; gap: 12px; }
.hobby-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #fff; flex-shrink: 0; }
.hobby-info { flex: 1; }
.hobby-info h3 { font-size: 16px; color: #1a1a2e; margin: 0 0 4px; }
.hobby-info p { font-size: 13px; color: #888; margin: 0; }

.hobby-stats { display: flex; gap: 20px; background: #f9f9f9; border-radius: 10px; padding: 12px 16px; }
.stat { display: flex; flex-direction: column; }
.stat-val { font-size: 18px; font-weight: 700; color: #1a1a2e; }
.stat-lbl { font-size: 11px; color: #888; }

.session-form { display: flex; gap: 8px; align-items: center; }
.input-sm { padding: 8px 10px; font-size: 13px; }
.btn-session { padding: 8px 12px; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: opacity 0.2s; }
.btn-session:hover { opacity: 0.85; }

.sessions-list { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid #f0f0f0; padding-top: 10px; }
.session-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.session-time { font-weight: 700; color: #1a1a2e; min-width: 50px; }
.session-note { flex: 1; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.session-date { color: #bbb; white-space: nowrap; }

.empty-text { color: #aaa; font-size: 14px; text-align: center; padding: 60px 0; }

.input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; margin-bottom: 10px; box-sizing: border-box; font-family: inherit; }
.input:focus { outline: none; border-color: #E08E6B; }
.textarea { resize: vertical; min-height: 60px; }
.error-message { background: #ffebee; color: #c62828; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 10px; }
.btn-primary { background: #E08E6B; color: #fff; padding: 10px 20px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
.btn-primary:hover { opacity: 0.9; }
.btn-cancel { background: #f5f5f5; color: #555; border: none; border-radius: 8px; padding: 10px 16px; font-size: 13px; cursor: pointer; }
.btn-cancel:hover { background: #eee; }
.delete-btn { background: none; border: none; color: #ccc; cursor: pointer; padding: 4px; transition: color 0.2s; margin-left: auto; }
.delete-btn:hover { color: #e53935; }
</style>
