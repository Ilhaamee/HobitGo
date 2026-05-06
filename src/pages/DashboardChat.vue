<template>
  <div class="dashboard-chat">
    <h1>Chat</h1>
    <p class="subtitle">Conecta con la comunidad</p>

    <div v-if="needsUsername" class="username-setup">
      <div class="setup-card">
        <h2>Elige tu nombre de usuario</h2>
        <p>Necesitas un nombre para participar en el chat</p>
        <input v-model="usernameInput" type="text" class="input" placeholder="Tu nombre de usuario" @keyup.enter="saveUsername" />
        <div v-if="usernameError" class="error-message">{{ usernameError }}</div>
        <button class="btn-primary" @click="saveUsername" :disabled="savingUsername">
          {{ savingUsername ? 'Guardando...' : 'Continuar' }}
        </button>
      </div>
    </div>

    <div v-else class="chat-container">
      <div class="chat-list">
        <div class="chat-item" :class="{ active: activeTab === 'community' }" @click="setTab('community')">
          <div class="chat-avatar community">🌍</div>
          <div class="chat-info">
            <h4>Comunidad</h4>
            <p>Canal público</p>
          </div>
        </div>

        <div class="chat-list-header">
          <span>Grupos</span>
          <button class="btn-header-action" @click="showCreateGroup = true" title="Crear grupo">+</button>
        </div>

        <div
          v-for="group in groups"
          :key="'g_' + group.id"
          class="chat-item"
          :class="{ active: activeTab === 'group_' + group.id }"
          @click="openGroup(group)"
        >
          <div class="chat-avatar group-avatar">{{ group.icon }}</div>
          <div class="chat-info">
            <h4>{{ group.name }}</h4>
            <p>{{ group.memberCount }} miembro{{ group.memberCount !== 1 ? 's' : '' }}</p>
          </div>
        </div>

        <div v-if="groups.length === 0" class="empty-section-hint">Sin grupos aún. ¡Crea el primero!</div>

        <div class="chat-list-header"><span>Mensajes privados</span></div>

        <div
          v-for="conv in conversations"
          :key="conv.user_id"
          class="chat-item"
          :class="{ active: activeTab === conv.user_id }"
          @click="openPrivate(conv)"
        >
          <div class="chat-avatar-img" v-if="conv.avatar_url">
            <img :src="conv.avatar_url" :alt="conv.username" />
          </div>
          <div class="chat-avatar" v-else>{{ conv.username[0].toUpperCase() }}</div>
          <div class="chat-info">
            <h4>{{ conv.username }}</h4>
            <p>{{ conv.lastMessage }}</p>
          </div>
        </div>

        <div class="new-chat">
          <input v-model="searchUser" type="text" class="input" placeholder="Buscar usuario..." @input="searchUsers" />
          <div v-if="searchResults.length > 0" class="search-results">
            <div
              v-for="user in searchResults"
              :key="user.id"
              class="search-result-item"
              @click="openPrivate({ user_id: user.id, username: user.username, avatar_url: user.avatar_url, lastMessage: '' })"
            >
              <img v-if="user.avatar_url" :src="user.avatar_url" class="search-avatar" />
              <div v-else class="search-avatar-placeholder">{{ user.username[0].toUpperCase() }}</div>
              {{ user.username }}
            </div>
          </div>
        </div>
      </div>

      <div class="chat-room">
        <div class="chat-header">
          <div class="chat-header-info">
            <h3>{{ chatHeaderTitle }}</h3>
            <span v-if="activeGroupData" class="header-members">{{ activeGroupData.memberCount }} miembros</span>
          </div>
          <div class="chat-header-actions">
            <button
              v-if="activeTab !== 'community' && !activeTab.startsWith('group_')"
              class="btn-add-to-group"
              @click="openAddToGroupModal"
            >
              <span class="btn-icon">👥</span>
              <span>Añadir al grupo</span>
            </button>
            <button
              v-if="activeTab.startsWith('group_')"
              class="btn-add-to-group"
              @click="openAddMemberModal"
            >
              <span class="btn-icon">➕</span>
              <span>Añadir miembro</span>
            </button>
          </div>
        </div>

        <div class="messages" ref="messagesContainer">
          <div
            v-for="msg in activeMessages"
            :key="msg.id"
            class="message-wrapper"
            :class="isOwnMessage(msg) ? 'sent' : 'received'"
          >
            <div v-if="!isOwnMessage(msg)" class="msg-avatar-wrap">
              <img v-if="msg.profiles?.avatar_url" :src="msg.profiles.avatar_url" class="msg-avatar" />
              <div v-else class="msg-avatar-placeholder">{{ (msg.username || '?')[0].toUpperCase() }}</div>
            </div>
            <div class="message" :class="isOwnMessage(msg) ? 'sent' : 'received'">
              <span v-if="(activeTab === 'community' || activeTab.startsWith('group_')) && !isOwnMessage(msg)" class="msg-username">{{ msg.username }}</span>
              <div v-if="msg.image_url" class="message-image" @click="openImagePreview(msg.image_url)">
                <img :src="msg.image_url" alt="Imagen enviada" />
              </div>
              <p v-if="msg.content">{{ msg.content }}</p>
              <span class="time">{{ formatTime(msg.created_at) }}</span>
            </div>
          </div>
          <div v-if="activeMessages.length === 0" class="no-messages">No hay mensajes aún. ¡Sé el primero!</div>
        </div>

        <div v-if="imagePreview" class="image-preview-container">
          <div class="image-preview">
            <img :src="imagePreview" alt="Preview" />
            <button class="remove-preview" @click="clearImagePreview">×</button>
          </div>
        </div>

        <div class="message-input">
          <input type="file" ref="fileInput" accept="image/*" style="display: none" @change="handleImageSelect" />
          <button class="attach-btn" @click="$refs.fileInput.click()">📎</button>
          <input
            v-model="newMessage"
            type="text"
            :placeholder="selectedImage ? 'Añade un texto (opcional)...' : 'Escribe un mensaje...'"
            @keyup.enter="sendMessage"
            :disabled="uploadingImage"
          />
          <button class="send-btn" @click="sendMessage" :disabled="(!newMessage.trim() && !selectedImage) || uploadingImage">
            <span v-if="uploadingImage">⏳</span>
            <span v-else>📤</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="previewImageUrl" class="image-modal" @click="previewImageUrl = null">
      <img :src="previewImageUrl" alt="Vista previa" />
    </div>

    <!-- Modal: Crear grupo -->
    <div v-if="showCreateGroup" class="modal-overlay" @click.self="showCreateGroup = false">
      <div class="modal-card">
        <h2>Crear nuevo grupo</h2>
        <p>Crea un espacio privado para compartir con otros</p>
        <div class="emoji-picker">
          <span v-for="emoji in groupEmojis" :key="emoji" class="emoji-option" :class="{ selected: newGroupIcon === emoji }" @click="newGroupIcon = emoji">{{ emoji }}</span>
        </div>
        <input v-model="newGroupName" type="text" class="input" placeholder="Nombre del grupo" maxlength="40" />
        <input v-model="newGroupDesc" type="text" class="input" placeholder="Descripción (opcional)" maxlength="100" />
        <div v-if="createGroupError" class="error-message">{{ createGroupError }}</div>
        <div class="modal-actions">
          <button class="btn-primary" @click="createGroup" :disabled="creatingGroup">{{ creatingGroup ? 'Creando...' : 'Crear grupo' }}</button>
          <button class="btn-cancel" @click="showCreateGroup = false">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal: Añadir usuario a grupo (desde privado) -->
    <div v-if="showAddToGroup" class="modal-overlay" @click.self="showAddToGroup = false">
      <div class="modal-card">
        <h2>Añadir <strong>{{ activeUsername }}</strong> a un grupo</h2>
        <p>Selecciona el grupo al que quieres invitar a este usuario</p>
        <div v-if="myAdminGroups.length === 0" class="empty-hint">
          No eres administrador de ningún grupo todavía.<br />
          <button class="btn-link" @click="showAddToGroup = false; showCreateGroup = true">Crea uno nuevo</button>
        </div>
        <div v-else class="group-select-list">
          <div
            v-for="group in myAdminGroups"
            :key="group.id"
            class="group-select-item"
            :class="{ added: addedGroupIds.includes(group.id) }"
            @click="addUserToGroup(group)"
          >
            <span class="group-icon">{{ group.icon }}</span>
            <div class="group-select-info">
              <strong>{{ group.name }}</strong>
              <span>{{ group.memberCount }} miembros</span>
            </div>
            <span v-if="addedGroupIds.includes(group.id)" class="check-mark">✅</span>
            <span v-else class="add-mark">Invitar →</span>
          </div>
        </div>
        <div v-if="addToGroupMsg" class="success-message">{{ addToGroupMsg }}</div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showAddToGroup = false">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Modal: Añadir miembro al grupo actual -->
    <div v-if="showAddMember" class="modal-overlay" @click.self="showAddMember = false">
      <div class="modal-card">
        <h2>Añadir miembro al grupo</h2>
        <p>Busca un usuario para invitarlo a <strong>{{ activeGroupData?.name }}</strong></p>
        <input v-model="addMemberSearch" type="text" class="input" placeholder="Buscar usuario..." @input="searchMemberCandidates" />
        <div v-if="memberCandidates.length > 0" class="search-results">
          <div v-for="user in memberCandidates" :key="user.id" class="search-result-item" @click="addMemberToCurrentGroup(user)">
            <img v-if="user.avatar_url" :src="user.avatar_url" class="search-avatar" />
            <div v-else class="search-avatar-placeholder">{{ user.username[0].toUpperCase() }}</div>
            <span style="flex:1">{{ user.username }}</span>
            <span v-if="addedMemberIds.includes(user.id)" class="check-mark">✅</span>
            <span v-else class="add-mark">Añadir →</span>
          </div>
        </div>
        <div v-if="addMemberMsg" class="success-message">{{ addMemberMsg }}</div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showAddMember = false">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { supabase } from '../lib/supabase'

