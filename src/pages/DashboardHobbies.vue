<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import HobbyCard   from '../components/hobbies/HobbyCard.vue'
import HobbyPicker from '../components/hobbies/HobbyPicker.vue'
import HobbySetup  from '../components/hobbies/HobbySetup.vue'

const hobbies      = ref([])
const sessions     = ref([])
const showPicker   = ref(false)
const currentUser  = ref(null)
const deleteId     = ref(null)
const loading      = ref(false)
const error        = ref('')
const editingHobby = ref(null)  // hobby que se está editando

async function load() {
  const { data: h } = await supabase
    .from('hobbies').select('*')
    .eq('user_id', currentUser.value.id)
    .order('created_at', { ascending: false })
  if (h) hobbies.value = h

  const { data: s } = await supabase
    .from('hobby_sessions').select('*')
    .eq('user_id', currentUser.value.id)
    .order('created_at', { ascending: false })
  if (s) sessions.value = s
}

// ── Crear nuevo hobby ──────────────────────────────────
async function onHobbySelected(hobbyData) {
  showPicker.value = false
  error.value = ''

  if (hobbyData.custom && !hobbyData.name?.trim()) {
    const name = prompt('Nombre de tu hobby personalizado:')
    if (!name?.trim()) return
    hobbyData.name = name.trim()
  }

  const isDuplicate = hobbies.value.some(h =>
    (hobbyData.id !== 'custom' && h.hobby_id === hobbyData.id) ||
    h.name.toLowerCase() === hobbyData.name.toLowerCase()
  )
  if (isDuplicate) {
    error.value = `Ya tienes "${hobbyData.name}" en tu lista.`
    return
  }

  loading.value = true
  let imageUrl = hobbyData.imagePreview || hobbyData.img || null

  if (hobbyData.customImage) {
    try {
      const ext  = hobbyData.customImage.name.split('.').pop()
      const path = `${currentUser.value.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('hobby-images').upload(path, hobbyData.customImage, { upsert: true })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('hobby-images').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }
    } catch (e) { console.warn('Error subiendo imagen:', e) }
  }

  const { data, error: insertErr } = await supabase.from('hobbies').insert({
    user_id:       currentUser.value.id,
    hobby_id:      hobbyData.id || 'custom',
    name:          hobbyData.name,
    category:      hobbyData.category || 'creatividad',
    gradient:      hobbyData.gradient || ['#ff6b9d','#ffb3c6'],
    image_url:     imageUrl,
    total_minutes: 0,
    total_days:    hobbyData.totalDays    || 30,
    daily_minutes: hobbyData.dailyMinutes || 20,
    difficulty:    hobbyData.difficulty   || 'media',
    motivation:    hobbyData.motivation   || null,
    is_public:     hobbyData.isPublic     ?? true,
    reminder:      hobbyData.reminder     || false,
    reminder_time: hobbyData.reminderTime || null,
  }).select()

  if (insertErr) {
    error.value = 'Error al crear: ' + insertErr.message
    loading.value = false
    return
  }
  if (data?.[0]) {
    hobbies.value.unshift(data[0])
    await supabase.from('activity_log').insert({
      user_id: currentUser.value.id, type: 'hobby',
      title: `Nuevo hobby: "${hobbyData.name}"`, points: 100,
      activity_date: new Date().toISOString().split('T')[0]
    })
  }
  loading.value = false
}

// ── Abrir edición ──────────────────────────────────────
function openEdit(hobby) {
  // Convertir el hobby de BD al formato que espera HobbySetup
  editingHobby.value = {
    id:          hobby.hobby_id || 'custom',
    name:        hobby.name,
    category:    hobby.category,
    gradient:    hobby.gradient,
    img:         hobby.image_url,
    custom:      hobby.hobby_id === 'custom',
    // Campos de configuración
    _dbId:       hobby.id,   // ID real en BD para el UPDATE
    totalDays:   hobby.total_days,
    dailyMinutes:hobby.daily_minutes,
    difficulty:  hobby.difficulty,
    motivation:  hobby.motivation || '',
    isPublic:    hobby.is_public,
    reminder:    hobby.reminder,
    reminderTime:hobby.reminder_time,
  }
}

// ── Guardar edición ────────────────────────────────────
async function onEditConfirm(hobbyData) {
  const dbId = editingHobby.value._dbId
  editingHobby.value = null
  loading.value = true
  error.value   = ''

  let imageUrl = hobbyData.imagePreview || hobbyData.img || null

  if (hobbyData.customImage) {
    try {
      const ext  = hobbyData.customImage.name.split('.').pop()
      const path = `${currentUser.value.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('hobby-images').upload(path, hobbyData.customImage, { upsert: true })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('hobby-images').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }
    } catch (e) { console.warn('Error subiendo imagen:', e) }
  }

  const { error: updateErr } = await supabase.from('hobbies').update({
    name:          hobbyData.name,
    gradient:      hobbyData.gradient,
    image_url:     imageUrl,
    total_days:    hobbyData.totalDays,
    daily_minutes: hobbyData.dailyMinutes,
    difficulty:    hobbyData.difficulty,
    motivation:    hobbyData.motivation   || null,
    is_public:     hobbyData.isPublic     ?? true,
    reminder:      hobbyData.reminder     || false,
    reminder_time: hobbyData.reminderTime || null,
  }).eq('id', dbId)

  if (updateErr) {
    error.value = 'Error al guardar: ' + updateErr.message
  } else {
    // Actualizar en local sin recargar todo
    const idx = hobbies.value.findIndex(h => h.id === dbId)
    if (idx !== -1) {
      hobbies.value[idx] = {
        ...hobbies.value[idx],
        name:          hobbyData.name,
        gradient:      hobbyData.gradient,
        image_url:     imageUrl,
        total_days:    hobbyData.totalDays,
        daily_minutes: hobbyData.dailyMinutes,
        difficulty:    hobbyData.difficulty,
        motivation:    hobbyData.motivation || null,
        is_public:     hobbyData.isPublic ?? true,
        reminder:      hobbyData.reminder || false,
        reminder_time: hobbyData.reminderTime || null,
      }
    }
  }
  loading.value = false
}

