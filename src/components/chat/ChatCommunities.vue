<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { supabase } from '../../lib/supabase.js'
import {
  useFormatters,
  useTyping,
  useMessageActions,
  useScroll,
  useGroupedMessages,
} from '../../funciones/useChat.js'
import {
  useCommunityCategories,
  useCommunitiesList,
  useCreateCommunity,
  useCommunityMessages,
  useCommunityAvatar,
  useDeleteCommunity,
  useCommunityInvites,
  useCommunityUnread,
  useCommunityMembers,
  POPULAR_LOCATIONS,
} from '../../funciones/useCommunities.js'
import ChatMessageList from './ChatMessageList.vue'
import ChatReplyBar from './ChatReplyBar.vue'
import ChatEditBar from './ChatEditBar.vue'
import ChatImagePreview from './ChatImagePreview.vue'
import ChatInputBar from './ChatInputBar.vue'
import ConfirmModal from '../ConfirmModal.vue'

// ═══════════════════════════════════════════════════════
// 1. PROPS Y EMITS
// ═══════════════════════════════════════════════════════
const props = defineProps({
  currentUser: { type: Object, required: true },
  profile:     { type: Object, required: true },
})
const emit = defineEmits(['unread'])

// ═══════════════════════════════════════════════════════
// 2. COMPOSABLES
// ═══════════════════════════════════════════════════════
const { initials, formatDate } = useFormatters()
const { COMMUNITY_CATEGORIES, categoryColor, categoryLabel } = useCommunityCategories()

const {
  communities, myMemberships, loading, viewMode, searchQuery,locationFilter,
  filteredCommunities,
  loadCommunities, isMember, isAdmin, toggleMember,
} = useCommunitiesList({ currentUserId: props.currentUser.id })

const {
  showCreate, creating, formError, form,
  createCommunity,
} = useCreateCommunity({
  currentUserId: props.currentUser.id,
  onCreated: () => loadCommunities()
})

const {
  messages, messagesRef, sending, replyingTo,
  loadMessages, sendMessage: sendMsg, subscribeMessages, cleanup: cleanupMessages,
} = useCommunityMessages({
  currentUserId: props.currentUser.id,
  profile: props.profile,
  emitUnread: (n) => emit('unread', n)
})

const { scrollToBottom } = useScroll(messagesRef)

const { avatarInput, uploadingAvatar, updateAvatar } = useCommunityAvatar()

const { deleteCommunity: doDeleteCommunity } = useDeleteCommunity()

const { typingUsers, notifyTyping, subscribeTyping, cleanupTyping } = useTyping({
  currentUserId: props.currentUser.id,
  profile: props.profile,
})

const {
  editingMsg, editText,
  startEdit, saveEdit, cancelEdit, 
  deleteMessage: deleteMsgAction,
  replyTo, cancelReply,
} = useMessageActions({
  messagesRef: messages,
  tableName: 'chat_group_messages'
})

const { invites, loadInvites, inviteUser } = useCommunityInvites({
  currentUserId: props.currentUser.id
})

const { unreadCounts, loadUnread, markAsRead } = useCommunityUnread({
  currentUserId: props.currentUser.id
})

const { members, loadMembers } = useCommunityMembers({ currentUserId: props.currentUser.id })


// ═══════════════════════════════════════════════════════
// 3. ESTADO LOCAL
// ═══════════════════════════════════════════════════════
const activeCommunity = ref(null)
const showLeftPanel   = ref(true)
const showInvites     = ref(false)
const showMembers     = ref(false)
const inviteSearch    = ref('')
const inviteResults   = ref([])
const inviteLoading   = ref(false)
const newMessage      = ref('')
const imagePreview    = ref(null)
const selectedImage   = ref(null)
const uploadingImage  = ref(false)
const previewImageUrl = ref(null)
const showDeleteMsgModal = ref(false)
const showDeleteCommunityModal = ref(false)
const msgToDelete = ref(null)
const communityToDelete = ref(null)

const { grouped: groupedMessages } = useGroupedMessages(messages, formatDate)

const typingText = computed(() => {
  if (!typingUsers.value.length) return ''
  if (typingUsers.value.length === 1) return `${typingUsers.value[0]} está escribiendo...`
  if (typingUsers.value.length === 2) return `${typingUsers.value[0]} y ${typingUsers.value[1]} están escribiendo...`
  return `${typingUsers.value.length} personas están escribiendo...`
})

// Invitaciones pendientes
const pendingInvites = ref([])
const showPendingInvites = ref(true)

