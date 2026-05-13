<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const props = defineProps({
  currentUser: { type: Object, required: true },
  profile:     { type: Object, required: true },
})
const emit = defineEmits(['unread'])

/* ── Estado ─────────────────────────────────────────── */
const conversations    = ref([])
const privateMessages  = ref([])
const activeConv       = ref(null)   // { user_id, username, avatar_url }
const newMessage       = ref('')
const searchQuery      = ref('')
const searchResults    = ref([])
const messagesRef      = ref(null)
const fileInput        = ref(null)
const selectedImage    = ref(null)
const imagePreview     = ref(null)
const uploadingImage   = ref(false)
const previewImageUrl  = ref(null)
const showSearch       = ref(false)

let privateSub = null

/* ── Helpers ────────────────────────────────────────── */
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

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

/* ── Agrupar mensajes por fecha ─────────────────────── */
const groupedMessages = computed(() => {
  const groups = []
  let lastDate = null
  for (const msg of privateMessages.value) {
    const d = formatDate(msg.created_at)
    if (d !== lastDate) {
      groups.push({ type: 'date', label: d })
      lastDate = d
    }
    groups.push({ type: 'msg', ...msg })
  }
  return groups
})

/* ── Cargar conversaciones ──────────────────────────── */
async function loadConversations() {
  const { data } = await supabase
    .from('private_messages')
    .select('*')
    .or(`sender_id.eq.${props.currentUser.id},receiver_id.eq.${props.currentUser.id}`)
    .order('created_at', { ascending: false })

  if (!data) return

  const map = {}
  for (const msg of data) {
    const otherId = msg.sender_id === props.currentUser.id ? msg.receiver_id : msg.sender_id
    if (!map[otherId]) {
      map[otherId] = {
        user_id: otherId,
        lastMessage: msg.content || (msg.image_url ? '📷 Imagen' : ''),
        lastAt: msg.created_at,
      }
    }
  }

  const ids = Object.keys(map)
  if (!ids.length) return

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
    })).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
  }
}

/* ── Abrir conversación ─────────────────────────────── */
async function openConv(conv) {
  activeConv.value = conv
  showSearch.value = false
  searchQuery.value = ''
  searchResults.value = []

  if (!conversations.value.find(c => c.user_id === conv.user_id)) {
    conversations.value.unshift(conv)
  }

  await loadPrivateMessages(conv.user_id)
}

async function loadPrivateMessages(otherId) {
  const { data } = await supabase
    .from('private_messages')
    .select('*')
    .or(`and(sender_id.eq.${props.currentUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${props.currentUser.id})`)
    .order('created_at', { ascending: true })

  if (data) {
    privateMessages.value = data
    scrollToBottom()
  }
}

/* ── Buscar usuarios ────────────────────────────────── */
let searchTimer = null
watch(searchQuery, val => {
  clearTimeout(searchTimer)
  if (!val.trim()) { searchResults.value = []; return }
  searchTimer = setTimeout(() => searchUsers(val), 400)
})

async function searchUsers(q) {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `%${q}%`)
    .neq('id', props.currentUser.id)
    .limit(6)
  if (data) searchResults.value = data
}

/* ── Imagen ─────────────────────────────────────────── */
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

/* ── Enviar mensaje ─────────────────────────────────── */
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

    const { data } = await supabase
      .from('private_messages')
      .insert(payload)
      .select()

    if (data?.[0]) {
      privateMessages.value.push(data[0])
      scrollToBottom()

      // Actualizar último mensaje en la lista
      const conv = conversations.value.find(c => c.user_id === activeConv.value.user_id)
      if (conv) {
        conv.lastMessage = hasText ? newMessage.value.trim() : '📷 Imagen'
        conv.lastAt      = data[0].created_at
      }
    }

    newMessage.value = ''
    clearImage()
  } catch (e) {
    console.error('Error enviando:', e)
  } finally {
    uploadingImage.value = false
  }
}

/* ── Realtime ───────────────────────────────────────── */
function subscribe() {
  privateSub = supabase.channel('private-directs')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, payload => {
      const msg = payload.new
      const isForMe = msg.receiver_id === props.currentUser.id || msg.sender_id === props.currentUser.id
      if (!isForMe) return

      const otherId = msg.sender_id === props.currentUser.id ? msg.receiver_id : msg.sender_id

      if (activeConv.value?.user_id === otherId) {
        privateMessages.value.push(msg)
        scrollToBottom()
      } else {
        emit('unread', 1)
      }

      loadConversations()
    })
    .subscribe()
}

onMounted(async () => {
  await loadConversations()
  subscribe()
})

