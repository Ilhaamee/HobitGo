<template>
  <div class="dashboard-hobbies">
    <div class="page-header">
      <div><h1>{{ t('hobbies_title') }}</h1><p class="subtitle">{{ t('hobbies_subtitle') }}</p></div>
      <button class="btn-add" @click="openForm()"><font-awesome-icon icon="plus" /> {{ t('add_hobby') }}</button>
    </div>

    <div v-if="showForm" class="overlay" @click.self="closeForm">
      <div class="modal">
        <button class="close" @click="closeForm">✕</button>
        <h3>{{ editingId ? t('edit_hobby') : t('new_hobby') }}</h3>
        <input v-model="newName" type="text" class="input" :placeholder="t('hobby_name_placeholder')" />
        <textarea v-model="newDescription" class="input textarea" :placeholder="t('description_placeholder')"></textarea>
        <label class="field-label">{{ t('image_label') }}</label>
        <div class="image-upload" @click="triggerImageUpload">
          <img v-if="previewImage" :src="previewImage" class="image-preview" />
          <div v-else class="image-placeholder"><font-awesome-icon icon="camera" /><span>{{ t('upload_image') }}</span></div>
          <input ref="imageInput" type="file" accept="image/*,.gif" @change="handleImageChange" hidden />
        </div>
        <button v-if="previewImage" class="btn-remove-image" @click.stop="removeImage">{{ t('remove_image') }}</button>
        <label class="field-label">{{ t('icon_label') }}</label>
        <div class="icon-grid">
          <button v-for="ic in iconOptions" :key="ic.value" class="icon-btn" :class="{ selected: newIcon === ic.value }" @click="newIcon = ic.value">
            <font-awesome-icon :icon="ic.value" /><span>{{ ic.label[currentLang] || ic.label.es }}</span>
          </button>
        </div>
        <label class="field-label">{{ t('color_label') }}</label>
        <div class="color-grid">
          <button v-for="c in colorOptions" :key="c" class="color-btn" :class="{ selected: newColor === c }" :style="{ background: c }" @click="newColor = c"></button>
        </div>
        <div v-if="formError" class="error-message">{{ formError }}</div>
        <div class="form-actions">
          <button class="btn-primary" @click="saveHobby" :disabled="saving">{{ saving ? t('saving') : (editingId ? t('save_changes') : t('add_hobby')) }}</button>
          <button class="btn-cancel" @click="closeForm">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>

    <div v-if="hobbies.length > 0" class="hobbies-grid">
      <div class="hobby-card" v-for="hobby in hobbies" :key="hobby.id">
        <div v-if="hobby.image_url" class="hobby-image"><img :src="hobby.image_url" :alt="hobby.name" /></div>
        <div class="hobby-header">
          <div class="hobby-icon" :style="{ background: hobby.color }"><font-awesome-icon :icon="hobby.icon" /></div>
          <div class="hobby-info"><h3>{{ hobby.name }}</h3><p v-if="hobby.description">{{ hobby.description }}</p></div>
          <div class="hobby-actions">
            <button class="edit-btn" @click="openForm(hobby)"><font-awesome-icon icon="pen" /></button>
            <button class="delete-btn" @click="deleteHobby(hobby.id)"><font-awesome-icon icon="trash" /></button>
          </div>
        </div>
        <div class="hobby-stats">
          <div class="stat"><span class="stat-val">{{ formatTime(hobby.total_minutes) }}</span><span class="stat-lbl">{{ t('total_time') }}</span></div>
          <div class="stat"><span class="stat-val">{{ getSessionCount(hobby.id) }}</span><span class="stat-lbl">{{ t('sessions') }}</span></div>
        </div>
        <div class="session-form">
          <input v-model.number="sessionMinutes[hobby.id]" type="number" min="1" class="input input-sm" :placeholder="t('minutes_placeholder')" />
          <input v-model="sessionNote[hobby.id]" type="text" class="input input-sm" :placeholder="t('note_placeholder')" />
          <button class="btn-session" @click="addSession(hobby)" :style="{ background: hobby.color }">{{ t('register') }}</button>
        </div>
        <div v-if="getHobbySessions(hobby.id).length > 0" class="sessions-list">
          <div class="session-item" v-for="s in getHobbySessions(hobby.id).slice(0,3)" :key="s.id">
            <span class="session-time">{{ formatTime(s.minutes) }}</span>
            <span class="session-note">{{ s.note || (currentLang === 'en' ? 'No note' : 'Sin nota') }}</span>
            <span class="session-date">{{ formatDate(s.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="empty-text">{{ t('no_hobbies') }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useI18n } from '../composables/useI18n'

const { t, currentLang } = useI18n()

const currentUser = ref(null)
const hobbies = ref([])
const sessions = ref([])
const showForm = ref(false)
const editingId = ref(null)
const newName = ref('')
const newDescription = ref('')
const newIcon = ref('book')
const newColor = ref('#E08E6B')
const saving = ref(false)
const formError = ref('')
const sessionMinutes = ref({})
const sessionNote = ref({})
const imageInput = ref(null)
const previewImage = ref('')
const imageFile = ref(null)

const iconOptions = [
  { value: 'book', label: { es: 'Lectura', en: 'Reading' } },
  { value: 'palette', label: { es: 'Arte', en: 'Art' } },
  { value: 'dumbbell', label: { es: 'Ejercicio', en: 'Exercise' } },
  { value: 'spa', label: { es: 'Meditación', en: 'Meditation' } },
  { value: 'music', label: { es: 'Música', en: 'Music' } },
  { value: 'camera', label: { es: 'Foto', en: 'Photo' } },
  { value: 'heart', label: { es: 'Bienestar', en: 'Wellness' } },
  { value: 'star', label: { es: 'Otro', en: 'Other' } },
]
const colorOptions = ['#E08E6B','#E91E63','#9C27B0','#3F51B5','#2196F3','#009688','#4CAF50','#FF9800','#FF5722','#795548','#607D8B','#22284E']

function formatTime(mins) {
  if (!mins || mins === 0) return '0 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60); const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}
function formatDate(ts) { return new Date(ts).toLocaleDateString(currentLang.value === 'en' ? 'en-GB' : 'es-ES', { day: '2-digit', month: 'short' }) }
function getHobbySessions(hobbyId) { return sessions.value.filter(s => s.hobby_id === hobbyId).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)) }
function getSessionCount(hobbyId) { return sessions.value.filter(s => s.hobby_id === hobbyId).length }
function triggerImageUpload() { imageInput.value.click() }
function handleImageChange(e) { const file = e.target.files[0]; if (!file) return; imageFile.value = file; previewImage.value = URL.createObjectURL(file) }
function removeImage() { imageFile.value = null; previewImage.value = ''; if (imageInput.value) imageInput.value.value = '' }

function openForm(hobby = null) {
  if (hobby) { editingId.value = hobby.id; newName.value = hobby.name; newDescription.value = hobby.description || ''; newIcon.value = hobby.icon; newColor.value = hobby.color; previewImage.value = hobby.image_url || '' }
  else { editingId.value = null; newName.value = ''; newDescription.value = ''; newIcon.value = 'book'; newColor.value = '#E08E6B'; previewImage.value = '' }
  imageFile.value = null; formError.value = ''; showForm.value = true
}
function closeForm() { showForm.value = false; editingId.value = null; imageFile.value = null; previewImage.value = '' }

async function uploadImage(hobbyId) {
  if (!imageFile.value) return null
  const ext = imageFile.value.name.split('.').pop()
  const path = `${currentUser.value.id}/${hobbyId}.${ext}`
  const { error } = await supabase.storage.from('hobbies').upload(path, imageFile.value, { upsert: true })
  if (error) return null
  const { data } = supabase.storage.from('hobbies').getPublicUrl(path)
  return data.publicUrl + '?t=' + Date.now()
}

async function saveHobby() {
  if (!newName.value.trim()) { formError.value = t('name_required'); return }
  saving.value = true; formError.value = ''
  if (editingId.value) {
    let imageUrl = previewImage.value && !imageFile.value ? previewImage.value : null
    if (imageFile.value) imageUrl = await uploadImage(editingId.value)
    const { error } = await supabase.from('hobbies').update({ name: newName.value.trim(), description: newDescription.value.trim(), icon: newIcon.value, color: newColor.value, image_url: imageUrl }).eq('id', editingId.value)
    if (!error) { const hobby = hobbies.value.find(h => h.id === editingId.value); if (hobby) { hobby.name = newName.value.trim(); hobby.description = newDescription.value.trim(); hobby.icon = newIcon.value; hobby.color = newColor.value; hobby.image_url = imageUrl }; closeForm() }
    else { formError.value = t('error_saving') }
  } else {
    const { data, error } = await supabase.from('hobbies').insert({ user_id: currentUser.value.id, name: newName.value.trim(), description: newDescription.value.trim(), icon: newIcon.value, color: newColor.value, total_minutes: 0 }).select()
    if (error) { formError.value = t('error_saving') }
    else {
      let imageUrl = null
      if (imageFile.value) imageUrl = await uploadImage(data[0].id)
      if (imageUrl) { await supabase.from('hobbies').update({ image_url: imageUrl }).eq('id', data[0].id); data[0].image_url = imageUrl }
      hobbies.value.unshift(data[0]); closeForm()
      await supabase.from('activity_log').insert({ user_id: currentUser.value.id, type: 'hobby', title: `${currentLang.value === 'en' ? 'New hobby' : 'Nuevo hobby'}: "${data[0].name}"`, points: 100, activity_date: new Date().toISOString().split('T')[0] })
    }
  }
  saving.value = false
}

async function addSession(hobby) {
  const mins = sessionMinutes.value[hobby.id]
  if (!mins || mins < 1) return
  const { data, error } = await supabase.from('hobby_sessions').insert({ hobby_id: hobby.id, user_id: currentUser.value.id, minutes: mins, note: sessionNote.value[hobby.id] || null }).select()
  if (!error) {
    sessions.value.unshift(data[0])
    const newTotal = hobby.total_minutes + mins
    await supabase.from('hobbies').update({ total_minutes: newTotal }).eq('id', hobby.id)
    hobby.total_minutes = newTotal; sessionMinutes.value[hobby.id] = null; sessionNote.value[hobby.id] = ''
    await supabase.from('activity_log').insert({ user_id: currentUser.value.id, type: 'hobby', title: `${formatTime(mins)} of "${hobby.name}"`, points: 10, activity_date: new Date().toISOString().split('T')[0] })
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
  const [hobbiesRes, sessionsRes] = await Promise.all([
    supabase.from('hobbies').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('hobby_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  ])
  if (hobbiesRes.data) hobbies.value = hobbiesRes.data
  if (sessionsRes.data) sessions.value = sessionsRes.data
})
</script>

<style scoped>
.dashboard-hobbies { max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; }
h1 { font-size: 28px; color: var(--text-primary); margin-bottom: 8px; }
.subtitle { color: var(--text-secondary); }
.btn-add { display: flex; align-items: center; gap: 6px; background: #E08E6B; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.btn-add:hover { opacity: 0.9; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal { background: var(--bg-card); padding: 32px; width: 480px; max-width: 90vw; border-radius: 20px; position: relative; max-height: 90vh; overflow-y: auto; }
.close { position: absolute; top: 12px; right: 12px; background: transparent; border: none; font-size: 20px; cursor: pointer; color: var(--text-muted); }
.modal h3 { font-size: 18px; color: var(--text-primary); margin-bottom: 16px; }
.field-label { font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px; margin-top: 12px; }
.image-upload { width: 100%; height: 160px; border: 2px dashed var(--input-border); border-radius: 12px; cursor: pointer; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.image-upload:hover { border-color: #E08E6B; }
.image-preview { width: 100%; height: 100%; object-fit: cover; }
.image-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--text-muted); font-size: 14px; }
.btn-remove-image { background: none; border: none; color: #e53935; font-size: 13px; cursor: pointer; margin-bottom: 8px; padding: 0; }
.icon-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
.icon-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 10px; background: var(--bg-card); cursor: pointer; font-size: 18px; color: var(--text-secondary); transition: all 0.2s; min-width: 60px; }
.icon-btn span { font-size: 10px; color: var(--text-muted); }
.icon-btn.selected { border-color: #E08E6B; color: #E08E6B; background: rgba(224,142,107,0.1); }
.color-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.color-btn { width: 32px; height: 32px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; transition: transform 0.2s; }
.color-btn:hover { transform: scale(1.1); }
.color-btn.selected { border-color: var(--text-primary); transform: scale(1.1); }
.form-actions { display: flex; gap: 10px; margin-top: 16px; }
.hobbies-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.hobby-card { background: var(--bg-card); border-radius: 16px; overflow: hidden; box-shadow: 0 2px 10px var(--shadow); display: flex; flex-direction: column; }
.hobby-image { width: 100%; height: 140px; overflow: hidden; }
.hobby-image img { width: 100%; height: 100%; object-fit: cover; }
.hobby-header { display: flex; align-items: flex-start; gap: 12px; padding: 16px 16px 0; }
.hobby-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #fff; flex-shrink: 0; }
.hobby-info { flex: 1; }
.hobby-info h3 { font-size: 16px; color: var(--text-primary); margin: 0 0 4px; }
.hobby-info p { font-size: 13px; color: var(--text-muted); margin: 0; }
.hobby-actions { display: flex; gap: 4px; }
.edit-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; transition: color 0.2s; }
.edit-btn:hover { color: #E08E6B; }
.delete-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; transition: color 0.2s; }
.delete-btn:hover { color: #e53935; }
.hobby-stats { display: flex; gap: 20px; background: var(--bg-hover); border-radius: 10px; padding: 12px 16px; margin: 12px 16px 0; }
.stat { display: flex; flex-direction: column; }
.stat-val { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.stat-lbl { font-size: 11px; color: var(--text-muted); }
.session-form { display: flex; gap: 8px; align-items: center; padding: 12px 16px 0; }
.input-sm { padding: 8px 10px; font-size: 13px; }
.btn-session { padding: 8px 12px; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.btn-session:hover { opacity: 0.85; }
.sessions-list { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--border-color); padding: 10px 16px 16px; margin-top: 12px; }
.session-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.session-time { font-weight: 700; color: var(--text-primary); min-width: 50px; }
.session-note { flex: 1; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.session-date { color: var(--text-muted); white-space: nowrap; }
.empty-text { color: var(--text-muted); font-size: 14px; text-align: center; padding: 60px 0; }
.input { width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); border-radius: 8px; font-size: 14px; margin-bottom: 10px; box-sizing: border-box; font-family: inherit; background: var(--bg-secondary); color: var(--text-primary); }
.input:focus { outline: none; border-color: #E08E6B; }
.textarea { resize: vertical; min-height: 60px; }
.error-message { background: #ffebee; color: #c62828; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 10px; }
.btn-primary { background: #E08E6B; color: #fff; padding: 10px 20px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; font-size: 14px; }
.btn-primary:hover { opacity: 0.9; }
.btn-cancel { background: var(--bg-hover); color: var(--text-secondary); border: none; border-radius: 8px; padding: 10px 16px; font-size: 13px; cursor: pointer; }
</style>