<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

import WelcomeBar   from '../components/inicio/WelcomeBar.vue'
import StreakCard   from '../components/inicio/StreakCard.vue'
import StatsGrid    from '../components/inicio/StatsGrid.vue'
import HobbyStack   from '../components/inicio/HobbyStack.vue'
import PostsFeed    from '../components/inicio/PostsFeed.vue'
import QuickNav     from '../components/inicio/QuickNav.vue'
import CelebrationPopup from '../components/hobbies/CelebrationPopup.vue'

const router = useRouter()
const loading = ref(true)

const user = ref(null)
const profile = ref(null)
const hobbies = ref([])
const sessions = ref([])
const posts = ref([])
const challenges = ref([])

// ── Celebración ─────────────────────────────────────────
const showCelebration = ref(false)
const celebrationData = ref({ hobbyName: '', points: 10 })

async function load() {
  const { data: { user: u } } = await supabase.auth.getUser()
  if (!u) return
  user.value = u

  const [{ data: p }, { data: h }, { data: s }, { data: postsData }, { data: chData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', u.id).single(),
    supabase.from('hobbies').select('*').eq('user_id', u.id).order('created_at', { ascending: false }),
    supabase.from('hobby_sessions').select('*').eq('user_id', u.id).order('created_at', { ascending: false }),
    supabase.from('posts').select('*, profiles:user_id(username, avatar_url)').order('created_at', { ascending: false }).limit(20),
    supabase.from('group_challenges')
      .select('*, group_challenge_members(count)')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(5)
  ])

  profile.value = p
  hobbies.value = h || []
  sessions.value = s || []
  posts.value = (postsData || []).filter(p => p.user_id !== u.id)
  challenges.value = chData || []
  loading.value = false
}

// ── Helpers para calcular días activos (misma lógica que HobbyCard) ──
function getActiveDays(hobbyId) {
  const daysSet = new Set()
  sessions.value
    .filter(s => s.hobby_id === hobbyId)
    .forEach(s => daysSet.add(new Date(s.created_at).toDateString()))
  return daysSet.size
}

function isHobbyCompleted(hobby) {
  if (hobby.completed_at) return true
  const total = hobby.total_days || 30
  return getActiveDays(hobby.id) >= total && getActiveDays(hobby.id) > 0
}

const streak = computed(() => {
  if (!sessions.value.length) return 0
  const dates = [...new Set(sessions.value.map(s => new Date(s.created_at).toDateString()))]
    .map(d => new Date(d)).sort((a, b) => b - a)
  let s = 0, cur = new Date(); cur.setHours(0,0,0,0)
  for (const d of dates) {
    if (Math.round((cur - d) / 86400000) <= 1) { s++; cur = d } else break
  }
  return s
})

const stats = computed(() => {
  const today = new Date().toDateString()
  const todayMins = sessions.value
    .filter(s => new Date(s.created_at).toDateString() === today)
    .reduce((sum, s) => sum + (s.minutes || 0), 0)
  const totalMins = sessions.value.reduce((sum, s) => sum + (s.minutes || 0), 0)

  return {
    hobbies: hobbies.value.length,
    sessions: sessions.value.length,
    minutes: totalMins,
    today: todayMins
  }
})