onUnmounted(() => {
  if (privateSub) supabase.removeChannel(privateSub)
})
</script>

<template>
  <div class="directs">

    <!-- ── Panel izquierdo — lista de conversaciones ── -->
    <div class="conv-panel">

      <!-- Cabecera con búsqueda -->
      <div class="conv-head">
        <span class="conv-head-title">Mensajes</span>
        <button class="icon-btn" @click="showSearch = !showSearch" title="Nueva conversación">
          <i class="ti ti-pencil-plus" aria-hidden="true"></i>
        </button>
      </div>

      <!-- Buscador de usuarios -->
      <Transition name="slide-down">
        <div v-if="showSearch" class="search-box">
          <div class="search-input-wrap">
            <i class="ti ti-search" aria-hidden="true"></i>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar usuario..."
              class="search-input"
              autofocus
            />
          </div>
          <div v-if="searchResults.length" class="search-results">
            <button
              v-for="u in searchResults" :key="u.id"
              class="search-result"
              @click="openConv({ user_id: u.id, username: u.username, avatar_url: u.avatar_url, lastMessage: '' })"
            >
              <div class="s-avatar" :style="{ background: '#ff6b9d' }">
                <img v-if="u.avatar_url" :src="u.avatar_url" />
                <span v-else>{{ initials(u.username) }}</span>
              </div>
              <span class="s-name">{{ u.username }}</span>
            </button>
          </div>
          <p v-else-if="searchQuery && !searchResults.length" class="search-empty">
            Sin resultados
          </p>
        </div>
      </Transition>

      <!-- Lista conversaciones -->
      <div class="conv-list">
        <div v-if="!conversations.length" class="conv-empty">
          <i class="ti ti-message-off" aria-hidden="true"></i>
          <p>Sin conversaciones aún</p>
          <span>Pulsa el lápiz para buscar usuarios</span>
        </div>

        <button
          v-for="conv in conversations" :key="conv.user_id"
          class="conv-item"
          :class="{ active: activeConv?.user_id === conv.user_id }"
          @click="openConv(conv)"
        >
          <div class="c-avatar">
            <img v-if="conv.avatar_url" :src="conv.avatar_url" />
            <span v-else>{{ initials(conv.username) }}</span>
          </div>
          <div class="c-info">
            <span class="c-name">{{ conv.username }}</span>
            <span class="c-last">{{ conv.lastMessage || 'Sin mensajes' }}</span>
          </div>
          <span class="c-time">{{ formatTime(conv.lastAt) }}</span>
        </button>
      </div>
    </div>

    <!-- ── Panel derecho — chat ── -->
    <div class="chat-panel" :class="{ 'has-conv': activeConv }">

      <!-- Sin conversación activa -->
      <div v-if="!activeConv" class="chat-empty">
        <i class="ti ti-message-circle" aria-hidden="true"></i>
        <h3>Tus mensajes</h3>
        <p>Selecciona una conversación o busca un usuario para empezar</p>
      </div>

      <template v-else>

        <!-- Header del chat -->
        <div class="chat-top">
          <button class="back-btn" @click="activeConv = null">
            <i class="ti ti-arrow-left" aria-hidden="true"></i>
          </button>
          <div class="ct-avatar">
            <img v-if="activeConv.avatar_url" :src="activeConv.avatar_url" />
            <span v-else>{{ initials(activeConv.username) }}</span>
          </div>
          <div class="ct-info">
            <span class="ct-name">{{ activeConv.username }}</span>
            <span class="ct-status">Activo</span>
          </div>
        </div>

        <!-- Mensajes -->
        <div class="messages" ref="messagesRef">
          <template v-for="item in groupedMessages" :key="item.id || item.label">

            <!-- Separador de fecha -->
            <div v-if="item.type === 'date'" class="date-sep">
              <span>{{ item.label }}</span>
            </div>

            <!-- Mensaje -->
            <div v-else class="msg-row" :class="isOwn(item) ? 'own' : 'other'">
              <div v-if="!isOwn(item)" class="msg-av">
                <img v-if="activeConv.avatar_url" :src="activeConv.avatar_url" />
                <span v-else>{{ initials(activeConv.username) }}</span>
              </div>
              <div class="msg-bubble" :class="isOwn(item) ? 'own' : 'other'">
                <img
                  v-if="item.image_url"
                  :src="item.image_url"
                  class="msg-img"
                  @click="previewImageUrl = item.image_url"
                />
                <p v-if="item.content">{{ item.content }}</p>
                <span class="msg-time">{{ formatTime(item.created_at) }}</span>
              </div>
            </div>
          </template>

          <div v-if="!privateMessages.length" class="no-msgs">
            <i class="ti ti-send" aria-hidden="true"></i>
            <p>Sé el primero en escribir</p>
          </div>
        </div>

        <!-- Preview imagen -->
        <div v-if="imagePreview" class="img-preview-bar">
          <img :src="imagePreview" />
          <button @click="clearImage">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>

        <!-- Input de mensaje -->
        <div class="msg-input-bar">
          <input type="file" ref="fileInput" accept="image/*" style="display:none" @change="onFileChange" />
          <button class="input-icon-btn" @click="fileInput.click()" title="Adjuntar imagen">
            <i class="ti ti-paperclip" aria-hidden="true"></i>
          </button>
          <input
            v-model="newMessage"
            type="text"
            class="msg-input"
            :placeholder="selectedImage ? 'Añade un texto (opcional)...' : 'Escribe un mensaje...'"
            @keyup.enter="sendMessage"
            :disabled="uploadingImage"
          />
          <button
            class="send-btn"
            @click="sendMessage"
            :disabled="(!newMessage.trim() && !selectedImage) || uploadingImage"
          >
            <i v-if="!uploadingImage" class="ti ti-send" aria-hidden="true"></i>
            <span v-else class="spinner"></span>
          </button>
        </div>

      </template>
    </div>

    <!-- Preview imagen a pantalla completa -->
    <Transition name="fade">
      <div v-if="previewImageUrl" class="img-fullscreen" @click="previewImageUrl = null">
        <img :src="previewImageUrl" />
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.directs {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 0;
  height: 100%;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 2px 20px rgba(34,40,78,.06);
  border: 1px solid rgba(34,40,78,.06);
}

