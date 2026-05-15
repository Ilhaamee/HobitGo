<template>
  <div class="dashboard-friends">
    <h1>{{ t('friends_title') }}</h1>
    <p class="subtitle">{{ t('friends_subtitle') }}</p>

    <div class="search-section">
      <div class="search-box">
        <font-awesome-icon icon="search" class="search-icon" />
        <input v-model="searchQuery" type="text" :placeholder="t('search_users')" @input="searchUsers" />
      </div>
      <div v-if="searchResults.length > 0" class="search-results">
        <div v-for="user in searchResults" :key="user.id" class="search-item">
          <div class="user-avatar" @click="router.push(`/dashboard/profile/${user.id}`)">
            <img v-if="user.avatar_url" :src="user.avatar_url" />
            <div v-else class="avatar-placeholder">{{ user.username[0].toUpperCase() }}</div>
          </div>
          <div class="user-info" @click="router.push(`/dashboard/profile/${user.id}`)">
            <span class="user-name">{{ user.username }}</span>
            <span class="user-bio">{{ user.bio || t('no_bio') }}</span>
          </div>
          <div class="user-actions">
            <button v-if="getFriendStatus(user.id) === null" class="btn-add" @click="sendRequest(user.id)">
              <font-awesome-icon icon="plus" /> {{ t('add_friend') }}
            </button>
            <div v-else-if="getFriendStatus(user.id) === 'pending_sent'" class="pending-wrap">
              <span class="status-badge pending">{{ t('pending') }}</span>
              <button class="btn-cancel-req" @click="cancelRequest(user.id)">✕</button>
            </div>
            <span v-else-if="getFriendStatus(user.id) === 'pending_received'" class="status-badge received">{{ t('sent_request') }}</span>
            <span v-else-if="getFriendStatus(user.id) === 'accepted'" class="status-badge accepted">{{ t('already_friends') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="friends-grid">
      <div class="section-card" v-if="pendingRequests.length > 0">
        <h2>{{ t('pending_requests') }} ({{ pendingRequests.length }})</h2>
        <div class="requests-list">
          <div v-for="req in pendingRequests" :key="req.id" class="request-item">
            <div class="user-avatar" @click="router.push(`/dashboard/profile/${req.sender_id}`)">
              <img v-if="req.profiles?.avatar_url" :src="req.profiles.avatar_url" />
              <div v-else class="avatar-placeholder">{{ req.profiles?.username?.[0]?.toUpperCase() || '?' }}</div>
            </div>
            <div class="user-info" @click="router.push(`/dashboard/profile/${req.sender_id}`)">
              <span class="user-name">{{ req.profiles?.username }}</span>
              <span class="user-bio">{{ req.profiles?.bio || t('no_bio') }}</span>
            </div>
            <div class="request-actions">
              <button class="btn-accept" @click="acceptRequest(req.id)">{{ t('accept') }}</button>
              <button class="btn-reject" @click="rejectRequest(req.id)">❌</button>
            </div>
          </div>
        </div>
      </div>

      <div class="section-card">
        <h2>{{ t('my_friends') }} ({{ friends.length }})</h2>
        <div v-if="friends.length > 0" class="friends-list">
          <div v-for="friend in friends" :key="friend.id" class="friend-item">
            <div class="user-avatar" @click="router.push(`/dashboard/profile/${friend.id}`)">
              <img v-if="friend.avatar_url" :src="friend.avatar_url" />
              <div v-else class="avatar-placeholder">{{ friend.username[0].toUpperCase() }}</div>
            </div>
            <div class="user-info" @click="router.push(`/dashboard/profile/${friend.id}`)">
              <span class="user-name">{{ friend.username }}</span>
              <span class="user-bio">{{ friend.bio || t('no_bio') }}</span>
            </div>
            <div class="friend-actions">
              <button class="btn-message" @click="goToChat(friend.id, friend.username)">
                <font-awesome-icon icon="comments" />
              </button>
              <button class="btn-remove" @click="removeFriend(friend.friendshipId)">
                <font-awesome-icon icon="trash" />
              </button>
            </div>
          </div>
        </div>
        <p v-else class="empty-text">{{ t('no_friends') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()
const router = useRouter()
const currentUser = ref(null)
const searchQuery = ref('')
const searchResults = ref([])
const pendingRequests = ref([])
const friends = ref([])
const friendships = ref([])

function getFriendStatus(userId) {
  const f = friendships.value.find(f => (f.sender_id === currentUser.value.id && f.receiver_id === userId) || (f.receiver_id === currentUser.value.id && f.sender_id === userId))
  if (!f) return null
  if (f.status === 'accepted') return 'accepted'
  if (f.status === 'pending' && f.sender_id === currentUser.value.id) return 'pending_sent'
  if (f.status === 'pending' && f.receiver_id === currentUser.value.id) return 'pending_received'
  return null
}

async function searchUsers() {
  if (!searchQuery.value.trim()) { searchResults.value = []; return }
  const { data } = await supabase.from('profiles').select('*').ilike('username', `%${searchQuery.value}%`).neq('id', currentUser.value.id).limit(8)
  if (data) searchResults.value = data
}

async function loadFriendships() {
  const { data } = await supabase.from('friendships').select('*').or(`sender_id.eq.${currentUser.value.id},receiver_id.eq.${currentUser.value.id}`)
  if (!data) return
  friendships.value = data
  const pending = data.filter(f => f.status === 'pending' && f.receiver_id === currentUser.value.id)
  if (pending.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', pending.map(f => f.sender_id))
    pendingRequests.value = pending.map(f => ({ ...f, profiles: profiles?.find(p => p.id === f.sender_id) || {} }))
  } else pendingRequests.value = []
  const accepted = data.filter(f => f.status === 'accepted')
  const friendIds = accepted.map(f => f.sender_id === currentUser.value.id ? f.receiver_id : f.sender_id)
  if (friendIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', friendIds)
    if (profiles) friends.value = profiles.map(p => ({ ...p, friendshipId: accepted.find(f => f.sender_id === p.id || f.receiver_id === p.id)?.id }))
  } else friends.value = []
}

async function sendRequest(receiverId) {
  const { data } = await supabase.from('friendships').insert({ sender_id: currentUser.value.id, receiver_id: receiverId, status: 'pending' }).select()
  if (data) { friendships.value.push(data[0]); searchResults.value = [...searchResults.value] }
}

async function cancelRequest(receiverId) {
  const f = friendships.value.find(f => f.sender_id === currentUser.value.id && f.receiver_id === receiverId)
  if (!f) return
  await supabase.from('friendships').delete().eq('id', f.id)
  friendships.value = friendships.value.filter(x => x.id !== f.id)
  searchResults.value = [...searchResults.value]
}

async function acceptRequest(friendshipId) {
  await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
  await loadFriendships()
}

async function rejectRequest(friendshipId) {
  await supabase.from('friendships').delete().eq('id', friendshipId)
  pendingRequests.value = pendingRequests.value.filter(r => r.id !== friendshipId)
  friendships.value = friendships.value.filter(f => f.id !== friendshipId)
}

async function removeFriend(friendshipId) {
  await supabase.from('friendships').delete().eq('id', friendshipId)
  await loadFriendships()
}

function goToChat(userId, username) { router.push({ path: '/dashboard/chat', query: { user: userId, username } }) }

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  currentUser.value = user
  await loadFriendships()
})
</script>

<style scoped>
.dashboard-friends { max-width: 900px; margin: 0 auto; }
h1 { font-size: 28px; color: var(--text-primary); margin-bottom: 8px; }
.subtitle { color: var(--text-secondary); margin-bottom: 32px; }
.search-section { margin-bottom: 24px; }
.search-box { position: relative; }
.search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-box input { width: 100%; padding: 14px 16px 14px 44px; border: 1px solid var(--input-border); border-radius: 12px; font-size: 15px; background: var(--bg-card); color: var(--text-primary); box-sizing: border-box; font-family: inherit; }
.search-box input:focus { outline: none; border-color: #E08E6B; }
.search-results { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; margin-top: 8px; overflow: hidden; box-shadow: 0 8px 24px var(--shadow); }
.search-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--border-color); transition: background 0.2s; }
.search-item:last-child { border-bottom: none; }
.search-item:hover { background: var(--bg-hover); }
.friends-grid { display: flex; flex-direction: column; gap: 24px; }
.section-card { background: var(--bg-card); border-radius: 16px; padding: 24px; box-shadow: 0 2px 10px var(--shadow); }
.section-card h2 { font-size: 16px; color: var(--text-primary); margin-bottom: 20px; }
.requests-list, .friends-list { display: flex; flex-direction: column; gap: 12px; }
.request-item, .friend-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-hover); border-radius: 12px; }
.user-avatar { width: 48px; height: 48px; border-radius: 14px; overflow: hidden; flex-shrink: 0; cursor: pointer; }
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { width: 100%; height: 100%; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
.user-info { flex: 1; display: flex; flex-direction: column; gap: 3px; cursor: pointer; }
.user-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.user-bio { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.user-actions, .request-actions, .friend-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.pending-wrap { display: flex; align-items: center; gap: 6px; }
.btn-add { display: flex; align-items: center; gap: 6px; background: #E08E6B; color: #fff; border: none; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-add:hover { opacity: 0.9; }
.btn-accept { background: #4caf50; color: #fff; border: none; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-reject { background: none; border: none; font-size: 18px; cursor: pointer; padding: 4px; }
.btn-cancel-req { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 16px; padding: 2px; }
.btn-cancel-req:hover { color: #e53935; }
.btn-message { background: #2196f3; color: #fff; border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer; font-size: 14px; }
.btn-message:hover { opacity: 0.9; }
.btn-remove { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 8px; font-size: 14px; }
.btn-remove:hover { color: #e53935; }
.status-badge { font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 20px; }
.status-badge.pending { background: #fff3e0; color: #ff9800; }
.status-badge.received { background: #e3f2fd; color: #2196f3; }
.status-badge.accepted { background: #e8f5e9; color: #4caf50; }
.empty-text { color: var(--text-muted); font-size: 14px; text-align: center; padding: 32px 0; }
</style>