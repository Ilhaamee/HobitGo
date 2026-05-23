<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const leaderboard    = ref([])
const currentUserId  = ref(null)
const loading        = ref(true)

const COLORS = ['#D4537E','#7F77DD','#1D9E75','#BA7517','#185FA5','#639922','#993C1D','#534AB7']

const maxPts = computed(() => leaderboard.value[0]?.total_points || 1)

const myIndex = computed(() =>
  leaderboard.value.findIndex(u => u.id === currentUserId.value)
)

const podiumOrder = computed(() => {
  const s = leaderboard.value
  return [s[1], s[0], s[2]].filter(Boolean)
})

const podiumRanks = [2, 1, 3]

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function color(index) {
  return COLORS[index % COLORS.length]
}

function rankOf(user) {
  return leaderboard.value.indexOf(user)
}

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) currentUserId.value = user.id

  // 1. Cargar leaderboard
  const { data: lbData } = await supabase.from('leaderboard').select('*')
  
  if (!lbData || lbData.length === 0) {
    loading.value = false
    return
  }

  // 2. Obtener IDs de usuarios
  const userIds = lbData.map(u => u.id)

  // 3. Contar retos por usuario desde group_challenge_members
  const { data: challengesData } = await supabase
    .from('group_challenge_members')
    .select('user_id, challenge_id')
    .in('user_id', userIds)

  // Crear mapa de user_id -> count de retos
  const challengesMap = {}
  if (challengesData) {
    challengesData.forEach(row => {
      challengesMap[row.user_id] = (challengesMap[row.user_id] || 0) + 1
    })
  }

  // 4. Combinar datos: añadir challenges_count a cada usuario
  leaderboard.value = lbData.map(u => ({
    ...u,
    challenges_count: challengesMap[u.id] || 0
  }))

  loading.value = false
})
</script>

<<template>
  <div class="lb-wrap">

    <div class="lb-header">
      <h1>Clasificación</h1>
      <p>Los usuarios con más puntos de la comunidad</p>
    </div>

    <div v-if="loading" class="loading">Cargando...</div>

    <template v-else-if="leaderboard.length === 0">
      <div class="empty-text">No hay usuarios aún</div>
    </template>

    <template v-else>

      <!-- Podio -->
      <div class="podium">
        <div
          v-for="(u, i) in podiumOrder"
          :key="u.id"
          class="podium-item"
          :data-rank="podiumRanks[i]"
        >
          <div class="podium-avatar-wrap">
            <div class="podium-avatar" :style="{ background: color(rankOf(u)), borderColor: color(rankOf(u)) }">
              <img v-if="u.avatar_url" :src="u.avatar_url" />
              <span v-else>{{ initials(u.username) }}</span>
            </div>
            <div class="rank-badge">{{ podiumRanks[i] }}</div>
          </div>
          <span class="podium-name">{{ u.username }}</span>
          <span class="podium-pts">{{ u.total_points?.toLocaleString() }} pts</span>
          <div class="podium-bar"></div>
        </div>
      </div>

      <!-- Lista -->
      <div class="list-section">
        <div
          v-for="(u, i) in leaderboard"
          :key="u.id"
          class="list-item"
          :class="{ 'is-me': u.id === currentUserId }"
        >
          <span class="rank-num">{{ i + 1 }}</span>
          <div class="list-avatar" :style="{ background: color(i) }">
            <img v-if="u.avatar_url" :src="u.avatar_url" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />
            <span v-else>{{ initials(u.username) }}</span>
          </div>
          <div class="list-info">
            <div class="list-name">
              {{ u.username }}
              <span v-if="u.id === currentUserId" class="me-badge">Tú</span>
            </div>
            <!-- CAMBIO AQUÍ: u.challenges_count en lugar de u.goals_completed -->
            <div class="list-stats">{{ u.challenges_count }} retos · {{ u.hobbies_count }} hobbies</div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: Math.round(u.total_points / maxPts * 100) + '%', background: color(i) }"></div>
            </div>
          </div>
          <div class="list-right">
            <span class="list-pts">{{ u.total_points?.toLocaleString() }}</span>
            <span class="list-pts-lbl">pts</span>
          </div>
        </div>
      </div>

      <!-- Mi posición si no estoy en top 3 -->
      <div v-if="myIndex > 2" class="my-pos-card">
        <span>Tu posición: <strong>#{{ myIndex + 1 }}</strong></span>
        <span>{{ leaderboard[myIndex]?.total_points?.toLocaleString() }} puntos</span>
      </div>

    </template>
  </div>
</template>

<style scoped>
.lb-wrap { max-width: 700px; margin: 0 auto; padding-bottom: 2rem; }