// ── Sesión ─────────────────────────────────────────────
async function onAddSession({ hobbyId, minutes, note }) {
  const { data, error: err } = await supabase
    .from('hobby_sessions')
    .insert({ hobby_id: hobbyId, user_id: currentUser.value.id, minutes, note })
    .select()
  if (err) { console.error('Error añadiendo sesión:', err); return }
  if (data?.[0]) {
    sessions.value.unshift(data[0])
    const hobby = hobbies.value.find(h => h.id === hobbyId)
    if (hobby) {
      hobby.total_minutes = (hobby.total_minutes || 0) + minutes
      await supabase.from('hobbies').update({ total_minutes: hobby.total_minutes }).eq('id', hobbyId)
    }
    await supabase.from('activity_log').insert({
      user_id: currentUser.value.id, type: 'hobby',
      title: `Sesión de "${hobby?.name}"`, points: 10,
      activity_date: new Date().toISOString().split('T')[0]
    })
  }
}

// ── Eliminar ───────────────────────────────────────────
async function deleteHobby(id) {
  await supabase.from('hobby_sessions').delete().eq('hobby_id', id)
  await supabase.from('hobbies').delete().eq('id', id)
  hobbies.value  = hobbies.value.filter(h => h.id !== id)
  sessions.value = sessions.value.filter(s => s.hobby_id !== id)
  deleteId.value = null
}

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  currentUser.value = user
  await load()
})
</script>

