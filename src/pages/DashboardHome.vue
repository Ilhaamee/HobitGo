<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

import GreetingHeader from '../components/inicio/GreetingHeader.vue'
import HobbyStack     from '../components/inicio/HobbyStack.vue'
import StreakCard      from '../components/inicio/StreakCard.vue'
import CommunityFeed  from '../components/inicio/CommunityFeed.vue'
import TodaySummary   from '../components/inicio/TodaySummary.vue'

/* ── Estado ── */
const currentUser = ref(null)
const username    = ref('Usuario')
const hobbies     = ref([])
const sessions    = ref([])
const events      = ref([])
const loading     = ref(true)

/* ── Streak calculado ── */
const streak = computed(() => {
  if (!sessions.value.length) return 0
  const dates = [...new Set(
    sessions.value.map(s => new Date(s.created_at).toDateString())
  )].map(d => new Date(d)).sort((a, b) => b - a)

  let count = 0
  let cur   = new Date(); cur.setHours(0, 0, 0, 0)
  for (const d of dates) {
    if (Math.round((cur - d) / 86400000) <= 1) { count++; cur = d }
    else break
  }
  return count
})

/* ── Hobbies completados hoy ── */
const hobbiesDoneToday = computed(() => {
  const today = new Date().toDateString()
  return hobbies.value.filter(h => {
    const mins = sessions.value
      .filter(s =>
        s.hobby_id === h.id &&
        new Date(s.created_at).toDateString() === today
      )
      .reduce((sum, s) => sum + (s.minutes || 0), 0)
    return mins >= (h.daily_minutes || 20)
  }).length
})

/* ── Cargar datos ── */
async function load() {
  loading.value = true
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { loading.value = false; return }
  currentUser.value = user

  const [profRes, hobbiesRes, sessionsRes, eventsRes] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user.id).single(),
    supabase.from('hobbies').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('hobby_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('events').select('*').eq('user_id', user.id),
  ])

  if (profRes.data)    username.value  = profRes.data.username || user.email.split('@')[0]
  if (hobbiesRes.data) hobbies.value   = hobbiesRes.data
  if (sessionsRes.data)sessions.value  = sessionsRes.data
  if (eventsRes.data)  events.value    = eventsRes.data

  loading.value = false
}

/* ── Quick check-in desde HobbyStack ── */
async function onQuickCheckin({ hobbyId, minutes }) {
  if (!currentUser.value) return

  const { data } = await supabase
    .from('hobby_sessions')
    .insert({
      user_id:  currentUser.value.id,
      hobby_id: hobbyId,
      minutes,
    })
    .select()

  if (data?.[0]) {
    sessions.value.unshift(data[0])

    // Actualizar total_minutes del hobby
    const hobby = hobbies.value.find(h => h.id === hobbyId)
    if (hobby) {
      hobby.total_minutes = (hobby.total_minutes || 0) + minutes
      await supabase
        .from('hobbies')
        .update({ total_minutes: hobby.total_minutes })
        .eq('id', hobbyId)
    }

    // Registrar en activity_log
    await supabase.from('activity_log').insert({
      user_id:       currentUser.value.id,
      type:          'hobby',
      title:         `Sesión rápida de "${hobby?.name}"`,
      points:        10,
      activity_date: new Date().toISOString().split('T')[0],
    })
  }
}

onMounted(load)
</script>

<template>
  <div class="dh-page">

    <!-- Loading -->
    <div v-if="loading" class="dh-loading">
      <div class="dh-spinner"></div>
    </div>

    <template v-else>

      <!-- Saludo -->
      <GreetingHeader
        :username="username"
        :hobbies-total="hobbies.length"
        :hobbies-done="hobbiesDoneToday"
        :streak="streak"
      />

      <!-- Resumen del día -->
      <TodaySummary
        :hobbies="hobbies"
        :sessions="sessions"
        :events="events"
      />

      <!-- Stack de hobbies + check-in rápido -->
      <HobbyStack
        :hobbies="hobbies"
        :sessions="sessions"
        @quick-checkin="onQuickCheckin"
      />

      <!-- Racha -->
      <StreakCard
        :streak="streak"
        :sessions="sessions"
      />

      <!-- Feed comunidad -->
      <CommunityFeed
        :current-user-id="currentUser?.id"
      />

    </template>

  </div>
</template>

<style scoped>
.dh-page {
  max-width: 680px;
  margin: 0 auto;
  padding-bottom: 80px;
}

.dh-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.dh-spinner {
  width: 36px; height: 36px;
  border: 3px solid rgba(34,40,78,.08);
  border-top-color: #ff6b9d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>