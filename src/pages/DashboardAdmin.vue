<template>
  <div class="dashboard-admin">
    <div class="page-header">
      <div>
        <h1>⚙️ Panel de Administración</h1>
        <p class="subtitle">Gestión de usuarios, hobbies, retos y sistema</p>
      </div>
      <div class="admin-badge">Admin</div>
    </div>

    <!-- No es admin -->
    <div v-if="!isAdmin && !loading" class="access-denied">
      <div class="denied-icon">🔒</div>
      <h2>Acceso restringido</h2>
      <p>Solo los administradores pueden acceder a este panel.</p>
    </div>

    <div v-else-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Verificando permisos...</p>
    </div>

    <template v-else>
      <!-- Métricas globales -->
      <div class="metrics-grid">
        <div class="metric-card" v-for="m in metrics" :key="m.label">
          <div class="metric-icon" :style="{ background: m.color }">{{ m.icon }}</div>
          <div class="metric-info">
            <span class="metric-value">{{ m.value }}</span>
            <span class="metric-label">{{ m.label }}</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button v-for="tab in tabs" :key="tab.id" class="tab-btn" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
          {{ tab.icon }} {{ tab.name }}
        </button>
      </div>

      <!-- Tab: Usuarios -->
      <div v-if="activeTab === 'users'" class="tab-content">
        <div class="section-header">
          <h3>👥 Usuarios registrados</h3>
          <input v-model="userSearch" class="search-input" placeholder="Buscar usuario..." />
        </div>
        <div class="data-table">
          <div class="table-head">
            <span>Usuario</span>
            <span>Email</span>
            <span>Puntos</span>
            <span>Retos</span>
            <span>Rol</span>
          </div>
          <div v-for="user in filteredUsers" :key="user.id" class="table-row">
            <div class="user-cell">
              <div class="user-avatar">
                <img v-if="user.avatar_url" :src="user.avatar_url" />
                <div v-else class="avatar-placeholder">{{ user.username?.[0]?.toUpperCase() }}</div>
              </div>
              <span>{{ user.username }}</span>
            </div>
            <span class="cell-muted">{{ user.email }}</span>
            <span class="cell-points">{{ user.total_points || 0 }} pts</span>
            <span class="cell-muted">{{ user.goals_completed || 0 }}</span>
            <div class="role-cell">
              <select class="role-select" :value="user.role || 'user'" @change="changeRole(user, $event.target.value)">
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div v-if="filteredUsers.length === 0" class="empty-table">No se encontraron usuarios</div>
        </div>
      </div>

      <!-- Tab: Hobbies -->
      <div v-if="activeTab === 'hobbies'" class="tab-content">
        <div class="section-header">
          <h3>🎯 Todos los hobbies</h3>
          <button class="btn-primary" @click="showHobbyForm = !showHobbyForm">
            <font-awesome-icon icon="plus" /> Nuevo hobby sugerido
          </button>
        </div>
        <div v-if="showHobbyForm" class="admin-form">
          <input v-model="newHobby.name" class="input" placeholder="Nombre del hobby" />
          <input v-model="newHobby.description" class="input" placeholder="Descripción" />
          <div class="form-row">
            <input v-model="newHobby.icon" class="input" placeholder="Icono (FA)" />
            <input v-model="newHobby.color" type="color" class="color-picker" />
            <button class="btn-primary" @click="createSuggestedHobby">Crear</button>
          </div>
        </div>
        <div class="data-table">
          <div class="table-head">
            <span>Hobby</span>
            <span>Usuario</span>
            <span>Sesiones</span>
            <span>Minutos</span>
            <span>Creado</span>
          </div>
          <div v-for="h in allHobbies" :key="h.id" class="table-row">
            <div class="hobby-cell">
              <span class="hobby-dot" :style="{ background: h.color || '#E08E6B' }"></span>
              {{ h.name }}
            </div>
            <span class="cell-muted">{{ h.profiles?.username || '—' }}</span>
            <span class="cell-muted">{{ h.session_count || 0 }}</span>
            <span class="cell-muted">{{ h.total_minutes || 0 }} min</span>
            <span class="cell-muted">{{ formatDate(h.created_at) }}</span>
          </div>
          <div v-if="allHobbies.length === 0" class="empty-table">No hay hobbies</div>
        </div>
      </div>

      <!-- Tab: Retos -->
      <div v-if="activeTab === 'goals'" class="tab-content">
        <div class="section-header">
          <h3>🏆 Todos los retos</h3>
        </div>
        <div class="data-table">
          <div class="table-head">
            <span>Reto</span>
            <span>Usuario</span>
            <span>Progreso</span>
            <span>Estado</span>
            <span>Acción</span>
          </div>
          <div v-for="g in allGoals" :key="g.id" class="table-row">
            <span class="goal-title-cell">{{ g.title }}</span>
            <span class="cell-muted">{{ g.profiles?.username || '—' }}</span>
            <div class="progress-mini">
              <div class="progress-mini-bar">
                <div class="progress-mini-fill" :style="{ width: (g.current_day / g.total_days * 100) + '%' }"></div>
              </div>
              <span class="progress-mini-text">{{ g.current_day }}/{{ g.total_days }}</span>
            </div>
            <span class="status-badge" :class="g.completed ? 'done' : 'active'">
              {{ g.completed ? '✅ Completado' : '🔄 Activo' }}
            </span>
            <button class="btn-delete" @click="deleteGoal(g.id)">
              <font-awesome-icon icon="trash" />
            </button>
          </div>
          <div v-if="allGoals.length === 0" class="empty-table">No hay retos</div>
        </div>
      </div>

      <!-- Tab: Consejos Admin -->
      <div v-if="activeTab === 'tips'" class="tab-content">
        <div class="section-header">
          <h3>💡 Gestión de consejos diarios</h3>
          <button class="btn-primary" @click="showTipForm = !showTipForm">
            <font-awesome-icon icon="plus" /> Nuevo consejo
          </button>
        </div>
        <div v-if="showTipForm" class="admin-form">
          <textarea v-model="newTip.tip" class="input textarea" placeholder="Escribe el consejo aquí..."></textarea>
          <div class="form-row">
            <select v-model="newTip.category" class="input">
              <option value="motivation">Motivación</option>
              <option value="habits">Hábitos</option>
              <option value="hobbies">Hobbies</option>
              <option value="mindset">Mentalidad</option>
              <option value="social">Social</option>
            </select>
            <input v-model="newTip.author" class="input" placeholder="Autor (opcional)" />
            <button class="btn-primary" @click="saveTip">Guardar</button>
          </div>
          <div v-if="tipSaved" class="success-msg">✅ Consejo guardado</div>
        </div>
        <div class="tips-admin-list">
          <div v-for="(tip, i) in adminTips" :key="i" class="tip-admin-item">
            <span class="tip-cat-dot" :class="tip.category"></span>
            <p class="tip-admin-text">{{ tip.tip }}</p>
            <span class="tip-admin-author">— {{ tip.author || 'HobitGo' }}</span>
          </div>
        </div>
      </div>

      <!-- Tab: Actividad -->
      <div v-if="activeTab === 'activity'" class="tab-content">
        <div class="section-header">
          <h3>📊 Actividad reciente del sistema</h3>
        </div>
        <div class="activity-log">
          <div v-for="a in systemActivity" :key="a.id" class="activity-log-item">
            <div class="activity-log-icon" :class="a.type">
              <font-awesome-icon :icon="getIcon(a.type)" />
            </div>
            <div class="activity-log-content">
              <span class="activity-log-user">{{ a.profiles?.username || 'Usuario' }}</span>
              <span class="activity-log-title">{{ a.title }}</span>
            </div>
            <div class="activity-log-right">
              <span class="activity-log-pts">+{{ a.points }} pts</span>
              <span class="activity-log-date">{{ formatDate(a.created_at) }}</span>
            </div>
          </div>
          <div v-if="systemActivity.length === 0" class="empty-table">Sin actividad</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const isAdmin = ref(false)