const currentUser = ref(null)
const profile = ref(null)
const needsUsername = ref(false)
const usernameInput = ref('')
const usernameError = ref('')
const savingUsername = ref(false)

const activeTab = ref('community')
const activeUsername = ref('')
const communityMessages = ref([])
const privateMessages = ref([])
const groupMessages = ref([])
const conversations = ref([])
const groups = ref([])
const newMessage = ref('')
const messagesContainer = ref(null)
const searchUser = ref('')
const searchResults = ref([])

const selectedImage = ref(null)
const imagePreview = ref(null)
const uploadingImage = ref(false)
const previewImageUrl = ref(null)
const fileInput = ref(null)

const showCreateGroup = ref(false)
const newGroupName = ref('')
const newGroupDesc = ref('')
const newGroupIcon = ref('💬')
const createGroupError = ref('')
const creatingGroup = ref(false)
const groupEmojis = ['💬','🏃','🎨','🎵','📚','🌿','🍳','✈️','🎮','🧘','🏋️','📷','🎯','⚽','🌊']
const activeGroupData = ref(null)
const groupSubscription = ref(null)

const showAddToGroup = ref(false)
const myAdminGroups = ref([])
const addedGroupIds = ref([])
const addToGroupMsg = ref('')

const showAddMember = ref(false)
const addMemberSearch = ref('')
const memberCandidates = ref([])
const addedMemberIds = ref([])
const addMemberMsg = ref('')