<template>
  <div class="hobbies-page">

    <div class="page-header">
      <div>
        <h1 class="page-title">Mis Hobbies</h1>
        <p class="page-sub">{{ hobbies.length }} activo{{ hobbies.length !== 1 ? 's' : '' }}</p>
      </div>
      <button class="btn-add" @click="showPicker = true" :disabled="loading">
        <svg viewBox="0 0 14 14" fill="none" width="13">
          <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        {{ loading ? 'Guardando...' : 'Añadir hobby' }}
      </button>
    </div>

    <div v-if="error" class="error-msg">
      {{ error }}
      <button @click="error = ''">✕</button>
    </div>

    <div v-if="hobbies.length > 0" class="hobbies-grid">
      <HobbyCard
        v-for="hobby in hobbies" :key="hobby.id"
        :hobby="hobby" :sessions="sessions"
        @delete="id => deleteId = id"
        @add-session="onAddSession"
        @edit="openEdit"
      />
    </div>

    <div v-else-if="!loading" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 48 48" fill="none" width="44">
          <circle cx="24" cy="24" r="20" stroke="rgba(34,40,78,.1)" stroke-width="2"/>
          <path d="M24 16v8l5 3" stroke="rgba(34,40,78,.15)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <h3>Sin hobbies todavía</h3>
      <p>Añade tu primer hobby y empieza a registrar tu progreso</p>
      <button class="btn-add" @click="showPicker = true">
        <svg viewBox="0 0 14 14" fill="none" width="13">
          <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Añadir hobby
      </button>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Guardando...</p>
    </div>

    <!-- Picker -->
    <HobbyPicker v-if="showPicker" @select="onHobbySelected" @close="showPicker = false" />

    <!-- Editor — HobbySetup reutilizado -->
    <Transition name="fade">
      <div v-if="editingHobby" class="edit-overlay" @click.self="editingHobby = null">
        <HobbySetup
          :hobby="editingHobby"
          @confirm="onEditConfirm"
          @back="editingHobby = null"
          @close="editingHobby = null"
        />
      </div>
    </Transition>

    <!-- Confirm delete -->
    <Transition name="fade">
      <div v-if="deleteId" class="overlay-confirm" @click.self="deleteId = null">
        <div class="confirm-card">
          <h3>¿Eliminar hobby?</h3>
          <p>Se eliminarán también todas las sesiones registradas.</p>
          <div class="confirm-row">
            <button class="btn-danger" @click="deleteHobby(deleteId)">Eliminar</button>
            <button class="btn-cancel" @click="deleteId = null">Cancelar</button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.hobbies-page { max-width: 1000px; margin: 0 auto; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
.page-title { font-size: 26px; font-weight: 900; color: #22284E; letter-spacing: -1px; margin: 0 0 4px; }
.page-sub   { font-size: 13px; color: rgba(34,40,78,.45); margin: 0; }

.btn-add {
  display: flex; align-items: center; gap: 7px;
  background: #22284E; color: #fff59e; border: none;
  font-size: 14px; font-weight: 700; padding: 11px 20px;
  border-radius: 12px; cursor: pointer; white-space: nowrap;
  box-shadow: 0 4px 14px rgba(34,40,78,.22);
  transition: transform .18s, box-shadow .18s, opacity .2s;
}
.btn-add:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 7px 20px rgba(34,40,78,.3); }
.btn-add:disabled { opacity: .6; cursor: not-allowed; }

.error-msg {
  background: rgba(239,68,68,.08); border: 1.5px solid rgba(239,68,68,.2);
  color: #dc2626; border-radius: 12px; padding: 12px 16px;
  font-size: 13px; display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.error-msg button { background: none; border: none; cursor: pointer; color: #dc2626; font-size: 16px; }

.hobbies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 18px;
}

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; text-align: center; }
.empty-icon { width: 80px; height: 80px; border-radius: 50%; background: rgba(34,40,78,.04); display: flex; align-items: center; justify-content: center; }
.empty-state h3 { font-size: 17px; font-weight: 700; color: #22284E; margin: 0; }
.empty-state p  { font-size: 13px; color: rgba(34,40,78,.45); margin: 0; }

.loading-overlay { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 0; }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(34,40,78,.1); border-top-color: #ff6b9d; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-overlay p { font-size: 14px; color: rgba(34,40,78,.5); margin: 0; }

/* Edit overlay — el HobbySetup ya tiene su propio overlay interno,
   aquí solo añadimos el backdrop por encima del picker */
.edit-overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: flex-end; justify-content: center;
}

.overlay-confirm {
  position: fixed; inset: 0;
  background: rgba(34,40,78,.5); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}
.confirm-card {
  background: #fff; border-radius: 20px; padding: 28px;
  width: 100%; max-width: 340px; text-align: center;
  box-shadow: 0 24px 60px rgba(34,40,78,.2);
}
.confirm-card h3 { font-size: 17px; font-weight: 800; color: #22284E; margin: 0 0 8px; }
.confirm-card p  { font-size: 13px; color: rgba(34,40,78,.5); margin: 0 0 20px; line-height: 1.6; }
.confirm-row { display: flex; gap: 10px; justify-content: center; }
.btn-danger { background: #ef4444; color: #fff; border: none; padding: 11px 22px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; }
.btn-danger:hover { opacity: .88; }
.btn-cancel { background: rgba(34,40,78,.06); color: #22284E; border: none; padding: 11px 18px; border-radius: 10px; font-size: 14px; cursor: pointer; }
.btn-cancel:hover { background: rgba(34,40,78,.1); }

.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>