<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import ChatSearch from './ChatSearch.vue'
import ChatMessageList from './ChatMessageList.vue'
import ChatReplyBar from './ChatReplyBar.vue'
import ChatEditBar from './ChatEditBar.vue'
import ChatImagePreview from './ChatImagePreview.vue'
import ChatInputBar from './ChatInputBar.vue'
import ConfirmModal from '../ConfirmModal.vue'

const props = defineProps({
  currentUser: { type: Object, required: true },
  profile:     { type: Object, required: true },
})
const emit = defineEmits(['unread'])

const conversations    = ref([])
const privateMessages  = ref([])
const activeConv       = ref(null)
const newMessage       = ref('')
const messagesRef      = ref(null)
const fileInput        = ref(null)
const selectedImage    = ref(null)
const imagePreview     = ref(null)
const uploadingImage   = ref(false)
const previewImageUrl  = ref(null)
const showSearch       = ref(false)
const typingUsers      = ref([])
const editingMsg       = ref(null)
const editText         = ref('')
const replyingTo       = ref(null)

let initialUnreadEmitted = false
let privateSub = null
let typingSub = null
let typingTimer = null

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
function isOwn(msg) {
  return msg.sender_id === props.currentUser?.id
}

const groupedMessages = computed(() => {
  const groups = []
  let lastDate = null
  for (const msg of privateMessages.value) {
    const d = formatDate(msg.created_at)
    if (d !== lastDate) { groups.push({ type: 'date', label: d }); lastDate = d }
    groups.push({ type: 'msg', ...msg })
  }
  return groups
})

const typingText = computed(() => {
  if (!typingUsers.value.length) return ''
  if (typingUsers.value.length === 1) return `${typingUsers.value[0]} está escribiendo...`
  return `${typingUsers.value.join(', ')} están escribiendo...`
})

const replyPreviewText = computed(() => {
  if (!replyingTo.value) return ''
  return replyingTo.value.content?.slice(0, 40) || '📷 Imagen'
})

// CONVERSATIONS
async function loadConversations() {
  const { data } = await supabase
    .from('private_messages')
    .select('*')
    .or(`sender_id.eq.${props.currentUser.id},receiver_id.eq.${props.currentUser.id}`)
    .order('created_at', { ascending: false })

  if (!data) return

  const map = {}
  const unreadMap = {}
  for (const msg of data) {
    const otherId = msg.sender_id === props.currentUser.id ? msg.receiver_id : msg.sender_id
    if (!map[otherId]) {
      map[otherId] = {
        user_id: otherId,
        lastMessage: msg.content || (msg.image_url ? '📷 Imagen' : ''),
        lastAt: msg.created_at,
      }
    }
    if (msg.receiver_id === props.currentUser.id && !msg.read_at) {
      unreadMap[otherId] = (unreadMap[otherId] || 0) + 1
    }
  }

  const ids = Object.keys(map)
  if (!ids.length) { conversations.value = []; return }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', ids)

  if (profiles) {
    conversations.value = profiles.map(p => ({
      user_id:     p.id,
      username:    p.username,
      avatar_url:  p.avatar_url || null,
      lastMessage: map[p.id]?.lastMessage || '',
      lastAt:      map[p.id]?.lastAt || '',
      unread:      unreadMap[p.id] || 0,
    })).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))

    if (!initialUnreadEmitted) {
      const totalUnread = conversations.value.reduce((sum, c) => sum + (c.unread || 0), 0)
      emit('unread', totalUnread)
      initialUnreadEmitted = true
    }
  }
}