let communitySubscription = null
let privateSubscription = null

const activeMessages = computed(() => {
  if (activeTab.value === 'community') return communityMessages.value
  if (activeTab.value.startsWith('group_')) return groupMessages.value
  return privateMessages.value
})

const chatHeaderTitle = computed(() => {
  if (activeTab.value === 'community') return '🌍 Comunidad HobitGo'
  if (activeTab.value.startsWith('group_')) return `${activeGroupData.value?.icon || '💬'} ${activeGroupData.value?.name || 'Grupo'}`
  return activeUsername.value
})

function isOwnMessage(msg) {
  return msg.sender_id === currentUser.value?.id || msg.user_id === currentUser.value?.id
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function setTab(tab) {
  activeTab.value = tab
  activeGroupData.value = null
}

function handleImageSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { alert('La imagen no puede superar los 5MB'); return }
  if (!file.type.startsWith('image/')) { alert('El archivo debe ser una imagen'); return }
  selectedImage.value = file
  const reader = new FileReader()
  reader.onload = (e) => { imagePreview.value = e.target.result }
  reader.readAsDataURL(file)
}

function clearImagePreview() {
  selectedImage.value = null
  imagePreview.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function openImagePreview(url) { previewImageUrl.value = url }

async function uploadImage(file) {
  const fileExt = file.name.split('.').pop().toLowerCase()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const { error } = await supabase.storage.from('chat-images').upload(fileName, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(fileName)
  return urlData.publicUrl
}

async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user
  if (!user) return
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (data) {
    profile.value = data
    needsUsername.value = false
    await loadCommunityMessages()
    await loadConversations()
    await loadGroups()
    subscribeToMessages()
  } else {
    needsUsername.value = true
  }
}

async function saveUsername() {
  if (!usernameInput.value.trim()) { usernameError.value = 'El nombre de usuario es obligatorio'; return }
  savingUsername.value = true
  usernameError.value = ''
  const { error } = await supabase.from('profiles').insert({ id: currentUser.value.id, username: usernameInput.value.trim() })
  if (error) {
    usernameError.value = error.message.includes('unique') ? 'Ese nombre ya está en uso' : 'Error al guardar'
  } else {
    profile.value = { id: currentUser.value.id, username: usernameInput.value.trim() }
    needsUsername.value = false
    await loadCommunityMessages()
    await loadConversations()
    await loadGroups()
    subscribeToMessages()
  }
  savingUsername.value = false
}

async function loadCommunityMessages() {
  const { data, error } = await supabase.from('community_messages').select('*').order('created_at', { ascending: true }).limit(100)
  if (error || !data) return
  const userIds = [...new Set(data.map(msg => msg.user_id).filter(Boolean))]
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, avatar_url').in('id', userIds)
    const pm = {}
    if (profiles) profiles.forEach(p => { pm[p.id] = p })
    communityMessages.value = data.map(msg => ({ ...msg, profiles: pm[msg.user_id] || null }))
  } else {
    communityMessages.value = data
  }
  scrollToBottom()
}