const loading = ref(true)
const activeTab = ref('users')
const userSearch = ref('')
const showHobbyForm = ref(false)
const showTipForm = ref(false)
const tipSaved = ref(false)

const allUsers = ref([])
const allHobbies = ref([])
const allGoals = ref([])
const systemActivity = ref([])
const adminTips = ref([])

const newHobby = ref({ name: '', description: '', icon: 'book', color: '#E08E6B' })
const newTip = ref({ tip: '', category: 'motivation', author: '' })

const metrics = ref([
  { icon: '👥', label: 'Usuarios totales', value: 0, color: '#e3f2fd' },
  { icon: '🎯', label: 'Hobbies creados', value: 0, color: '#fce4ec' },
  { icon: '🏆', label: 'Retos activos', value: 0, color: '#fff3e0' },
  { icon: '💬', label: 'Posts comunidad', value: 0, color: '#f3e5f5' },
])

const tabs = [
  { id: 'users', name: 'Usuarios', icon: '👥' },
  { id: 'hobbies', name: 'Hobbies', icon: '🎯' },
  { id: 'goals', name: 'Retos', icon: '🏆' },
  { id: 'tips', name: 'Consejos', icon: '💡' },
  { id: 'activity', name: 'Actividad', icon: '📊' },
]

const filteredUsers = computed(() => {
  if (!userSearch.value) return allUsers.value
  const q = userSearch.value.toLowerCase()
  return allUsers.value.filter(u => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
})

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })
}
function getIcon(type) {
  return { event: 'calendar', hobby: 'heart', challenge: 'trophy', message: 'comments' }[type] || 'star'
}

