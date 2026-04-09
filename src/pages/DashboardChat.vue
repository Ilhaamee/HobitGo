<template>
  <div class="dashboard-chat">
    <h1>Chat</h1>
    <p class="subtitle">Conecta con la comunidad</p>

    <!-- Setup username si no tiene -->
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
      <!-- Lista de conversaciones -->
      <div class="chat-list">
        <div
          class="chat-item"
          :class="{ active: activeTab === 'community' }"
          @click="activeTab = 'community'"
        >
          <div class="chat-avatar community">🌍</div>
          <div class="chat-info">
            <h4>Comunidad</h4>
            <p>Canal público</p>
          </div>
        </div>

        <div class="chat-list-header">Mensajes privados</div>

        <div
          v-for="conv in conversations"
          :key="conv.user_id"
          class="chat-item"
          :class="{ active: activeTab === conv.user_id }"
          @click="openPrivate(conv)"
        >
          <div class="chat-avatar">{{ conv.username[0].toUpperCase() }}</div>
          <div class="chat-info">
            <h4>{{ conv.username }}</h4>
            <p>{{ conv.lastMessage }}</p>
          </div>
        </div>

        <div class="new-chat">
          <input v-model="searchUser" type="text" class="input" placeholder="Buscar usuario..." @keyup.enter="searchUsers" />
          <div v-if="searchResults.length > 0" class="search-results">
            <div
              v-for="user in searchResults"
              :key="user.id"
              class="search-result-item"
              @click="openPrivate({ user_id: user.id, username: user.username, lastMessage: '' })"
            >
              {{ user.username }}
            </div>
          </div>
        </div>
      </div>

      <!-- Sala de chat -->
      <div class="chat-room">
        <div class="chat-header">
          <h3>{{ activeTab === 'community' ? '🌍 Comunidad HobitGo' : activeUsername }}</h3>
        </div>

        <div class="messages" ref="messagesContainer">
          <div
            v-for="msg in activeMessages"
            :key="msg.id"
            class="message"
            :class="msg.sender_id === currentUser?.id || msg.user_id === currentUser?.id ? 'sent' : 'received'"
          >
            <span v-if="activeTab === 'community'" class="msg-username">{{ msg.username }}</span>
            <p>{{ msg.content }}</p>
            <span class="time">{{ formatTime(msg.created_at) }}</span>
          </div>
          <div v-if="activeMessages.length === 0" class="no-messages">
            No hay mensajes aún. ¡Sé el primero!
          </div>
        </div>

        <div class="message-input">
          <input
            v-model="newMessage"
            type="text"
            placeholder="Escribe un mensaje..."
            @keyup.enter="sendMessage"
          />
          <button class="send-btn" @click="sendMessage" :disabled="!newMessage.trim()">
            <font-awesome-icon icon="paper-plane" />
          </button>
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
const conversations = ref([])
const newMessage = ref('')
const messagesContainer = ref(null)
const searchUser = ref('')
const searchResults = ref([])

let communitySubscription = null
let privateSubscription = null

const activeMessages = computed(() => {
  if (activeTab.value === 'community') return communityMessages.value
  return privateMessages.value
})

function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
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
    subscribeToMessages()
  } else {
    needsUsername.value = true
  }
}

async function saveUsername() {
  if (!usernameInput.value.trim()) {
    usernameError.value = 'El nombre de usuario es obligatorio'
    return
  }
  savingUsername.value = true
  usernameError.value = ''

  const { error } = await supabase.from('profiles').insert({
    id: currentUser.value.id,
    username: usernameInput.value.trim()
  })

  if (error) {
    usernameError.value = error.message.includes('unique') ? 'Ese nombre ya está en uso' : 'Error al guardar'
  } else {
    profile.value = { id: currentUser.value.id, username: usernameInput.value.trim() }
    needsUsername.value = false
    await loadCommunityMessages()
    await loadConversations()
    subscribeToMessages()
  }
  savingUsername.value = false
}

async function loadCommunityMessages() {
  const { data } = await supabase
    .from('community_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(100)
  if (data) communityMessages.value = data
  scrollToBottom()
}

async function loadConversations() {
  const { data } = await supabase
    .from('private_messages')
    .select('*')
    .or(`sender_id.eq.${currentUser.value.id},receiver_id.eq.${currentUser.value.id}`)
    .order('created_at', { ascending: false })

  if (!data) return

  const convMap = {}
  for (const msg of data) {
    const otherId = msg.sender_id === currentUser.value.id ? msg.receiver_id : msg.sender_id
    if (!convMap[otherId]) {
      convMap[otherId] = { user_id: otherId, lastMessage: msg.content }
    }
  }

  const userIds = Object.keys(convMap)
  if (userIds.length === 0) return

  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds)
  if (profiles) {
    conversations.value = profiles.map(p => ({
      user_id: p.id,
      username: p.username,
      lastMessage: convMap[p.id]?.lastMessage || ''
    }))
  }
}

