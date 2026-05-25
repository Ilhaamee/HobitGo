import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const CHALLENGE_CATEGORIES = [
  { key: 'general',     label: 'General',     color: '#6366f1' },
  { key: 'deportes',    label: 'Deportes',    color: '#ff6b9d' },
  { key: 'creatividad', label: 'Creatividad', color: '#8b5cf6' },
  { key: 'musica',      label: 'Música',      color: '#f59e0b' },
  { key: 'mente',       label: 'Mente',       color: '#3b82f6' },
  { key: 'bienestar',   label: 'Bienestar',   color: '#14b8a6' },
  { key: 'cocina',      label: 'Cocina',      color: '#f97316' },
  { key: 'tecnologia',  label: 'Tecnología',  color: '#06b6d4' },
]

export const DAY_PRESETS = [7, 14, 21, 30, 60, 90]

export const POPULAR_LOCATIONS = [
  { key: 'madrid',      label: 'Madrid' },
  { key: 'barcelona',   label: 'Barcelona' },
  { key: 'valencia',    label: 'Valencia' },
  { key: 'sevilla',     label: 'Sevilla' },
  { key: 'bilbao',      label: 'Bilbao' },
  { key: 'zaragoza',    label: 'Zaragoza' },
  { key: 'malaga',      label: 'Málaga' },
  { key: 'alicante',    label: 'Alicante' },
  { key: 'remote',      label: 'Online / Remoto' },
]

// ═══════════════════════════════════════════════════════════════════
// 1. CATEGORÍAS
// ═══════════════════════════════════════════════════════════════════
export function useChallengeCategories() {
  function categoryColor(key) {
    return CHALLENGE_CATEGORIES.find(c => c.key === key)?.color || '#6366f1'
  }
  function categoryLabel(key) {
    return CHALLENGE_CATEGORIES.find(c => c.key === key)?.label || key
  }
  return { CHALLENGE_CATEGORIES, categoryColor, categoryLabel }
}

// ═══════════════════════════════════════════════════════════════════
// 2. LISTA DE RETOS (mis retos / explorar / privados / públicos)
// ═══════════════════════════════════════════════════════════════════
export function useChallengesList({ currentUserId }) {
  const challenges    = ref([])
  const myMemberships = ref([])
  const loading       = ref(false)
  const searchQuery   = ref('')
  const locationFilter = ref('')
  const viewMode      = ref('mine') // 'mine' | 'explore'

  async function loadChallenges() {
    loading.value = true
    const { data } = await supabase
      .from('group_challenges')
      .select('*, group_challenge_members(count)')
      .order('created_at', { ascending: false })
    if (data) challenges.value = data

    const { data: memberships } = await supabase
      .from('group_challenge_members')
      .select('challenge_id')
      .eq('user_id', currentUserId)
    if (memberships) myMemberships.value = memberships.map(m => m.challenge_id)
    loading.value = false
  }

  function isMember(challengeId) {
    return myMemberships.value.includes(challengeId)
  }

  function isAdmin(challenge, userId) {
    return challenge?.creator_id === userId
  }

  const filteredChallenges = computed(() => {
    let result
    if (viewMode.value === 'mine') {
      result = challenges.value.filter(c => 
        isMember(c.id) || c.creator_id === currentUserId
      )
    } else {
      // explore: públicas donde NO soy miembro
      result = challenges.value.filter(c => 
        !isMember(c.id) && 
        c.creator_id !== currentUserId && 
        !c.is_private
      )
    }
    // Filtro de búsqueda
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(c => c.title.toLowerCase().includes(q))
    }
    // Filtro de ubicación
    if (locationFilter.value) {
      result = result.filter(c => c.location === locationFilter.value)
    }
    return result
  })

  async function toggleMember(challengeId) {
    if (isMember(challengeId)) {
      await supabase
        .from('group_challenge_members')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('user_id', currentUserId)
      myMemberships.value = myMemberships.value.filter(id => id !== challengeId)
    } else {
      await supabase
        .from('group_challenge_members')
        .insert({ 
          challenge_id: challengeId, 
          user_id: currentUserId,
          days_done: 0,
          role: 'member'
        })
      myMemberships.value.push(challengeId)
    }
    await loadChallenges()
  }

  return {
    challenges, myMemberships, loading, viewMode, searchQuery, locationFilter,
    filteredChallenges,
    loadChallenges, isMember, isAdmin, toggleMember
  }
}

