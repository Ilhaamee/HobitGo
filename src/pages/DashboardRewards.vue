<template>
  <div class="dashboard-rewards">
    <div class="page-header">
      <div>
        <h1>🏅 Recompensas</h1>
        <p class="subtitle">Tu progreso, nivel y logros desbloqueados</p>
      </div>
    </div>

    <!-- Tarjeta de nivel actual -->
    <div class="level-card">
      <div class="level-badge-wrap">
        <div class="level-badge" :style="{ background: currentLevel.gradient }">
          <span class="level-emoji">{{ currentLevel.emoji }}</span>
          <span class="level-num">{{ userLevel }}</span>
        </div>
      </div>
      <div class="level-info">
        <div class="level-name-row">
          <h2>{{ currentLevel.name }}</h2>
          <span class="points-pill">{{ totalPoints }} pts</span>
        </div>
        <p class="level-sub">
          {{ nextLevel ? `Faltan ${nextLevel.minPoints - totalPoints} puntos para nivel ${nextLevel.name}` : '¡Nivel máximo alcanzado! 🌟' }}
        </p>
        <div class="xp-bar-container">
          <div class="xp-bar" :style="{ width: xpProgress + '%' }"></div>
        </div>
        <div class="xp-labels">
          <span>{{ currentLevel.minPoints }} pts</span>
          <span v-if="nextLevel">{{ nextLevel.minPoints }} pts</span>
          <span v-else>MAX</span>
        </div>
      </div>
    </div>

    <!-- Cómo ganar puntos -->
    <div class="section-card how-to-earn">
      <h3>⚡ Cómo ganar puntos</h3>
      <div class="earn-grid">
        <div class="earn-item" v-for="item in earnMethods" :key="item.action">
          <span class="earn-icon">{{ item.icon }}</span>
          <div class="earn-info">
            <span class="earn-action">{{ item.action }}</span>
            <span class="earn-pts">+{{ item.points }} pts</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Logros -->
    <div class="section-card">
      <h3>🎖️ Logros</h3>
      <div class="achievements-grid">
        <div
          v-for="badge in achievements"
          :key="badge.id"
          class="achievement-card"
          :class="{ unlocked: badge.unlocked, locked: !badge.unlocked }"
        >
          <div class="achievement-icon">{{ badge.icon }}</div>
          <div class="achievement-name">{{ badge.name }}</div>
          <div class="achievement-desc">{{ badge.description }}</div>
          <div v-if="badge.unlocked" class="achievement-badge">✅ Desbloqueado</div>
          <div v-else class="achievement-lock">🔒 {{ badge.requirement }}</div>
        </div>
      </div>
    </div>

    <!-- Historial de puntos recientes -->
    <div class="section-card">
      <h3>📊 Puntos recientes</h3>
      <div v-if="recentPoints.length > 0" class="points-history">
        <div v-for="entry in recentPoints" :key="entry.id" class="points-entry">
          <div class="points-entry-icon" :class="entry.type">
            <font-awesome-icon :icon="getIcon(entry.type)" />
          </div>
          <div class="points-entry-info">
            <span class="points-entry-title">{{ entry.title }}</span>
            <span class="points-entry-date">{{ formatDate(entry.created_at) }}</span>
          </div>
          <span class="points-entry-value">+{{ entry.points }}</span>
        </div>
      </div>
      <p v-else class="empty-text">No hay historial de puntos aún</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const totalPoints = ref(0)
const recentPoints = ref([])
const userStats = ref({ hobbies: 0, goalsCompleted: 0, streak: 0, posts: 0 })

const levels = [
  { level: 1, name: 'Principiante', emoji: '🌱', minPoints: 0, gradient: 'linear-gradient(135deg, #66bb6a, #43a047)' },
  { level: 2, name: 'Aprendiz', emoji: '📚', minPoints: 100, gradient: 'linear-gradient(135deg, #42a5f5, #1e88e5)' },
  { level: 3, name: 'Explorador', emoji: '🧭', minPoints: 300, gradient: 'linear-gradient(135deg, #ab47bc, #8e24aa)' },
  { level: 4, name: 'Aventurero', emoji: '⚔️', minPoints: 600, gradient: 'linear-gradient(135deg, #ff7043, #f4511e)' },
  { level: 5, name: 'Experto', emoji: '🎯', minPoints: 1000, gradient: 'linear-gradient(135deg, #ffa726, #fb8c00)' },
  { level: 6, name: 'Maestro', emoji: '🏆', minPoints: 1800, gradient: 'linear-gradient(135deg, #ef5350, #e53935)' },
  { level: 7, name: 'Leyenda', emoji: '👑', minPoints: 3000, gradient: 'linear-gradient(135deg, #E08E6B, #c06040)' },
]