// ── Sesión rápida desde HobbyStack ─────────────────────
async function quickSession(hobbyId, minutes) {
  if (!user.value) return

  // 1. Insertar sesión
  const { data: newSession, error: insertErr } = await supabase
    .from('hobby_sessions')
    .insert({
      hobby_id: hobbyId,
      user_id: user.value.id,
      minutes,
      note: 'Sesión rápida'
    })
    .select()
    .single()

  if (insertErr) {
    console.error('Error en sesión rápida:', insertErr)
    return
  }

  // 2. Añadir a sesiones locales
  if (newSession) {
    sessions.value.unshift(newSession)
  }

  // 3. Recalcular total_minutes desde TODAS las sesiones
  const hobby = hobbies.value.find(h => h.id === hobbyId)
  if (hobby) {
    const newTotal = sessions.value
      .filter(s => s.hobby_id === hobbyId)
      .reduce((sum, s) => sum + s.minutes, 0)

    await supabase
      .from('hobbies')
      .update({ total_minutes: newTotal })
      .eq('id', hobbyId)

    hobby.total_minutes = newTotal

    // 4. Verificar si el reto se completó con ESTA sesión
    const activeDays = getActiveDays(hobbyId)
    const totalDays = hobby.total_days || 30
    const wasAlreadyCompleted = !!hobby.completed_at
    const nowCompleted = activeDays >= totalDays && activeDays > 0

    if (nowCompleted && !wasAlreadyCompleted) {
      // ¡Reto completado! Marcar en BD y mostrar celebración
      const completedAt = new Date().toISOString()
      await supabase
        .from('hobbies')
        .update({ completed_at: completedAt })
        .eq('id', hobbyId)

      hobby.completed_at = completedAt

      // Mostrar popup de celebración
      celebrationData.value = { 
        hobbyName: hobby.name, 
        points: 20 
      }
      showCelebration.value = true

      // Guardar log de actividad
      await supabase.from('activity_log').insert({
        user_id: user.value.id,
        type: 'achievement',
        title: `Reto completado: "${hobby.name}"`,
        points: 20,
        activity_date: new Date().toISOString().split('T')[0]
      })
    }

    // 5. Log de sesión normal (puntos)
    if (!nowCompleted || wasAlreadyCompleted) {
      await supabase.from('activity_log').insert({
        user_id: user.value.id,
        type: 'hobby',
        title: `Sesión rápida: "${hobby.name}"`,
        points: 5,
        activity_date: new Date().toISOString().split('T')[0]
      })
    }
  }
}

onMounted(load)
</script>

<template>
  <div class="home">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Cargando tu espacio...</p>
    </div>

    <template v-else>
      <WelcomeBar :profile="profile" :streak="streak" />

      <div class="dashboard-grid">
        <!-- Columna izquierda: Desktop -->
        <div class="col-left">
          <StreakCard :streak="streak" :sessions="sessions" />
          <StatsGrid :stats="stats" />
        </div>

        <!-- Columna centro -->
        <div class="col-center">
          <!-- En móvil: StreakBar aparece aquí primero -->
          <div class="mobile-streak">
            <StreakCard :streak="streak" :sessions="sessions" />
          </div>
          <HobbyStack :hobbies="hobbies" :sessions="sessions" @quick-session="quickSession" />
          <PostsFeed :posts="posts" :current-user="user" @refresh="load" />
        </div>

        <!-- Columna derecha: Desktop -->
        <div class="col-right">
          <div class="side-card challenges-card">
            <div class="side-header">
              <svg viewBox="0 0 24 24" fill="none" width="18" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
              </svg>
              <span>Retos grupales</span>
            </div>

            <div v-if="challenges.length === 0" class="challenges-empty">
              <p>Aún no hay retos públicos</p>
              <button class="btn-mini" @click="router.push('/dashboard/chat')">Explorar retos</button>
            </div>

            <div v-else class="challenges-list">
              <div 
                v-for="challenge in challenges.slice(0, 4)" 
                :key="challenge.id"
                class="challenge-item"
                @click="router.push({ path: '/dashboard/chat', query: { challengeId: challenge.id } })"
              >
                <div class="challenge-icon" :style="{ background: challenge.avatar_url ? 'transparent' : '#ff6b9d' }">
                  <img v-if="challenge.avatar_url" :src="challenge.avatar_url" />
                  <span v-else>{{ (challenge.title || '?')[0].toUpperCase() }}</span>
                </div>
                <div class="challenge-info">
                  <span class="challenge-name">{{ challenge.title }}</span>
                  <span class="challenge-meta">
                    {{ challenge.total_days }}d · {{ challenge.group_challenge_members?.count || 0 }} participantes
                  </span>
                </div>
                <svg class="challenge-arrow" viewBox="0 0 24 24" fill="none" width="14" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>

            <button class="btn-see-all" @click="router.push({ path: '/dashboard/chat', query: { tab: 'challenges' } })">
              Ver todos los retos
              <svg viewBox="0 0 24 24" fill="none" width="14" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          <QuickNav />
        </div>
      </div>
    </template>

    <!-- Celebration Popup -->
    <CelebrationPopup
      v-if="showCelebration"
      :hobby-name="celebrationData.hobbyName"
      :points="celebrationData.points"
      @close="showCelebration = false"
    />
  </div>