/* ── Panel izquierdo ── */
.conv-panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(34,40,78,.06);
  background: #fafafa;
  overflow: hidden;
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
  width: 32px; height: 32px; border-radius: 10px;
  background: rgba(34,40,78,.06); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #22284E; font-size: 16px;
  transition: background .2s;
}
.icon-btn:hover { background: rgba(255,107,157,.12); color: #ff6b9d; }

/* Buscador */
.search-box {
  padding: 0 12px 10px;
  flex-shrink: 0;
}
.search-input-wrap {
  display: flex; align-items: center; gap: 8px;
  background: #fff; border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 10px; padding: 8px 12px;
  font-size: 14px; color: rgba(34,40,78,.4);
}
.search-input-wrap i { font-size: 15px; flex-shrink: 0; }
.search-input {
  border: none; background: transparent; font-size: 13px;
  color: #22284E; font-family: inherit; width: 100%;
}
.search-input:focus { outline: none; }
.search-results { margin-top: 6px; display: flex; flex-direction: column; gap: 2px; }
.search-result {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 10px;
  background: #fff; border: none; cursor: pointer;
  transition: background .15s;
}
.search-result:hover { background: rgba(255,107,157,.06); }
.s-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff;
  overflow: hidden; flex-shrink: 0;
}
.s-avatar img { width: 100%; height: 100%; object-fit: cover; }
.s-name { font-size: 13px; font-weight: 600; color: #22284E; }
.search-empty { font-size: 12px; color: rgba(34,40,78,.4); text-align: center; padding: 8px 0; }

/* Lista conversaciones */
.conv-list { flex: 1; overflow-y: auto; padding: 4px 8px 8px; }
.conv-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 40px 16px; text-align: center;
  color: rgba(34,40,78,.3);
}
.conv-empty i { font-size: 32px; }
.conv-empty p { font-size: 13px; font-weight: 600; margin: 0; }
.conv-empty span { font-size: 11px; }

.conv-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 10px; border-radius: 12px;
  width: 100%; border: none; background: transparent;
  cursor: pointer; text-align: left;
  transition: background .15s;
}
.conv-item:hover { background: rgba(34,40,78,.04); }
.conv-item.active { background: rgba(255,107,157,.08); }