const earnMethods = [
  { icon: '✅', action: 'Completar un día de reto', points: 10 },
  { icon: '🏆', action: 'Completar un reto completo', points: 500 },
  { icon: '💬', action: 'Publicar en la comunidad', points: 5 },
  { icon: '🎯', action: 'Registrar sesión de hobby', points: 15 },
  { icon: '📅', action: 'Crear evento en el calendario', points: 5 },
]

const userLevel = computed(() => {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalPoints.value >= levels[i].minPoints) return levels[i].level
  }
  return 1
})
const currentLevel = computed(() => levels.find(l => l.level === userLevel.value) || levels[0])
const nextLevel = computed(() => levels.find(l => l.level === userLevel.value + 1) || null)
const xpProgress = computed(() => {
  if (!nextLevel.value) return 100
  const range = nextLevel.value.minPoints - currentLevel.value.minPoints
  const progress = totalPoints.value - currentLevel.value.minPoints
  return Math.min(100, Math.round((progress / range) * 100))
})

const achievements = computed(() => [
  {
    id: 'first_hobby', icon: '🎯', name: 'Primer Hobby',
    description: 'Crea tu primer hobby',
    requirement: 'Crea 1 hobby',
    unlocked: userStats.value.hobbies >= 1
  },
  {
    id: 'five_hobbies', icon: '🌟', name: 'Coleccionista',
    description: 'Tienes 5 o más hobbies',
    requirement: 'Necesitas 5 hobbies',
    unlocked: userStats.value.hobbies >= 5
  },
  {
    id: 'first_goal', icon: '🏅', name: 'Primer Reto',
    description: 'Completa tu primer reto de 30 días',
    requirement: 'Completa 1 reto',
    unlocked: userStats.value.goalsCompleted >= 1
  },
  {
    id: 'three_goals', icon: '🔥', name: 'Perseverante',
    description: 'Completas 3 retos',
    requirement: 'Completa 3 retos',
    unlocked: userStats.value.goalsCompleted >= 3
  },
  {
    id: 'streak_7', icon: '🗓️', name: 'Racha Semanal',
    description: '7 días consecutivos activo',
    requirement: 'Necesitas racha de 7 días',
    unlocked: userStats.value.streak >= 7
  },
  {
    id: 'streak_30', icon: '💪', name: 'Racha Mensual',
    description: '30 días consecutivos activo',
    requirement: 'Necesitas racha de 30 días',
    unlocked: userStats.value.streak >= 30
  },
  {
    id: 'points_500', icon: '⭐', name: 'Medio Camino',
    description: 'Acumula 500 puntos',
    requirement: 'Necesitas 500 puntos',
    unlocked: totalPoints.value >= 500
  },
  {
    id: 'points_1000', icon: '💎', name: 'Mil Puntos',
    description: 'Supera los 1000 puntos',
    requirement: 'Necesitas 1000 puntos',
    unlocked: totalPoints.value >= 1000
  },
  {
    id: 'community', icon: '🌍', name: 'Sociable',
    description: 'Publica por primera vez en la comunidad',
    requirement: 'Publica 1 post',
    unlocked: userStats.value.posts >= 1
  },
  {
    id: 'legend', icon: '👑', name: 'Leyenda',
    description: 'Alcanza el nivel máximo',
    requirement: 'Necesitas 3000 puntos',
    unlocked: totalPoints.value >= 3000
  },
])