async function markAsRead(otherId) {
  const { error } = await supabase
    .from('private_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('receiver_id', props.currentUser.id)
    .eq('sender_id', otherId)
    .is('read_at', null)

  if (!error) {
    const conv = conversations.value.find(c => c.user_id === otherId)
    if (conv && conv.unread > 0) {
      const wasUnread = conv.unread
      conv.unread = 0
      emit('unread', -wasUnread)
    }
  }
}

async function openConv(conv) {
  activeConv.value = conv
  showSearch.value = false

  if (!conversations.value.find(c => c.user_id === conv.user_id)) {
    conversations.value.unshift(conv)
  }

  await loadPrivateMessages(conv.user_id)
  await markAsRead(conv.user_id)
  subscribe(conv.user_id)
  subscribeTyping(conv.user_id)
}

async function loadPrivateMessages(otherId) {
  const { data } = await supabase
    .from('private_messages')
    .select('*')
    .or(`and(sender_id.eq.${props.currentUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${props.currentUser.id})`)
    .order('created_at', { ascending: true })

  if (data) {
    privateMessages.value = data
    await nextTick()
    messagesRef.value?.scrollToBottom()
  }
}

//IMAGE UPLOAD
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
  if (fileInput.value) fileInput.value.value = ''
}
async function uploadImage(file) {
  const ext  = file.name.split('.').pop().toLowerCase()
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('chat-images').upload(name, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('chat-images').getPublicUrl(name)
  return data.publicUrl
}

//MESSAGE ACTIONS
function startEdit(msg) {
  editingMsg.value = msg
  editText.value = msg.content || ''
}
async function saveEdit() {
  if (!editingMsg.value || !editText.value.trim()) return
  const { error } = await supabase
    .from('private_messages')
    .update({ content: editText.value.trim(), edited_at: new Date().toISOString() })
    .eq('id', editingMsg.value.id)

  if (!error) {
    const idx = privateMessages.value.findIndex(m => m.id === editingMsg.value.id)
    if (idx !== -1) {
      privateMessages.value[idx].content = editText.value.trim()
      privateMessages.value[idx].edited_at = new Date().toISOString()
    }
  }
  editingMsg.value = null
  editText.value = ''
}
function cancelEdit() {
  editingMsg.value = null
  editText.value = ''
}

function replyTo(msg) {
  replyingTo.value = msg
}
function cancelReply() {
  replyingTo.value = null
}

// REACTIONS
async function addReaction(msg, emoji) {
  if (!msg) return
  const liveMsg = privateMessages.value.find(m => m.id === msg.id)
  if (!liveMsg) return

  const current = liveMsg.reactions || {}
  const userReactions = current[emoji] || []
  const hasReacted = userReactions.includes(props.currentUser.id)

  const newReactions = { ...current }
  if (hasReacted) {
    newReactions[emoji] = userReactions.filter(id => id !== props.currentUser.id)
    if (!newReactions[emoji].length) delete newReactions[emoji]
  } else {
    newReactions[emoji] = [...userReactions, props.currentUser.id]
  }

  liveMsg.reactions = newReactions

  const { error } = await supabase
    .from('private_messages')
    .update({ reactions: newReactions })
    .eq('id', liveMsg.id)

  if (error) {
    liveMsg.reactions = current
    console.error('Error guardando reacción:', error)
  }
}

async function notifyTyping() {
  if (!activeConv.value) return
  await supabase.from('typing_indicators').insert({
    receiver_id: activeConv.value.user_id,
    user_id: props.currentUser.id,
    username: props.profile.username,
    typing: true,
    updated_at: new Date().toISOString()
  })

  clearTimeout(typingTimer)
  typingTimer = setTimeout(async () => {
    await supabase.from('typing_indicators').delete()
      .eq('receiver_id', activeConv.value.user_id)
      .eq('user_id', props.currentUser.id)
  }, 3000)
}

function subscribeTyping(otherId) {
  if (typingSub) supabase.removeChannel(typingSub)
  typingSub = supabase.channel(`typing-direct-${otherId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'typing_indicators',
      filter: `receiver_id=eq.${props.currentUser.id}`
    }, payload => {
      const row = payload.new
      if (!row || row.user_id !== otherId) return
      if (row.typing) {
        if (!typingUsers.value.includes(row.username)) typingUsers.value.push(row.username)
      } else {
        typingUsers.value = typingUsers.value.filter(u => u !== row.username)
      }
    })
    .subscribe()
}

//SEND MESSAGE
async function sendMessage() {
  if (!activeConv.value) return
  const hasText  = newMessage.value.trim().length > 0
  const hasImage = !!selectedImage.value
  if ((!hasText && !hasImage) || uploadingImage.value) return

  uploadingImage.value = true
  let imageUrl = null

  try {
    if (hasImage) imageUrl = await uploadImage(selectedImage.value)

    const payload = {
      sender_id:   props.currentUser.id,
      receiver_id: activeConv.value.user_id,
    }
    if (hasText)  payload.content   = newMessage.value.trim()
    if (imageUrl) payload.image_url = imageUrl
    if (replyingTo.value) {
      payload.reply_to = replyingTo.value.id
      payload.reply_preview = replyingTo.value.content?.slice(0, 50) || '📷 Imagen'
    }

    const { data } = await supabase
      .from('private_messages')
      .insert(payload)
      .select()

    if (data?.[0]) {
      const exists = privateMessages.value.some(m => m.id === data[0].id)
      if (!exists) {
        privateMessages.value.push(data[0])
        await nextTick()
        messagesRef.value?.scrollToBottom()
      }

      const conv = conversations.value.find(c => c.user_id === activeConv.value.user_id)
      if (conv) {
        conv.lastMessage = hasText ? newMessage.value.trim() : '📷 Imagen'
        conv.lastAt      = data[0].created_at
      }
    }

    newMessage.value = ''
    clearImage()
    replyingTo.value = null
  } catch (e) {
    console.error('Error enviando:', e)
  } finally {
    uploadingImage.value = false
  }
}

// REALTIME
function subscribe(otherId) {
  if (privateSub) supabase.removeChannel(privateSub)
  privateSub = supabase.channel('private-directs')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, async payload => {
      const msg = payload.new
      const isForMe = msg.receiver_id === props.currentUser.id || msg.sender_id === props.currentUser.id
      if (!isForMe) return
      const otherIdMsg = msg.sender_id === props.currentUser.id ? msg.receiver_id : msg.sender_id

      if (activeConv.value?.user_id === otherIdMsg) {
        const exists = privateMessages.value.some(m => m.id === msg.id)
        if (!exists) {
          privateMessages.value.push(msg)
          await nextTick()
          messagesRef.value?.scrollToBottom()
        }
        if (msg.receiver_id === props.currentUser.id && !msg.read_at) {
          await supabase.from('private_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id)
        }
      } else {
        if (msg.receiver_id === props.currentUser.id && !msg.read_at) {
          emit('unread', 1)
          const conv = conversations.value.find(c => c.user_id === otherIdMsg)
          if (conv) {
            conv.unread = (conv.unread || 0) + 1
            conv.lastMessage = msg.content || (msg.image_url ? '📷 Imagen' : '')
            conv.lastAt = msg.created_at
          }
        }
      }
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages' }, payload => {
      const msg = payload.new
      const idx = privateMessages.value.findIndex(m => m.id === msg.id)
      if (idx !== -1) privateMessages.value[idx] = { ...privateMessages.value[idx], ...msg }
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'private_messages' }, payload => {
      privateMessages.value = privateMessages.value.filter(m => m.id !== payload.old.id)
    })
    .subscribe()
}

const showDeleteModal = ref(false)
const msgToDelete = ref(null)

// Reemplaza el confirm() nativo
function deleteMessage(msg) {
  msgToDelete.value = msg
  showDeleteModal.value = true
}

async function confirmDelete() {
  await supabase.from('private_messages').delete().eq('id', msgToDelete.value.id)
  privateMessages.value = privateMessages.value.filter(m => m.id !== msgToDelete.value.id)
  showDeleteModal.value = false
  msgToDelete.value = null
}

//LIFECYCLE
onMounted(async () => { await loadConversations() })
onUnmounted(() => {
  if (privateSub) supabase.removeChannel(privateSub)
  if (typingSub) supabase.removeChannel(typingSub)
})

watch(newMessage, (val) => {
  if (val && val.length > 0) notifyTyping()
})
</script>

<template>
  <div class="directs">

    <!-- PANEL IZQUIERDO -->
    <div class="conv-panel">
      <div class="conv-head">
        <span class="conv-head-title">Mensajes</span>
        <button class="icon-btn new-conv-btn" @click="showSearch = !showSearch" title="Nueva conversación">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
        </button>
      </div>

      <Transition name="slide-down">
        <div v-if="showSearch" class="search-box">
          <ChatSearch
            :current-user-id="currentUser.id"
            mode="direct"
            placeholder="Buscar usuario para chatear..."
            @message="openConv({ user_id: $event.id, username: $event.username, avatar_url: $event.avatar_url, lastMessage: '', unread: 0 })"
            @close="showSearch = false"
          />
        </div>
      </Transition>

      <div class="conv-list">
        <div v-if="!conversations.length" class="conv-empty">
          <div class="empty-illustration">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <p>Sin conversaciones aún</p>
          <span>Pulsa el lápiz para buscar usuarios</span>
        </div>

        <button
          v-for="conv in conversations"
          :key="conv.user_id"
          class="conv-item"
          :class="{ active: activeConv?.user_id === conv.user_id }"
          @click="openConv(conv)"
        >
          <div class="c-avatar" :style="conv.avatar_url ? {} : { background: 'linear-gradient(135deg, #ff6b9d, #ffb3c6)' }">
            <img v-if="conv.avatar_url" :src="conv.avatar_url" />
            <span v-else>{{ initials(conv.username) }}</span>
          </div>
          <div class="c-info">
            <span class="c-name">{{ conv.username }}</span>
            <span class="c-last">{{ conv.lastMessage || 'Sin mensajes' }}</span>
          </div>
          <div class="c-meta">
            <span class="c-time">{{ formatTime(conv.lastAt) }}</span>
            <span v-if="conv.unread > 0" class="c-unread">{{ conv.unread }}</span>
          </div>
        </button>
      </div>
    </div>

    <!--PANEL DERECHO -->
    <div class="chat-panel" :class="{ 'has-conv': activeConv }">

      <!-- Estado vacío -->
      <div v-if="!activeConv" class="chat-empty">
        <div class="empty-illustration large">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3>Tus mensajes</h3>
        <p>Selecciona una conversación o busca un usuario para empezar</p>
      </div>

      <!-- CHAT ACTIVO -->
      <template v-else>

        <!-- Header -->
        <div class="chat-top">
          <button class="back-btn" @click="activeConv = null">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="ct-avatar" :style="activeConv.avatar_url ? {} : { background: 'linear-gradient(135deg, #ff6b9d, #ffb3c6)' }">
            <img v-if="activeConv.avatar_url" :src="activeConv.avatar_url" />
            <span v-else>{{ initials(activeConv.username) }}</span>
          </div>
          <div class="ct-info">
            <span class="ct-name">{{ activeConv.username }}</span>
          </div>
        </div>

        <!-- Messages -->
        <ChatMessageList
          ref="messagesRef"
          :messages="groupedMessages"
          :current-user-id="currentUser.id"
          :is-own="isOwn"
          :typing-text="typingText"
          :show-author="false"
          avatar-source="active"
          :active-avatar="activeConv?.avatar_url"
          enable-image-click
          @reaction="addReaction"
          @reply="replyTo"
          @edit="startEdit"
          @delete="deleteMessage"
          @image-click="previewImageUrl = $event"
        />

        <!-- Reply bar-->
        <ChatReplyBar
          :replying-to="replyingTo"
          :author-name="activeConv?.username"
          :preview-text="replyPreviewText"
          @cancel="cancelReply"
        />

        <!-- Edit bar -->
        <ChatEditBar
          v-if="editingMsg"
          v-model="editText"
          @save="saveEdit"
          @cancel="cancelEdit"
        />

        <!-- Image preview -->
        <ChatImagePreview
          v-if="imagePreview"
          :src="imagePreview"
          @clear="clearImage"
        />

        <!-- Input -->
        <ChatInputBar
          v-model="newMessage"
          :image-preview="imagePreview"
          :uploading="uploadingImage"
          @send="sendMessage"
          @attach="onFileChange"
        />

      </template>
    </div>

    <!-- Preview imagen fullscreen -->
    <Transition name="fade">
      <div v-if="previewImageUrl" class="img-fullscreen" @click="previewImageUrl = null">
        <img :src="previewImageUrl" />
      </div>
    </Transition>

    <ConfirmModal
      :show="showDeleteModal"
      title="¿Eliminar mensaje?"
      message="Esta acción no se puede deshacer."
      confirm-text="Eliminar"
      cancel-text="Cancelar"
      type="danger"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<style scoped>
/* LAYOUT PRINCIPAL */
.directs {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 0;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 2px 20px rgba(34,40,78,.06);
  border: 1px solid rgba(34,40,78,.06);
}

.conv-panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(34,40,78,.06);
  background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
  overflow: hidden;
  min-height: 0;
  height: 100%;
}

.conv-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  flex-shrink: 0;
}
.conv-head-title { font-size: 16px; font-weight: 800; color: #22284E; }

.icon-btn {
  width: 34px; height: 34px; border-radius: 10px;
  background: rgba(34,40,78,.06); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #22284E; font-size: 16px;
  transition: all .2s;
}
.icon-btn svg { display: block; }
.new-conv-btn:hover {
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  transform: scale(1.05);
}

.search-box {
  padding: 0 12px 10px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(34,40,78,.06);
}

.conv-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 8px;
  min-height: 0;
}

.conv-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 40px 16px; text-align: center;
  color: rgba(34,40,78,.3);
}
.empty-illustration {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255,107,157,.1), rgba(255,179,198,.1));
  display: flex; align-items: center; justify-content: center;
  color: #ff6b9d;
}
.empty-illustration.large { width: 80px; height: 80px; }
.conv-empty p { font-size: 13px; font-weight: 600; margin: 0; color: rgba(34,40,78,.5); }
.conv-empty span { font-size: 11px; }

.conv-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px; border-radius: 14px;
  width: 100%; border: none; background: transparent;
  cursor: pointer; text-align: left;
  transition: all .2s;
}
.conv-item:hover { background: rgba(255,107,157,.05); }
.conv-item.active {
  background: linear-gradient(135deg, rgba(255,107,157,.1), rgba(255,179,198,.1));
  box-shadow: 0 2px 8px rgba(255,107,157,.1);
}

.c-avatar {
  width: 44px; height: 44px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff;
  flex-shrink: 0; overflow: hidden;
  box-shadow: 0 2px 8px rgba(34,40,78,.1);
}
.c-avatar img { width: 100%; height: 100%; object-fit: cover; }

.c-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.c-name { font-size: 14px; font-weight: 700; color: #22284E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.c-last { font-size: 12px; color: rgba(34,40,78,.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.c-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.c-time { font-size: 10px; color: rgba(34,40,78,.3); }
.c-unread {
  min-width: 18px; height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
}

/* PANEL DERECHO */
.chat-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, #fff 0%, #fafbfc 100%);
  min-height: 0;
  height: 100%;
  max-height: 100%;
}

.chat-empty {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 14px; color: rgba(34,40,78,.25); text-align: center;
}
.chat-empty h3 { font-size: 16px; font-weight: 700; color: rgba(34,40,78,.4); margin: 0; }
.chat-empty p  { font-size: 13px; margin: 0; max-width: 220px; }

.chat-top {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(34,40,78,.06);
  flex-shrink: 0;
  background: linear-gradient(90deg, rgba(255,107,157,.03), transparent);
}
.back-btn {
  display: none;
  background: none; border: none; cursor: pointer;
  color: rgba(34,40,78,.5); padding: 4px;
}
.back-btn svg { display: block; }
.ct-avatar {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff;
  overflow: hidden; flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(34,40,78,.1);
}
.ct-avatar img { width: 100%; height: 100%; object-fit: cover; }
.ct-info { display: flex; flex-direction: column; gap: 2px; }
.ct-name   { font-size: 15px; font-weight: 800; color: #22284E; }

/* Preview fullscreen */
.img-fullscreen {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.9);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; cursor: pointer;
}
.img-fullscreen img { max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 12px; }

/* Transiciones */
.slide-down-enter-active, .slide-down-leave-active { transition: all .2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Responsive */
@media (max-width: 768px) {
  .directs { grid-template-columns: 1fr; }
  .chat-panel { display: none; }
  .chat-panel.has-conv {
    display: flex;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 100;
    border-radius: 0;
    height: 100%; height: 100dvh; max-height: 100dvh;
    padding-bottom: calc(70px + env(safe-area-inset-bottom));
  }
  .back-btn { display: flex; }
}
</style>