async function loadPendingInvites() {
  const { data } = await supabase
    .from('chat_group_invites')
    .select(`
      id,
      group_id,
      invited_by,
      status,
      created_at,
      group:chat_groups(id, name),
      inviter:profiles!chat_group_invites_invited_by_fkey(username)
    `)
    .eq('invited_user_id', props.currentUser.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (data) {
    pendingInvites.value = data.map(inv => ({
      id: inv.id,
      group_id: inv.group_id,
      group_name: inv.group?.name || 'Comunidad',
      invited_by_name: inv.inviter?.username || 'Alguien',
      status: inv.status,
      created_at: inv.created_at
    }))
  }
}

async function respondToInvite(inviteId, status) {
  const { respondInvite } = useCommunityInvites({ currentUserId: props.currentUser.id })
  const ok = await respondInvite({ inviteId, status })
  if (ok) {
    if (status === 'accepted') {
      const invite = pendingInvites.value.find(i => i.id === inviteId)
      if (invite) {
        await supabase.from('chat_group_members').insert({
          group_id: invite.group_id,
          user_id: props.currentUser.id
        })
        myMemberships.value.push(invite.group_id)
        await loadCommunities()
      }
    }
    pendingInvites.value = pendingInvites.value.filter(i => i.id !== inviteId)
  }
}

// ═══════════════════════════════════════════════════════
// 4. FUNCIONES
// ═══════════════════════════════════════════════════════
async function openCommunity(community) {
  activeCommunity.value = community
  showLeftPanel.value   = false
  showInvites.value     = false
  inviteSearch.value    = ''
  inviteResults.value   = []
  await loadMessages(community.id)
  await loadMembers(community.id)
  await scrollToBottom()
  await markAsRead(community.id)
  subscribeMessages(community.id, scrollToBottom)
  subscribeTyping(community.id, true)
}

async function deleteCommunity() {
  if (!activeCommunity.value) return
  const ok = await doDeleteCommunity(activeCommunity.value)
  if (ok) {
    activeCommunity.value = null
    messages.value        = []
    showLeftPanel.value   = true
    await loadCommunities()
  }
}

async function onAvatarChange(e) {
  const file = e.target.files[0]
  if (!file || !activeCommunity.value) return
  const url = await updateAvatar({ community: activeCommunity.value, file })
  if (url) {
    activeCommunity.value.avatar_url = url
    const idx = communities.value.findIndex(c => c.id === activeCommunity.value.id)
    if (idx !== -1) communities.value[idx].avatar_url = url
  }
}

async function uploadImage(file) {
  const ext  = file.name.split('.').pop().toLowerCase()
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('chat-images').upload(name, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('chat-images').getPublicUrl(name)
  return data.publicUrl
}

async function sendMessage() {
  if (!activeCommunity.value) return
  let imageUrl = null
  if (selectedImage.value) {
    uploadingImage.value = true
    try {
      imageUrl = await uploadImage(selectedImage.value)
    } catch (e) {
      console.error('Error subiendo imagen:', e)
      uploadingImage.value = false
      return
    }
    uploadingImage.value = false
  }

  await sendMsg({
    groupId: activeCommunity.value.id,
    content: newMessage.value,
    imageUrl,
    replyTo: replyingTo.value,
  })

  newMessage.value   = ''
  clearImage()
  replyingTo.value   = null
  await scrollToBottom()
}

function backToList() {
  activeCommunity.value = null
  messages.value        = []
  showLeftPanel.value   = true
  showInvites.value     = false
  inviteSearch.value    = ''
  inviteResults.value   = []
  cleanupMessages()
  cleanupTyping()
}

function isOwn(msg) {
  return msg.sender_id === props.currentUser?.id
}

function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { alert('Máximo 5MB'); return }
  selectedImage.value = file
  const reader = new FileReader()
  reader.onload = ev => { imagePreview.value = ev.target.result }
  reader.readAsDataURL(file)
}

function clearImage() {
  selectedImage.value = null
  imagePreview.value  = null
}

// ── Invitar miembros ──────────────────────────────────
async function searchUsersToInvite() {
  if (!inviteSearch.value.trim() || inviteSearch.value.length < 3) return
  if (!activeCommunity.value) return
  inviteLoading.value = true

  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `%${inviteSearch.value}%`)
    .limit(10)

  if (data) {
    const { data: currentMembers } = await supabase
      .from('chat_group_members')
      .select('user_id')
      .eq('group_id', activeCommunity.value.id)

    const memberIds = (currentMembers || []).map(m => m.user_id)

    const { data: existingInvites } = await supabase
      .from('chat_group_invites')
      .select('invited_user_id')
      .eq('group_id', activeCommunity.value.id)
      .eq('status', 'pending')

    const invitedIds = (existingInvites || []).map(i => i.invited_user_id)

    inviteResults.value = data.filter(u =>
      !memberIds.includes(u.id) &&
      !invitedIds.includes(u.id) &&
      u.id !== props.currentUser.id
    )
  }
  inviteLoading.value = false
}

async function doInviteUser(user) {
  const { data: existing } = await supabase
    .from('chat_group_invites')
    .select('id, status')
    .eq('group_id', activeCommunity.value.id)
    .eq('invited_user_id', user.id)
    .maybeSingle()

  if (existing?.status === 'pending') {
    alert(`${user.username} ya tiene una invitación pendiente`)
    return
  }
  if (existing?.status === 'rejected') {
    alert(`${user.username} rechazó una invitación anterior`)
    return
  }

  const ok = await inviteUser({ groupId: activeCommunity.value.id, userId: user.id })
  if (ok) {
    inviteResults.value = inviteResults.value.filter(u => u.id !== user.id)
    alert(`Invitación enviada a ${user.username}`)
  } else {
    alert('Error al enviar invitación. ¿Eres el creador de la comunidad?')
  }
}