function getIcon(type) {
  return { event: 'calendar', hobby: 'heart', challenge: 'trophy', message: 'comments' }[type] || 'star'
}
function formatDate(ts) {
  return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

async function loadData() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: activity } = await supabase.from('activity_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
  if (activity) {
    totalPoints.value = activity.reduce((s, a) => s + (a.points || 0), 0)
    recentPoints.value = activity.filter(a => a.points > 0).slice(0, 15)
  }

  const { count: hobbies } = await supabase.from('hobbies').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  userStats.value.hobbies = hobbies || 0

  const { count: goals } = await supabase.from('goals').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true)
  userStats.value.goalsCompleted = goals || 0

  const { count: posts } = await supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  userStats.value.posts = posts || 0

  // Calcular racha
  if (activity) {
    const dateSet = new Set(activity.map(a => a.activity_date))
    let streak = 0
    const today = new Date()
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    let cur = new Date()
    if (!dateSet.has(fmt(cur))) cur.setDate(cur.getDate() - 1)
    while (dateSet.has(fmt(cur))) { streak++; cur.setDate(cur.getDate() - 1) }
    userStats.value.streak = streak
  }
}

onMounted(loadData)
</script>

<style scoped>
.dashboard-rewards { max-width: 800px; margin: 0 auto; }
.page-header { margin-bottom: 28px; }
h1 { font-size: 26px; color: var(--text-primary); margin-bottom: 4px; }
.subtitle { color: var(--text-secondary); font-size: 14px; }

.level-card { background: var(--bg-card); border-radius: 20px; padding: 28px; margin-bottom: 24px; box-shadow: 0 4px 20px var(--shadow); display: flex; gap: 24px; align-items: center; }
.level-badge-wrap { flex-shrink: 0; }
.level-badge { width: 90px; height: 90px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
.level-emoji { font-size: 28px; line-height: 1; }
.level-num { font-size: 14px; font-weight: 800; color: #fff; margin-top: 2px; }
.level-info { flex: 1; }
.level-name-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.level-name-row h2 { font-size: 22px; color: var(--text-primary); margin: 0; }
.points-pill { background: #E08E6B; color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; }
.level-sub { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
.xp-bar-container { height: 10px; background: #e0e0e0; border-radius: 5px; overflow: hidden; margin-bottom: 6px; }
.xp-bar { height: 100%; background: linear-gradient(90deg, #E08E6B, #c06040); border-radius: 5px; transition: width 0.6s ease; }
.xp-labels { display: flex; justify-content: space-between; font-size: 11px; color: #999; }

.section-card { background: var(--bg-card); border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 10px var(--shadow); }
.section-card h3 { font-size: 16px; color: var(--text-primary); margin-bottom: 20px; }

.how-to-earn {}
.earn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.earn-item { display: flex; align-items: center; gap: 12px; background: var(--bg-secondary); border-radius: 10px; padding: 12px 14px; }
.earn-icon { font-size: 22px; }
.earn-info { display: flex; flex-direction: column; }
.earn-action { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.earn-pts { font-size: 13px; color: #4caf50; font-weight: 700; }

.achievements-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
.achievement-card { border-radius: 14px; padding: 16px; text-align: center; border: 2px solid transparent; transition: all 0.2s; }
.achievement-card.unlocked { background: linear-gradient(135deg, #fff8f0, #fef3e8); border-color: #E08E6B; }
.achievement-card.locked { background: var(--bg-secondary); opacity: 0.6; }
.achievement-icon { font-size: 32px; margin-bottom: 8px; }
.achievement-name { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block; }
.achievement-desc { font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 8px; }
.achievement-badge { font-size: 11px; color: #4caf50; font-weight: 600; background: #e8f5e9; padding: 3px 8px; border-radius: 10px; display: inline-block; }
.achievement-lock { font-size: 11px; color: #999; }

.points-history { display: flex; flex-direction: column; gap: 10px; }
.points-entry { display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-secondary); border-radius: 10px; }
.points-entry-icon { width: 36px; height: 36px; border-radius: 10px; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.points-entry-icon.event { background: #2196f3; }
.points-entry-icon.hobby { background: #e91e63; }
.points-entry-icon.challenge { background: #ff9800; }
.points-entry-icon.message { background: #9c27b0; }
.points-entry-info { flex: 1; display: flex; flex-direction: column; }
.points-entry-title { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.points-entry-date { font-size: 11px; color: #999; }
.points-entry-value { font-size: 14px; font-weight: 700; color: #4caf50; flex-shrink: 0; }
.empty-text { color: #aaa; text-align: center; padding: 20px 0; font-size: 14px; }

@media (max-width: 600px) {
  .level-card { flex-direction: column; text-align: center; }
  .level-name-row { justify-content: center; }
  .xp-labels { justify-content: space-between; }
}
</style>
