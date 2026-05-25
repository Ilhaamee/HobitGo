<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { supabase } from '@/lib/supabase'
import {
  useFormatters,
  useMessageActions,
  useScroll,
  useGroupedMessages,
} from '../../funciones/useChat.js'
import {
  useChallengeCategories,
  useChallengesList,
  useCreateChallenge,
  useChallengeMembers,
  useChallengeMessages,
  useChallengeCheckIn,
  useChallengeAvatar,
  useDeleteChallenge,
  useChallengeInvites,
  useChallengePendingInvites,
} from '../../funciones/useChallenges.js'
import ChatMessageList from './ChatMessageList.vue'
import ChatReplyBar from './ChatReplyBar.vue'
import ChatEditBar from './ChatEditBar.vue'
import ChatImagePreview from './ChatImagePreview.vue'
import ChatInputBar from './ChatInputBar.vue'
import ChatSearch from './ChatSearch.vue'
import ConfirmModal from '../ConfirmModal.vue'

const props = defineProps({
  currentUser:        { type: Object, required: true },
  profile:            { type: Object, required: true },
  initialChallengeId: { type: String, default: null },
})
const emit = defineEmits(['unread'])

// ═══════════════════════════════════════════════════════
// COMPOSABLES
// ═══════════════════════════════════════════════════════
const { initials, formatDate } = useFormatters()
const { CHALLENGE_CATEGORIES, categoryColor, categoryLabel } = useChallengeCategories()

const {
  challenges, myMemberships, loading, viewMode, searchQuery,
  filteredChallenges,
  loadChallenges, isMember, isAdmin, toggleMember,
} = useChallengesList({ currentUserId: props.currentUser.id })

const {
  showCreate, creating, formError, form,
  createChallenge,
} = useCreateChallenge({
  currentUserId: props.currentUser.id,
  onCreated: () => loadChallenges()
})

const {
  messages, messagesRef, sending, replyingTo,
  loadMessages, sendMessage: sendMsg, subscribeMessages, cleanup: cleanupMessages,
} = useChallengeMessages({
  currentUserId: props.currentUser.id,
  profile: props.profile,
  emitUnread: (n) => emit('unread', n)
})

const { scrollToBottom } = useScroll(messagesRef)

const { members, loadMembers } = useChallengeMembers({ currentUserId: props.currentUser.id })

const { checkingIn, checkIn } = useChallengeCheckIn({ currentUserId: props.currentUser.id })

const { avatarInput, uploadingAvatar, updateAvatar } = useChallengeAvatar()

const { deleteChallenge: doDeleteChallenge } = useDeleteChallenge()

const { invites, loadInvites, inviteUser } = useChallengeInvites({
  currentUserId: props.currentUser.id
})

const { pendingInvites, loadPendingInvites } = useChallengePendingInvites({
  currentUserId: props.currentUser.id
})

const {
  editingMsg, editText,
  startEdit, saveEdit, cancelEdit, 
  deleteMessage: deleteMsgAction, // ← renombrar del composable
  replyTo, cancelReply,
} = useMessageActions({
  messagesRef: messages,
  tableName: 'chat_group_messages'
})

// ═══════════════════════════════════════════════════════
// ESTADO LOCAL
// ═══════════════════════════════════════════════════════
const activeChallenge = ref(null)
const showLeftPanel   = ref(true)
const showInvites     = ref(false)
const showMembers     = ref(false)
const showSearch      = ref(false)
const newMessage      = ref('')
const imagePreview    = ref(null)
const selectedImage   = ref(null)
const uploadingImage  = ref(false)
const previewImageUrl = ref(null)
const showPending     = ref(true)
const showDeleteMsgModal = ref(false)
const showDeleteChallengeModal = ref(false)
const msgToDelete = ref(null)
const challengesToDelete = ref(null)

const { grouped: groupedMessages } = useGroupedMessages(messages, formatDate)

// ═══════════════════════════════════════════════════════
// COMPUTED
// ═══════════════════════════════════════════════════════
const myMembership = computed(() =>
  members.value.find(m => m.id === props.currentUser?.id) || null
)

