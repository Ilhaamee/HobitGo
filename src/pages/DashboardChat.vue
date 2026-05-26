<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import ChatDirects     from '../components/chat/ChatDirects.vue'
import ChatCommunities from '../components/chat/ChatCommunities.vue'
import ChatChallenges  from '../components/chat/ChatGroupChallenge.vue'

const route = useRoute()

const activeTab     = ref('directs')
const currentUser   = ref(null)
const profile       = ref(null)
const needsUsername = ref(false)
const usernameInput = ref('')
const usernameError = ref('')
const savingUsername= ref(false)

const unreadDirects     = ref(0)
const unreadCommunities = ref(0)
const unreadChallenges  = ref(0)

const initialChallengeId = ref(null)

const tabs = [
  { key: 'directs',     label: 'Mensajes',    icon: 'ti-message-circle' },
  { key: 'communities', label: 'Comunidades', icon: 'ti-users-group' },
  { key: 'challenges',  label: 'Retos',       icon: 'ti-trophy' },
]

async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  currentUser.value = user

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (data?.username) {
    profile.value    = data
    needsUsername.value = false
  } else {
    needsUsername.value = true
  }
  if (route.query.challengeId) {
    initialChallengeId.value = route.query.challengeId
    activeTab.value = 'challenges'
  } else if (route.query.tab) {
    activeTab.value = route.query.tab
  }
}

async function saveUsername() {
  if (!usernameInput.value.trim()) { usernameError.value = 'El nombre es obligatorio'; return }
  savingUsername.value = true
  usernameError.value  = ''

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: currentUser.value.id, username: usernameInput.value.trim() }, { onConflict: 'id' })

  if (error) {
    usernameError.value  = error.message.includes('unique') ? 'Ese nombre ya está en uso' : 'Error al guardar'
    savingUsername.value = false
    return
  }

  profile.value       = { id: currentUser.value.id, username: usernameInput.value.trim() }
  needsUsername.value = false
  savingUsername.value = false
}

function setTab(key) {
  activeTab.value = key
  if (key !== 'challenges') initialChallengeId.value = null
}

function onUnreadDirects(delta) {
  if (delta === 0) unreadDirects.value = 0
  else unreadDirects.value = Math.max(0, unreadDirects.value + delta)
}

onMounted(loadProfile)
</script>

<template>
  <div class="chat-page">

    <!-- Setup de username -->
    <div v-if="needsUsername" class="username-setup">
      <div class="setup-card">
        <div class="setup-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <h2>Elige tu nombre</h2>
        <p>Necesitas un nombre para participar en el chat</p>
        <input
          v-model="usernameInput"
          type="text"
          class="setup-input"
          placeholder="Tu nombre de usuario"
          @keyup.enter="saveUsername"
          maxlength="30"
        />
        <div v-if="usernameError" class="setup-error">{{ usernameError }}</div>
        <button class="setup-btn" @click="saveUsername" :disabled="savingUsername">
          {{ savingUsername ? 'Guardando...' : 'Continuar' }}
        </button>
      </div>
    </div>

    <!-- Chat principal -->
    <template v-else-if="profile">

      <div class="chat-header">
        <div class="chat-title">
          <h1>Chat</h1>
          <p>Conecta con la comunidad</p>
        </div>
        <div class="chat-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="chat-tab"
            :class="{ active: activeTab === tab.key }"
            @click="setTab(tab.key)"
          >
            <svg v-if="tab.key === 'directs'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else-if="tab.key === 'communities'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else-if="tab.key === 'challenges'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M4 22h16" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>{{ tab.label }}</span>
            <span v-if="tab.key === 'directs' && unreadDirects > 0" class="tab-badge">{{ unreadDirects }}</span>
            <span v-if="tab.key === 'communities' && unreadCommunities > 0" class="tab-badge">{{ unreadCommunities }}</span>
            <span v-if="tab.key === 'challenges' && unreadChallenges > 0" class="tab-badge">{{ unreadChallenges }}</span>
          </button>
        </div>
      </div>

      <!-- Contenido -->
      <div class="chat-content-wrapper">
        <KeepAlive>
          <ChatDirects
            v-if="activeTab === 'directs'"
            key="directs"
            :current-user="currentUser"
            :profile="profile"
            @unread="onUnreadDirects"
          />
          <ChatCommunities
            v-else-if="activeTab === 'communities'"
            key="communities"
            :current-user="currentUser"
            :profile="profile"
            @unread="unreadCommunities = $event"
          />
          <ChatChallenges
            v-else-if="activeTab === 'challenges'"
            key="challenges"
            :current-user="currentUser"
            :profile="profile"
            :initial-challenge-id="initialChallengeId"
            @unread="unreadChallenges = $event"
          />
        </KeepAlive>
      </div>

    </template>

  </div>
</template>

<style scoped>
.chat-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px 20px;
  height: calc(100vh - 60px);
  max-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
}

.username-setup {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
}
.setup-card {
  background: #fff;
  border-radius: 20px;
  padding: 40px 32px;
  width: 100%;
  max-width: 380px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(34,40,78,.08);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.setup-icon { font-size: 48px; color: #ff6b9d; line-height: 1; }
.setup-card h2 { font-size: 20px; font-weight: 800; color: #22284E; margin: 0; }
.setup-card p  { font-size: 13px; color: rgba(34,40,78,.5); margin: 0; }
.setup-input {
  padding: 12px 14px;
  border: 1.5px solid rgba(34,40,78,.12);
  border-radius: 12px;
  font-size: 14px; color: #22284E;
  font-family: inherit; background: #fafafa;
  transition: border-color .2s;
}
.setup-input:focus { outline: none; border-color: #ff6b9d; background: #fff; }
.setup-error { font-size: 12px; color: #dc2626; }
.setup-btn {
  padding: 13px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff; border: none; border-radius: 12px;
  font-size: 15px; font-weight: 800; cursor: pointer;
  transition: opacity .2s;
}
.setup-btn:disabled { opacity: .6; cursor: not-allowed; }
.setup-btn:hover:not(:disabled) { opacity: .9; }

.chat-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-shrink: 0;
  padding-top: 8px;
}
.chat-title h1 { font-size: 26px; font-weight: 900; color: #22284E; letter-spacing: -1px; margin: 0 0 3px; }
.chat-title p  { font-size: 13px; color: rgba(34,40,78,.45); margin: 0; }

.chat-tabs {
  display: flex;
  gap: 6px;
  background: rgba(34,40,78,.04);
  padding: 5px;
  border-radius: 14px;
  flex-shrink: 0;
}
.chat-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(34,40,78,.45);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
  white-space: nowrap;
}
.chat-tab:hover { color: #22284E; background: rgba(34,40,78,.05); }
.chat-tab.active {
  background: #fff;
  color: #22284E;
  box-shadow: 0 2px 10px rgba(34,40,78,.08);
}
.tab-badge {
  position: absolute;
  top: 2px; right: 2px;
  min-width: 16px; height: 16px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  border-radius: 99px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.chat-content-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

@media (max-width: 768px) {
  .chat-page {
    padding: 0;
    height: 80vh;
    max-height: 100vh;
  }
  .chat-header {
    padding: 12px 16px;
    margin-bottom: 0;
  }
}
@media (max-width: 600px) {
  .chat-tab span:not(.tab-badge) { display: none; }
  .chat-tab { padding: 10px 14px; justify-content: center; }
}

.icon-btn svg,
.chat-tab svg,
.input-icon-btn svg,
.send-btn svg {
  display: block;
  flex-shrink: 0;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
  display: block;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>