async function checkAdmin() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { loading.value = false; return }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  isAdmin.value = profile?.role === 'admin'
  loading.value = false
  if (isAdmin.value) await loadAllData()
}

async function loadAllData() {
  // Usuarios desde leaderboard view
  const { data: lb } = await supabase.from('leaderboard').select('*')
  const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url, role')
  if (lb && profiles) {
    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
    allUsers.value = lb.map(u => ({ ...u, ...profileMap[u.id], email: '***@***.com' }))
    metrics.value[0].value = lb.length
  }

  // Hobbies
  const { data: hobbies } = await supabase.from('hobbies').select('*, profiles(username)').order('created_at', { ascending: false })
  if (hobbies) { allHobbies.value = hobbies; metrics.value[1].value = hobbies.length }

  // Retos
  const { data: goals } = await supabase.from('goals').select('*, profiles(username)').order('created_at', { ascending: false })
  if (goals) { allGoals.value = goals; metrics.value[2].value = goals.filter(g => !g.completed).length }

  // Posts comunidad
  const { count: postsCount } = await supabase.from('community_posts').select('*', { count: 'exact', head: true })
  metrics.value[3].value = postsCount || 0

  // Actividad reciente
  const { data: activity } = await supabase.from('activity_log').select('*, profiles(username)').order('created_at', { ascending: false }).limit(30)
  if (activity) systemActivity.value = activity

  // Consejos admin (desde localStorage por ahora)
  const saved = localStorage.getItem('hobitgo_admin_tips')
  if (saved) adminTips.value = JSON.parse(saved)
}

async function changeRole(user, newRole) {
  await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
  user.role = newRole
}

async function deleteGoal(id) {
  if (!confirm('¿Eliminar este reto?')) return
  await supabase.from('goals').delete().eq('id', id)
  allGoals.value = allGoals.value.filter(g => g.id !== id)
}

async function createSuggestedHobby() {
  if (!newHobby.value.name.trim()) return
  // Crear como sugerencia del sistema (user_id del admin)
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('hobbies').insert({ user_id: user.id, ...newHobby.value })
  newHobby.value = { name: '', description: '', icon: 'book', color: '#E08E6B' }
  showHobbyForm.value = false
  await loadAllData()
}

function saveTip() {
  if (!newTip.value.tip.trim()) return
  adminTips.value.unshift({ ...newTip.value })
  localStorage.setItem('hobitgo_admin_tips', JSON.stringify(adminTips.value))
  newTip.value = { tip: '', category: 'motivation', author: '' }
  tipSaved.value = true
  setTimeout(() => { tipSaved.value = false; showTipForm.value = false }, 2000)
}

onMounted(checkAdmin)
</script>