// Abrir modal para eliminar mensaje
function openDeleteMsgModal(msg) {
  msgToDelete.value = msg
  showDeleteMsgModal.value = true
}

// Confirmar eliminación de mensaje (llama al composable)
async function confirmDeleteMessage() {
  if (!msgToDelete.value) return
  await deleteMsgAction(msgToDelete.value) // ← usa la función del composable
  showDeleteMsgModal.value = false
  msgToDelete.value = null
}

// Abrir modal para eliminar comunidad
function openDeleteCommunityModal(community) {
  communityToDelete.value = community
  showDeleteCommunityModal.value = true
}

// Confirmar eliminación de comunidad
async function confirmDeleteCommunity() {
  if (!communityToDelete.value) return
  const ok = await doDeleteCommunity(communityToDelete.value)
  if (ok) {
    activeCommunity.value = null
    messages.value = []
    showLeftPanel.value = true
    await loadCommunities()
  }
  showDeleteCommunityModal.value = false
  communityToDelete.value = null
}

// ── Lifecycle ─────────────────────────────────────────
onMounted(() => {
  loadCommunities()
  loadPendingInvites()
})
onUnmounted(() => {
  cleanupMessages()
  cleanupTyping()
})

watch(newMessage, (val) => {
  if (val && val.length > 0 && activeCommunity.value) {
    notifyTyping(activeCommunity.value.id, true)
  }
})

let inviteSearchTimer = null
watch(inviteSearch, (val) => {
  clearTimeout(inviteSearchTimer)
  inviteResults.value = []
  if (!val.trim() || val.length < 3) return
  inviteLoading.value = true
  inviteSearchTimer = setTimeout(() => searchUsersToInvite(), 400)
})

function locationLabel(key) {
  return POPULAR_LOCATIONS.find(l => l.key === key)?.label || key
}
</script>