const alreadyCheckedToday = computed(() => {
  if (!myMembership.value?.last_check) return false
  return new Date(myMembership.value.last_check).toDateString() === new Date().toDateString()
})

const memberIds = computed(() => members.value.map(m => m.id))

const daysLeft = computed(() => {
  if (!activeChallenge.value) return 0
  const c = activeChallenge.value
  if (!c.starts_at) return c.total_days
  const start = new Date(c.starts_at)
  const end = new Date(start)
  end.setDate(end.getDate() + c.total_days)
  const diff = Math.ceil((end - new Date()) / 86400000)
  return Math.max(0, diff)
})

function progressPct(member, totalDays) {
  return Math.min(100, Math.round(((member?.days_done || 0) / totalDays) * 100))
}

// ═══════════════════════════════════════════════════════
// FUNCIONES
// ═══════════════════════════════════════════════════════
async function openChallenge(c) {
  activeChallenge.value = c
  showLeftPanel.value = false
  showInvites.value = false
  showSearch.value = false
  await Promise.all([
    loadMessages(c.id),
    loadMembers(c.id)
  ])
  await scrollToBottom()
  subscribeMessages(c.id, scrollToBottom)
}

async function deleteChallenge() {
  if (!activeChallenge.value) return
  const ok = await doDeleteChallenge(activeChallenge.value)
  if (ok) {
    activeChallenge.value = null
    messages.value = []
    showLeftPanel.value = true
    await loadChallenges()
  }
}

async function onAvatarChange(e) {
  const file = e.target.files[0]
  if (!file || !activeChallenge.value) return
  const url = await updateAvatar({ challenge: activeChallenge.value, file })
  if (url) {
    activeChallenge.value.avatar_url = url
    const idx = challenges.value.findIndex(c => c.id === activeChallenge.value.id)
    if (idx !== -1) challenges.value[idx].avatar_url = url
  }
}

async function uploadImage(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('chat-images').upload(name, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('chat-images').getPublicUrl(name)
  return data.publicUrl
}

async function sendMessage() {
  if (!activeChallenge.value) return
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
    challengeId: activeChallenge.value.id,
    content: newMessage.value,
    imageUrl,
    replyTo: replyingTo.value,
  })

  newMessage.value = ''
  clearImage()
  replyingTo.value = null
  await scrollToBottom()
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
  imagePreview.value = null
}

async function doCheckIn() {
  if (!activeChallenge.value || !myMembership.value) return
  const ok = await checkIn(
    activeChallenge.value.id,
    myMembership.value,
    props.profile
  )
  if (ok) {
    await loadMembers(activeChallenge.value.id)
    await loadMessages(activeChallenge.value.id)
  }
}

function backToList() {
  activeChallenge.value = null
  messages.value = []
  showLeftPanel.value = true
  showInvites.value = false
  showSearch.value = false
  cleanupMessages()
}

function isOwn(msg) {
  return msg.user_id === props.currentUser?.id
}

// ── Invitar miembros ──────────────────────────────────
async function doInviteUser(user) {
  const { data: existing } = await supabase
    .from('challenge_invites')
    .select('id, status')
    .eq('challenge_id', activeChallenge.value.id)
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

  const ok = await inviteUser({ 
    challengeId: activeChallenge.value.id, 
    userId: user.id 
  })
  if (ok) {
    alert(`Invitación enviada a ${user.username}`)
  } else {
    alert('Error al enviar invitación')
  }
}

async function respondToInvite(inviteId, status) {
  const { respondInvite } = useChallengeInvites({ currentUserId: props.currentUser.id })
  const ok = await respondInvite({ inviteId, status })
  if (ok) {
    if (status === 'accepted') {
      const invite = pendingInvites.value.find(i => i.id === inviteId)
      if (invite) {
        await supabase.from('group_challenge_members').insert({
          challenge_id: invite.challenge_id,
          user_id: props.currentUser.id,
          days_done: 0,
          role: 'member'
        })
        myMemberships.value.push(invite.challenge_id)
        await loadChallenges()
      }
    }
    pendingInvites.value = pendingInvites.value.filter(i => i.id !== inviteId)
  }
}

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