.c-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: #22284E; color: #fff59e;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; flex-shrink: 0;
  overflow: hidden;
}
.c-avatar img { width: 100%; height: 100%; object-fit: cover; }
.c-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.c-name { font-size: 13px; font-weight: 700; color: #22284E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.c-last { font-size: 11px; color: rgba(34,40,78,.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.c-time { font-size: 10px; color: rgba(34,40,78,.3); flex-shrink: 0; }

/* ── Panel derecho ── */
.chat-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.chat-empty {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px; color: rgba(34,40,78,.25); text-align: center;
}
.chat-empty i { font-size: 48px; }
.chat-empty h3 { font-size: 16px; font-weight: 700; color: rgba(34,40,78,.4); margin: 0; }
.chat-empty p  { font-size: 13px; margin: 0; max-width: 220px; }

/* Header del chat */
.chat-top {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(34,40,78,.06);
  flex-shrink: 0;
}
.back-btn {
  display: none;
  background: none; border: none; cursor: pointer;
  color: rgba(34,40,78,.5); font-size: 18px; padding: 4px;
}
.ct-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  background: #22284E; color: #fff59e;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; overflow: hidden; flex-shrink: 0;
}
.ct-avatar img { width: 100%; height: 100%; object-fit: cover; }
.ct-info { display: flex; flex-direction: column; gap: 1px; }
.ct-name   { font-size: 14px; font-weight: 800; color: #22284E; }
.ct-status { font-size: 11px; color: #22c55e; font-weight: 600; }

/* Mensajes */
.messages {
  flex: 1; overflow-y: auto;
  padding: 16px; display: flex; flex-direction: column; gap: 4px;
}
.date-sep {
  text-align: center; margin: 10px 0;
}
.date-sep span {
  font-size: 11px; font-weight: 600; color: rgba(34,40,78,.35);
  background: #f4f5f9; padding: 3px 12px; border-radius: 99px;
}

.msg-row {
  display: flex; align-items: flex-end; gap: 8px;
  margin-bottom: 4px;
}
.msg-row.own { justify-content: flex-end; }
.msg-row.other { justify-content: flex-start; }

.msg-av {
  width: 28px; height: 28px; border-radius: 50%;
  background: #22284E; color: #fff59e;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; flex-shrink: 0;
  overflow: hidden;
}
.msg-av img { width: 100%; height: 100%; object-fit: cover; }

.msg-bubble {
  max-width: 68%; padding: 10px 14px;
  border-radius: 18px; display: flex; flex-direction: column; gap: 4px;
}
.msg-bubble.own   { background: #22284E; color: #fff; border-bottom-right-radius: 4px; }
.msg-bubble.other { background: #f4f5f9; color: #22284E; border-bottom-left-radius: 4px; }
.msg-bubble p { margin: 0; font-size: 14px; line-height: 1.5; word-break: break-word; }
.msg-time { font-size: 10px; opacity: .55; align-self: flex-end; }
.msg-bubble.own .msg-time { color: rgba(255,255,255,.6); }

.msg-img {
  max-width: 200px; border-radius: 10px;
  cursor: pointer; display: block;
  transition: opacity .2s;
}
.msg-img:hover { opacity: .88; }

.no-msgs {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; color: rgba(34,40,78,.25);
}
.no-msgs i { font-size: 32px; }
.no-msgs p { font-size: 13px; margin: 0; }

/* Preview imagen antes de enviar */
.img-preview-bar {
  padding: 8px 16px 0;
  position: relative; display: inline-flex;
}
.img-preview-bar img { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; }
.img-preview-bar button {
  position: absolute; top: 4px; right: 12px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #22284E; border: none; color: #fff;
  font-size: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

/* Input mensaje */
.msg-input-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(34,40,78,.06);
  flex-shrink: 0;
}
.input-icon-btn {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(34,40,78,.05); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(34,40,78,.4); font-size: 16px;
  transition: background .2s, color .2s; flex-shrink: 0;
}
.input-icon-btn:hover { background: rgba(255,107,157,.1); color: #ff6b9d; }
.msg-input {
  flex: 1; padding: 10px 14px;
  border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 12px; font-size: 14px;
  color: #22284E; background: #fafafa;
  font-family: inherit; transition: border-color .2s;
}
.msg-input:focus { outline: none; border-color: #ff6b9d; background: #fff; }
.send-btn {
  width: 40px; height: 40px; border-radius: 12px;
  background: #22284E; border: none; color: #fff59e;
  font-size: 17px; cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: transform .15s, opacity .2s;
}
.send-btn:hover:not(:disabled) { transform: scale(1.05); }
.send-btn:disabled { opacity: .4; cursor: not-allowed; }
.spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Preview imagen fullscreen */
.img-fullscreen {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.85);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; cursor: pointer;
}
.img-fullscreen img { max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 12px; }

/* Transiciones */
.slide-down-enter-active, .slide-down-leave-active { transition: all .2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Responsive móvil ── */
@media (max-width: 640px) {
  .directs { grid-template-columns: 1fr; }
  .conv-panel { display: flex; }
  .chat-panel { display: none; }
  .chat-panel.has-conv {
    display: flex;
    position: absolute; inset: 0;
    z-index: 50;
    border-radius: 0;
  }
  .back-btn { display: flex; }
}
</style>