<<template>
  <div class="communities">

    <!-- ══ PANEL IZQUIERDO ════════════════════════════ -->
    <div class="left-panel" :class="{ 'hidden-mobile': !showLeftPanel }">

      <div class="panel-head">
        <span class="panel-title">Comunidades</span>
        <button class="icon-btn" @click="showCreate = !showCreate" title="Crear comunidad">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="18" height="18">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      <!-- Invitaciones pendientes -->
      <div v-if="pendingInvites.length" class="pending-invites">
        <div class="pi-header" @click="showPendingInvites = !showPendingInvites">
          <span class="pi-title">📩 Invitaciones</span>
          <span class="pi-badge">{{ pendingInvites.length }}</span>
          <svg 
            :class="{ rotated: showPendingInvites }" 
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" 
            stroke-linecap="round" stroke-linejoin="round" width="14" height="14"
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
        <Transition name="slide-down">
          <div v-if="showPendingInvites" class="pi-list">
            <div
              v-for="inv in pendingInvites"
              :key="inv.id"
              class="pi-item"
            >
              <div class="pi-info">
                <span class="pi-group">{{ inv.group_name }}</span>
                <span class="pi-by">de {{ inv.invited_by_name }}</span>
              </div>
              <div class="pi-actions">
                <button class="pi-accept" @click="respondToInvite(inv.id, 'accepted')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </button>
                <button class="pi-reject" @click="respondToInvite(inv.id, 'rejected')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Toggle vista -->
      <div class="view-toggle">
        <button :class="{ active: viewMode === 'mine' }" @click="viewMode = 'mine'">Mis comunidades</button>
        <button :class="{ active: viewMode === 'explore' }" @click="viewMode = 'explore'">Explorar</button>
      </div>

      <!-- Filtros de Explorar: ubicación + búsqueda en la misma línea -->
      <div v-if="viewMode === 'explore' && !showCreate" class="explore-filters">
        <div class="filter-row">
          <select v-model="locationFilter" class="cf-input filter-select">
            <option value="">📍 Todas las ubicaciones</option>
            <option v-for="loc in POPULAR_LOCATIONS" :key="loc.key" :value="loc.key">
              {{ loc.label }}
            </option>
          </select>
          <input
            v-model="searchQuery"
            type="text"
            class="cf-input search-input"
            placeholder="Buscar comunidades..."
          />
        </div>
      </div>

      <!-- Crear comunidad -->
      <Transition name="slide-down">
        <div v-if="showCreate" class="create-form">
          <input v-model="form.name" type="text" class="cf-input" placeholder="Nombre de la comunidad" maxlength="40" />
          <input v-model="form.description" type="text" class="cf-input" placeholder="Descripción (opcional)" maxlength="100" />
          <div class="cf-cats">
            <button
              v-for="cat in COMMUNITY_CATEGORIES" :key="cat.key"
              class="cf-cat"
              :class="{ active: form.category === cat.key }"
              :style="form.category === cat.key
                ? { background: cat.color, borderColor: cat.color, color: '#fff' }
                : { borderColor: cat.color + '55' }"
              @click="form.category = cat.key"
            >{{ cat.label }}</button>
          </div>
          <select v-model="form.location" class="cf-input location-select">
            <option value="">📍 Sin ubicación (global)</option>
            <option v-for="loc in POPULAR_LOCATIONS" :key="loc.key" :value="loc.key">
              {{ loc.label }}
            </option>
          </select>
          <label class="cf-private">
            <input type="checkbox" v-model="form.is_private" />
            <span>Comunidad privada (solo por invitación)</span>
          </label>
          <p v-if="formError" class="cf-error">{{ formError }}</p>
          <div class="cf-actions">
            <button class="cf-btn-create" @click="createCommunity" :disabled="creating">
              {{ creating ? 'Creando...' : 'Crear' }}
            </button>
            <button class="cf-btn-cancel" @click="showCreate = false">Cancelar</button>
          </div>
        </div>
      </Transition>

      <!-- Lista -->
      <div class="comm-list">
        <div v-if="loading" class="list-empty">
          <div class="mini-spinner"></div>
        </div>
        <div v-else-if="!filteredCommunities.length" class="list-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p v-if="viewMode === 'mine'">No estás en ninguna comunidad</p>
          <p v-else>No hay comunidades públicas</p>
          <span v-if="viewMode === 'mine'">Únete a una o crea la tuya</span>
        </div>

        <button
          v-for="c in filteredCommunities" :key="c.id"
          class="comm-item"
          :class="{ active: activeCommunity?.id === c.id }"
          @click="openCommunity(c)"
        >
          <div class="ci-icon" :style="{ background: c.avatar_url ? 'transparent' : categoryColor(c.icon || 'general') }">
            <img v-if="c.avatar_url" :src="c.avatar_url" class="ci-avatar-img" />
            <span v-else>{{ initials(c.name) }}</span>
          </div>
          <div class="ci-info">
            <span class="ci-name">{{ c.name }}</span>
            <span class="ci-cat">{{ categoryLabel(c.icon || 'general') }} {{ c.is_private ? '· 🔒' : '' }} {{ c.location ? '· ' + locationLabel(c.location) : '' }}</span>
          </div>
          <div class="ci-right">
            <span v-if="unreadCounts[c.id] > 0" class="ci-unread">{{ unreadCounts[c.id] }}</span>
            <span class="ci-badge" :class="{ member: isMember(c.id) }" :style="isMember(c.id) ? { background: categoryColor(c.icon || 'general') } : {}">
              <svg v-if="isMember(c.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="10" height="10">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="10" height="10">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- ══ PANEL DERECHO ══════════════════════════════ -->
    <div class="right-panel" :class="{ 'hidden-mobile': showLeftPanel, 'has-community': activeCommunity }">

      <div v-if="!activeCommunity" class="panel-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3>Comunidades</h3>
        <p>Selecciona una comunidad para ver el chat</p>
      </div>

      <template v-else>

        <!-- Header -->
        <div class="comm-top">
          <button class="back-btn" @click="backToList">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>

          <div class="ct-icon-wrapper">
            <div class="ct-icon" :style="{ background: activeCommunity.avatar_url ? 'transparent' : categoryColor(activeCommunity.icon || 'general') }">
              <img v-if="activeCommunity.avatar_url" :src="activeCommunity.avatar_url" class="ct-avatar-img" />
              <span v-else>{{ initials(activeCommunity.name) }}</span>
            </div>
            <button v-if="isAdmin(activeCommunity, currentUser.id)" class="avatar-edit-btn" @click="avatarInput.click()" title="Cambiar imagen">
              <svg v-if="!uploadingAvatar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span v-else class="spinner-sm"></span>
            </button>
            <input type="file" ref="avatarInput" accept="image/*" style="display:none" @change="onAvatarChange" />
          </div>

          <div class="ct-info">
            <span class="ct-name">{{ activeCommunity.name }}</span>
            <span class="ct-cat">{{ categoryLabel(activeCommunity.icon || 'general') }} {{ activeCommunity.is_private ? '· Privada 🔒' : '' }} {{ activeCommunity.location ? '· ' + locationLabel(activeCommunity.location) : '' }}</span>
          </div>

          <button
            class="join-btn"
            :style="isMember(activeCommunity.id)
              ? { background: 'rgba(34,40,78,.06)', color: 'rgba(34,40,78,.5)' }
              : { background: categoryColor(activeCommunity.icon || 'general'), color: '#fff' }"
            @click="toggleMember(activeCommunity.id)"
          >
            {{ isMember(activeCommunity.id) ? 'Salir' : 'Unirse' }}
          </button>

          <button
            v-if="isAdmin(activeCommunity, currentUser.id)"
            class="invite-btn"
            :class="{ active: showInvites }"
            @click="showInvites = !showInvites"
            title="Invitar miembros"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </button>

          <button v-if="isAdmin(activeCommunity, currentUser.id)" class="delete-btn" @click="openDeleteCommunityModal(activeCommunity)" title="Eliminar comunidad">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>

        <!-- Descripción -->
        <div v-if="activeCommunity.description" class="comm-desc">
          {{ activeCommunity.description }}
        </div>

        <!-- Miembros del grupo -->
        <div class="members-bar">
          <div class="mb-header" @click="showMembers = !showMembers">
            <span class="mb-count">{{ members.length }} miembro{{ members.length !== 1 ? 's' : '' }}</span>
            <svg :class="{ rotated: showMembers }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <Transition name="slide-down">
            <div v-if="showMembers" class="mb-list">
              <div
                v-for="m in members"
                :key="m.id"
                class="mb-item"
                :class="{ admin: m.role === 'admin', me: m.id === currentUser.id }"
              >
                <div class="mb-avatar">
                  <img v-if="m.avatar_url" :src="m.avatar_url" />
                  <span v-else>{{ initials(m.username) }}</span>
                </div>
                <div class="mb-info">
                  <span class="mb-name">{{ m.username }}</span>
                  <span v-if="m.role === 'admin'" class="mb-role">Admin</span>
                  <span v-if="m.id === currentUser.id" class="mb-role me">Tú</span>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Panel de invitaciones -->
        <Transition name="slide-down">
          <div v-if="showInvites" class="invite-panel">
            <p class="ip-title">Invitar miembros</p>
            <div class="invite-search-row">
              <input
                v-model="inviteSearch"
                type="text"
                class="cf-input"
                placeholder="Buscar usuario por nombre..."
                @keyup.enter="searchUsersToInvite"
              />
              <button class="invite-search-btn" @click="searchUsersToInvite" :disabled="inviteLoading">
                <svg v-if="!inviteLoading" viewBox="0 0 20 20" fill="none" width="14">
                  <circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.7"/>
                  <path d="M14 14l3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                </svg>
                <span v-else class="mini-spinner" style="width:14px;height:14px;border-width:2px;"></span>
              </button>
            </div>

            <div v-if="inviteResults.length" class="invite-results">
              <div
                v-for="user in inviteResults"
                :key="user.id"
                class="invite-user"
                @click="doInviteUser(user)"
              >
                <div class="iu-avatar">
                  <img v-if="user.avatar_url" :src="user.avatar_url" />
                  <span v-else>{{ initials(user.username) }}</span>
                </div>
                <span class="iu-name">{{ user.username }}</span>
                <button class="iu-btn">Invitar</button>
              </div>
            </div>
            <div v-else-if="inviteSearch.length >= 3 && !inviteLoading" class="ip-empty">
              No se encontraron usuarios disponibles
            </div>
            <div v-else-if="inviteSearch.length < 3" class="ip-hint">
              Escribe al menos 3 caracteres y pulsa Enter o el botón buscar
            </div>

            <button class="ip-close" @click="showInvites = false; inviteSearch = ''; inviteResults = []">Cerrar</button>
          </div>
        </Transition>

        <!-- Messages (componente extraído) -->
        <ChatMessageList
          ref="messagesRef"
          :messages="groupedMessages"
          :current-user-id="currentUser.id"
          :is-own="isOwn"
          :typing-text="typingText"
          :show-author="true"
          avatar-source="profile"
          enable-image-click
          @reaction="addReaction"
          @reply="replyTo"
          @edit="startEdit"
          @delete="openDeleteMsgModal($event)"
          @image-click="previewImageUrl = $event"
        />

        <!-- Reply bar (componente extraído) -->
        <ChatReplyBar
          :replying-to="replyingTo"
          :author-name="activeCommunity?.name"
          :preview-text="replyingTo?.content?.slice(0,40) || '📷 Imagen'"
          @cancel="cancelReply"
        />

        <!-- Edit bar (componente extraído) -->
        <ChatEditBar
          v-if="editingMsg"
          v-model="editText"
          @save="saveEdit"
          @cancel="cancelEdit"
        />

        <!-- Image preview (componente extraído) -->
        <ChatImagePreview
          v-if="imagePreview"
          :src="imagePreview"
          @clear="clearImage"
        />

        <!-- Input (componente extraído) -->
        <ChatInputBar
          v-if="isMember(activeCommunity.id)"
          v-model="newMessage"
          :image-preview="imagePreview"
          :uploading="uploadingImage"
          :send-color="categoryColor(activeCommunity.icon || 'general')"
          @send="sendMessage"
          @attach="onFileChange"
        />

        <!-- Banner unirse -->
        <div v-else class="join-banner">
          <p>Únete a la comunidad para participar</p>
          <button
            class="join-banner-btn"
            :style="{ background: categoryColor(activeCommunity.icon || 'general') }"
            @click="toggleMember(activeCommunity.id)"
          >
            Unirse a {{ activeCommunity.name }}
          </button>
        </div>

      </template>
    </div>

    <!-- Preview imagen fullscreen -->
    <Transition name="fade">
      <div v-if="previewImageUrl" class="img-fullscreen" @click="previewImageUrl = null">
        <img :src="previewImageUrl" />
      </div>
    </Transition>
  </div>
  <ConfirmModal
    :show="showDeleteMsgModal"
    title="¿Eliminar mensaje?"
    message="Esta acción no se puede deshacer."
    confirm-text="Eliminar"
    cancel-text="Cancelar"
    type="danger"
    @confirm="confirmDeleteMessage"
    @cancel="showDeleteMsgModal = false"
  />
  
  <ConfirmModal
    :show="showDeleteCommunityModal"
    title="¿Eliminar comunidad?"
    message="Se borrarán todos los mensajes y miembros. Esta acción no se puede deshacer."
    confirm-text="Eliminar"
    cancel-text="Cancelar"
    type="danger"
    @confirm="confirmDeleteCommunity"
    @cancel="showDeleteCommunityModal = false"
  />