<style scoped>
.dashboard-admin { max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; }
h1 { font-size: 26px; color: var(--text-primary); margin-bottom: 4px; }
.subtitle { color: var(--text-secondary); font-size: 14px; }
.admin-badge { background: #22284E; color: #E08E6B; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 1px; }

.access-denied { text-align: center; padding: 80px 20px; }
.denied-icon { font-size: 56px; margin-bottom: 16px; }
.access-denied h2 { font-size: 22px; color: var(--text-primary); margin-bottom: 8px; }
.access-denied p { color: #888; }
.loading-state { text-align: center; padding: 60px; color: #888; }
.spinner { width: 36px; height: 36px; border: 3px solid #eee; border-top-color: #E08E6B; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
@keyframes spin { to { transform: rotate(360deg); } }

.metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
.metric-card { background: var(--bg-card); border-radius: 14px; padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 2px 8px var(--shadow); }
.metric-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.metric-value { font-size: 26px; font-weight: 800; color: var(--text-primary); display: block; }
.metric-label { font-size: 12px; color: #888; }

.tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.tab-btn { border: 1px solid #e0e0e0; background: var(--bg-card); color: var(--text-secondary); border-radius: 10px; padding: 8px 14px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
.tab-btn:hover { border-color: #E08E6B; color: #E08E6B; }
.tab-btn.active { background: #22284E; color: #fff; border-color: #22284E; }

.tab-content { background: var(--bg-card); border-radius: 16px; padding: 24px; box-shadow: 0 2px 10px var(--shadow); }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.section-header h3 { font-size: 16px; color: var(--text-primary); margin: 0; }
.search-input { border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; font-size: 13px; font-family: inherit; background: var(--bg-secondary); color: var(--text-primary); }
.search-input:focus { outline: none; border-color: #E08E6B; }

.data-table { width: 100%; }
.table-head { display: grid; grid-template-columns: 2fr 2fr 1fr 1fr 1fr; gap: 12px; padding: 10px 12px; font-size: 12px; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
.table-row { display: grid; grid-template-columns: 2fr 2fr 1fr 1fr 1fr; gap: 12px; padding: 12px; border-radius: 10px; align-items: center; transition: background 0.15s; }
.table-row:hover { background: var(--bg-secondary); }
.user-cell { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-primary); font-weight: 600; }
.user-avatar { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { width: 100%; height: 100%; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
.cell-muted { font-size: 13px; color: #888; }
.cell-points { font-size: 13px; color: #4caf50; font-weight: 600; }
.role-select { border: 1px solid #ddd; border-radius: 6px; padding: 4px 8px; font-size: 12px; font-family: inherit; cursor: pointer; }
.empty-table { text-align: center; color: #ccc; padding: 24px; font-size: 14px; }

.hobby-cell { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-primary); }
.hobby-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.goal-title-cell { font-size: 14px; color: var(--text-primary); font-weight: 500; }
.progress-mini { display: flex; align-items: center; gap: 6px; }
.progress-mini-bar { width: 60px; height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden; }
.progress-mini-fill { height: 100%; background: #E08E6B; border-radius: 3px; }
.progress-mini-text { font-size: 11px; color: #999; }
.status-badge { font-size: 12px; padding: 3px 8px; border-radius: 20px; font-weight: 600; white-space: nowrap; }
.status-badge.done { background: #e8f5e9; color: #4caf50; }
.status-badge.active { background: #e3f2fd; color: #1565c0; }
.btn-delete { background: none; border: none; color: #ccc; cursor: pointer; font-size: 14px; padding: 4px 8px; transition: color 0.2s; }
.btn-delete:hover { color: #e53935; }

.admin-form { background: var(--bg-secondary); border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
.input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; box-sizing: border-box; background: var(--bg-card); color: var(--text-primary); }
.input:focus { outline: none; border-color: #E08E6B; }
.textarea { resize: vertical; min-height: 80px; }
.form-row { display: flex; gap: 10px; align-items: center; }
.color-picker { width: 42px; height: 40px; border: 1px solid #ddd; border-radius: 8px; padding: 2px; cursor: pointer; }
.btn-primary { background: #E08E6B; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap; transition: opacity 0.2s; }
.btn-primary:hover { opacity: 0.9; }
.success-msg { color: #4caf50; font-size: 13px; }

.tips-admin-list { display: flex; flex-direction: column; gap: 10px; }
.tip-admin-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px; background: var(--bg-secondary); border-radius: 10px; }
.tip-cat-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
.tip-cat-dot.motivation { background: #ff9800; }
.tip-cat-dot.habits { background: #2196f3; }
.tip-cat-dot.hobbies { background: #E08E6B; }
.tip-cat-dot.mindset { background: #9c27b0; }
.tip-cat-dot.social { background: #4caf50; }
.tip-admin-text { flex: 1; font-size: 13px; color: var(--text-primary); line-height: 1.5; margin: 0; }
.tip-admin-author { font-size: 11px; color: #999; white-space: nowrap; }

.activity-log { display: flex; flex-direction: column; gap: 10px; }
.activity-log-item { display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-secondary); border-radius: 10px; }
.activity-log-icon { width: 36px; height: 36px; border-radius: 10px; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.activity-log-icon.event { background: #2196f3; }
.activity-log-icon.hobby { background: #e91e63; }
.activity-log-icon.challenge { background: #ff9800; }
.activity-log-icon.message { background: #9c27b0; }
.activity-log-content { flex: 1; display: flex; flex-direction: column; }
.activity-log-user { font-size: 12px; font-weight: 700; color: var(--text-primary); }
.activity-log-title { font-size: 12px; color: #888; }
.activity-log-right { display: flex; flex-direction: column; align-items: flex-end; }
.activity-log-pts { font-size: 13px; font-weight: 600; color: #4caf50; }
.activity-log-date { font-size: 11px; color: #999; }

@media (max-width: 768px) {
  .table-head, .table-row { grid-template-columns: 1fr 1fr; }
  .table-head span:nth-child(3), .table-head span:nth-child(4),
  .table-row > span:nth-child(3), .table-row > span:nth-child(4) { display: none; }
}
</style>
