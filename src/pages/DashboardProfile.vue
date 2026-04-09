<template>
  <div class="dashboard-profile">
    <h1>Mi Perfil</h1>
    <p class="subtitle">Gestiona tu información personal</p>

    <div class="profile-header">
      <div class="profile-avatar">
        <img :src="avatarUrl || defaultAvatar" alt="Avatar" />
        <label class="edit-avatar" title="Cambiar foto">
          <font-awesome-icon icon="camera" />
          <input type="file" accept="image/*,.gif" @change="uploadAvatar" hidden />
        </label>
        <button v-if="avatarUrl" class="delete-avatar" @click="deleteAvatar" title="Eliminar foto">
          <font-awesome-icon icon="trash" />
        </button>
      </div>
      <div class="profile-info">
        <h2>{{ profile.username || 'Usuario' }}</h2>
        <p>{{ currentUser?.email }}</p>
        <div class="profile-stats">
          <div class="profile-stat">
            <span class="stat-val">{{ stats.hobbies }}</span>
            <span class="stat-lbl">Hobbies</span>
          </div>
          <div class="profile-stat">
            <span class="stat-val">{{ stats.events }}</span>
            <span class="stat-lbl">Eventos</span>
          </div>
          <div class="profile-stat">
            <span class="stat-val">{{ stats.goalsCompleted }}</span>
            <span class="stat-lbl">Retos completados</span>
          </div>
          <div class="profile-stat">
            <span class="stat-val">{{ stats.points }}</span>
            <span class="stat-lbl">Puntos</span>
          </div>
        </div>
      </div>
    </div>

    <div class="profile-sections">
      <!-- Información personal -->
      <div class="profile-section">
        <h3>Información personal</h3>
        <div class="form-group">
          <label>Nombre de usuario</label>
          <input v-model="editUsername" type="text" class="input" placeholder="Tu nombre de usuario" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input :value="currentUser?.email" type="email" class="input" disabled />
        </div>
        <div class="form-group">
          <label>Biografía</label>
          <textarea v-model="editBio" class="input textarea" placeholder="Cuéntanos sobre ti..."></textarea>
        </div>
        <div v-if="profileSuccess" class="success-message">✅ Perfil actualizado correctamente</div>
        <div v-if="profileError" class="error-message">{{ profileError }}</div>
        <button class="btn-primary" @click="saveProfile" :disabled="savingProfile">
          {{ savingProfile ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </div>

      <!-- Cambiar contraseña -->
      <div class="profile-section">
        <h3>Cambiar contraseña</h3>
        <div v-if="!showPasswordForm">
          <button class="btn-primary" @click="showPasswordForm = true">Cambiar contraseña</button>
        </div>
        <div v-else>
          <div class="form-group">
            <label>Nueva contraseña</label>
            <div class="password-field">
              <input v-model="newPassword" :type="showPassword ? 'text' : 'password'" class="input" placeholder="Nueva contraseña" />
              <button class="toggle-password" @click="showPassword = !showPassword">
                <font-awesome-icon :icon="showPassword ? 'eye-slash' : 'eye'" />
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Confirmar contraseña</label>
            <div class="password-field">
              <input v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" class="input" placeholder="Confirmar contraseña" />
            </div>
          </div>
          <div v-if="passwordSuccess" class="success-message">✅ Contraseña actualizada correctamente</div>
          <div v-if="passwordError" class="error-message">{{ passwordError }}</div>
          <div style="display:flex;gap:10px">
            <button class="btn-primary" @click="changePassword" :disabled="savingPassword">
              {{ savingPassword ? 'Guardando...' : 'Guardar' }}
            </button>
            <button class="btn-cancel" @click="showPasswordForm = false">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="profile-section">
        <h3>📊 Mis estadísticas</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon" style="background:#fff3e0;color:#ff9800"><font-awesome-icon icon="trophy" /></div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.goalsCompleted }}</span>
              <span class="stat-label">Retos completados</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fce4ec;color:#e91e63"><font-awesome-icon icon="heart" /></div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.hobbies }}</span>
              <span class="stat-label">Hobbies</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#e3f2fd;color:#2196f3"><font-awesome-icon icon="calendar" /></div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.events }}</span>
              <span class="stat-label">Eventos creados</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#e8f5e9;color:#4caf50"><font-awesome-icon icon="star" /></div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.points }}</span>
              <span class="stat-label">Puntos totales</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#f3e5f5;color:#9c27b0"><font-awesome-icon icon="comments" /></div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.messages }}</span>
              <span class="stat-label">Mensajes enviados</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fff8e1;color:#ffc107"><font-awesome-icon icon="fire" /></div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.hobbySessions }}</span>
              <span class="stat-label">Sesiones de hobby</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Cerrar sesión -->
      <div class="profile-section danger-section">
        <h3>Cuenta</h3>
        <div class="danger-item">
          <div>
            <h4>Cerrar sesión</h4>
            <p>Salir de tu cuenta en este dispositivo</p>
          </div>
          <button class="btn-danger" @click="logout">Cerrar sesión</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const currentUser = ref(null)
const profile = ref({})
const editUsername = ref('')
const editBio = ref('')
const avatarUrl = ref('')
const defaultAvatar = 'https://ui-avatars.com/api/?background=E08E6B&color=fff&size=100&name=U'
const savingProfile = ref(false)
const profileError = ref('')
const profileSuccess = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showPasswordForm = ref(false)
const savingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref(false)
const stats = ref({ hobbies: 0, events: 0, goalsCompleted: 0, points: 0, messages: 0, hobbySessions: 0 })

async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  currentUser.value = user

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (data) {
    profile.value = data
    editUsername.value = data.username || ''
    editBio.value = data.bio || ''
    avatarUrl.value = data.avatar_url || ''
  }

  await loadStats(user.id)
}

async function loadStats(userId) {
  const [hobbiesRes, eventsRes, goalsRes, activityRes, messagesRes, sessionsRes] = await Promise.all([
    supabase.from('hobbies').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('goals').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', true),
    supabase.from('activity_log').select('points').eq('user_id', userId),
    supabase.from('community_messages').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('hobby_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  stats.value = {
    hobbies: hobbiesRes.count || 0,
    events: eventsRes.count || 0,
    goalsCompleted: goalsRes.count || 0,
    points: activityRes.data ? activityRes.data.reduce((sum, a) => sum + (a.points || 0), 0) : 0,
    messages: messagesRes.count || 0,
    hobbySessions: sessionsRes.count || 0,
  }
}

async function saveProfile() {
  if (!editUsername.value.trim()) { profileError.value = 'El nombre de usuario es obligatorio'; return }
  savingProfile.value = true
  profileError.value = ''
  profileSuccess.value = false

  const { error } = await supabase.from('profiles').update({
    username: editUsername.value.trim(),
    bio: editBio.value.trim()
  }).eq('id', currentUser.value.id)

  if (error) {
    profileError.value = error.message.includes('unique') ? 'Ese nombre ya está en uso' : 'Error al guardar'
  } else {
    profile.value.username = editUsername.value.trim()
    profile.value.bio = editBio.value.trim()
    profileSuccess.value = true
    setTimeout(() => profileSuccess.value = false, 3000)
  }
  savingProfile.value = false
}

async function uploadAvatar(e) {
  const file = e.target.files[0]
  if (!file) return
  const ext = file.name.split('.').pop()
  const path = `${currentUser.value.id}.${ext}`
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (uploadError) { profileError.value = 'Error al subir la imagen'; return }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  avatarUrl.value = data.publicUrl + '?t=' + Date.now()
  await supabase.from('profiles').update({ avatar_url: avatarUrl.value }).eq('id', currentUser.value.id)
}

async function deleteAvatar() {
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', currentUser.value.id)
  if (!error) avatarUrl.value = ''
}

async function changePassword() {
  if (!newPassword.value) { passwordError.value = 'Introduce una nueva contraseña'; return }
  if (newPassword.value.length < 6) { passwordError.value = 'La contraseña debe tener al menos 6 caracteres'; return }
  if (newPassword.value !== confirmPassword.value) { passwordError.value = 'Las contraseñas no coinciden'; return }
  savingPassword.value = true
  passwordError.value = ''
  passwordSuccess.value = false
  const { error } = await supabase.auth.updateUser({ password: newPassword.value })
  if (error) { passwordError.value = 'Error al cambiar la contraseña' }
  else {
    passwordSuccess.value = true
    newPassword.value = ''
    confirmPassword.value = ''
    showPasswordForm.value = false
    setTimeout(() => passwordSuccess.value = false, 3000)
  }
  savingPassword.value = false
}

async function logout() {
  await supabase.auth.signOut()
  router.push('/')
}

onMounted(loadProfile)
</script>

<style scoped>
.dashboard-profile { max-width: 800px; margin: 0 auto; }
h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 8px; }
.subtitle { color: #666; margin-bottom: 32px; }

.profile-header { display: flex; align-items: center; gap: 24px; background: #fff; padding: 32px; border-radius: 20px; margin-bottom: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }

.profile-avatar { position: relative; width: 100px; height: 100px; flex-shrink: 0; }
.profile-avatar img { width: 100%; height: 100%; border-radius: 20px; object-fit: cover; }
.edit-avatar { position: absolute; bottom: -8px; right: -8px; width: 36px; height: 36px; border-radius: 50%; background: #E08E6B; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: opacity 0.2s; }
.edit-avatar:hover { opacity: 0.85; }
.delete-avatar { position: absolute; bottom: -8px; left: -8px; width: 36px; height: 36px; border-radius: 50%; background: #e53935; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: opacity 0.2s; }
.delete-avatar:hover { opacity: 0.85; }

.profile-info h2 { font-size: 22px; color: #1a1a2e; margin: 0 0 4px; }
.profile-info > p { color: #888; margin: 0 0 16px; font-size: 14px; }
.profile-stats { display: flex; gap: 20px; flex-wrap: wrap; }
.profile-stat { display: flex; flex-direction: column; }
.stat-val { font-size: 20px; font-weight: 700; color: #1a1a2e; }
.stat-lbl { font-size: 11px; color: #888; }

.profile-sections { display: flex; flex-direction: column; gap: 24px; }
.profile-section { background: #fff; padding: 24px; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.profile-section h3 { font-size: 17px; color: #1a1a2e; margin: 0 0 20px; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; color: #666; margin-bottom: 6px; font-weight: 500; }

.password-field { position: relative; }
.toggle-password { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #888; cursor: pointer; padding: 4px; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.stat-card { display: flex; align-items: center; gap: 14px; padding: 16px; background: #f9f9f9; border-radius: 12px; }
.stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 20px; font-weight: 700; color: #1a1a2e; }
.stat-label { font-size: 12px; color: #666; }

.danger-section { border: 1px solid #ffebee; }
.danger-section h3 { color: #c62828; }
.danger-item { display: flex; align-items: center; justify-content: space-between; }
.danger-item h4 { font-size: 14px; color: #1a1a2e; margin: 0 0 4px; }
.danger-item p { font-size: 13px; color: #888; margin: 0; }
.btn-danger { background: #ffebee; color: #c62828; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-danger:hover { background: #ffcdd2; }

.input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; margin-bottom: 0; box-sizing: border-box; font-family: inherit; }
.input:focus { outline: none; border-color: #E08E6B; }
.input:disabled { background: #f9f9f9; color: #aaa; cursor: not-allowed; }
.textarea { resize: vertical; min-height: 80px; }
.success-message { background: #e8f5e9; color: #2e7d32; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
.error-message { background: #ffebee; color: #c62828; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
.btn-primary { background: #E08E6B; color: #fff; padding: 10px 24px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel { background: #f5f5f5; color: #555; border: none; border-radius: 8px; padding: 10px 16px; font-size: 13px; cursor: pointer; }
.btn-cancel:hover { background: #eee; }

@media (max-width: 600px) {
  .profile-header { flex-direction: column; text-align: center; }
  .profile-stats { justify-content: center; }
}
</style>