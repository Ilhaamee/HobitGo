<template>
  <div class="public-profile-page">
    <div v-if="loading" class="loading">Cargando perfil...</div>

    <div v-else-if="!profile" class="not-found">
      <h2>Usuario no encontrado</h2>
      <button class="btn-back" @click="router.back()">← Volver</button>
    </div>

    <div v-else>
      <button class="btn-back" @click="router.back()">← Volver</button>

      <!-- Header -->
      <div class="profile-header">
        <div class="profile-avatar">
          <img v-if="profile.avatar_url" :src="profile.avatar_url" />
          <div v-else class="avatar-placeholder">{{ profile.username[0].toUpperCase() }}</div>
        </div>
        <div class="profile-info">
          <h1>{{ profile.username }}</h1>
          <p class="bio">{{ profile.bio || 'Sin biografía' }}</p>
          <div class="profile-actions">
            <button class="btn-message" @click="goToChat">
              <font-awesome-icon icon="comments" /> Mensaje
            </button>
            <button v-if="friendStatus === null" class="btn-add" @click="sendRequest">
              <font-awesome-icon icon="plus" /> Añadir amigo
            </button>
            <span v-else-if="friendStatus === 'pending_sent'" class="status-badge pending">Solicitud enviada</span>
            <span v-else-if="friendStatus === 'pending_received'" class="status-badge received">
              <button class="btn-accept" @click="acceptRequest">✅ Aceptar</button>
            </span>
            <span v-else-if="friendStatus === 'accepted'" class="status-badge accepted">✅ Amigos</span>
          </div>
        </div>
      </div>

      <!-- Stats -->
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
          <div class="stat-icon" style="background:#e8f5e9;color:#4caf50"><font-awesome-icon icon="star" /></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.points }}</span>
            <span class="stat-label">Puntos totales</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#e3f2fd;color:#2196f3"><font-awesome-icon icon="user-group" /></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.friends }}</span>
            <span class="stat-label">Amigos</span>
          </div>
        </div>
      </div>

      <div class="bottom-grid">
        <!-- Hobbies -->
        <div class="section-card">
          <h2>❤️ Hobbies</h2>
          <div v-if="hobbies.length > 0" class="hobbies-list">
            <div v-for="hobby in hobbies" :key="hobby.id" class="hobby-item">
              <div class="hobby-icon" :style="{ background: hobby.color }">
                <font-awesome-icon :icon="hobby.icon" />
              </div>
              <div class="hobby-info">
                <span class="hobby-name">{{ hobby.name }}</span>
                <span class="hobby-time">{{ formatTime(hobby.total_minutes) }}</span>
              </div>
            </div>
          </div>
          <p v-else class="empty-text">No tiene hobbies aún</p>
        </div>

        <!-- Retos completados -->
        <div class="section-card">
          <h2>🏆 Retos completados</h2>
          <div v-if="completedGoals.length > 0" class="goals-list">
            <div v-for="goal in completedGoals" :key="goal.id" class="goal-item">
              <span class="goal-check">✅</span>
              <div class="goal-info">
                <span class="goal-title">{{ goal.title }}</span>
                <span class="goal-days">{{ goal.total_days }} días</span>
              </div>
            </div>
          </div>
          <p v-else class="empty-text">No ha completado retos aún</p>
        </div>

        <!-- Amigos en común -->
        <div class="section-card" v-if="mutualFriends.length > 0">
          <h2>👥 Amigos en común ({{ mutualFriends.length }})</h2>
          <div class="mutual-friends">
            <div v-for="friend in mutualFriends" :key="friend.id" class="mutual-friend" @click="router.push(`/dashboard/profile/${friend.id}`)">
              <div class="mini-avatar">
                <img v-if="friend.avatar_url" :src="friend.avatar_url" />
                <div v-else class="avatar-placeholder mini">{{ friend.username[0].toUpperCase() }}</div>
              </div>
              <span>{{ friend.username }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()

const profile = ref(null)
const loading = ref(true)
const currentUser = ref(null)
const stats = ref({ goalsCompleted: 0, hobbies: 0, points: 0, friends: 0 })
const hobbies = ref([])
const completedGoals = ref([])
const mutualFriends = ref([])
const friendStatus = ref(null)
const friendshipId = ref(null)

function formatTime(mins) {
  if (!mins || mins === 0) return '0 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

async function loadProfile() {
  const userId = route.params.id
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user

  // Si es el propio perfil redirige
  if (user && userId === user.id) {
    router.replace('/dashboard/profile')
    return
  }

  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (!data) { loading.value = false; return }
  profile.value = data

  await Promise.all([
    loadStats(userId),
    loadHobbies(userId),
    loadGoals(userId),
    loadFriendStatus(userId),
    loadMutualFriends(userId),
  ])

  loading.value = false
}

async function loadStats(userId) {
  const [goalsRes, hobbiesRes, activityRes, friendsRes] = await Promise.all([
    supabase.from('goals').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', true),
    supabase.from('hobbies').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('activity_log').select('points').eq('user_id', userId),
    supabase.from('friendships').select('*', { count: 'exact', head: true }).or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq('status', 'accepted'),
  ])
  stats.value = {
    goalsCompleted: goalsRes.count || 0,
    hobbies: hobbiesRes.count || 0,
    points: activityRes.data ? activityRes.data.reduce((sum, a) => sum + (a.points || 0), 0) : 0,
    friends: friendsRes.count || 0,
  }
}

async function loadHobbies(userId) {
  const { data } = await supabase.from('hobbies').select('*').eq('user_id', userId).order('total_minutes', { ascending: false }).limit(6)
  if (data) hobbies.value = data
}

async function loadGoals(userId) {
  const { data } = await supabase.from('goals').select('*').eq('user_id', userId).eq('completed', true).order('created_at', { ascending: false }).limit(5)
  if (data) completedGoals.value = data
}

async function loadFriendStatus(userId) {
  if (!currentUser.value) return
  const { data } = await supabase.from('friendships').select('*')
    .or(`and(sender_id.eq.${currentUser.value.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.value.id})`)
    .single()
  if (!data) { friendStatus.value = null; return }
  friendshipId.value = data.id
  if (data.status === 'accepted') friendStatus.value = 'accepted'
  else if (data.status === 'pending' && data.sender_id === currentUser.value.id) friendStatus.value = 'pending_sent'
  else if (data.status === 'pending' && data.receiver_id === currentUser.value.id) friendStatus.value = 'pending_received'
}

async function loadMutualFriends(userId) {
  if (!currentUser.value) return

  const [myFriendsRes, theirFriendsRes] = await Promise.all([
    supabase.from('friendships').select('sender_id, receiver_id').or(`sender_id.eq.${currentUser.value.id},receiver_id.eq.${currentUser.value.id}`).eq('status', 'accepted'),
    supabase.from('friendships').select('sender_id, receiver_id').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq('status', 'accepted'),
  ])

  if (!myFriendsRes.data || !theirFriendsRes.data) return

  const myFriendIds = myFriendsRes.data.map(f => f.sender_id === currentUser.value.id ? f.receiver_id : f.sender_id)
  const theirFriendIds = theirFriendsRes.data.map(f => f.sender_id === userId ? f.receiver_id : f.sender_id)
  const mutualIds = myFriendIds.filter(id => theirFriendIds.includes(id) && id !== currentUser.value.id && id !== userId)

  if (mutualIds.length > 0) {
    const { data } = await supabase.from('profiles').select('id, username, avatar_url').in('id', mutualIds)
    if (data) mutualFriends.value = data
  }
}

async function sendRequest() {
  const { data } = await supabase.from('friendships').insert({
    sender_id: currentUser.value.id,
    receiver_id: profile.value.id,
    status: 'pending'
  }).select()
  if (data) { friendStatus.value = 'pending_sent'; friendshipId.value = data[0].id }
}

async function acceptRequest() {
  await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId.value)
  friendStatus.value = 'accepted'
  stats.value.friends++
}

function goToChat() {
  router.push({ path: '/dashboard/chat', query: { user: profile.value.id, username: profile.value.username } })
}

onMounted(loadProfile)
</script>

<style scoped>
.public-profile-page { max-width: 900px; margin: 0 auto; }

.loading, .not-found { text-align: center; padding: 60px; color: var(--text-muted); }
.not-found h2 { color: var(--text-primary); margin-bottom: 16px; }

.btn-back { background: none; border: none; color: #E08E6B; font-size: 14px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 24px; display: flex; align-items: center; gap: 4px; }
.btn-back:hover { opacity: 0.8; }

.profile-header { display: flex; align-items: center; gap: 24px; background: var(--bg-card); padding: 32px; border-radius: 20px; margin-bottom: 24px; box-shadow: 0 2px 10px var(--shadow); }
.profile-avatar { width: 100px; height: 100px; border-radius: 20px; overflow: hidden; flex-shrink: 0; }
.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { width: 100%; height: 100%; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 36px; }
.avatar-placeholder.mini { font-size: 14px; border-radius: 8px; }

.profile-info h1 { font-size: 24px; color: var(--text-primary); margin: 0 0 6px; }
.bio { color: var(--text-secondary); font-size: 14px; margin: 0 0 16px; }

.profile-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.btn-message { display: flex; align-items: center; gap: 6px; background: #2196f3; color: #fff; border: none; border-radius: 8px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
.btn-message:hover { opacity: 0.9; }
.btn-add { display: flex; align-items: center; gap: 6px; background: #E08E6B; color: #fff; border: none; border-radius: 8px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
.btn-add:hover { opacity: 0.9; }
.btn-accept { background: #4caf50; color: #fff; border: none; border-radius: 8px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; }

.status-badge { font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 20px; }
.status-badge.pending { background: #fff3e0; color: #ff9800; }
.status-badge.accepted { background: #e8f5e9; color: #4caf50; }
.status-badge.received { background: none; padding: 0; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 14px; box-shadow: 0 2px 10px var(--shadow); }
.stat-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 22px; font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: 12px; color: var(--text-secondary); }

.bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.section-card { background: var(--bg-card); border-radius: 16px; padding: 24px; box-shadow: 0 2px 10px var(--shadow); }
.section-card h2 { font-size: 16px; color: var(--text-primary); margin: 0 0 16px; }
.empty-text { color: var(--text-muted); font-size: 14px; text-align: center; padding: 20px 0; }

.hobbies-list { display: flex; flex-direction: column; gap: 10px; }
.hobby-item { display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-hover); border-radius: 10px; }
.hobby-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; flex-shrink: 0; }
.hobby-info { display: flex; flex-direction: column; gap: 2px; }
.hobby-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.hobby-time { font-size: 12px; color: var(--text-muted); }

.goals-list { display: flex; flex-direction: column; gap: 10px; }
.goal-item { display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--bg-hover); border-radius: 10px; }
.goal-check { font-size: 18px; }
.goal-info { display: flex; flex-direction: column; gap: 2px; }
.goal-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.goal-days { font-size: 12px; color: var(--text-muted); }

.mutual-friends { display: flex; flex-wrap: wrap; gap: 12px; }
.mutual-friend { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
.mutual-friend:hover { opacity: 0.8; }
.mutual-friend span { font-size: 12px; color: var(--text-secondary); }
.mini-avatar { width: 48px; height: 48px; border-radius: 12px; overflow: hidden; }
.mini-avatar img { width: 100%; height: 100%; object-fit: cover; }

@media (max-width: 600px) {
  .profile-header { flex-direction: column; text-align: center; }
  .profile-actions { justify-content: center; }
  .bottom-grid { grid-template-columns: 1fr; }
}
</style>
