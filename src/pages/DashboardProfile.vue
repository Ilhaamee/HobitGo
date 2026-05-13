<template>
  <div class="dashboard-profile">
    <h1>{{ t('profile_title') }}</h1>
    <p class="subtitle">{{ t('profile_subtitle') }}</p>

    <div class="profile-header">
      <div class="profile-avatar">
        <img :src="avatarUrl || defaultAvatar" alt="Avatar" />
        <label class="edit-avatar" title="Cambiar foto">
          <font-awesome-icon icon="camera" />
          <input type="file" accept="image/*,.gif" @change="uploadAvatar" hidden />
        </label>
        <button v-if="avatarUrl" class="delete-avatar" @click="deleteAvatar">
          <font-awesome-icon icon="trash" />
        </button>
      </div>
      <div class="profile-info">
        <h2>{{ profile.username || 'Usuario' }}</h2>
        <p>{{ currentUser?.email }}</p>
        <div class="profile-stats">
          <div class="profile-stat"><span class="stat-val">{{ stats.hobbies }}</span><span class="stat-lbl">{{ t('hobbies') }}</span></div>
          <div class="profile-stat"><span class="stat-val">{{ stats.events }}</span><span class="stat-lbl">{{ t('events_this_month') }}</span></div>
          <div class="profile-stat"><span class="stat-val">{{ stats.goalsCompleted }}</span><span class="stat-lbl">{{ t('completed_challenges') }}</span></div>
          <div class="profile-stat"><span class="stat-val">{{ stats.points }}</span><span class="stat-lbl">{{ t('total_points') }}</span></div>
        </div>
      </div>
    </div>

    <div class="profile-sections">
      <!-- Info personal -->
      <div class="profile-section">
        <h3>{{ t('personal_info') }}</h3>
        <div class="form-group">
          <label>{{ t('username_label') }}</label>
          <input v-model="editUsername" type="text" class="input" :placeholder="t('username_label')" />
        </div>
        <div class="form-group">
          <label>{{ t('email_label') }}</label>
          <input :value="currentUser?.email" type="email" class="input" disabled />
        </div>
        <div class="form-group">
          <label>{{ t('bio_label') }}</label>
          <textarea v-model="editBio" class="input textarea" :placeholder="t('bio_placeholder')"></textarea>
        </div>
        <div v-if="profileSuccess" class="success-message">{{ t('profile_updated') }}</div>
        <div v-if="profileError" class="error-message">{{ profileError }}</div>
        <button class="btn-primary" @click="saveProfile" :disabled="savingProfile">
          {{ savingProfile ? t('saving') : t('save_changes') }}
        </button>
      </div>

      <!-- Preferencias -->
      <div class="profile-section">
        <h3>{{ t('preferences') }}</h3>

        <!-- Modo oscuro -->
        <div class="preference-item">
          <div>
            <h4>{{ isDark ? t('dark_mode') : t('light_mode') }}</h4>
            <p>{{ t('theme_desc') }}</p>
          </div>
          <label class="toggle">
            <input type="checkbox" :checked="isDark" @change="toggleTheme" />
            <span class="slider"></span>
          </label>
        </div>

        <!-- Idioma -->
        <div class="preference-item">
          <div>
            <h4>{{ t('language_label') }}</h4>
            <p>{{ t('language_desc') }}</p>
          </div>
          <div class="lang-selector">
            <button :class="{ active: currentLang === 'es' }" @click="changeLanguage('es')">🇪🇸 ES</button>
            <button :class="{ active: currentLang === 'en' }" @click="changeLanguage('en')">🇬🇧 EN</button>
          </div>
        </div>
      </div>

      <!-- Cambiar contraseña -->
      <div class="profile-section">
        <h3>{{ t('change_password') }}</h3>
        <div v-if="!showPasswordForm">
          <button class="btn-primary" @click="showPasswordForm = true">{{ t('change_password') }}</button>
        </div>
        <div v-else>
          <div class="form-group">
            <label>{{ t('new_password') }}</label>
            <div class="password-field">
              <input v-model="newPassword" :type="showPassword ? 'text' : 'password'" class="input" :placeholder="t('new_password')" />
              <button class="toggle-password" @click="showPassword = !showPassword">
                <font-awesome-icon :icon="showPassword ? 'eye-slash' : 'eye'" />
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>{{ t('confirm_password') }}</label>
            <div class="password-field">
              <input v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" class="input" :placeholder="t('confirm_password')" />
            </div>
          </div>
          <div v-if="passwordSuccess" class="success-message">{{ t('password_updated') }}</div>
          <div v-if="passwordError" class="error-message">{{ passwordError }}</div>
          <div style="display:flex;gap:10px">
            <button class="btn-primary" @click="changePassword" :disabled="savingPassword">
              {{ savingPassword ? t('saving') : t('save') }}
            </button>
            <button class="btn-cancel" @click="showPasswordForm = false">{{ t('cancel') }}</button>
          </div>
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="profile-section">
        <h3>{{ t('my_stats') }}</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon" style="background:#fff3e0;color:#ff9800"><font-awesome-icon icon="trophy" /></div>
            <div class="stat-info"><span class="stat-value">{{ stats.goalsCompleted }}</span><span class="stat-label">{{ t('completed_challenges') }}</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fce4ec;color:#e91e63"><font-awesome-icon icon="heart" /></div>
            <div class="stat-info"><span class="stat-value">{{ stats.hobbies }}</span><span class="stat-label">{{ t('hobbies') }}</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#e3f2fd;color:#2196f3"><font-awesome-icon icon="calendar" /></div>
            <div class="stat-info"><span class="stat-value">{{ stats.events }}</span><span class="stat-label">{{ t('events_created') }}</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#e8f5e9;color:#4caf50"><font-awesome-icon icon="star" /></div>
            <div class="stat-info"><span class="stat-value">{{ stats.points }}</span><span class="stat-label">{{ t('total_points') }}</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#f3e5f5;color:#9c27b0"><font-awesome-icon icon="comments" /></div>
            <div class="stat-info"><span class="stat-value">{{ stats.messages }}</span><span class="stat-label">{{ t('messages_sent') }}</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fff8e1;color:#ffc107"><font-awesome-icon icon="fire" /></div>
            <div class="stat-info"><span class="stat-value">{{ stats.hobbySessions }}</span><span class="stat-label">{{ t('hobby_sessions') }}</span></div>
          </div>
        </div>
      </div>

      <!-- Cuenta -->
      <div class="profile-section danger-section">
        <h3>{{ t('account') }}</h3>
        <div class="danger-item">
          <div>
            <h4>{{ t('logout_title') }}</h4>
            <p>{{ t('logout_desc') }}</p>
          </div>
          <button class="btn-danger" @click="logout">{{ t('logout') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useTheme } from '../composables/useTheme'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const { t, currentLang, setLanguage } = useI18n()

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

async function changeLanguage(lang) {
  await setLanguage(lang)
}

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
  if (!editUsername.value.trim()) { profileError.value = t('username_required'); return }
  savingProfile.value = true; profileError.value = ''; profileSuccess.value = false
  const { error } = await supabase.from('profiles').update({ username: editUsername.value.trim(), bio: editBio.value.trim() }).eq('id', currentUser.value.id)
  if (error) { profileError.value = error.message.includes('unique') ? t('username_taken') : t('error_saving') }
  else { profile.value.username = editUsername.value.trim(); profile.value.bio = editBio.value.trim(); profileSuccess.value = true; setTimeout(() => profileSuccess.value = false, 3000) }
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
  if (!newPassword.value) { passwordError.value = t('password_min'); return }
  if (newPassword.value.length < 6) { passwordError.value = t('password_min'); return }
  if (newPassword.value !== confirmPassword.value) { passwordError.value = t('passwords_no_match'); return }
  savingPassword.value = true; passwordError.value = ''; passwordSuccess.value = false
  const { error } = await supabase.auth.updateUser({ password: newPassword.value })
  if (error) { passwordError.value = 'Error al cambiar la contraseña' }
  else { passwordSuccess.value = true; newPassword.value = ''; confirmPassword.value = ''; showPasswordForm.value = false; setTimeout(() => passwordSuccess.value = false, 3000) }
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
h1 { font-size: 28px; color: var(--text-primary); margin-bottom: 8px; }
.subtitle { color: var(--text-secondary); margin-bottom: 32px; }

.profile-header { display: flex; align-items: center; gap: 24px; background: var(--bg-card); padding: 32px; border-radius: 20px; margin-bottom: 24px; box-shadow: 0 2px 10px var(--shadow); }
.profile-avatar { position: relative; width: 100px; height: 100px; flex-shrink: 0; }
.profile-avatar img { width: 100%; height: 100%; border-radius: 20px; object-fit: cover; }
.edit-avatar { position: absolute; bottom: -8px; right: -8px; width: 36px; height: 36px; border-radius: 50%; background: #E08E6B; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; }
.delete-avatar { position: absolute; bottom: -8px; left: -8px; width: 36px; height: 36px; border-radius: 50%; background: #e53935; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; }

.profile-info h2 { font-size: 22px; color: var(--text-primary); margin: 0 0 4px; }
.profile-info > p { color: var(--text-muted); margin: 0 0 16px; font-size: 14px; }
.profile-stats { display: flex; gap: 20px; flex-wrap: wrap; }
.profile-stat { display: flex; flex-direction: column; }
.stat-val { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.stat-lbl { font-size: 11px; color: var(--text-muted); }

.profile-sections { display: flex; flex-direction: column; gap: 24px; }
.profile-section { background: var(--bg-card); padding: 24px; border-radius: 16px; box-shadow: 0 2px 10px var(--shadow); }
.profile-section h3 { font-size: 17px; color: var(--text-primary); margin: 0 0 20px; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }

.password-field { position: relative; }
.toggle-password { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }

.preference-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-color); }
.preference-item:last-child { border-bottom: none; }
.preference-item h4 { font-size: 14px; color: var(--text-primary); margin: 0 0 4px; }
.preference-item p { font-size: 13px; color: var(--text-muted); margin: 0; }

.toggle { position: relative; display: inline-block; width: 50px; height: 28px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #ccc; transition: 0.3s; border-radius: 28px; }
.slider:before { position: absolute; content: ""; height: 22px; width: 22px; left: 3px; bottom: 3px; background: white; transition: 0.3s; border-radius: 50%; }
.toggle input:checked + .slider { background: #E08E6B; }
.toggle input:checked + .slider:before { transform: translateX(22px); }

.lang-selector { display: flex; gap: 8px; }
.lang-selector button { padding: 8px 14px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); color: var(--text-secondary); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.lang-selector button.active { border-color: #E08E6B; color: #E08E6B; background: rgba(224,142,107,0.1); }
.lang-selector button:hover { border-color: #E08E6B; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.stat-card { display: flex; align-items: center; gap: 14px; padding: 16px; background: var(--bg-hover); border-radius: 12px; }
.stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: 12px; color: var(--text-secondary); }

.danger-section { border: 1px solid #ffebee; }
.danger-section h3 { color: #c62828; }
.danger-item { display: flex; align-items: center; justify-content: space-between; }
.danger-item h4 { font-size: 14px; color: var(--text-primary); margin: 0 0 4px; }
.danger-item p { font-size: 13px; color: var(--text-muted); margin: 0; }
.btn-danger { background: #ffebee; color: #c62828; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-danger:hover { background: #ffcdd2; }

.input { width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); border-radius: 8px; font-size: 14px; margin-bottom: 0; box-sizing: border-box; font-family: inherit; background: var(--bg-secondary); color: var(--text-primary); }
.input:focus { outline: none; border-color: #E08E6B; }
.input:disabled { opacity: 0.6; cursor: not-allowed; }
.textarea { resize: vertical; min-height: 80px; }
.success-message { background: #e8f5e9; color: #2e7d32; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
.error-message { background: #ffebee; color: #c62828; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
.btn-primary { background: #E08E6B; color: #fff; padding: 10px 24px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel { background: var(--bg-hover); color: var(--text-secondary); border: none; border-radius: 8px; padding: 10px 16px; font-size: 13px; cursor: pointer; }

@media (max-width: 600px) {
  .profile-header { flex-direction: column; text-align: center; }
  .profile-stats { justify-content: center; }
}
</style>