async function loadConversations() {
  const { data } = await supabase.from('private_messages').select('*')
    .or(`sender_id.eq.${currentUser.value.id},receiver_id.eq.${currentUser.value.id}`)
    .order('created_at', { ascending: false })
  if (!data) return
  const convMap = {}
  for (const msg of data) {
    const otherId = msg.sender_id === currentUser.value.id ? msg.receiver_id : msg.sender_id
    if (!convMap[otherId]) convMap[otherId] = { user_id: otherId, lastMessage: msg.content || (msg.image_url ? '📷 Imagen' : '') }
  }
  const userIds = Object.keys(convMap)
  if (userIds.length === 0) return
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds)
  if (profiles) {
    conversations.value = profiles.map(p => ({ user_id: p.id, username: p.username, avatar_url: p.avatar_url || null, lastMessage: convMap[p.id]?.lastMessage || '' }))
  }
}

async function loadPrivateMessages(otherUserId) {
  const { data } = await supabase.from('private_messages').select('*')
    .or(`and(sender_id.eq.${currentUser.value.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.value.id})`)
    .order('created_at', { ascending: true })
  if (data) { privateMessages.value = data; scrollToBottom() }
}

function openPrivate(conv) {
  activeTab.value = conv.user_id
  activeUsername.value = conv.username
  activeGroupData.value = null
  searchUser.value = ''
  searchResults.value = []
  if (!conversations.value.find(c => c.user_id === conv.user_id)) conversations.value.unshift(conv)
  loadPrivateMessages(conv.user_id)
}

async function searchUsers() {
  if (!searchUser.value.trim()) { searchResults.value = []; return }
  const { data } = await supabase.from('profiles').select('*').ilike('username', `%${searchUser.value}%`).neq('id', currentUser.value.id).limit(5)
  if (data) searchResults.value = data
}

async function loadGroups() {
  const { data: memberData } = await supabase.from('chat_group_members').select('group_id').eq('user_id', currentUser.value.id)
  if (!memberData || memberData.length === 0) { groups.value = []; return }
  const groupIds = memberData.map(m => m.group_id)
  const { data: groupData } = await supabase.from('chat_groups').select('*').in('id', groupIds)
  if (!groupData) return
  const { data: allMembers } = await supabase.from('chat_group_members').select('group_id').in('group_id', groupIds)
  const countMap = {}
  if (allMembers) allMembers.forEach(m => { countMap[m.group_id] = (countMap[m.group_id] || 0) + 1 })
  groups.value = groupData.map(g => ({ ...g, memberCount: countMap[g.id] || 1 }))
}

