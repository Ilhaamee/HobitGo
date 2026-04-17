<template>
  <div class="dashboard-leaderboard">
    <h1>🏆 Clasificación</h1>
    <p class="subtitle">Los usuarios con más puntos de la comunidad</p>

    <div v-if="loading" class="loading">Cargando...</div>

    <div v-else-if="leaderboard.length === 0" class="empty-text">No hay usuarios aún</div>

    <div v-else class="leaderboard-card">
      <!-- Top 3 -->
      <div class="top3" v-if="leaderboard.length >= 3">
        <div class="top-item second">
          <div class="top-avatar">
            <img v-if="leaderboard[1].avatar_url" :src="leaderboard[1].avatar_url" />
            <div v-else class="avatar-placeholder">{{ leaderboard[1].username[0].toUpperCase() }}</div>
          </div>
          <div class="top-rank silver">2</div>
          <span class="top-name">{{ leaderboard[1].username }}</span>
          <span class="top-points">{{ leaderboard[1].total_points }} pts</span>
        </div>

        <div class="top-item first">
          <div class="crown">👑</div>
          <div class="top-avatar large">
            <img v-if="leaderboard[0].avatar_url" :src="leaderboard[0].avatar_url" />
            <div v-else class="avatar-placeholder">{{ leaderboard[0].username[0].toUpperCase() }}</div>
          </div>
          <div class="top-rank gold">1</div>
          <span class="top-name">{{ leaderboard[0].username }}</span>
          <span class="top-points">{{ leaderboard[0].total_points }} pts</span>
        </div>

        <div class="top-item third">
          <div class="top-avatar">
            <img v-if="leaderboard[2].avatar_url" :src="leaderboard[2].avatar_url" />
            <div v-else class="avatar-placeholder">{{ leaderboard[2].username[0].toUpperCase() }}</div>
          </div>
          <div class="top-rank bronze">3</div>
          <span class="top-name">{{ leaderboard[2].username }}</span>
          <span class="top-points">{{ leaderboard[2].total_points }} pts</span>
        </div>
      </div>

      <!-- Lista completa desde posición 4 -->
      <div class="list">
        <div
          v-for="(user, index) in leaderboard"
          :key="user.id"
          class="list-item"
          :class="{ 'is-me': user.id === currentUserId }"
        >
          <span class="rank">
            <span v-if="index === 0">🥇</span>
            <span v-else-if="index === 1">🥈</span>
            <span v-else-if="index === 2">🥉</span>
            <span v-else>{{ index + 1 }}</span>
          </span>
          <div class="user-avatar">
            <img v-if="user.avatar_url" :src="user.avatar_url" />
            <div v-else class="avatar-placeholder small">{{ user.username[0].toUpperCase() }}</div>
          </div>
          <div class="user-info">
            <span class="user-name">
              {{ user.username }}
              <span v-if="user.id === currentUserId" class="me-tag">Tú</span>
            </span>
            <span class="user-stats">{{ user.goals_completed }} retos · {{ user.hobbies_count }} hobbies</span>
          </div>
          <div class="user-points">
            <span class="points-val">{{ user.total_points }}</span>
            <span class="points-lbl">pts</span>
          </div>
        </div>
      </div>

      <!-- Mi posición si no estoy en top 3 -->
      <div v-if="myPosition > 3" class="my-position">
        <span>Tu posición: <strong>#{{ myPosition }}</strong></span>
        <span>{{ myPoints }} puntos</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const leaderboard = ref([])
const currentUserId = ref(null)
const loading = ref(true)

const myPosition = computed(() => {
  const idx = leaderboard.value.findIndex(u => u.id === currentUserId.value)
  return idx + 1
})

const myPoints = computed(() => {
  const user = leaderboard.value.find(u => u.id === currentUserId.value)
  return user ? user.total_points : 0
})

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) currentUserId.value = user.id

  const { data, error } = await supabase.from('leaderboard').select('*')
  console.log(data, error)
  if (data) leaderboard.value = data
  loading.value = false
})
</script>

<style scoped>
.dashboard-leaderboard { max-width: 700px; margin: 0 auto; }
h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 8px; }
.subtitle { color: #666; margin-bottom: 32px; }
.loading { text-align: center; color: #888; padding: 60px; }
.empty-text { text-align: center; color: #aaa; padding: 60px; font-size: 14px; }

.leaderboard-card { background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 2px 20px rgba(0,0,0,0.05); }

.top3 { display: flex; align-items: flex-end; justify-content: center; gap: 16px; padding: 40px 24px 24px; background: linear-gradient(135deg, #22284E 0%, #1a1a2e 100%); }
.top-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.top-item.first { order: 2; }
.top-item.second { order: 1; }
.top-item.third { order: 3; }
.crown { font-size: 24px; margin-bottom: -4px; }

.top-avatar { width: 60px; height: 60px; border-radius: 50%; overflow: hidden; border: 3px solid rgba(255,255,255,0.3); }
.top-avatar.large { width: 80px; height: 80px; border-color: #FFD700; }
.top-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { width: 100%; height: 100%; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px; }

.top-rank { width: 28px; height: 28px; border-radius: 50%; background: #888; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; margin-top: -10px; }
.top-rank.gold { background: #FFD700; color: #1a1a2e; }
.top-rank.silver { background: #C0C0C0; color: #1a1a2e; }
.top-rank.bronze { background: #CD7F32; color: #fff; }
.top-name { font-size: 13px; font-weight: 600; color: #fff; }
.top-points { font-size: 12px; color: rgba(255,255,255,0.7); }

.list { padding: 8px 0; }
.list-item { display: flex; align-items: center; gap: 14px; padding: 14px 24px; transition: background 0.2s; border-left: 3px solid transparent; }
.list-item:hover { background: #f9f9f9; }
.list-item.is-me { background: #fff5f0; border-left-color: #E08E6B; }

.rank { width: 32px; text-align: center; font-size: 18px; font-weight: 700; color: #aaa; flex-shrink: 0; }

.user-avatar { width: 40px; height: 40px; border-radius: 12px; overflow: hidden; flex-shrink: 0; }
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder.small { width: 100%; height: 100%; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; border-radius: 12px; }

.user-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.user-name { font-size: 14px; font-weight: 600; color: #1a1a2e; display: flex; align-items: center; gap: 6px; }
.me-tag { background: #E08E6B; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: 700; }
.user-stats { font-size: 12px; color: #888; }

.user-points { display: flex; flex-direction: column; align-items: flex-end; }
.points-val { font-size: 18px; font-weight: 700; color: #1a1a2e; }
.points-lbl { font-size: 11px; color: #888; }

.my-position { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #fff5f0; border-top: 1px solid #eee; font-size: 14px; color: #666; }
.my-position strong { color: #E08E6B; }
</style>