</template>

<style scoped>
.welcome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0 4px;
}
.home {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px 40px;
  min-height: 100vh;
  background: #f5f5f0;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}
.loading p {
  color: rgba(34,40,78,.4);
  font-size: 14px;
  font-weight: 500;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(34,40,78,.1);
  border-top-color: #ff6b9d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ═══ GRID PRINCIPAL ═══ */
.dashboard-grid {
  display: grid;
  grid-template-columns: 260px 1fr 260px;
  gap: 20px;
  margin-top: 24px;
  align-items: start;
  height: calc(100vh - 120px);
}

.col-left, .col-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 20px;
}

.col-center {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(34,40,78,.12) transparent;
  padding-right: 4px;
  padding-bottom: 24px;
}
.col-center::-webkit-scrollbar {
  width: 4px;
}
.col-center::-webkit-scrollbar-track {
  background: transparent;
}
.col-center::-webkit-scrollbar-thumb {
  background: rgba(34,40,78,.12);
  border-radius: 99px;
}

/* Mobile streak: oculto en desktop */
.mobile-streak {
  display: none;
}

/* Side cards */
.side-card {
  background: #fff;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(34,40,78,.06);
  border: 1px solid rgba(34,40,78,.06);
}
.side-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 700;
  color: #22284E;
}
.side-header svg {
  color: #ff6b9d;
}

/* Challenges */
.challenges-empty {
  text-align: center;
  padding: 20px 0;
}
.challenges-empty p {
  font-size: 13px;
  color: rgba(34,40,78,.4);
  margin: 0 0 12px;
}
.btn-mini {
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-mini:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255,107,157,.3);
}
.challenges-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}
.challenge-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid transparent;
}
.challenge-item:hover {
  background: rgba(34,40,78,.03);
  border-color: rgba(255,107,157,.15);
  transform: translateX(4px);
}
.challenge-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
}
.challenge-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.challenge-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.challenge-name {
  font-size: 13px;
  font-weight: 700;
  color: #22284E;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.challenge-meta {
  font-size: 11px;
  color: rgba(34,40,78,.4);
  font-weight: 500;
}
.challenge-arrow {
  color: rgba(34,40,78,.2);
  flex-shrink: 0;
  transition: all 0.2s;
}
.challenge-item:hover .challenge-arrow {
  color: #ff6b9d;
  transform: translateX(2px);
}
.btn-see-all {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 12px;
  border: 1.5px solid rgba(34,40,78,.1);
  background: transparent;
  color: rgba(34,40,78,.5);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-see-all:hover {
  background: rgba(255,107,157,.08);
  border-color: rgba(255,107,157,.2);
  color: #ff6b9d;
}

/* ═══ RESPONSIVE: Móvil ═══ */
@media (max-width: 1100px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 12px;
    height: auto;
  }
  .col-left {
    display: none;
  }
  .col-right {
    display: none;
  }
  .col-center {
    order: 1;
    gap: 10px;
    height: auto;
    overflow-y: visible;
    padding-right: 0;
  }

  /* Mostrar streak compacto en móvil */
  .mobile-streak {
    display: block;
    order: -1;
  }

  /* Ocultar QuickNav en móvil */
  .desktop-only {
    display: none;
  }
}

@media (max-width: 768px) {
  .home { padding: 0; }
}
</style>