async function loadGroupMessages(groupId) {
  const { data } = await supabase.from('chat_group_messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true }).limit(100)
  if (data) {
    const userIds = [...new Set(data.map(m => m.sender_id).filter(Boolean))]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, avatar_url').in('id', userIds)
      const pm = {}
      if (profiles) profiles.forEach(p => { pm[p.id] = p })
      groupMessages.value = data.map(msg => ({ ...msg, user_id: msg.sender_id, profiles: pm[msg.sender_id] || null }))
    } else {
      groupMessages.value = data.map(msg => ({ ...msg, user_id: msg.sender_id }))
    }
    scrollToBottom()
  }
}

function openGroup(group) {
  activeTab.value = 'group_' + group.id
  activeGroupData.value = group
  activeUsername.value = ''
  groupMessages.value = []
  loadGroupMessages(group.id)
  subscribeToGroupMessages(group.id)
}

function subscribeToGroupMessages(groupId) {
  if (groupSubscription.value) supabase.removeChannel(groupSubscription.value)
  groupSubscription.value = supabase.channel('group_' + groupId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_group_messages', filter: `group_id=eq.${groupId}` },
      async payload => {
        const msg = { ...payload.new, user_id: payload.new.sender_id }
        if (msg.sender_id) {
          const { data: prof } = await supabase.from('profiles').select('avatar_url').eq('id', msg.sender_id).single()
          msg.profiles = prof || null
        }
        groupMessages.value.push(msg)
        scrollToBottom()
      }
    ).subscribe()
}

async function createGroup() {
  if (!newGroupName.value.trim()) { createGroupError.value = 'El nombre es obligatorio'; return }
  creatingGroup.value = true
  createGroupError.value = ''
  const { data: groupData, error } = await supabase.from('chat_groups').insert({
    name: newGroupName.value.trim(),
    description: newGroupDesc.value.trim() || null,
    icon: newGroupIcon.value,
    created_by: currentUser.value.id
  }).select().single()
  if (error) { createGroupError.value = 'Error al crear el grupo'; creatingGroup.value = false; return }
  await supabase.from('chat_group_members').insert({ group_id: groupData.id, user_id: currentUser.value.id, role: 'admin' })
  await loadGroups()
  showCreateGroup.value = false
  newGroupName.value = ''
  newGroupDesc.value = ''
  newGroupIcon.value = '💬'
  creatingGroup.value = false
  openGroup({ ...groupData, memberCount: 1 })
}

async function openAddToGroupModal() {
  addedGroupIds.value = []
  addToGroupMsg.value = ''
  const { data: memberData } = await supabase.from('chat_group_members').select('group_id, role').eq('user_id', currentUser.value.id).eq('role', 'admin')
  if (!memberData || memberData.length === 0) { myAdminGroups.value = []; showAddToGroup.value = true; return }
  const groupIds = memberData.map(m => m.group_id)
  const { data: groupData } = await supabase.from('chat_groups').select('*').in('id', groupIds)
  if (!groupData) { myAdminGroups.value = []; showAddToGroup.value = true; return }
  const { data: allMembers } = await supabase.from('chat_group_members').select('group_id').in('group_id', groupIds)
  const countMap = {}
  if (allMembers) allMembers.forEach(m => { countMap[m.group_id] = (countMap[m.group_id] || 0) + 1 })
  const targetUserId = activeTab.value
  const { data: existing } = await supabase.from('chat_group_members').select('group_id').eq('user_id', targetUserId).in('group_id', groupIds)
  if (existing) addedGroupIds.value = existing.map(m => m.group_id)
  myAdminGroups.value = groupData.map(g => ({ ...g, memberCount: countMap[g.id] || 1 }))
  showAddToGroup.value = true
}

async function addUserToGroup(group) {
  if (addedGroupIds.value.includes(group.id)) return
  const targetUserId = activeTab.value
  const { error } = await supabase.from('chat_group_members').insert({ group_id: group.id, user_id: targetUserId, role: 'member' })
  if (!error) {
    addedGroupIds.value.push(group.id)
    addToGroupMsg.value = `✅ ${activeUsername.value} añadido a "${group.name}"`
    group.memberCount++
    await loadGroups()
  } else {
    addToGroupMsg.value = '❌ Error al añadir. Puede que ya sea miembro.'
  }
}