async function loadPrivateMessages(otherUserId) {
  const { data } = await supabase
    .from('private_messages')
    .select('*')
    .or(`and(sender_id.eq.${currentUser.value.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.value.id})`)
    .order('created_at', { ascending: true })
  if (data) privateMessages.value = data
  scrollToBottom()
}

function openPrivate(conv) {
  activeTab.value = conv.user_id
  activeUsername.value = conv.username
  searchUser.value = ''
  searchResults.value = []
  if (!conversations.value.find(c => c.user_id === conv.user_id)) {
    conversations.value.unshift(conv)
  }
  loadPrivateMessages(conv.user_id)
}

async function searchUsers() {
  if (!searchUser.value.trim()) return
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${searchUser.value}%`)
    .neq('id', currentUser.value.id)
    .limit(5)
  if (data) searchResults.value = data
}

async function sendMessage() {
  if (!newMessage.value.trim()) return
  const content = newMessage.value.trim()
  newMessage.value = ''

  if (activeTab.value === 'community') {
    await supabase.from('community_messages').insert({
      user_id: currentUser.value.id,
      username: profile.value.username,
      content
    })
  } else {
    await supabase.from('private_messages').insert({
      sender_id: currentUser.value.id,
      receiver_id: activeTab.value,
      content
    })
  }
}

function subscribeToMessages() {
  communitySubscription = supabase
    .channel('community')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' }, payload => {
      communityMessages.value.push(payload.new)
      if (activeTab.value === 'community') scrollToBottom()
    })
    .subscribe()

  privateSubscription = supabase
    .channel('private')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, payload => {
      const msg = payload.new
      const isForMe = msg.receiver_id === currentUser.value.id || msg.sender_id === currentUser.value.id
      if (!isForMe) return
      const otherId = msg.sender_id === currentUser.value.id ? msg.receiver_id : msg.sender_id
      if (activeTab.value === otherId) {
        privateMessages.value.push(msg)
        scrollToBottom()
      }
      loadConversations()
    })
    .subscribe()
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(activeTab, () => scrollToBottom())

onMounted(loadProfile)

onUnmounted(() => {
  if (communitySubscription) supabase.removeChannel(communitySubscription)
  if (privateSubscription) supabase.removeChannel(privateSubscription)
})
</script>

<style scoped>
.dashboard-chat { max-width: 1000px; margin: 0 auto; }
h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 8px; }
.subtitle { color: #666; margin-bottom: 32px; }

.username-setup {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.setup-card {
  background: #fff;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.05);
  width: 400px;
  max-width: 90vw;
  text-align: center;
}

.setup-card h2 { font-size: 22px; color: #1a1a2e; margin-bottom: 8px; }
.setup-card p { color: #888; margin-bottom: 24px; }

.chat-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  height: calc(100vh - 200px);
}

.chat-list {
  background: #fff;
  border-radius: 16px;
  overflow-y: auto;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}

.chat-list-header {
  font-size: 11px;
  font-weight: 700;
  color: #aaa;
  text-transform: uppercase;
  padding: 12px 16px 4px;
  letter-spacing: 0.5px;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-left: 3px solid transparent;
}

.chat-item:hover { background: #f9f9f9; }
.chat-item.active { background: #fff5f0; border-left-color: #E08E6B; }

.chat-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #E08E6B;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.chat-avatar.community { background: #22284E; font-size: 20px; }

.chat-info { flex: 1; min-width: 0; }
.chat-info h4 { font-size: 14px; color: #1a1a2e; margin: 0 0 3px; }
.chat-info p { font-size: 12px; color: #888; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.new-chat { padding: 12px; border-top: 1px solid #eee; margin-top: auto; }

.search-results {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-top: 4px;
  overflow: hidden;
}

.search-result-item {
  padding: 10px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-result-item:hover { background: #f5f5f5; }

.chat-room {
  background: #fff;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  overflow: hidden;
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.chat-header h3 { font-size: 18px; color: #1a1a2e; margin: 0; }

.messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-messages { color: #aaa; font-size: 14px; text-align: center; margin: auto; }

.message {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.message.received { background: #f5f5f5; align-self: flex-start; border-bottom-left-radius: 4px; }
.message.sent { background: #E08E6B; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }

.msg-username { font-size: 11px; font-weight: 700; color: #E08E6B; }
.message.sent .msg-username { color: rgba(255,255,255,0.8); }

.message p { margin: 0; font-size: 14px; }
.message .time { font-size: 11px; opacity: 0.6; align-self: flex-end; }

.message-input {
  padding: 16px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
}

.message-input input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #eee;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  font-family: inherit;
}

.message-input input:focus { border-color: #E08E6B; }

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #E08E6B;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}

.send-btn:hover { background: #d07a5a; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 10px;
  box-sizing: border-box;
  font-family: inherit;
}

.input:focus { outline: none; border-color: #E08E6B; }

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 10px;
}

.btn-primary {
  background: #E08E6B;
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  width: 100%;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
}

.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 768px) {
  .chat-container { grid-template-columns: 1fr; }
  .chat-list { max-height: 200px; }
}
</style>
