import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'

export const COMMUNITY_CATEGORIES = [
  { key: 'general',     label: 'General',     color: '#6366f1' },
  { key: 'deportes',    label: 'Deportes',    color: '#ff6b9d' },
  { key: 'creatividad', label: 'Creatividad', color: '#8b5cf6' },
  { key: 'musica',      label: 'Música',      color: '#f59e0b' },
  { key: 'mente',       label: 'Mente',       color: '#3b82f6' },
  { key: 'bienestar',   label: 'Bienestar',   color: '#14b8a6' },
  { key: 'cocina',      label: 'Cocina',      color: '#f97316' },
  { key: 'tecnologia',  label: 'Tecnología',  color: '#06b6d4' },
]

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

export function useCommunityCategories() {
  function categoryColor(key) {
    return COMMUNITY_CATEGORIES.find(c => c.key === key)?.color || '#6366f1'
  }
  function categoryLabel(key) {
    return COMMUNITY_CATEGORIES.find(c => c.key === key)?.label || key
  }
  return { COMMUNITY_CATEGORIES, categoryColor, categoryLabel }
}

export function useCommunitiesList({ currentUserId }) {
  const communities   = ref([])
  const myMemberships = ref([])
  const loading       = ref(false)
  const searchQuery   = ref('')
  const locationFilter = ref('') 

  const viewMode = ref('mine')

  async function loadCommunities() {
    loading.value = true
    const { data } = await supabase
      .from('chat_groups')
      .select('*, chat_group_members(count)')
      .order('created_at', { ascending: false })
    if (data) communities.value = data

    const { data: memberships } = await supabase
      .from('chat_group_members')
      .select('group_id')
      .eq('user_id', currentUserId)
    if (memberships) myMemberships.value = memberships.map(m => m.group_id)
    loading.value = false
  }

  function isMember(groupId) {
    return myMemberships.value.includes(groupId)
  }

  function isAdmin(community, userId) {
    return community?.created_by === userId
  }

  const filteredCommunities = computed(() => {
    let result
    if (viewMode.value === 'mine') {
      result = communities.value.filter(c => isMember(c.id) || c.created_by === currentUserId)
    } else {
      // explore: públicas donde NO soy miembro
      result = communities.value.filter(c => !isMember(c.id) && c.created_by !== currentUserId && !c.is_private)
    }
    // Filtro de búsqueda
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(q))
    }
    if (locationFilter.value) {
      result = result.filter(c => c.location === locationFilter.value)
    }
    return result
  })

  async function toggleMember(groupId) {
    if (isMember(groupId)) {
      await supabase
        .from('chat_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', currentUserId)
      myMemberships.value = myMemberships.value.filter(id => id !== groupId)
    } else {
      await supabase
        .from('chat_group_members')
        .insert({ group_id: groupId, user_id: currentUserId })
      myMemberships.value.push(groupId)
    }
    await loadCommunities()
  }

  return {
    communities, myMemberships, loading, viewMode, searchQuery, locationFilter,
    filteredCommunities,
    loadCommunities, isMember, isAdmin, toggleMember
  }
}

export function useCreateCommunity({ currentUserId, onCreated }) {
  const showCreate = ref(false)
  const creating   = ref(false)
  const formError  = ref('')
  const form       = ref({
    name: '',
    description: '',
    category: 'general',
    is_private: false,
    location: '', 
  })

  async function createCommunity() {
    if (!form.value.name.trim()) { formError.value = 'El nombre es obligatorio'; return }
    creating.value = true
    formError.value = ''

    const { data, error } = await supabase
      .from('chat_groups')
      .insert({
        name:        form.value.name.trim(),
        description: form.value.description.trim() || null,
        icon:        form.value.category,
        created_by:  currentUserId,
        is_private:  form.value.is_private,
        location: form.value.location || null, 
      })
      .select()

    if (error) {
      formError.value = 'Error al crear la comunidad'
      creating.value = false
      return
    }

    if (data?.[0]) {
      await supabase.from('chat_group_members').insert({
        group_id: data[0].id,
        user_id:  currentUserId,
        role:     'admin',
      })
      form.value = { name: '', description: '', category: 'general', is_private: false, location: '' }
      showCreate.value = false
      if (onCreated) onCreated(data[0])
    }
    creating.value = false
  }

  return { showCreate, creating, formError, form, createCommunity }
}

