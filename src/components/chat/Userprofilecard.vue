<script setup>
import { ref, watch, computed } from 'vue'
import { supabase } from '@/lib/supabase'

const props = defineProps({
  userId:        { type: String, required: true },
  currentUserId: { type: String, required: true },
  mode:          { type: String, default: 'direct' },
  inviteLabel:   { type: String, default: 'Invitar' },
})

const emit = defineEmits(['message', 'invite', 'close'])

const profile    = ref(null)
const allHobbies = ref([])   
const publicHobbies = ref([])
const sessions   = ref([])
const activities = ref([])
const loading    = ref(true)
const error      = ref(null)

const THRESHOLDS   = [0, 300, 800, 1800, 3500, 7000, 15000, 30000]
const LEVEL_NAMES  = ['Semilla','Brote','Explorador','Constante','Dedicado','Experto','Maestro','Leyenda']
const LEVEL_COLORS = ['#94a3b8', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ff6b9d', '#fde047']

const userLevel = computed(() => {
  const points = stats.value.points || 0
  let lv = 1
  THRESHOLDS.forEach((t, i) => { if (points >= t) lv = i + 1 })
  return Math.min(lv, THRESHOLDS.length)
})

const levelName  = computed(() => LEVEL_NAMES[userLevel.value - 1] || 'Semilla')
const levelColor = computed(() => LEVEL_COLORS[userLevel.value - 1] || '#94a3b8')

const levelProgress = computed(() => {
  const next = THRESHOLDS[userLevel.value] ?? THRESHOLDS[THRESHOLDS.length - 1]
  const prev = THRESHOLDS[userLevel.value - 1] ?? 0
  const range = next - prev
  if (!range) return 100
  return Math.min(100, Math.round(((stats.value.points - prev) / range) * 100))
})

// Stats 
const stats = computed(() => {
  // Puntos
  const totalPoints = (activities.value || []).reduce((sum, x) => sum + (x.points || 0), 0)

  // Sesiones
  const totalSessions = sessions.value.length

  // Días únicos con sesión
  const uniqueDays = new Set(
    sessions.value.map(s => new Date(s.created_at).toISOString().split('T')[0])
  ).size

  // Racha general 
  let maxStreak = 0
  allHobbies.value.forEach(h => {
    const dates = [...new Set(
      sessions.value
        .filter(s => s.hobby_id === h.id)
        .map(s => new Date(s.created_at).toDateString())
    )].map(d => new Date(d)).sort((a, b) => b - a)

    let streak = 0
    let cur = new Date(); cur.setHours(0, 0, 0, 0)
    for (const d of dates) {
      const diff = Math.round((cur - d) / 86400000)
      if (diff <= 1) { streak++; cur = d } else break
    }
    maxStreak = Math.max(maxStreak, streak)
  })

  return {
    points: totalPoints,
    sessions: totalSessions,
    uniqueDays,
    streak: maxStreak,
  }
})

async function load() {
  loading.value = true
  error.value = null
  profile.value = null
  allHobbies.value = []
  publicHobbies.value = []
  sessions.value = []
  activities.value = []

  try {
    // 1. Perfil
    const { data: profData, error: profErr } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, is_public, created_at')
      .eq('id', props.userId)
      .single()

    if (profErr) throw profErr
    if (!profData) throw new Error('Perfil no encontrado')

    // 2. TODOS los hobbies del usuario
    const { data: allHobbiesData } = await supabase
      .from('hobbies')
      .select('id, name, gradient, category, is_public')
      .eq('user_id', props.userId)

    // 3. TODAS las sessions del usuario
    const { data: sessionsData } = await supabase
      .from('hobby_sessions')
      .select('id, hobby_id, minutes, created_at')
      .eq('user_id', props.userId)
      .order('created_at', { ascending: false })

    // 4. Activity log
    const { data: activityData } = await supabase
      .from('activity_log')
      .select('points')
      .eq('user_id', props.userId)

    profile.value = profData
    allHobbies.value = allHobbiesData || []
    publicHobbies.value = (allHobbiesData || []).filter(h => h.is_public)
    sessions.value = sessionsData || []
    activities.value = activityData || []

  } catch (err) {
    console.error('[UserProfileCard] Error cargando perfil:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function hobbyColor(h) {
  return Array.isArray(h.gradient) ? h.gradient[0] : (h.gradient || '#ff6b9d')
}

watch(() => props.userId, load, { immediate: true })
</script>

<template>
  <Transition name="card-pop">
    <div class="upc-backdrop" @click.self="emit('close')">
      <div class="upc-card" role="dialog" aria-modal="true">

        <button class="upc-close" @click="emit('close')" aria-label="Cerrar">
          <svg viewBox="0 0 14 14" fill="none" width="11">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- Skeleton -->
        <template v-if="loading">
          <div class="upc-skeleton">
            <div class="sk-avatar"></div>
            <div class="sk-line sk-long"></div>
            <div class="sk-line sk-short"></div>
            <div class="sk-stats">
              <div class="sk-stat" v-for="i in 3" :key="i"></div>
            </div>
          </div>
        </template>

        <!-- Error -->
        <template v-else-if="error">
          <div class="upc-error">
            <svg viewBox="0 0 24 24" fill="none" width="40" stroke="#dc2626" stroke-width="1.4">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>Error al cargar el perfil</p>
            <span>{{ error }}</span>
          </div>
        </template>

        <!-- Contenido -->
        <template v-else-if="profile">

          <div class="upc-cover" :style="{ background: `linear-gradient(135deg, ${levelColor}22, ${levelColor}08)` }">
            <div class="upc-cover-orb" :style="{ background: levelColor }"></div>
          </div>

          <div class="upc-avatar-row">
            <div class="upc-avatar-wrap">
              <div class="upc-avatar">
                <img v-if="profile.avatar_url" :src="profile.avatar_url" :alt="profile.username" />
                <span v-else>{{ initials(profile.username) }}</span>
              </div>
              <svg class="upc-ring" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="27" fill="none" stroke="rgba(34,40,78,.08)" stroke-width="2.5"/>
                <circle cx="30" cy="30" r="27" fill="none"
                  :stroke="levelColor" stroke-width="2.5"
                  stroke-linecap="round"
                  :stroke-dasharray="`${levelProgress * 1.696} 169.6`"
                  transform="rotate(-90 30 30)"
                  style="transition: stroke-dasharray .8s ease"
                />
              </svg>
            </div>
            <div class="upc-level-chip" :style="{ background: levelColor + '18', borderColor: levelColor + '40', color: levelColor }">
              <span class="upc-level-dot" :style="{ background: levelColor }"></span>
              Nv.{{ userLevel }} · {{ levelName }}
            </div>
          </div>

          <div class="upc-identity">
            <h3 class="upc-name">{{ profile.username }}</h3>
            <span class="upc-handle">@{{ profile.username.toLowerCase().replace(/\s/g, '') }}</span>
          </div>

          <p v-if="profile.bio" class="upc-bio">{{ profile.bio }}</p>
          <p v-else class="upc-bio upc-bio-empty">Sin bio todavía</p>

          <!-- Stats -->
          <div class="upc-stats">
            <div class="upc-stat">
              <span class="upc-stat-val">{{ (stats.points || 0).toLocaleString() }}</span>
              <span class="upc-stat-lbl">puntos</span>
            </div>
            <div class="upc-stat-div"></div>
            <div class="upc-stat">
              <span class="upc-stat-val">{{ stats.sessions }}</span>
              <span class="upc-stat-lbl">sesiones</span>
            </div>
            <div class="upc-stat-div"></div>
            <div class="upc-stat">
              <span class="upc-stat-val" :style="stats.streak > 0 ? { color: '#f59e0b' } : {}">
                {{ stats.streak > 0 ? stats.streak + '🔥' : '0' }}
              </span>
              <span class="upc-stat-lbl">racha días</span>
            </div>
          </div>

          <!-- Hobbies (solo públicos) -->
          <div v-if="publicHobbies.length" class="upc-hobbies-section">
            <span class="upc-section-label">Hobbies</span>
            <div class="upc-hobbies">
              <span
                v-for="h in publicHobbies"
                :key="h.id"
                class="upc-hobby-tag"
                :style="{ background: hobbyColor(h) + '18', color: hobbyColor(h), borderColor: hobbyColor(h) + '35' }"
              >
                {{ h.name }}
              </span>
            </div>
          </div>

          <div v-if="profile.created_at" class="upc-joined">
            Miembro desde {{ new Date(profile.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) }}
          </div>

          <!-- Acciones -->
          <div class="upc-actions">
            <!-- Mensaje: solo en modo direct -->
            <button
              v-if="mode === 'direct' && userId !== currentUserId"
              class="upc-btn-primary"
              @click="emit('message')"
            >
              <svg viewBox="0 0 16 16" fill="none" width="14">
                <path d="M14 10a1 1 0 01-1 1H5l-3 3V3a1 1 0 011-1h10a1 1 0 011 1v7z"
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Mensaje
            </button>

            <button
              v-if="mode === 'invite' && userId !== currentUserId"
              class="upc-btn-primary"
              @click="emit('invite')"
            >
              <svg viewBox="0 0 16 16" fill="none" width="14">
                <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              {{ inviteLabel }}
            </button>

            <button
              v-if="userId === currentUserId"
              class="upc-btn-primary"
              disabled
            >
              Este eres tú
            </button>
          </div>

        </template>

        <div v-else class="upc-private">
          <svg viewBox="0 0 24 24" fill="none" width="40" stroke="rgba(34,40,78,.2)" stroke-width="1.4">
            <circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0116 0"/>
          </svg>
          <p>Perfil no disponible</p>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.upc-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(34,40,78,.45);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  padding: 20px;
}

.upc-card {
  background: #fff;
  border-radius: 24px;
  width: 100%;
  max-width: 340px;
  box-shadow: 0 32px 80px rgba(34,40,78,.2), 0 0 0 1px rgba(34,40,78,.06);
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.upc-close {
  position: absolute;
  top: 12px; right: 12px;
  z-index: 10;
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,.8);
  backdrop-filter: blur(6px);
  border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: rgba(34,40,78,.5);
  transition: background .2s, color .2s;
}
.upc-close:hover { background: #fff; color: #ff6b9d; }

.upc-cover {
  height: 72px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.upc-cover-orb {
  position: absolute;
  width: 160px; height: 160px;
  border-radius: 50%;
  filter: blur(50px);
  opacity: .3;
  top: -60px; right: -40px;
}

.upc-avatar-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 20px;
  margin-top: -28px;
  position: relative;
  z-index: 2;
  margin-bottom: 12px;
}

.upc-avatar-wrap {
  position: relative;
  width: 64px; height: 64px;
  flex-shrink: 0;
}

.upc-avatar {
  width: 64px; height: 64px;
  border-radius: 18px;
  border: 3px solid #fff;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 900; color: #fff;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(34,40,78,.15);
}
.upc-avatar img { width: 100%; height: 100%; object-fit: cover; }

.upc-ring {
  position: absolute;
  inset: -5px;
  width: calc(100% + 10px);
  height: calc(100% + 10px);
}

.upc-level-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 99px;
  border: 1.5px solid;
  margin-bottom: 4px;
  letter-spacing: .02em;
}
.upc-level-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

.upc-identity {
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 6px;
}
.upc-name {
  font-size: 20px;
  font-weight: 900;
  color: #22284E;
  margin: 0;
  letter-spacing: -.5px;
}
.upc-handle {
  font-size: 12px;
  color: rgba(34,40,78,.4);
  font-weight: 500;
}

.upc-bio {
  padding: 0 20px;
  font-size: 13px;
  color: rgba(34,40,78,.6);
  line-height: 1.55;
  margin: 0 0 14px;
}
.upc-bio-empty {
  color: rgba(34,40,78,.25);
  font-style: italic;
}

.upc-stats {
  display: flex;
  align-items: center;
  margin: 0 20px 16px;
  background: rgba(34,40,78,.03);
  border: 1px solid rgba(34,40,78,.06);
  border-radius: 14px;
  padding: 12px 0;
}
.upc-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.upc-stat-val {
  font-size: 18px;
  font-weight: 900;
  color: #22284E;
  line-height: 1;
  letter-spacing: -.5px;
}
.upc-stat-lbl {
  font-size: 10px;
  font-weight: 600;
  color: rgba(34,40,78,.38);
  text-transform: uppercase;
  letter-spacing: .05em;
}
.upc-stat-div {
  width: 1px;
  height: 28px;
  background: rgba(34,40,78,.08);
  flex-shrink: 0;
}

/* Hobbies */
.upc-hobbies-section {
  padding: 0 20px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.upc-section-label {
  font-size: 10px;
  font-weight: 700;
  color: rgba(34,40,78,.4);
  text-transform: uppercase;
  letter-spacing: .07em;
}
.upc-hobbies {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.upc-hobby-tag {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 99px;
  border: 1.5px solid;
  white-space: nowrap;
}

.upc-joined {
  padding: 0 20px;
  font-size: 11px;
  color: rgba(34,40,78,.35);
  text-align: center;
  margin-bottom: 14px;
}

.upc-actions {
  display: flex;
  gap: 8px;
  padding: 0 20px 20px;
}

.upc-btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: #22284E;
  color: #fff59e;
  border: none;
  font-size: 13px;
  font-weight: 700;
  padding: 11px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: opacity .2s, transform .15s;
}
.upc-btn-primary:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
.upc-btn-primary:disabled {
  opacity: .5;
  cursor: not-allowed;
  background: rgba(34,40,78,.3);
  color: #fff;
}

.upc-btn-secondary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: rgba(34,40,78,.06);
  color: #22284E;
  border: 1.5px solid rgba(34,40,78,.12);
  font-size: 13px;
  font-weight: 700;
  padding: 11px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: background .2s;
}
.upc-btn-secondary:hover { background: rgba(34,40,78,.1); }

.upc-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 20px;
  text-align: center;
}
.upc-error p { font-size: 14px; color: #dc2626; margin: 0; font-weight: 700; }
.upc-error span { font-size: 12px; color: rgba(34,40,78,.4); }

.upc-private {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 20px;
}
.upc-private p { font-size: 14px; color: rgba(34,40,78,.35); margin: 0; }

.upc-skeleton {
  padding: 24px 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.sk-avatar {
  width: 64px; height: 64px;
  border-radius: 18px;
  background: linear-gradient(90deg, rgba(34,40,78,.06) 25%, rgba(34,40,78,.1) 50%, rgba(34,40,78,.06) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.sk-line {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(34,40,78,.06) 25%, rgba(34,40,78,.1) 50%, rgba(34,40,78,.06) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.sk-long  { width: 60%; }
.sk-short { width: 35%; }
.sk-stats { display: flex; gap: 12px; width: 100%; }
.sk-stat {
  flex: 1; height: 44px;
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(34,40,78,.06) 25%, rgba(34,40,78,.1) 50%, rgba(34,40,78,.06) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.card-pop-enter-active { transition: opacity .25s ease, transform .25s cubic-bezier(.34,1.56,.64,1); }
.card-pop-leave-active { transition: opacity .2s ease, transform .2s ease; }
.card-pop-enter-from  { opacity: 0; transform: scale(.92); }
.card-pop-leave-to    { opacity: 0; transform: scale(.96); }
</style>