// ═══════════════════════════════════════════════════════════════════
// 3. CREAR RETO
// ═══════════════════════════════════════════════════════════════════
export function useCreateChallenge({ currentUserId, onCreated }) {
  const showCreate = ref(false)
  const creating   = ref(false)
  const formError  = ref('')
  const form       = ref({
    title: '',
    description: '',
    category: 'general',
    total_days: 30,
    is_private: false,
    location: '',
  })

  async function createChallenge() {
    if (!form.value.title.trim()) { 
      formError.value = 'El título es obligatorio'; 
      return 
    }
    creating.value = true
    formError.value = ''

    const { data, error } = await supabase
      .from('group_challenges')
      .insert({
        title:       form.value.title.trim(),
        description: form.value.description.trim() || null,
        category:    form.value.category,
        total_days:  form.value.total_days,
        creator_id:  currentUserId,
        is_private:  form.value.is_private,
        location:    form.value.location || null,
        starts_at:   new Date().toISOString(),
      })
      .select()

    if (error) {
      formError.value = error.message || 'Error al crear el reto'
      creating.value = false
      return
    }

    if (data?.[0]) {
      await supabase.from('group_challenge_members').insert({
        challenge_id: data[0].id,
        user_id:      currentUserId,
        days_done:    0,
        role:         'admin',
      })
      form.value = { 
        title: '', 
        description: '', 
        category: 'general', 
        total_days: 30,
        is_private: false 
      }
      showCreate.value = false
      if (onCreated) onCreated(data[0])
    }
    creating.value = false
  }

  return { showCreate, creating, formError, form, createChallenge }
}

// ═══════════════════════════════════════════════════════════════════
// 4. MIEMBROS DEL RETO
// ═══════════════════════════════════════════════════════════════════
export function useChallengeMembers({ currentUserId }) {
  const members = ref([])

  async function loadMembers(challengeId) {
    // Paso 1: Obtener miembros
    const { data: memberRows, error: memberError } = await supabase
      .from('group_challenge_members')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('days_done', { ascending: false })

    if (memberError || !memberRows || memberRows.length === 0) {
      members.value = []
      return
    }

    // Paso 2: Obtener perfiles
    const userIds = memberRows.map(m => m.user_id).filter(Boolean)
    let profilesMap = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds)

      if (profiles) {
        profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]))
      }
    }

    // Paso 3: Combinar + obtener check-ins reales
    const { data: checkins } = await supabase
      .from('challenge_checkins')
      .select('user_id, check_date')
      .eq('challenge_id', challengeId)
      .order('check_date', { ascending: false })

    const checkinsByUser = {}
    if (checkins) {
      checkins.forEach(c => {
        if (!checkinsByUser[c.user_id]) checkinsByUser[c.user_id] = []
        checkinsByUser[c.user_id].push(c.check_date)
      })
    }

    members.value = memberRows.map(m => ({
      id: m.user_id,
      username: profilesMap[m.user_id]?.username || 'Usuario',
      avatar_url: profilesMap[m.user_id]?.avatar_url || null,
      role: m.role || 'member',
      days_done: m.days_done || 0,
      last_check: m.last_check,
      joined_at: m.joined_at,
      checkins: checkinsByUser[m.user_id] || []
    }))
  }

  return { members, loadMembers }
}