// Abrir modal para eliminar reto
function openDeleteChallengeModal(challenge) {
  challengesToDelete.value = challenge
  showDeleteChallengeModal.value = true
}

// Confirmar eliminación de reto
async function confirmDeleteChallenge() {
  if (!challengesToDelete.value) return
  const ok = await doDeleteChallenge(challengesToDelete.value)
  if (ok) {
    activeChallenge.value = null
    messages.value = []
    showLeftPanel.value = true
    await loadChallenges()
  }
  showDeleteChallengeModal.value = false
  challengesToDelete.value = null
}
// ── Realtime invitaciones pendientes ─────────────────
let invitesSub = null

function subscribeInvites() {
  if (invitesSub) supabase.removeChannel(invitesSub)
  invitesSub = supabase
    .channel(`challenge-invites-${props.currentUser.id}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'challenge_invites',
      filter: `invited_user_id=eq.${props.currentUser.id}`
    }, () => {
      loadPendingInvites()
    })
    .subscribe()
}

// ── Lifecycle ─────────────────────────────────────────
onMounted(async () => {
  await loadChallenges()
  loadPendingInvites()
  subscribeInvites()
  if (props.initialChallengeId) {
    const target = challenges.value.find(c => c.id === props.initialChallengeId)
    if (target) await openChallenge(target)
  }
})
onUnmounted(() => {
  cleanupMessages()
  if (invitesSub) supabase.removeChannel(invitesSub)
})
</script>

<template>
  <div class="cgc">

    <!-- ══ PANEL IZQUIERDO ════════════════════════════ -->
    <div class="left-panel" :class="{ 'hidden-mobile': !showLeftPanel }">

      <div class="panel-head">
        <span class="panel-title">Retos grupales</span>
        <button class="icon-btn" @click="showCreate = !showCreate" title="Crear reto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="18" height="18">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      <!-- Invitaciones pendientes -->
      <div v-if="pendingInvites.length" class="pending-invites">
        <div class="pi-header" @click="showPending = !showPending">
          <span class="pi-title">📩 Invitaciones</span>
          <span class="pi-badge">{{ pendingInvites.length }}</span>
          <svg 
            :class="{ rotated: showPending }" 
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" 
            stroke-linecap="round" stroke-linejoin="round" width="14" height="14"
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
        <Transition name="slide-down">
          <div v-if="showPending" class="pi-list">
            <div v-for="inv in pendingInvites" :key="inv.id" class="pi-item">
              <div class="pi-info">
                <span class="pi-group">{{ inv.challenge_name }}</span>
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
        <button :class="{ active: viewMode === 'mine' }" @click="viewMode = 'mine'">Mis retos</button>
        <button :class="{ active: viewMode === 'explore' }" @click="viewMode = 'explore'">Explorar</button>
      </div>

      <!-- Búsqueda -->
      <div v-if="viewMode === 'explore'" class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          class="cf-input search-input"
          placeholder="Buscar retos..."
        />
      </div>

      <!-- Formulario crear reto -->
      <Transition name="slide-down">
        <div v-if="showCreate" class="create-form">
          <input v-model="form.title" class="cf-input" placeholder="Nombre del reto" maxlength="50" />
          <input v-model="form.description" class="cf-input" placeholder="Descripción (opcional)" maxlength="100" />
          <div class="cf-cats">
            <button
              v-for="cat in CHALLENGE_CATEGORIES" :key="cat.key"
              class="cf-cat"
              :class="{ active: form.category === cat.key }"
              :style="form.category === cat.key
                ? { background: cat.color, borderColor: cat.color, color: '#fff' }
                : { borderColor: cat.color + '55' }"
              @click="form.category = cat.key"
            >{{ cat.label }}</button>
          </div>
          <div class="cf-days-row">
            <span class="cf-days-label">Duración</span>
            <div class="cf-days-presets">
              <button
                v-for="d in [7, 14, 21, 30, 60, 90]" :key="d"
                class="cf-day-btn"
                :class="{ active: form.total_days === d }"
                @click="form.total_days = d"
              >{{ d }}d</button>
            </div>
          </div>
          <label class="cf-private">
            <input type="checkbox" v-model="form.is_private" />
            <span>Reto privado (solo por invitación)</span>
          </label>
          <p v-if="formError" class="cf-error">{{ formError }}</p>
          <div class="cf-actions">
            <button class="cf-btn-create" @click="createChallenge" :disabled="creating">
              {{ creating ? 'Creando...' : 'Crear reto' }}
            </button>
            <button class="cf-btn-cancel" @click="showCreate = false">Cancelar</button>
          </div>
        </div>
      </Transition>

      <!-- Lista de retos -->
      <div class="challenge-list">
        <div v-if="loading" class="list-empty">
          <div class="mini-spinner"></div>
        </div>

        <div v-else-if="!filteredChallenges.length" class="list-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4 22h16" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p v-if="viewMode === 'mine'">No estás en ningún reto</p>
          <p v-else>No hay retos públicos</p>
          <span v-if="viewMode === 'mine'">Únete a uno o crea el tuyo</span>
        </div>

        <button
          v-for="c in filteredChallenges" :key="c.id"
          class="challenge-item"
          :class="{ active: activeChallenge?.id === c.id }"
          @click="openChallenge(c)"
        >
          <div class="ci-icon" :style="{ background: c.avatar_url ? 'transparent' : categoryColor(c.category) }">
            <img v-if="c.avatar_url" :src="c.avatar_url" class="ci-avatar-img" />
            <span v-else>{{ initials(c.title) }}</span>
          </div>
          <div class="ci-info">
            <span class="ci-title">{{ c.title }}</span>
            <span class="ci-meta">
              {{ c.total_days }}d · {{ categoryLabel(c.category) }} {{ c.is_private ? '· 🔒' : '' }}
            </span>
          </div>
          <div class="ci-right">
            <span v-if="c.group_challenge_members?.count > 0" class="ci-count">
              {{ c.group_challenge_members.count }}
            </span>
            <span class="ci-badge" :class="{ member: isMember(c.id) }" :style="isMember(c.id) ? { background: categoryColor(c.category) } : {}">
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
    <div class="right-panel" :class="{ 'hidden-mobile': showLeftPanel, 'has-challenge': activeChallenge }">

      <!-- Estado vacío -->
      <div v-if="!activeChallenge" class="panel-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4 22h16" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3>Retos grupales</h3>
        <p>Selecciona un reto o crea uno nuevo para empezar</p>
      </div>

      <template v-else>

        <!-- Header del reto -->
        <div class="challenge-top">
          <button class="back-btn" @click="backToList">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>

          <div class="ct-icon-wrapper">
            <div class="ct-icon" :style="{ background: activeChallenge.avatar_url ? 'transparent' : categoryColor(activeChallenge.category) }">
              <img v-if="activeChallenge.avatar_url" :src="activeChallenge.avatar_url" class="ct-avatar-img" />
              <span v-else>{{ initials(activeChallenge.title) }}</span>
            </div>
            <button v-if="isAdmin(activeChallenge, currentUser.id)" class="avatar-edit-btn" @click="avatarInput.click()" title="Cambiar imagen">
              <svg v-if="!uploadingAvatar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span v-else class="spinner-sm"></span>
            </button>
            <input type="file" ref="avatarInput" accept="image/*" style="display:none" @change="onAvatarChange" />
          </div>

          <div class="ct-info">
            <span class="ct-title">{{ activeChallenge.title }}</span>
            <span class="ct-meta">
              {{ members.length }} participante{{ members.length !== 1 ? 's' : '' }}
              · {{ daysLeft }} días restantes
              {{ activeChallenge.is_private ? '· Privado 🔒' : '' }}
            </span>
          </div>

          <button
            class="join-btn"
            :style="isMember(activeChallenge.id)
              ? { background: 'rgba(34,40,78,.06)', color: 'rgba(34,40,78,.5)' }
              : { background: categoryColor(activeChallenge.category), color: '#fff' }"
            @click="toggleMember(activeChallenge.id)"
          >
            {{ isMember(activeChallenge.id) ? 'Salir' : 'Unirse' }}
          </button>

          <button
            v-if="isAdmin(activeChallenge, currentUser.id)"
            class="invite-btn"
            :class="{ active: showInvites }"
            @click="showInvites = !showInvites; showSearch = false"
            title="Invitar miembros"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </button>

          <button v-if="isAdmin(activeChallenge, currentUser.id)" class="delete-btn" @click="openDeleteChallengeModal(activeChallenge)" title="Eliminar reto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>

        <!-- Descripción -->
        <div v-if="activeChallenge.description" class="challenge-desc">
          {{ activeChallenge.description }}
        </div>

        <!-- Panel invitar -->
        <Transition name="slide-down">
          <div v-if="showInvites" class="invite-panel">
            <ChatSearch
              :current-user-id="currentUser.id"
              :exclude-ids="memberIds"
              mode="invite"
              placeholder="Buscar usuario para invitar..."
              @message="doInviteUser"
              @close="showInvites = false"
            />
          </div>
        </Transition>

        <!-- Progreso miembros -->
        <div class="members-progress">
          <div class="mp-header" @click="showMembers = !showMembers">
            <span class="mp-label">Progreso del equipo</span>
            <div class="mp-header-right">
              <button
                v-if="isMember(activeChallenge.id)"
                class="checkin-btn"
                :class="{ done: alreadyCheckedToday }"
                :disabled="alreadyCheckedToday || checkingIn"
                :style="alreadyCheckedToday
                  ? { background: 'rgba(34,197,94,.1)', color: '#16a34a', borderColor: 'rgba(34,197,94,.25)' }
                  : { background: categoryColor(activeChallenge.category), color: '#fff', borderColor: 'transparent' }"
                @click.stop="doCheckIn"
              >
                <svg v-if="alreadyCheckedToday" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <svg v-else-if="checkingIn" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                {{ alreadyCheckedToday ? 'Día completado' : checkingIn ? 'Guardando...' : 'Check-in hoy' }}
              </button>
              <svg 
                :class="{ rotated: showMembers }" 
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" 
                stroke-linecap="round" stroke-linejoin="round" width="14" height="14"
                style="color: rgba(34,40,78,.3); transition: transform .2s;"
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
          </div>

          <Transition name="slide-down">
            <div v-if="showMembers" class="members-list">
              <div
                v-for="(m, i) in members"
                :key="m.id"
                class="member-row"
                :class="{ 'is-me': m.id === currentUser.id }"
              >
                <span class="mr-rank" :class="{ gold: i === 0, silver: i === 1, bronze: i === 2 }">{{ i + 1 }}</span>
                <div class="mr-avatar">
                  <img v-if="m.avatar_url" :src="m.avatar_url" />
                  <span v-else>{{ initials(m.username) }}</span>
                </div>
                <div class="mr-info">
                  <div class="mr-name-row">
                    <span class="mr-name">
                      {{ m.username }}
                      <span v-if="m.id === currentUser.id" class="me-tag">Tú</span>
                      <span v-if="m.role === 'admin'" class="admin-tag">Admin</span>
                    </span>
                    <span class="mr-days">
                      {{ m.days_done }}/{{ activeChallenge.total_days }}d
                    </span>
                  </div>
                  <div class="mr-bar-track">
                    <div
                      class="mr-bar-fill"
                      :style="{
                        width: progressPct(m, activeChallenge.total_days) + '%',
                        background: categoryColor(activeChallenge.category)
                      }"
                    ></div>
                  </div>
                </div>
                <div class="mr-today">
                  <svg v-if="m.last_check && new Date(m.last_check).toDateString() === new Date().toDateString()"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"
                    :style="{ color: categoryColor(activeChallenge.category) }"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <svg v-else
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"
                    style="color: rgba(34,40,78,.2)"
                  >
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                </div>
              </div>
              <div v-if="!members.length" class="mp-empty">
                Únete para ver el progreso del equipo
              </div>
            </div>
          </Transition>
        </div>

        <!-- Messages (componente extraído) -->
        <ChatMessageList
          ref="messagesRef"
          :messages="groupedMessages"
          :current-user-id="currentUser.id"
          :is-own="isOwn"
          :typing-text="''"
          :show-author="true"
          avatar-source="profile"
          enable-image-click
          @reaction="(msg, emoji) => {}"
          @reply="replyTo"
          @edit="startEdit"
          @delete="openDeleteMsgModal($event)"
          @image-click="previewImageUrl = $event"
        />

        <!-- Reply bar (componente extraído) -->
        <ChatReplyBar
          :replying-to="replyingTo"
          :author-name="activeChallenge?.title"
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
          v-if="isMember(activeChallenge.id)"
          v-model="newMessage"
          :image-preview="imagePreview"
          :uploading="uploadingImage"
          :send-color="categoryColor(activeChallenge.category)"
          @send="sendMessage"
          @attach="onFileChange"
        />

        <!-- Banner unirse -->
        <div v-else class="join-banner">
          <p>Únete al reto para participar en el chat</p>
          <button
            class="join-banner-btn"
            :style="{ background: categoryColor(activeChallenge.category) }"
            @click="toggleMember(activeChallenge.id)"
          >
            Unirse a "{{ activeChallenge.title }}"
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
    :show="showDeleteChallengeModal"
    title="¿Eliminar reto?"
    message="Se borrarán todos los mensajes y miembros. Esta acción no se puede deshacer."
    confirm-text="Eliminar"
    cancel-text="Cancelar"
    type="danger"
    @confirm="confirmDeleteChallenge"
    @cancel="showDeleteChallengeModal = false"
  />
</template>

<style scoped>
.cgc {
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

/* ══ PANEL IZQUIERDO ════════════════════════════════ */
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

/* Búsqueda */
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
.cf-days-row { display: flex; align-items: center; gap: 8px; }
.cf-days-label { font-size: 11px; font-weight: 700; color: rgba(34,40,78,.45); white-space: nowrap; }
.cf-days-presets { display: flex; gap: 4px; flex-wrap: wrap; }
.cf-day-btn {
  padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;
  border: 1.5px solid rgba(34,40,78,.1); background: transparent;
  color: rgba(34,40,78,.5); cursor: pointer; transition: all .15s;
}
.cf-day-btn.active { background: #22284E; border-color: #22284E; color: #fff59e; }
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

/* Lista retos */
.challenge-list { flex: 1; overflow-y: auto; padding: 4px 8px 8px; min-height: 0; }
.list-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 40px 16px; text-align: center;
  color: rgba(34,40,78,.3);
}
.list-empty p { font-size: 13px; font-weight: 600; margin: 0; }
.list-empty span { font-size: 11px; }
.mini-spinner {
  width: 24px; height: 24px;
  border: 2px solid rgba(34,40,78,.1);
  border-top-color: #ff6b9d; border-radius: 50%;
  animation: spin .7s linear infinite;
}

.challenge-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px; border-radius: 12px;
  width: 100%; border: none; background: transparent;
  cursor: pointer; text-align: left; transition: background .15s;
}
.challenge-item:hover { background: rgba(34,40,78,.04); }
.challenge-item.active { background: rgba(99,102,241,.08); }

.ci-icon {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0;
  overflow: hidden;
}
.ci-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.ci-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ci-title { font-size: 13px; font-weight: 700; color: #22284E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ci-meta { font-size: 11px; color: rgba(34,40,78,.4); }
.ci-right { display: flex; align-items: center; gap: 6px; }
.ci-count {
  font-size: 10px; font-weight: 700; color: rgba(34,40,78,.4);
  background: rgba(34,40,78,.06); padding: 2px 6px; border-radius: 99px;
}
.ci-badge {
  width: 22px; height: 22px; border-radius: 50%;
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
.panel-empty p { font-size: 13px; margin: 0; max-width: 220px; }

/* Header reto activo */
.challenge-top {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(34,40,78,.06);
  flex-shrink: 0;
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
.ct-title { font-size: 14px; font-weight: 800; color: #22284E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ct-meta { font-size: 11px; color: rgba(34,40,78,.4); font-weight: 600; }

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

.challenge-desc {
  padding: 10px 16px; font-size: 13px; color: rgba(34,40,78,.5);
  background: rgba(34,40,78,.02); border-bottom: 1px solid rgba(34,40,78,.05);
  flex-shrink: 0;
}

/* Panel invitar */
.invite-panel {
  border-bottom: 1px solid rgba(34,40,78,.07);
  max-height: 280px; flex-shrink: 0; overflow: hidden;
}

/* Progreso miembros  */
.members-progress {
  border-bottom: 1px solid rgba(34,40,78,.06);
  flex-shrink: 0;
}
.mp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  transition: background .15s;
}
.mp-header:hover {
  background: rgba(34,40,78,.02);
}
.mp-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mp-header svg.rotated {
  transform: rotate(180deg);
}
.mp-label {
  font-size: 10px;
  font-weight: 700;
  color: rgba(34,40,78,.4);
  text-transform: uppercase;
  letter-spacing: .07em;
}

/* Check-in btn ahora dentro del header */
.checkin-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 14px; border-radius: 99px;
  border: 1.5px solid transparent; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit;
  transition: opacity .2s, transform .15s;
}
.checkin-btn svg { display: block; }
.checkin-btn:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
.checkin-btn:disabled { cursor: not-allowed; }
.checkin-btn.done { cursor: default; }
.spin { animation: spin .7s linear infinite; }

.members-list {
  display: flex; flex-direction: column; gap: 8px;
  padding: 0 16px 12px;
  max-height: 200px;
  overflow-y: auto;
}
.mp-empty { font-size: 12px; color: rgba(34,40,78,.35); text-align: center; padding: 8px 0; }

.member-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border-radius: 10px;
  transition: background .15s;
}
.member-row:hover { background: rgba(34,40,78,.03); }
.member-row.is-me { background: rgba(34,40,78,.04); }

.mr-rank {
  font-size: 11px; font-weight: 700; color: rgba(34,40,78,.3);
  min-width: 18px; text-align: center;
}
.mr-rank.gold { color: #f59e0b; text-shadow: 0 0 10px rgba(245,158,11,.3); }
.mr-rank.silver { color: #94a3b8; }
.mr-rank.bronze { color: #f97316; }

.mr-avatar {
  width: 30px; height: 30px; border-radius: 8px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
}
.mr-avatar img { width: 100%; height: 100%; object-fit: cover; }

.mr-info { flex: 1; min-width: 0; }
.mr-name-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 4px;
}
.mr-name {
  font-size: 12px; font-weight: 700; color: #22284E;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  display: flex; align-items: center; gap: 5px;
}
.me-tag {
  font-size: 9px; font-weight: 700;
  background: rgba(34,40,78,.1); color: rgba(34,40,78,.5);
  padding: 1px 6px; border-radius: 99px;
}
.admin-tag {
  font-size: 9px; font-weight: 700;
  background: rgba(255,107,157,.12); color: #ff6b9d;
  padding: 1px 6px; border-radius: 99px;
}
.mr-days { font-size: 11px; font-weight: 700; color: rgba(34,40,78,.4); white-space: nowrap; flex-shrink: 0; }

.mr-bar-track {
  height: 4px; background: rgba(34,40,78,.07);
  border-radius: 99px; overflow: hidden;
}
.mr-bar-fill {
  height: 100%; border-radius: 99px; min-width: 4px;
  transition: width .6s cubic-bezier(.4,0,.2,1);
}

.mr-today { flex-shrink: 0; display: flex; align-items: center; }
.mr-today svg { display: block; }

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
.slide-down-enter-active, .slide-down-leave-active { transition: all .22s ease; }
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

/* Spinner */
@keyframes spin { to { transform: rotate(360deg); } }
.spinner-sm {
  width: 10px; height: 10px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
  animation: spin .7s linear infinite; display: block;
}

/* ══ RESPONSIVE MÓVIL ═══════════════════════════════ */
@media (max-width: 768px) {
  .cgc {
    grid-template-columns: 1fr;
    border-radius: 20px; border: none; box-shadow: none;
    position: relative; height: 100%;
  }
  .left-panel.hidden-mobile { display: none; }
  .right-panel.hidden-mobile { display: none; }
  .right-panel.has-challenge {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    z-index: 100; border-radius: 0; height: 100%; height: 100dvh; max-height: 100dvh;
    padding-bottom: calc(70px + env(safe-area-inset-bottom));
  }
  .back-btn { display: flex; }
}
</style>