</template>

<style scoped>
/* ══ LAYOUT PRINCIPAL ═════════════════════════════════ */
.communities {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 2px 20px rgba(34,40,78,.06);
  border: 1px solid rgba(34,40,78,.06);
}

/* ══ PANEL IZQUIERDO ══════════════════════════════════ */
.left-panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(34,40,78,.06);
  background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
  overflow: hidden;
  min-height: 0;
  height: 100%;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  flex-shrink: 0;
}
.panel-title { font-size: 16px; font-weight: 800; color: #22284E; }

.icon-btn {
  width: 34px; height: 34px; border-radius: 10px;
  background: rgba(34,40,78,.06); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #22284E; transition: all .2s;
}
.icon-btn:hover { background: rgba(255,107,157,.12); color: #ff6b9d; }
.icon-btn svg { display: block; }

/* Toggle vista */
.view-toggle {
  display: flex; gap: 4px;
  padding: 0 12px 10px; flex-shrink: 0;
}
.view-toggle button {
  flex: 1; padding: 6px 8px;
  border: 1.5px solid rgba(34,40,78,.1); border-radius: 8px;
  background: transparent; font-size: 11px; font-weight: 700;
  color: rgba(34,40,78,.5); cursor: pointer; transition: all .15s;
}
.view-toggle button.active {
  background: #22284E; color: #fff; border-color: #22284E;
}

/* Búsqueda explorar */
.search-box { padding: 0 12px 10px; flex-shrink: 0; }
.search-input { width: 100%; box-sizing: border-box; }

/* Formulario crear */
.create-form {
  padding: 0 12px 12px;
  display: flex; flex-direction: column; gap: 8px;
  flex-shrink: 0; border-bottom: 1px solid rgba(34,40,78,.06);
}
.cf-input {
  padding: 9px 12px; border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 10px; font-size: 13px; color: #22284E;
  background: #fff; font-family: inherit; transition: border-color .2s;
}
.cf-input:focus { outline: none; border-color: #ff6b9d; }
.cf-cats { display: flex; flex-wrap: wrap; gap: 5px; }
.cf-cat {
  padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 600;
  border: 1.5px solid; background: transparent;
  color: rgba(34,40,78,.6); cursor: pointer; transition: all .15s;
}
.cf-private {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: rgba(34,40,78,.6); cursor: pointer;
}
.cf-private input { cursor: pointer; }
.cf-error { font-size: 12px; color: #dc2626; margin: 0; }
.cf-actions { display: flex; gap: 6px; }
.cf-btn-create {
  flex: 1; padding: 9px; border: none; border-radius: 10px;
  background: #22284E; color: #fff59e;
  font-size: 13px; font-weight: 700; cursor: pointer;
}
.cf-btn-create:disabled { opacity: .5; cursor: not-allowed; }
.cf-btn-cancel {
  padding: 9px 14px; border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 10px; background: transparent;
  font-size: 13px; color: rgba(34,40,78,.5); cursor: pointer;
}

/* Lista comunidades */
.comm-list { flex: 1; overflow-y: auto; padding: 4px 8px 8px; min-height: 0; }
.list-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 40px 16px; text-align: center; color: rgba(34,40,78,.3);
}
.list-empty p  { font-size: 13px; font-weight: 600; margin: 0; }
.list-empty span { font-size: 11px; }
.mini-spinner {
  width: 24px; height: 24px;
  border: 2px solid rgba(34,40,78,.1);
  border-top-color: #ff6b9d; border-radius: 50%;
  animation: spin .7s linear infinite;
  display: block;
}

.comm-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px; border-radius: 14px;
  width: 100%; border: none; background: transparent;
  cursor: pointer; text-align: left; transition: all .2s;
}
.comm-item:hover { background: rgba(34,40,78,.04); }
.comm-item.active { background: rgba(99,102,241,.08); }

.ci-icon {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #fff;
  flex-shrink: 0; overflow: hidden;
}
.ci-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.ci-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ci-name { font-size: 13px; font-weight: 700; color: #22284E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ci-cat  { font-size: 11px; color: rgba(34,40,78,.4); }
.ci-right { display: flex; align-items: center; gap: 6px; }
.ci-unread {
  min-width: 18px; height: 18px; border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff; font-size: 10px; font-weight: 800;
  display: flex; align-items: center; justify-content: center; padding: 0 5px;
}
.ci-badge {
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(34,40,78,.06); color: rgba(34,40,78,.4);
  flex-shrink: 0; transition: all .2s;
}
.ci-badge.member { color: #fff; }
.ci-badge svg { display: block; }

/* ══ PANEL DERECHO ══════════════════════════════════ */
.right-panel {
  display: flex; flex-direction: column;
  overflow: hidden; background: #fff;
  min-height: 0; height: 100%; max-height: 100%;
}

.panel-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px; color: rgba(34,40,78,.25); text-align: center;
}
.panel-empty h3 { font-size: 16px; font-weight: 700; color: rgba(34,40,78,.4); margin: 0; }
.panel-empty p  { font-size: 13px; margin: 0; max-width: 220px; }

/* Header comunidad */
.comm-top {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(34,40,78,.06); flex-shrink: 0;
}
.back-btn {
  display: none; background: none; border: none;
  cursor: pointer; color: rgba(34,40,78,.5); padding: 4px;
}
.back-btn svg { display: block; }
.ct-icon-wrapper { position: relative; flex-shrink: 0; }
.ct-icon {
  width: 38px; height: 38px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff; overflow: hidden;
}
.ct-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-edit-btn {
  position: absolute; bottom: -2px; right: -2px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #22284E; border: 2px solid #fff; color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.avatar-edit-btn svg { display: block; }
.ct-info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ct-name { font-size: 14px; font-weight: 800; color: #22284E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ct-cat  { font-size: 11px; color: rgba(34,40,78,.4); font-weight: 600; }

.join-btn {
  padding: 7px 14px; border: none; border-radius: 99px;
  font-size: 12px; font-weight: 700; cursor: pointer;
  transition: opacity .2s; flex-shrink: 0;
}
.join-btn:hover { opacity: .85; }

.invite-btn {
  width: 34px; height: 34px; border-radius: 10px;
  border: 1.5px solid rgba(34,40,78,.1); background: transparent;
  color: rgba(34,40,78,.5); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .2s; flex-shrink: 0;
}
.invite-btn svg { display: block; }
.invite-btn:hover, .invite-btn.active {
  background: rgba(34,40,78,.07); color: #22284E;
  border-color: rgba(34,40,78,.2);
}

.delete-btn {
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(220,38,38,.08); border: none; color: #dc2626;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all .2s; flex-shrink: 0;
}
.delete-btn:hover { background: rgba(220,38,38,.15); }
.delete-btn svg { display: block; }

.comm-desc {
  padding: 10px 16px; font-size: 13px; color: rgba(34,40,78,.5);
  background: rgba(34,40,78,.02); border-bottom: 1px solid rgba(34,40,78,.05);
  flex-shrink: 0;
}

/* Panel invitaciones */
.invite-panel {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(34,40,78,.06);
  flex-shrink: 0; background: rgba(34,40,78,.02);
}
.ip-title { font-size: 12px; font-weight: 700; color: rgba(34,40,78,.5); margin: 0 0 8px; }
.invite-search-row { display: flex; gap: 6px; }
.invite-search-btn {
  width: 38px; height: 38px; border-radius: 10px;
  background: #22284E; border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: opacity .2s;
}
.invite-search-btn:disabled { opacity: .5; cursor: not-allowed; }
.invite-search-btn svg { display: block; }
.ip-hint { font-size: 11px; color: rgba(34,40,78,.35); padding: 8px 0; }
.ip-close {
  padding: 6px 12px; border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 8px; background: transparent;
  font-size: 12px; color: rgba(34,40,78,.5); cursor: pointer; margin-top: 8px;
}
.invite-results {
  display: flex; flex-direction: column; gap: 6px;
  margin: 8px 0; max-height: 180px; overflow-y: auto;
}
.invite-user {
  display: flex; align-items: center; gap: 8px;
  padding: 8px; border-radius: 10px;
  cursor: pointer; transition: background .15s;
}
.invite-user:hover { background: rgba(34,40,78,.04); }
.iu-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; overflow: hidden; flex-shrink: 0;
}
.iu-avatar img { width: 100%; height: 100%; object-fit: cover; }
.iu-name { flex: 1; font-size: 13px; font-weight: 600; color: #22284E; }
.iu-btn {
  padding: 4px 10px; border-radius: 6px;
  background: #22284E; color: #fff;
  font-size: 11px; font-weight: 700; border: none; cursor: pointer;
}
.ip-empty { font-size: 12px; color: rgba(34,40,78,.4); text-align: center; padding: 8px 0; }

/* Preview fullscreen */
.img-fullscreen {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.9);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; cursor: pointer;
}
.img-fullscreen img { max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 12px; }

/* Banner unirse */
.join-banner {
  padding: 14px 16px; border-top: 1px solid rgba(34,40,78,.06);
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-shrink: 0; background: rgba(34,40,78,.02);
}
.join-banner p { font-size: 13px; color: rgba(34,40,78,.5); margin: 0; }
.join-banner-btn {
  padding: 9px 18px; border: none; border-radius: 99px;
  font-size: 13px; font-weight: 700; color: #fff;
  cursor: pointer; white-space: nowrap; transition: opacity .2s;
}
.join-banner-btn:hover { opacity: .88; }

/* Transiciones */
.slide-down-enter-active, .slide-down-leave-active { transition: all .2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Invitaciones pendientes */
.pending-invites {
  margin: 0 12px 10px;
  background: linear-gradient(135deg, rgba(255,107,157,.08), rgba(255,179,198,.06));
  border: 1.5px solid rgba(255,107,157,.15);
  border-radius: 14px;
  overflow: hidden;
  flex-shrink: 0;
}
.pi-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  transition: background .15s;
}
.pi-header:hover { background: rgba(255,107,157,.05); }
.pi-header svg {
  margin-left: auto;
  transition: transform .2s;
  color: rgba(34,40,78,.4);
}
.pi-header svg.rotated { transform: rotate(180deg); }
.pi-title {
  font-size: 12px;
  font-weight: 800;
  color: #ff6b9d;
}
.pi-badge {
  min-width: 18px; height: 18px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  font-size: 10px; font-weight: 800;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  padding: 0 5px;
}
.pi-list {
  padding: 0 10px 10px;
  display: flex; flex-direction: column; gap: 6px;
}
.pi-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid rgba(255,107,157,.1);
}
.pi-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.pi-group { font-size: 12px; font-weight: 700; color: #22284E; }
.pi-by { font-size: 10px; color: rgba(34,40,78,.4); }
.pi-actions { display: flex; gap: 4px; }
.pi-accept, .pi-reject {
  width: 28px; height: 28px;
  border-radius: 8px; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .15s;
}
.pi-accept { background: rgba(34,197,94,.1); color: #16a34a; }
.pi-accept:hover { background: #16a34a; color: #fff; }
.pi-reject { background: rgba(220,38,38,.08); color: #dc2626; }
.pi-reject:hover { background: #dc2626; color: #fff; }

/* Miembros del grupo */
.members-bar {
  padding: 10px 16px;
  border-bottom: 1px solid rgba(34,40,78,.06);
  flex-shrink: 0;
}
.mb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}
.mb-count {
  font-size: 12px;
  font-weight: 700;
  color: rgba(34,40,78,.5);
}
.mb-header svg {
  color: rgba(34,40,78,.3);
  transition: transform .2s;
}
.mb-header svg.rotated { transform: rotate(180deg); }
.mb-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  max-height: 200px;
  overflow-y: auto;
}
.mb-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 10px;
  transition: background .15s;
}
.mb-item:hover { background: rgba(34,40,78,.03); }
.mb-item.admin { background: rgba(255,107,157,.05); }
.mb-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700;
  overflow: hidden; flex-shrink: 0;
}
.mb-avatar img { width: 100%; height: 100%; object-fit: cover; }
.mb-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.mb-name {
  font-size: 12px;
  font-weight: 600;
  color: #22284E;
}
.mb-role {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 99px;
  background: rgba(255,107,157,.12);
  color: #ff6b9d;
  flex-shrink: 0;
}
.mb-role.me {
  background: rgba(34,40,78,.08);
  color: rgba(34,40,78,.5);
}

/* ══ FILTROS DE EXPLORAR ════════════════════════════ */
.explore-filters {
  padding: 0 12px 10px;
  flex-shrink: 0;
}

.filter-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.filter-select {
  flex: 0 0 140px;        /* Ancho fijo para el select */
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2322284E' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
  cursor: pointer;
  font-size: 12px;
}

.search-input {
  flex: 1;                /* Ocupa el resto del espacio */
  min-width: 0;
}

/* Select de ubicación en el formulario de crear */
.location-select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2322284E' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
  cursor: pointer;
}

/* ══ RESPONSIVE MÓVIL ═══════════════════════════════ */
@media (max-width: 768px) {
  .communities {
    grid-template-columns: 1fr;
    border-radius: 20px; border: none; box-shadow: none;
    position: relative; height: 100%;
  }
  .left-panel.hidden-mobile  { display: none; }
  .right-panel.hidden-mobile { display: none; }
  .right-panel.has-community {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    z-index: 100; border-radius: 0; height: 100%; height: 100dvh; max-height: 100dvh;
    padding-bottom: calc(70px + env(safe-area-inset-bottom));
  }
  .back-btn { display: flex; }
}
</style>