async function openAddMemberModal() {
  addedMemberIds.value = []
  addMemberMsg.value = ''
  addMemberSearch.value = ''
  memberCandidates.value = []
  const groupId = activeTab.value.replace('group_', '')
  const { data } = await supabase.from('chat_group_members').select('role').eq('group_id', groupId).eq('user_id', currentUser.value.id).single()
  const { data: currentMembers } = await supabase.from('chat_group_members').select('user_id').eq('group_id', groupId)
  if (currentMembers) addedMemberIds.value = currentMembers.map(m => m.user_id)
  if (!data || data.role !== 'admin') {
    addMemberMsg.value = 'Solo el administrador puede añadir miembros'
  }
  showAddMember.value = true
}

async function searchMemberCandidates() {
  if (!addMemberSearch.value.trim()) { memberCandidates.value = []; return }
  const { data } = await supabase.from('profiles').select('*').ilike('username', `%${addMemberSearch.value}%`).neq('id', currentUser.value.id).limit(5)
  if (data) memberCandidates.value = data
}

async function addMemberToCurrentGroup(user) {
  if (addedMemberIds.value.includes(user.id)) return
  const groupId = activeTab.value.replace('group_', '')
  const { error } = await supabase.from('chat_group_members').insert({ group_id: groupId, user_id: user.id, role: 'member' })
  if (!error) {
    addedMemberIds.value.push(user.id)
    addMemberMsg.value = `✅ ${user.username} añadido al grupo`
    if (activeGroupData.value) activeGroupData.value.memberCount++
    await loadGroups()
  } else {
    addMemberMsg.value = '❌ Error al añadir miembro'
  }
}

async function sendMessage() {
  const hasText = newMessage.value.trim().length > 0
  const hasImage = selectedImage.value !== null
  if ((!hasText && !hasImage) || uploadingImage.value) return

  let imageUrl = null
  if (hasImage) {
    uploadingImage.value = true
    try { imageUrl = await uploadImage(selectedImage.value) }
    catch (error) { alert('Error al subir la imagen: ' + error.message); uploadingImage.value = false; return }
  }

  const content = hasText ? newMessage.value.trim() : null

  try {
    let error = null
    if (activeTab.value === 'community') {
      const d = { user_id: currentUser.value.id, username: profile.value.username }
      if (content) d.content = content
      if (imageUrl) d.image_url = imageUrl
      const r = await supabase.from('community_messages').insert(d)
      error = r.error
    } else if (activeTab.value.startsWith('group_')) {
      const groupId = activeTab.value.replace('group_', '')
      const d = { group_id: groupId, sender_id: currentUser.value.id, username: profile.value.username }
      if (content) d.content = content
      if (imageUrl) d.image_url = imageUrl
      const r = await supabase.from('chat_group_messages').insert(d)
      error = r.error
    } else {
      const d = { sender_id: currentUser.value.id, receiver_id: activeTab.value }
      if (content) d.content = content
      if (imageUrl) d.image_url = imageUrl
      const r = await supabase.from('private_messages').insert(d)
      error = r.error
    }
    if (error) { alert('Error al enviar mensaje: ' + error.message); throw error }
    newMessage.value = ''
    clearImagePreview()
  } finally {
    uploadingImage.value = false
  }
}

function subscribeToMessages() {
  communitySubscription = supabase.channel('community')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' },
      async payload => {
        const msg = payload.new
        if (msg.user_id) {
          const { data: prof } = await supabase.from('profiles').select('avatar_url').eq('id', msg.user_id).single()
          msg.profiles = prof || null
        }
        communityMessages.value.push(msg)
        if (activeTab.value === 'community') scrollToBottom()
      }
    ).subscribe()

  privateSubscription = supabase.channel('private')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' },
      payload => {
        const msg = payload.new
        const isForMe = msg.receiver_id === currentUser.value.id || msg.sender_id === currentUser.value.id
        if (!isForMe) return
        const otherId = msg.sender_id === currentUser.value.id ? msg.receiver_id : msg.sender_id
        if (activeTab.value === otherId) { privateMessages.value.push(msg); scrollToBottom() }
        loadConversations()
      }
    ).subscribe()
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  })
}