// ═══════════════════════════════════════════════════════════════════
// 5. MENSAJES DEL RETO
// ═══════════════════════════════════════════════════════════════════
export function useChallengeMessages({ currentUserId, profile, emitUnread }) {
  const messages    = ref([])
  const messagesRef = ref(null)
  const sending     = ref(false)
  const replyingTo  = ref(null)
  let msgSub = null

  async function loadMessages(challengeId) {
    const { data: msgs } = await supabase
      .from('challenge_messages')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (!msgs) { messages.value = []; return }

    const senderIds = [...new Set(msgs.map(m => m.user_id).filter(Boolean))]
    let profilesMap = {}
    if (senderIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', senderIds)
      if (profs) profilesMap = Object.fromEntries(profs.map(p => [p.id, p]))
    }

    messages.value = msgs.map(m => ({
      ...m,
      profiles: profilesMap[m.user_id] || null,
      reactions: m.reactions || {}
    }))
  }

  async function sendMessage({ challengeId, content, imageUrl, replyTo }) {
    if (!challengeId || sending.value) return
    const hasText  = content?.trim().length > 0
    const hasImage = !!imageUrl
    if (!hasText && !hasImage) return

    sending.value = true
    try {
      const payload = {
        challenge_id: challengeId,
        user_id:      currentUserId,
        username:     profile?.username,
      }
      if (hasText)  payload.content   = content.trim()
      if (hasImage) payload.image_url = imageUrl
      if (replyTo) {
        payload.reply_to     = replyTo.id
        payload.reply_preview = replyTo.content?.slice(0, 50) || '📷 Imagen'
      }

      const { data, error } = await supabase
        .from('challenge_messages')
        .insert(payload)
        .select()

      if (error) {
        console.error('Error enviando:', error)
      } else if (data?.[0]) {
        const exists = messages.value.some(m => m.id === data[0].id)
        if (!exists) {
          messages.value.push({
            ...data[0],
            profiles: { 
              id: currentUserId, 
              username: profile?.username, 
              avatar_url: profile?.avatar_url 
            },
            reactions: {}
          })
        }
      }
    } catch (e) {
      console.error('Error enviando:', e)
    } finally {
      sending.value = false
    }
  }

  function subscribeMessages(challengeId, onScrollBottom) {
    if (msgSub) supabase.removeChannel(msgSub)
    msgSub = supabase.channel(`challenge-${challengeId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'challenge_messages',
        filter: `challenge_id=eq.${challengeId}`
      }, async payload => {
        const msg = payload.new
        if (msg.user_id === currentUserId) return
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', msg.user_id)
          .single()
        const exists = messages.value.some(m => m.id === msg.id)
        if (!exists) {
          messages.value.push({ ...msg, profiles: prof, reactions: msg.reactions || {} })
          if (onScrollBottom) onScrollBottom()
          if (emitUnread) emitUnread(1)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'challenge_messages',
        filter: `challenge_id=eq.${challengeId}`
      }, payload => {
        const msg = payload.new
        const idx = messages.value.findIndex(m => m.id === msg.id)
        if (idx !== -1) {
          const existing = messages.value[idx]
          messages.value[idx] = {
            ...existing,
            ...msg,
            profiles: existing.profiles || msg.profiles,
            reactions: msg.reactions !== undefined ? msg.reactions : (existing.reactions || {})
          }
        }
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'challenge_messages',
        filter: `challenge_id=eq.${challengeId}`
      }, payload => {
        messages.value = messages.value.filter(m => m.id !== payload.old.id)
      })
      .subscribe()
  }

  function cleanup() {
    if (msgSub) supabase.removeChannel(msgSub)
  }

  return {
    messages, messagesRef, sending, replyingTo,
    loadMessages, sendMessage, subscribeMessages, cleanup
  }
}

// ═══════════════════════════════════════════════════════════════════
// 6. CHECK-IN DIARIO
// ═══════════════════════════════════════════════════════════════════
export function useChallengeCheckIn({ currentUserId }) {
  const checkingIn = ref(false)

  async function checkIn(challengeId, myMembership, profile) {
    if (!challengeId || !myMembership || checkingIn.value) return false
    
    const today = new Date().toISOString().split('T')[0]
    
    // Verificar si ya hizo check-in hoy
    const { data: existing } = await supabase
      .from('challenge_checkins')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', currentUserId)
      .eq('check_date', today)
      .maybeSingle()

    if (existing) return false // Ya hizo check-in hoy

    checkingIn.value = true

    try {
      // Insertar check-in
      await supabase.from('challenge_checkins').insert({
        challenge_id: challengeId,
        user_id: currentUserId,
        check_date: today
      })

      // Calcular días totales (count de check-ins)
      const { count } = await supabase
        .from('challenge_checkins')
        .select('*', { count: 'exact', head: true })
        .eq('challenge_id', challengeId)
        .eq('user_id', currentUserId)

      const newDays = count || 0

      // Actualizar member
      await supabase
        .from('group_challenge_members')
        .update({ 
          days_done: newDays, 
          last_check: today 
        })
        .eq('challenge_id', challengeId)
        .eq('user_id', currentUserId)

      // Mensaje de sistema
      await supabase.from('challenge_messages').insert({
        challenge_id: challengeId,
        user_id: currentUserId,
        content: `✅ ${profile?.username || 'Alguien'} completó el día ${newDays}!`,
      })

      checkingIn.value = false
      return true
    } catch (e) {
      console.error('Error en check-in:', e)
      checkingIn.value = false
      return false
    }
  }

  return { checkingIn, checkIn }
}

// ═══════════════════════════════════════════════════════════════════
// 7. AVATAR DEL RETO
// ═══════════════════════════════════════════════════════════════════
export function useChallengeAvatar() {
  const avatarInput     = ref(null)
  const uploadingAvatar = ref(false)

  async function updateAvatar({ challenge, file }) {
    if (!challenge || file.size > 2 * 1024 * 1024) {
      if (file.size > 2 * 1024 * 1024) alert('Máximo 2MB')
      return null
    }

    uploadingAvatar.value = true
    const ext = file.name.split('.').pop().toLowerCase()
    const name = `challenges/${challenge.id}-${Date.now()}.${ext}`

    try {
      const { error } = await supabase.storage.from('chat-images').upload(name, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('chat-images').getPublicUrl(name)

      await supabase.from('group_challenges').update({ avatar_url: data.publicUrl }).eq('id', challenge.id)
      uploadingAvatar.value = false
      return data.publicUrl
    } catch (e) {
      console.error('Error subiendo avatar:', e)
      alert('Error al subir la imagen')
      uploadingAvatar.value = false
      return null
    }
  }

  return { avatarInput, uploadingAvatar, updateAvatar }
}

// ═══════════════════════════════════════════════════════════════════
// 8. ELIMINAR RETO
// ═══════════════════════════════════════════════════════════════════
export function useDeleteChallenge() {
  async function deleteChallenge(challenge) {
    if (!challenge) return false

    await supabase.from('challenge_messages').delete().eq('challenge_id', challenge.id)
    await supabase.from('challenge_checkins').delete().eq('challenge_id', challenge.id)
    await supabase.from('group_challenge_members').delete().eq('challenge_id', challenge.id)
    await supabase.from('challenge_invites').delete().eq('challenge_id', challenge.id)
    await supabase.from('group_challenges').delete().eq('id', challenge.id)
    return true
  }
  return { deleteChallenge }
}

// ═══════════════════════════════════════════════════════════════════
// 9. INVITACIONES A RETOS
// ═══════════════════════════════════════════════════════════════════
export function useChallengeInvites({ currentUserId }) {
  const invites = ref([])
  const loading = ref(false)

  async function loadInvites(challengeId) {
    loading.value = true
    const { data } = await supabase
      .from('challenge_invites')
      .select('*, invited_user:profiles(id, username, avatar_url)')
      .eq('challenge_id', challengeId)
      .order('created_at', { ascending: false })
    if (data) invites.value = data
    loading.value = false
  }

  async function inviteUser({ challengeId, userId }) {
    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('challenge_invites')
      .select('id, status')
      .eq('challenge_id', challengeId)
      .eq('invited_user_id', userId)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'pending') return false
      if (existing.status === 'rejected') return false
    }

    const { error } = await supabase
      .from('challenge_invites')
      .insert({ 
        challenge_id: challengeId, 
        invited_by: currentUserId, 
        invited_user_id: userId, 
        status: 'pending' 
      })

    if (!error) await loadInvites(challengeId)
    return !error
  }

  async function respondInvite({ inviteId, status }) {
    const { error } = await supabase
      .from('challenge_invites')
      .update({ status })
      .eq('id', inviteId)
    if (!error) {
      const idx = invites.value.findIndex(i => i.id === inviteId)
      if (idx !== -1) invites.value[idx].status = status
    }
    return !error
  }

  return { invites, loading, loadInvites, inviteUser, respondInvite }
}

// ═══════════════════════════════════════════════════════════════════
// 10. INVITACIONES PENDIENTES (para el usuario actual)
// ═══════════════════════════════════════════════════════════════════
export function useChallengePendingInvites({ currentUserId }) {
  const pendingInvites = ref([])
  let inviteSub = null

  async function loadPendingInvites() {
    // Step 1: get pending invites for this user
    const { data, error } = await supabase
      .from('challenge_invites')
      .select('id, challenge_id, invited_by, status, created_at')
      .eq('invited_user_id', currentUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[loadPendingInvites] Error:', error)
      return
    }
    if (!data || data.length === 0) {
      pendingInvites.value = []
      return
    }

    // Step 2: enrich with challenge title and inviter username
    const challengeIds = [...new Set(data.map(i => i.challenge_id))]
    const inviterIds   = [...new Set(data.map(i => i.invited_by).filter(Boolean))]

    const [{ data: challenges }, { data: inviters }] = await Promise.all([
      supabase.from('group_challenges').select('id, title').in('id', challengeIds),
      supabase.from('profiles').select('id, username').in('id', inviterIds),
    ])

    const challengeMap = Object.fromEntries((challenges || []).map(c => [c.id, c]))
    const inviterMap   = Object.fromEntries((inviters   || []).map(p => [p.id, p]))

    pendingInvites.value = data.map(inv => ({
      id:              inv.id,
      challenge_id:    inv.challenge_id,
      challenge_name:  challengeMap[inv.challenge_id]?.title || 'Reto',
      invited_by_name: inviterMap[inv.invited_by]?.username  || 'Alguien',
      status:          inv.status,
      created_at:      inv.created_at,
    }))
  }

  // Realtime: reload when a new invite arrives for this user
  function subscribeInvites() {
    if (inviteSub) supabase.removeChannel(inviteSub)
    inviteSub = supabase
      .channel(`challenge-invites-${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'challenge_invites',
        filter: `invited_user_id=eq.${currentUserId}`,
      }, () => loadPendingInvites())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'challenge_invites',
        filter: `invited_user_id=eq.${currentUserId}`,
      }, () => loadPendingInvites())
      .subscribe()
  }

  function cleanupInvites() {
    if (inviteSub) supabase.removeChannel(inviteSub)
  }

  return { pendingInvites, loadPendingInvites, subscribeInvites, cleanupInvites }
}