import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'

const THRESHOLDS  = [0, 300, 800, 1800, 3500, 7000, 15000, 30000]
const LEVEL_NAMES = ['Semilla','Brote','Explorador','Constante','Dedicado','Experto','Maestro','Leyenda']

export function useProfile() {
  const router = useRouter()

  /* ── State ────────────────────────────── */
  const loading        = ref(true)
  const currentUser    = ref(null)
  const profile        = ref({})
  const avatarUrl      = ref('')
  const hobbies        = ref([])
  const stats          = ref({ hobbies:0, events:0, challenges:0, points:0, messages:0, hobbySessions:0 })
  const targetUserId   = ref(null)

  const editUsername   = ref('')
  const editBio        = ref('')
  const savingProfile  = ref(false)
  const profileSuccess = ref(false)
  const profileError   = ref('')

  const newPassword     = ref('')
  const confirmPassword = ref('')
  const savingPassword  = ref(false)
  const passwordSuccess = ref(false)
  const passwordError   = ref('')

  /* ── Computed ─────────────────────────── */
  const isOwner = computed(() => {
    if (!targetUserId.value) return true
    return targetUserId.value === currentUser.value?.id
  })

  const isPublic = computed(() => profile.value?.is_public ?? true)

  const userLevel = computed(() => {
    let lv = 1
    THRESHOLDS.forEach((t, i) => { if (stats.value.points >= t) lv = i + 1 })
    return Math.min(lv, THRESHOLDS.length)
  })

  const levelName = computed(() => LEVEL_NAMES[userLevel.value - 1])

  const levelProgress = computed(() => {
    const next = THRESHOLDS[userLevel.value] ?? THRESHOLDS[THRESHOLDS.length - 1]
    const prev = THRESHOLDS[userLevel.value - 1] ?? 0
    const range = next - prev
    if (!range) return 100
    return Math.min(100, Math.round(((stats.value.points - prev) / range) * 100))
  })

  const nextLevelPts = computed(() =>
    THRESHOLDS[userLevel.value] ?? THRESHOLDS[THRESHOLDS.length - 1]
  )

  /* ── Load ─────────────────────────────── */
  async function load(username = null) {
    loading.value = true
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    currentUser.value = user

    let profileId = user.id
    
    // Si hay username, buscar el ID de ese usuario
    if (username) {
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, is_public')
        .eq('username', username)
        .single()
      
      if (!userData) {
        router.push('/dashboard')
        return
      }
      
      profileId = userData.id
      targetUserId.value = profileId
      
      // Si el perfil es privado y no es owner, cargar solo lo básico
      if (!userData.is_public && profileId !== user.id) {
        profile.value = { username, is_public: false }
        loading.value = false
        return
      }
    } else {
      targetUserId.value = null
    }

    // Query de hobbies: externo = solo públicos, propio = todos
    const hobbiesQuery = username 
      ? supabase.from('hobbies').select('id,name,gradient,is_public').eq('user_id', profileId).eq('is_public', true)
      : supabase.from('hobbies').select('id,name,gradient,is_public').eq('user_id', profileId)

    const [profRes, hobbiesRes, statsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', profileId).single(),
      hobbiesQuery,
      loadStats(profileId),
    ])

    if (profRes.data) {
      profile.value      = profRes.data
      editUsername.value = profRes.data.username || ''
      editBio.value      = profRes.data.bio      || ''
      avatarUrl.value    = profRes.data.avatar_url || ''
    }
    if (hobbiesRes.data) hobbies.value = hobbiesRes.data
    stats.value = statsRes
    loading.value = false
  }

async function loadStats(userId) {
  const [h, a, s, c] = await Promise.all([
    supabase.from('hobbies').select('*', { count:'exact', head:true }).eq('user_id', userId),
    supabase.from('activity_log').select('points').eq('user_id', userId),
    supabase.from('hobby_sessions').select('*', { count:'exact', head:true }).eq('user_id', userId),
    supabase.from('group_challenge_members').select('*', { count:'exact', head:true }).eq('user_id', userId),
  ])
  return {
    hobbies: h.count ?? 0,
    events: 0,
    points: a.data?.reduce((sum, x) => sum + (x.points || 0), 0) ?? 0,
    messages: 0,
    hobbySessions: s.count ?? 0,
    challenges: c.count ?? 0,
  }
}

  /* ── Actions ──────────────────────────── */
  async function uploadAvatar(e) {
    const file = e.target.files[0]
    if (!file) return
    const ext  = file.name.split('.').pop()
    const path = `${currentUser.value.id}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { profileError.value = 'Error al subir la imagen'; return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    avatarUrl.value = data.publicUrl + '?t=' + Date.now()
    await supabase.from('profiles').update({ avatar_url: avatarUrl.value }).eq('id', currentUser.value.id)
  }

  async function saveProfile() {
    if (!editUsername.value.trim()) { profileError.value = 'El nombre es obligatorio'; return }
    savingProfile.value  = true
    profileError.value   = ''
    profileSuccess.value = false

    const { error } = await supabase.from('profiles').update({
      username: editUsername.value.trim(),
      bio:      editBio.value.trim(),
    }).eq('id', currentUser.value.id)

    if (error) {
      profileError.value = error.message.includes('unique') ? 'Ese nombre ya está en uso' : 'Error al guardar'
    } else {
      profile.value.username = editUsername.value.trim()
      profile.value.bio      = editBio.value.trim()
      profileSuccess.value   = true
      setTimeout(() => profileSuccess.value = false, 3000)
    }
    savingProfile.value = false
  }

  async function changePassword() {
    passwordError.value   = ''
    passwordSuccess.value = false
    if (!newPassword.value)                          { passwordError.value = 'Introduce una contraseña'; return }
    if (newPassword.value.length < 6)               { passwordError.value = 'Mínimo 6 caracteres'; return }
    if (newPassword.value !== confirmPassword.value) { passwordError.value = 'Las contraseñas no coinciden'; return }

    savingPassword.value = true
    const { error } = await supabase.auth.updateUser({ password: newPassword.value })
    if (error) {
      passwordError.value = 'Error al cambiar la contraseña'
    } else {
      passwordSuccess.value = true
      newPassword.value     = ''
      confirmPassword.value = ''
      setTimeout(() => passwordSuccess.value = false, 3000)
    }
    savingPassword.value = false
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return {
    loading, currentUser, profile, avatarUrl, hobbies, stats,
    isOwner, isPublic,
    editUsername, editBio, savingProfile, profileSuccess, profileError,
    newPassword, confirmPassword, savingPassword, passwordSuccess, passwordError,
    userLevel, levelName, levelProgress, nextLevelPts,
    load, uploadAvatar, saveProfile, changePassword, logout,
  }
}