// ═══════════════════════════════════════════════════════════════════
// FIX: useCommunityMembers - Carga miembros en 2 pasos (sin relaciones automáticas)
// ═══════════════════════════════════════════════════════════════════
export function useCommunityMembers({ currentUserId }) {
  const members = ref([])

  async function loadMembers(groupId) {
    // Paso 1: Obtener miembros del grupo
    const { data: memberRows, error: memberError } = await supabase
      .from('chat_group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })

    if (memberError || !memberRows || memberRows.length === 0) {
      members.value = []
      return
    }

    // Paso 2: Obtener perfiles de los usuarios
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

    // Paso 3: Combinar datos
    members.value = memberRows.map(m => ({
      id: m.user_id,
      username: profilesMap[m.user_id]?.username || 'Usuario',
      avatar_url: profilesMap[m.user_id]?.avatar_url || null,
      role: m.role || 'member',
      joined_at: m.joined_at
    }))
  }

  return { members, loadMembers }
}

export function useCommunityMessages({ currentUserId, profile, emitUnread }) {
  const messages        = ref([])
  const messagesRef     = ref(null)
  const sending         = ref(false)
  const replyingTo      = ref(null)
  let commSub = null

  async function loadMessages(groupId) {
    const { data: msgs } = await supabase
      .from('chat_group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (!msgs) { messages.value = []; return }

    const senderIds = [...new Set(msgs.map(m => m.sender_id).filter(Boolean))]
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
      profiles: profilesMap[m.sender_id] || null,
      reactions: m.reactions || {}  // Asegurar reactions siempre es objeto
    }))
  }

  async function sendMessage({ groupId, content, imageUrl, replyTo }) {
    if (!groupId || sending.value) return
    const hasText  = content?.trim().length > 0
    const hasImage = !!imageUrl
    if (!hasText && !hasImage) return

    sending.value = true
    try {
      const payload = {
        group_id:  groupId,
        sender_id: currentUserId,
        username:  profile?.username,
      }
      if (hasText)  payload.content   = content.trim()
      if (hasImage) payload.image_url = imageUrl
      if (replyTo) {
        payload.reply_to     = replyTo.id
        payload.reply_preview = replyTo.content?.slice(0, 50) || '📷 Imagen'
      }

      const { data, error } = await supabase
        .from('chat_group_messages')
        .insert(payload)
        .select()

      if (error) {
        console.error('Error enviando:', error)
      } else if (data?.[0]) {
        const exists = messages.value.some(m => m.id === data[0].id)
        if (!exists) {
          messages.value.push({
            ...data[0],
            profiles: { id: currentUserId, username: profile?.username, avatar_url: profile?.avatar_url },
            reactions: {}  // Inicializar reactions para mensajes nuevos
          })
        }
      }
    } catch (e) {
      console.error('Error enviando:', e)
    } finally {
      sending.value = false
    }
  }

  function subscribeMessages(groupId, onScrollBottom) {
    if (commSub) supabase.removeChannel(commSub)
    commSub = supabase.channel(`community-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_group_messages',
        filter: `group_id=eq.${groupId}`
      }, async payload => {
        const msg = payload.new
        if (msg.sender_id === currentUserId) return
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', msg.sender_id)
          .single()
        const exists = messages.value.some(m => m.id === msg.id)
        if (!exists) {
          messages.value.push({
            ...msg,
            profiles: prof,
            reactions: msg.reactions || {}  // Asegurar reactions
          })
          if (onScrollBottom) onScrollBottom()
          if (emitUnread) emitUnread(1)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_group_messages',
        filter: `group_id=eq.${groupId}`
      }, payload => {
        const msg = payload.new
        const idx = messages.value.findIndex(m => m.id === msg.id)
        if (idx !== -1) {
          const existing = messages.value[idx]
          // Merge inteligente: preservar profiles local y reactions si el payload no los trae
          const merged = {
            ...existing,
            ...msg,
            profiles: existing.profiles || msg.profiles,  // Mantener profiles cargado localmente
            reactions: msg.reactions !== undefined ? msg.reactions : (existing.reactions || {})
          }
          messages.value[idx] = merged
        }
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'chat_group_messages',
        filter: `group_id=eq.${groupId}`
      }, payload => {
        const id = payload.old.id
        messages.value = messages.value.filter(m => m.id !== id)
      })
      .subscribe()
  }

  function cleanup() {
    if (commSub) supabase.removeChannel(commSub)
  }

  return {
    messages, messagesRef, sending, replyingTo,
    loadMessages, sendMessage, subscribeMessages, cleanup
  }
}

export function useCommunityAvatar() {
  const avatarInput     = ref(null)
  const uploadingAvatar = ref(false)

  async function updateAvatar({ community, file }) {
    if (!community || file.size > 2 * 1024 * 1024) {
      if (file.size > 2 * 1024 * 1024) alert('Máximo 2MB')
      return null
    }

    uploadingAvatar.value = true
    const ext = file.name.split('.').pop().toLowerCase()
    const name = `communities/${community.id}-${Date.now()}.${ext}`

    try {
      const { error } = await supabase.storage.from('chat-images').upload(name, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('chat-images').getPublicUrl(name)

      await supabase.from('chat_groups').update({ avatar_url: data.publicUrl }).eq('id', community.id)
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

export function useDeleteCommunity() {
  async function deleteCommunity(community) {
    if (!community) return false

    await supabase.from('chat_group_messages').delete().eq('group_id', community.id)
    await supabase.from('chat_group_members').delete().eq('group_id', community.id)
    await supabase.from('chat_groups').delete().eq('id', community.id)
    return true
  }
  return { deleteCommunity }
}

export function useCommunityInvites({ currentUserId }) {
  const invites = ref([])
  const loading = ref(false)

  async function loadInvites(groupId) {
    loading.value = true
    const { data } = await supabase
      .from('chat_group_invites')
      .select('*, invited_user:profiles(id, username, avatar_url)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
    if (data) invites.value = data
    loading.value = false
  }

  async function inviteUser({ groupId, userId }) {
    // Verificar si ya existe invitación pendiente para este usuario en este grupo
    const { data: existing } = await supabase
      .from('chat_group_invites')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('invited_user_id', userId)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'pending') {
        console.warn('Ya existe una invitación pendiente para este usuario')
        return false
      }
      // Si fue rechazada, podríamos actualizarla a pending, pero por ahora bloqueamos
      if (existing.status === 'rejected') {
        console.warn('Este usuario rechazó una invitación anterior')
        return false
      }
    }

    const { error } = await supabase
      .from('chat_group_invites')
      .insert({ group_id: groupId, invited_by: currentUserId, invited_user_id: userId, status: 'pending' })

    if (!error) await loadInvites(groupId)
    return !error
  }

  async function respondInvite({ inviteId, status }) {
    const { error } = await supabase
      .from('chat_group_invites')
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

export function useCommunityUnread({ currentUserId }) {
  const unreadCounts = ref({}) // { groupId: count }

  async function loadUnread(groupId) {
    // Paso 1: Obtener IDs de mensajes ya leídos por este usuario en este grupo
    const { data: readMsgs } = await supabase
      .from('chat_group_message_reads')
      .select('message_id')
      .eq('user_id', currentUserId)

    const readIds = (readMsgs || []).map(r => r.message_id)

    // Paso 2: Contar mensajes no leídos (no de mí, no en la lista de leídos)
    let query = supabase
      .from('chat_group_messages')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .neq('sender_id', currentUserId)

    if (readIds.length > 0) {
      query = query.not('id', 'in', `(${readIds.join(',')})`)
    }

    const { count, error } = await query
    if (error) {
      console.error('Error cargando unread:', error)
      unreadCounts.value[groupId] = 0
      return
    }
    unreadCounts.value[groupId] = count || 0
  }

  async function markAsRead(groupId) {
    const { data: unreadMsgs } = await supabase
      .from('chat_group_messages')
      .select('id')
      .eq('group_id', groupId)
      .neq('sender_id', currentUserId)

    if (!unreadMsgs?.length) return

    const reads = unreadMsgs.map(m => ({ message_id: m.id, user_id: currentUserId }))
    await supabase.from('chat_group_message_reads').upsert(reads, { onConflict: 'message_id,user_id' })
    unreadCounts.value[groupId] = 0
  }

  return { unreadCounts, loadUnread, markAsRead }
}