.lb-header { margin-bottom: 1.5rem; }
.lb-header h1 { font-size: 26px; font-weight: 800; color: #22284E; margin-bottom: 4px; }
.lb-header p  { font-size: 13px; color: rgba(34,40,78,.45); }

.loading    { text-align: center; color: #888; padding: 60px; }
.empty-text { text-align: center; color: #aaa; padding: 60px; font-size: 14px; }

/* Podio */
.podium {
  display: flex; align-items: flex-end; justify-content: center;
  gap: 12px; margin-bottom: 2rem; padding: 0 1rem;
}
.podium-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; flex: 1; max-width: 160px;
}
.podium-avatar-wrap { position: relative; }
.podium-avatar {
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-weight: 700; color: #fff; border: 2px solid transparent; overflow: hidden;
  flex-shrink: 0;
}
.podium-avatar img {
  width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
} 
.podium-item[data-rank="1"] .podium-avatar { width: 72px; height: 72px; font-size: 20px; }
.podium-item[data-rank="2"] .podium-avatar { width: 56px; height: 56px; font-size: 16px; }
.podium-item[data-rank="3"] .podium-avatar { width: 56px; height: 56px; font-size: 16px; }

.rank-badge {
  position: absolute; bottom: -4px; right: -4px;
  width: 20px; height: 20px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #fff;
  border: 2px solid #fff;
}
.podium-item[data-rank="1"] .rank-badge { background: #BA7517; }
.podium-item[data-rank="2"] .rank-badge { background: #888780; }
.podium-item[data-rank="3"] .rank-badge { background: #993C1D; }

.podium-name { font-size: 13px; font-weight: 700; color: #22284E; text-align: center; }
.podium-pts  { font-size: 12px; color: rgba(34,40,78,.45); }

.podium-bar {
  width: 100%; border-radius: 8px 8px 0 0;
}
.podium-item[data-rank="1"] .podium-bar { height: 80px; background: #D4537E; }
.podium-item[data-rank="2"] .podium-bar { height: 56px; background: #7F77DD; }
.podium-item[data-rank="3"] .podium-bar { height: 40px; background: #1D9E75; }

/* Lista */
.list-section { display: flex; flex-direction: column; gap: 6px; }

.list-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px; border-radius: 14px;
  border: 1px solid rgba(34,40,78,.06);
  background: #fff; transition: background .15s, border-color .15s;
}
.list-item:hover { background: #fafafa; }
.list-item.is-me { border-color: #D4537E; background: #fff5f8; }

.rank-num { width: 28px; font-size: 13px; font-weight: 600; color: rgba(34,40,78,.35); text-align: center; flex-shrink: 0; }

.list-avatar {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px; color: #fff;
}

.list-info { flex: 1; min-width: 0; }
.list-name { font-size: 14px; font-weight: 700; color: #22284E; display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.me-badge { font-size: 10px; padding: 2px 7px; border-radius: 99px; background: rgba(212,83,126,.1); color: #993556; font-weight: 700; }
.list-stats { font-size: 12px; color: rgba(34,40,78,.4); margin-bottom: 4px; }

.progress-bar { height: 3px; background: rgba(34,40,78,.06); border-radius: 99px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 99px; transition: width .6s cubic-bezier(.4,0,.2,1); }

.list-right { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; flex-shrink: 0; }
.list-pts     { font-size: 17px; font-weight: 800; color: #22284E; }
.list-pts-lbl { font-size: 11px; color: rgba(34,40,78,.35); }

.my-pos-card {
  margin-top: 1rem; padding: 14px 18px;
  border-radius: 14px; border: 1px solid #D4537E;
  background: #fff5f8;
  display: flex; align-items: center; justify-content: space-between;
  font-size: 13px; color: rgba(34,40,78,.6);
}
.my-pos-card strong { color: #993556; font-weight: 800; }
/* Corona animada sobre el #1 */
.podium-item[data-rank="1"] .podium-avatar-wrap::before {
  content: '👑';
  position: absolute;
  top: -22px; left: 50%;
  transform: translateX(-50%);
  font-size: 20px;
  animation: crown-float 2s ease-in-out infinite;
}
@keyframes crown-float {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50%       { transform: translateX(-50%) translateY(-4px); }
}

/* Anillo pulsante en el #1 */
.podium-item[data-rank="1"] .podium-avatar {
  box-shadow: 0 0 0 4px rgba(212,83,126,.2), 0 0 0 8px rgba(212,83,126,.08);
  animation: pulse-ring 2s ease-in-out infinite;
}
@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 0 4px rgba(212,83,126,.2), 0 0 0 8px rgba(212,83,126,.08); }
  50%       { box-shadow: 0 0 0 6px rgba(212,83,126,.3), 0 0 0 12px rgba(212,83,126,.1); }
}

/* Racha de fuego en la lista si tiene buena posición */
.list-item:nth-child(-n+3) .rank-num::after {
  content: ' ⭐';
  font-size: 11px;
}

/* Entrada animada de los items */
.list-item {
  animation: slide-in .35s ease both;
}
.list-item:nth-child(1) { animation-delay: .05s; }
.list-item:nth-child(2) { animation-delay: .10s; }
.list-item:nth-child(3) { animation-delay: .15s; }
.list-item:nth-child(4) { animation-delay: .20s; }
.list-item:nth-child(5) { animation-delay: .25s; }
.list-item:nth-child(6) { animation-delay: .30s; }
@keyframes slide-in {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Barra del podio con entrada animada */
.podium-bar {
  animation: grow-up .7s cubic-bezier(.4,0,.2,1) both;
  transform-origin: bottom;
}
.podium-item[data-rank="1"] .podium-bar { animation-delay: .1s; }
.podium-item[data-rank="2"] .podium-bar { animation-delay: .2s; }
.podium-item[data-rank="3"] .podium-bar { animation-delay: .3s; }
@keyframes grow-up {
  from { transform: scaleY(0); opacity: 0; }
  to   { transform: scaleY(1); opacity: 1; }
}
</style>