watch(activeTab, () => scrollToBottom())
onMounted(async () => { await loadProfile() })
onUnmounted(() => {
  if (communitySubscription) supabase.removeChannel(communitySubscription)
  if (privateSubscription) supabase.removeChannel(privateSubscription)
  if (groupSubscription.value) supabase.removeChannel(groupSubscription.value)
})
</script>

<style scoped>
.dashboard-chat { max-width: 1000px; margin: 0 auto; }
h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 8px; }
.subtitle { color: #666; margin-bottom: 32px; }

.username-setup { display: flex; justify-content: center; align-items: center; min-height: 400px; }
.setup-card { background: #fff; padding: 40px; border-radius: 20px; box-shadow: 0 2px 20px rgba(0,0,0,0.05); width: 400px; max-width: 90vw; text-align: center; }
.setup-card h2 { font-size: 22px; color: #1a1a2e; margin-bottom: 8px; }
.setup-card p { color: #888; margin-bottom: 24px; }

.chat-container { display: grid; grid-template-columns: 280px 1fr; gap: 24px; height: calc(100vh - 200px); }

.chat-list { background: #fff; border-radius: 16px; overflow-y: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
.chat-list-header { font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase; padding: 12px 16px 4px; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: space-between; }
.btn-header-action { background: #E08E6B; color: #fff; border: none; border-radius: 6px; width: 22px; height: 22px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
.btn-header-action:hover { background: #d07a5a; }

.chat-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; transition: background 0.2s; border-left: 3px solid transparent; }
.chat-item:hover { background: #f9f9f9; }
.chat-item.active { background: #fff5f0; border-left-color: #E08E6B; }

.chat-avatar { width: 44px; height: 44px; border-radius: 12px; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0; }
.chat-avatar.community { background: #22284E; font-size: 20px; }
.chat-avatar.group-avatar { background: #f0f0f0; font-size: 22px; }
.chat-avatar-img { width: 44px; height: 44px; border-radius: 12px; overflow: hidden; flex-shrink: 0; }
.chat-avatar-img img { width: 100%; height: 100%; object-fit: cover; }

.chat-info { flex: 1; min-width: 0; }
.chat-info h4 { font-size: 14px; color: #1a1a2e; margin: 0 0 3px; }
.chat-info p { font-size: 12px; color: #888; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.empty-section-hint { font-size: 12px; color: #bbb; padding: 8px 16px 12px; text-align: center; }

.new-chat { padding: 12px; border-top: 1px solid #eee; margin-top: auto; }
.search-results { background: #fff; border: 1px solid #eee; border-radius: 8px; margin-top: 4px; overflow: hidden; }
.search-result-item { padding: 10px 12px; font-size: 14px; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 8px; }
.search-result-item:hover { background: #f5f5f5; }
.search-avatar { width: 28px; height: 28px; border-radius: 8px; object-fit: cover; }
.search-avatar-placeholder { width: 28px; height: 28px; border-radius: 8px; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }

.chat-room { background: #fff; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 2px 10px rgba(0,0,0,0.05); overflow: hidden; }
.chat-header { padding: 16px 20px; border-bottom: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.chat-header-info { display: flex; flex-direction: column; gap: 2px; }
.chat-header-info h3 { font-size: 18px; color: #1a1a2e; margin: 0; }
.header-members { font-size: 12px; color: #aaa; }
.chat-header-actions { flex-shrink: 0; }

.btn-add-to-group { display: flex; align-items: center; gap: 6px; background: #22284E; color: #fff; border: none; border-radius: 10px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
.btn-add-to-group:hover { background: #2f3870; }
.btn-icon { font-size: 16px; }

.messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.no-messages { color: #aaa; font-size: 14px; text-align: center; margin: auto; }

.message-wrapper { display: flex; align-items: flex-end; gap: 8px; }
.message-wrapper.sent { justify-content: flex-end; }
.message-wrapper.received { justify-content: flex-start; }

.msg-avatar-wrap { flex-shrink: 0; }
.msg-avatar { width: 30px; height: 30px; border-radius: 8px; object-fit: cover; }
.msg-avatar-placeholder { width: 30px; height: 30px; border-radius: 8px; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }

.message { max-width: 70%; padding: 10px 14px; border-radius: 16px; display: flex; flex-direction: column; gap: 4px; }
.message.received { background: #f5f5f5; border-bottom-left-radius: 4px; }
.message.sent { background: #E08E6B; color: #fff; border-bottom-right-radius: 4px; }
.msg-username { font-size: 11px; font-weight: 700; color: #E08E6B; }
.message.sent .msg-username { color: rgba(255,255,255,0.8); }
.message p { margin: 0; font-size: 14px; word-break: break-word; }
.message .time { font-size: 11px; opacity: 0.6; align-self: flex-end; }

.message-image { margin: 4px 0; border-radius: 12px; overflow: hidden; cursor: pointer; max-width: 250px; }
.message-image img { width: 100%; height: auto; display: block; transition: transform 0.2s; }
.message-image:hover img { transform: scale(1.02); }

.image-preview-container { padding: 8px 16px 0; }
.image-preview { position: relative; display: inline-block; max-width: 150px; }
.image-preview img { width: 100%; height: auto; border-radius: 12px; border: 1px solid #eee; }
.remove-preview { position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; border-radius: 50%; background: #ff4444; color: white; border: 2px solid white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; padding: 0; line-height: 1; }

.message-input { padding: 16px; border-top: 1px solid #eee; display: flex; gap: 8px; align-items: center; }
.message-input input[type="text"] { flex: 1; padding: 12px 16px; border: 1px solid #eee; border-radius: 24px; font-size: 14px; outline: none; font-family: inherit; }
.message-input input[type="text"]:focus { border-color: #E08E6B; }
.attach-btn { width: 44px; height: 44px; border-radius: 50%; background: #f5f5f5; color: #666; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.attach-btn:hover { background: #e0e0e0; }
.send-btn { width: 44px; height: 44px; border-radius: 50%; background: #E08E6B; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.send-btn:hover { background: #d07a5a; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.image-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 9999; cursor: pointer; }
.image-modal img { max-width: 90%; max-height: 90%; object-fit: contain; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-card { background: #fff; border-radius: 20px; padding: 32px; width: 100%; max-width: 420px; box-shadow: 0 8px 40px rgba(0,0,0,0.15); }
.modal-card h2 { font-size: 20px; color: #1a1a2e; margin-bottom: 8px; }
.modal-card p { color: #888; font-size: 14px; margin-bottom: 20px; }
.modal-actions { display: flex; gap: 10px; margin-top: 20px; }

.emoji-picker { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.emoji-option { font-size: 24px; cursor: pointer; padding: 6px; border-radius: 8px; transition: background 0.15s; border: 2px solid transparent; }
.emoji-option:hover { background: #f5f5f5; }
.emoji-option.selected { background: #fff5f0; border-color: #E08E6B; }

.group-select-list { display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
.group-select-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1.5px solid #eee; cursor: pointer; transition: all 0.2s; }
.group-select-item:hover:not(.added) { border-color: #E08E6B; background: #fff5f0; }
.group-select-item.added { background: #f0fff4; border-color: #52c41a; cursor: default; }
.group-icon { font-size: 24px; }
.group-select-info { flex: 1; display: flex; flex-direction: column; }
.group-select-info strong { font-size: 14px; color: #1a1a2e; }
.group-select-info span { font-size: 12px; color: #aaa; }
.check-mark { font-size: 18px; }
.add-mark { font-size: 13px; color: #E08E6B; font-weight: 600; }

.empty-hint { text-align: center; color: #aaa; font-size: 14px; padding: 20px 0; line-height: 1.8; }
.btn-link { background: none; border: none; color: #E08E6B; font-weight: 600; cursor: pointer; font-size: 14px; text-decoration: underline; }

.success-message { background: #f0fff4; color: #389e0d; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-top: 12px; }

.input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; margin-bottom: 10px; box-sizing: border-box; font-family: inherit; }
.input:focus { outline: none; border-color: #E08E6B; }
.error-message { background: #ffebee; color: #c62828; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 10px; }
.btn-primary { background: #E08E6B; color: #fff; padding: 12px 20px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; font-size: 14px; flex: 1; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel { background: #f5f5f5; color: #666; padding: 12px 20px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; font-size: 14px; }
.btn-cancel:hover { background: #eee; }

@media (max-width: 768px) {
  .chat-container { grid-template-columns: 1fr; }
  .chat-list { max-height: 200px; }
  .message-image { max-width: 200px; }
  .btn-add-to-group span:last-child { display: none; }
}
</style>
