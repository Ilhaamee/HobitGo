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
        <div class="chat-item" :class="{ active: activeTab === 'community' }" @click="activeTab = 'community'">
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
          <h3>{{ activeTab === 'community' ? '🌍 Comunidad HobitGo' : activeUsername }}</h3>
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
              <span v-if="activeTab === 'community' && !isOwnMessage(msg)" class="msg-username">{{ msg.username }}</span>
              
              <div v-if="msg.image_url" class="message-image" @click="openImagePreview(msg.image_url)">
                <img :src="msg.image_url" alt="Imagen enviada" />
              </div>
              
              <p v-if="msg.content">{{ msg.content }}</p>
              
              <span class="time">{{ formatTime(msg.created_at) }}</span>
            </div>
          </div>
          <div v-if="activeMessages.length === 0" class="no-messages">
            No hay mensajes aún. ¡Sé el primero!
          </div>
        </div>

        <div v-if="imagePreview" class="image-preview-container">
          <div class="image-preview">
            <img :src="imagePreview" alt="Preview" />
            <button class="remove-preview" @click="clearImagePreview">×</button>
          </div>
        </div>

        <div class="message-input">
          <input
            type="file"
            ref="fileInput"
            accept="image/*"
            style="display: none"
            @change="handleImageSelect"
          />
          <button class="attach-btn" @click="$refs.fileInput.click()" title="Adjuntar imagen">
            📎
          </button>
          <input
            v-model="newMessage"
            type="text"
            :placeholder="selectedImage ? 'Añade un texto (opcional)...' : 'Escribe un mensaje...'"
            @keyup.enter="sendMessage"
            :disabled="uploadingImage"
          />
          <button
            class="send-btn"
            @click="sendMessage"
            :disabled="(!newMessage.trim() && !selectedImage) || uploadingImage"
            :title="!newMessage.trim() && !selectedImage ? 'Escribe un mensaje o adjunta una imagen' : 'Enviar mensaje'"
          >
            <span v-if="uploadingImage">⏳</span>
            <span v-else>📤</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="previewImageUrl" class="image-modal" @click="previewImageUrl = null">
      <img :src="previewImageUrl" alt="Vista previa" />
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

const selectedImage = ref(null)
const imagePreview = ref(null)
const uploadingImage = ref(false)
const previewImageUrl = ref(null)
const fileInput = ref(null)

let communitySubscription = null
let privateSubscription = null

const activeMessages = computed(() => {
  if (activeTab.value === 'community') return communityMessages.value
  return privateMessages.value
})

function isOwnMessage(msg) {
  return msg.sender_id === currentUser.value?.id || msg.user_id === currentUser.value?.id
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function handleImageSelect(event) {
  const file = event.target.files[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      alert('El archivo debe ser una imagen')
      return
    }
    selectedImage.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

function clearImagePreview() {
  selectedImage.value = null
  imagePreview.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function openImagePreview(url) {
  previewImageUrl.value = url
}

async function uploadImage(file) {
  try {
    console.log('📤 Subiendo imagen:', file.name, file.size, 'bytes')
    
    const fileExt = file.name.split('.').pop().toLowerCase()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    
    // Subir sin carpeta (directamente en la raíz del bucket)
    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error de subida:', error)
      throw error
    }

    console.log('✅ Imagen subida:', data)

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName)

    console.log('🔗 URL:', urlData.publicUrl)
    return urlData.publicUrl
    
  } catch (error) {
    console.error('Error en uploadImage:', error)
    throw error
  }
}

async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user
  if (!user) return

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
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
    usernameError.value = error.message.includes('unique')
      ? 'Ese nombre ya está en uso'
      : 'Error al guardar'
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
  try {
    console.log('📥 Cargando mensajes de comunidad...')
    
    const { data, error } = await supabase
      .from('community_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)
      
    if (error) {
      console.error('❌ Error cargando mensajes:', error)
      throw error
    }
    
    if (data) {
      const userIds = [...new Set(data.map(msg => msg.user_id).filter(Boolean))]
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', userIds)
          
        const profilesMap = {}
        if (profiles) {
          profiles.forEach(p => { profilesMap[p.id] = p })
        }
        
        communityMessages.value = data.map(msg => ({
          ...msg,
          profiles: profilesMap[msg.user_id] || null
        }))
      } else {
        communityMessages.value = data
      }
      
      console.log(`✅ ${communityMessages.value.length} mensajes cargados`)
      scrollToBottom()
    }
  } catch (error) {
    console.error('Error en loadCommunityMessages:', error)
    communityMessages.value = []
  }
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
      let lastMessage = ''
      if (msg.content) {
        lastMessage = msg.content
      } else if (msg.image_url) {
        lastMessage = '📷 Imagen'
      }
      
      convMap[otherId] = { user_id: otherId, lastMessage }
    }
  }

  const userIds = Object.keys(convMap)
  if (userIds.length === 0) return

  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds)
  if (profiles) {
    conversations.value = profiles.map(p => ({
      user_id: p.id,
      username: p.username,
      avatar_url: p.avatar_url || null,
      lastMessage: convMap[p.id]?.lastMessage || ''
    }))
  }
}

async function loadPrivateMessages(otherUserId) {
  try {
    console.log(`📥 Cargando mensajes privados con usuario ${otherUserId}`)
    
    const { data, error } = await supabase
      .from('private_messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.value.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.value.id})`)
      .order('created_at', { ascending: true })
      
    if (error) {
      console.error('❌ Error cargando mensajes privados:', error)
      throw error
    }
    
    if (data) {
      privateMessages.value = data
      console.log(`✅ ${data.length} mensajes privados cargados`)
      scrollToBottom()
    }
  } catch (error) {
    console.error('Error en loadPrivateMessages:', error)
    privateMessages.value = []
  }
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
  if (!searchUser.value.trim()) {
    searchResults.value = []
    return
  }
  
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${searchUser.value}%`)
    .neq('id', currentUser.value.id)
    .limit(5)
    
  if (data) searchResults.value = data
}

async function sendMessage() {
  const hasText = newMessage.value.trim().length > 0
  const hasImage = selectedImage.value !== null
  
  console.log('📨 Validando envío:', { hasText, hasImage, uploading: uploadingImage.value })
  
  if ((!hasText && !hasImage) || uploadingImage.value) {
    console.log('⚠️ No hay contenido para enviar o ya está subiendo')
    return
  }
  
  let imageUrl = null
  
  if (hasImage) {
    uploadingImage.value = true
    try {
      console.log('📤 Subiendo imagen...')
      imageUrl = await uploadImage(selectedImage.value)
      console.log('✅ Imagen subida:', imageUrl)
    } catch (error) {
      console.error('❌ Error al subir imagen:', error)
      alert('Error al subir la imagen: ' + error.message)
      uploadingImage.value = false
      return
    }
  }

  const content = hasText ? newMessage.value.trim() : null
  
  try {
    let error = null
    
    if (activeTab.value === 'community') {
      // Construir objeto simple sin campos undefined
      const insertData = {
        user_id: currentUser.value.id,
        username: profile.value.username
      }
      
      if (content) insertData.content = content
      if (imageUrl) insertData.image_url = imageUrl
      
      console.log('📦 Enviando a community_messages:', insertData)
      
      const result = await supabase
        .from('community_messages')
        .insert(insertData)
      
      error = result.error
      
      if (!error) {
        console.log('✅ Mensaje de comunidad enviado')
      }
      
    } else {
      // Construir objeto simple sin campos undefined
      const insertData = {
        sender_id: currentUser.value.id,
        receiver_id: activeTab.value
      }
      
      if (content) insertData.content = content
      if (imageUrl) insertData.image_url = imageUrl
      
      console.log('📦 Enviando a private_messages:', insertData)
      
      const result = await supabase
        .from('private_messages')
        .insert(insertData)
      
      error = result.error
      
      if (!error) {
        console.log('✅ Mensaje privado enviado')
      }
    }
    
    if (error) {
      console.error('❌ Error de Supabase:', error)
      
      // Mostrar mensaje específico según el error
      if (error.message && error.message.includes('image_url')) {
        alert('Error: La columna image_url no existe. Ejecuta el script SQL proporcionado.')
      } else if (error.code === '23502') {
        alert('Error: Faltan campos requeridos.')
      } else {
        alert('Error al enviar mensaje: ' + error.message)
      }
      
      throw error
    }
    
    // Limpiar campos
    newMessage.value = ''
    clearImagePreview()
    
  } catch (error) {
    console.error('❌ Error completo:', error)
  } finally {
    uploadingImage.value = false
  }
}

function subscribeToMessages() {
  communitySubscription = supabase.channel('community')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'community_messages' },
      async payload => {
        console.log('📨 Nuevo mensaje de comunidad recibido')
        const msg = payload.new
        
        if (msg.user_id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', msg.user_id)
            .single()
          msg.profiles = prof || null
        }
        
        communityMessages.value.push(msg)
        if (activeTab.value === 'community') scrollToBottom()
      }
    )
    .subscribe((status) => {
      console.log('📡 Suscripción community:', status)
    })

  privateSubscription = supabase.channel('private')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'private_messages' },
      payload => {
        console.log('📨 Nuevo mensaje privado recibido')
        const msg = payload.new
        const isForMe = msg.receiver_id === currentUser.value.id || msg.sender_id === currentUser.value.id
        
        if (!isForMe) return
        
        const otherId = msg.sender_id === currentUser.value.id ? msg.receiver_id : msg.sender_id
        
        if (activeTab.value === otherId) {
          privateMessages.value.push(msg)
          scrollToBottom()
        }
        
        loadConversations()
      }
    )
    .subscribe((status) => {
      console.log('📡 Suscripción private:', status)
    })
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

async function diagnoseDatabase() {
  console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO...')
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('👤 Usuario:', user ? `✅ ${user.email}` : '❌ No autenticado')
    if (authError) console.error('Error auth:', authError)
    
    const { data: profileTest, error: profileError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      
    if (profileError) {
      console.error('❌ Error en tabla profiles:', profileError.message)
    } else {
      console.log('✅ Tabla profiles accesible')
    }
    
    const { data: commTest, error: commError } = await supabase
      .from('community_messages')
      .select('id')
      .limit(1)
      
    if (commError) {
      console.error('❌ Error en community_messages:', commError.message)
    } else {
      console.log('✅ Tabla community_messages accesible')
    }
    
    const { data: privTest, error: privError } = await supabase
      .from('private_messages')
      .select('id')
      .limit(1)
      
    if (privError) {
      console.error('❌ Error en private_messages:', privError.message)
    } else {
      console.log('✅ Tabla private_messages accesible')
    }
    
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    if (bucketError) {
      console.error('❌ Error listando buckets:', bucketError)
    } else {
      console.log('📦 Buckets disponibles:', buckets?.map(b => b.name).join(', ') || 'NINGUNO')
      const chatBucket = buckets?.find(b => b.name === 'chat-images')
      console.log(`📦 Bucket chat-images: ${chatBucket ? '✅ Existe' : '❌ No existe - EJECUTA EL SQL'}`)
    }
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
  }
  
  console.log('🔍 DIAGNÓSTICO COMPLETADO')
}

watch(activeTab, () => scrollToBottom())

onMounted(async () => {
  await diagnoseDatabase()
  await loadProfile()
})

onUnmounted(() => {
  if (communitySubscription) supabase.removeChannel(communitySubscription)
  if (privateSubscription) supabase.removeChannel(privateSubscription)
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
.chat-list-header { font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase; padding: 12px 16px 4px; letter-spacing: 0.5px; }
.chat-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; transition: background 0.2s; border-left: 3px solid transparent; }
.chat-item:hover { background: #f9f9f9; }
.chat-item.active { background: #fff5f0; border-left-color: #E08E6B; }

.chat-avatar { width: 44px; height: 44px; border-radius: 12px; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0; }
.chat-avatar.community { background: #22284E; font-size: 20px; }
.chat-avatar-img { width: 44px; height: 44px; border-radius: 12px; overflow: hidden; flex-shrink: 0; }
.chat-avatar-img img { width: 100%; height: 100%; object-fit: cover; }

.chat-info { flex: 1; min-width: 0; }
.chat-info h4 { font-size: 14px; color: #1a1a2e; margin: 0 0 3px; }
.chat-info p { font-size: 12px; color: #888; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.new-chat { padding: 12px; border-top: 1px solid #eee; margin-top: auto; }
.search-results { background: #fff; border: 1px solid #eee; border-radius: 8px; margin-top: 4px; overflow: hidden; }
.search-result-item { padding: 10px 12px; font-size: 14px; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 8px; }
.search-result-item:hover { background: #f5f5f5; }
.search-avatar { width: 28px; height: 28px; border-radius: 8px; object-fit: cover; }
.search-avatar-placeholder { width: 28px; height: 28px; border-radius: 8px; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }

.chat-room { background: #fff; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 2px 10px rgba(0,0,0,0.05); overflow: hidden; }
.chat-header { padding: 20px; border-bottom: 1px solid #eee; }
.chat-header h3 { font-size: 18px; color: #1a1a2e; margin: 0; }

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
.remove-preview:hover { background: #cc0000; }

.message-input { padding: 16px; border-top: 1px solid #eee; display: flex; gap: 8px; align-items: center; }
.message-input input[type="text"] { flex: 1; padding: 12px 16px; border: 1px solid #eee; border-radius: 24px; font-size: 14px; outline: none; font-family: inherit; }
.message-input input[type="text"]:focus { border-color: #E08E6B; }
.attach-btn { width: 44px; height: 44px; border-radius: 50%; background: #f5f5f5; color: #666; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 20px; flex-shrink: 0; }
.attach-btn:hover { background: #e0e0e0; }
.send-btn { width: 44px; height: 44px; border-radius: 50%; background: #E08E6B; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; flex-shrink: 0; font-size: 18px; }
.send-btn:hover { background: #d07a5a; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.image-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 9999; cursor: pointer; }
.image-modal img { max-width: 90%; max-height: 90%; object-fit: contain; }

.input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; margin-bottom: 10px; box-sizing: border-box; font-family: inherit; }
.input:focus { outline: none; border-color: #E08E6B; }
.error-message { background: #ffebee; color: #c62828; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 10px; }
.btn-primary { background: #E08E6B; color: #fff; padding: 12px; border-radius: 8px; width: 100%; font-weight: 600; border: none; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 768px) {
  .chat-container { grid-template-columns: 1fr; }
  .chat-list { max-height: 200px; }
  .message-image { max-width: 200px; }
}
</style>