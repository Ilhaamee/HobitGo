<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const props = defineProps({
  currentUser: { type: Object, required: true },
  profile:     { type: Object, required: true },
})
const emit = defineEmits(['unread'])

/* ── Estado ─────────────────────────────────────────── */
const communities     = ref([])   // todas las comunidades
const myCommunities   = ref([])   // ids de las que soy miembro
const activeCommunity = ref(null) // comunidad abierta
const messages        = ref([])
const newMessage      = ref('')
const messagesRef     = ref(null)
const showCreate      = ref(false)
const sending         = ref(false)

// Formulario crear comunidad
const form = ref({ name: '', description: '', category: 'general' })
const creating = ref(false)
const formError = ref('')

const CATEGORIES = [
  { key: 'general',     label: 'General',     color: '#6366f1' },
  { key: 'deportes',    label: 'Deportes',     color: '#ff6b9d' },
  { key: 'creatividad', label: 'Creatividad',  color: '#8b5cf6' },
  { key: 'musica',      label: 'Música',       color: '#f59e0b' },
  { key: 'mente',       label: 'Mente',        color: '#3b82f6' },
  { key: 'bienestar',   label: 'Bienestar',    color: '#14b8a6' },
  { key: 'cocina',      label: 'Cocina',       color: '#f97316' },
  { key: 'tecnologia',  label: 'Tecnología',   color: '#06b6d4' },
]

let commSub = null

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
function categoryColor(key) {
  return CATEGORIES.find(c => c.key === key)?.color || '#6366f1'
}
function categoryLabel(key) {
  return CATEGORIES.find(c => c.key === key)?.label || key
}
function isOwn(msg) {
  return msg.user_id === props.currentUser?.id
}
function isMember(communityId) {
  return myCommunities.value.includes(communityId)
}
function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  })
}

/* ── Agrupar mensajes por fecha ─────────────────────── */
const groupedMessages = computed(() => {
  const groups = []
  let lastDate = null
  for (const msg of messages.value) {
    const d = formatDate(msg.created_at)
    if (d !== lastDate) {
      groups.push({ type: 'date', label: d })
      lastDate = d
    }
    groups.push({ type: 'msg', ...msg })
  }
  return groups
})

/* ── Cargar comunidades ─────────────────────────────── */
async function loadCommunities() {
  const { data } = await supabase
    .from('communities')
    .select('*, community_members(count)')
    .order('created_at', { ascending: false })

  if (data) communities.value = data

  // Mis membresías
  const { data: memberships } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', props.currentUser.id)

  if (memberships) myCommunities.value = memberships.map(m => m.community_id)
}

/* ── Abrir comunidad ────────────────────────────────── */
async function openCommunity(community) {
  activeCommunity.value = community
  await loadMessages(community.id)
  subscribeMessages(community.id)
}

async function loadMessages(communityId) {
  const { data } = await supabase
    .from('community_messages')
    .select('*, profiles(id, username, avatar_url)')
    .eq('community_id', communityId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (data) {
    messages.value = data
    scrollToBottom()
  }
}

/* ── Unirse / salir ─────────────────────────────────── */
async function toggleMember(communityId) {
  if (isMember(communityId)) {
    await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', props.currentUser.id)
    myCommunities.value = myCommunities.value.filter(id => id !== communityId)
  } else {
    await supabase
      .from('community_members')
      .insert({ community_id: communityId, user_id: props.currentUser.id })
    myCommunities.value.push(communityId)
  }
  await loadCommunities()
}

/* ── Crear comunidad ────────────────────────────────── */
async function createCommunity() {
  if (!form.value.name.trim()) { formError.value = 'El nombre es obligatorio'; return }
  creating.value = true
  formError.value = ''

  const { data, error } = await supabase
    .from('communities')
    .insert({
      name:        form.value.name.trim(),
      description: form.value.description.trim() || null,
      category:    form.value.category,
      creator_id:  props.currentUser.id,
    })
    .select()

  if (error) {
    formError.value = 'Error al crear la comunidad'
    creating.value = false
    return
  }

  if (data?.[0]) {
    // Unirse automáticamente como creador
    await supabase.from('community_members').insert({
      community_id: data[0].id,
      user_id:      props.currentUser.id,
      role:         'admin',
    })
    myCommunities.value.push(data[0].id)
    await loadCommunities()
    showCreate.value = false
    form.value = { name: '', description: '', category: 'general' }
  }

  creating.value = false
}

/* ── Enviar mensaje ─────────────────────────────────── */
async function sendMessage() {
  if (!activeCommunity.value || !newMessage.value.trim() || sending.value) return
  sending.value = true

  const { data } = await supabase
    .from('community_messages')
    .insert({
      community_id: activeCommunity.value.id,
      user_id:      props.currentUser.id,
      username:     props.profile.username,
      content:      newMessage.value.trim(),
    })
    .select('*, profiles(id, username, avatar_url)')

  if (data?.[0]) {
    messages.value.push(data[0])
    scrollToBottom()
  }

  newMessage.value = ''
  sending.value = false
}

/* ── Realtime mensajes ──────────────────────────────── */
function subscribeMessages(communityId) {
  if (commSub) supabase.removeChannel(commSub)

  commSub = supabase.channel(`community-${communityId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'community_messages',
      filter: `community_id=eq.${communityId}`
    }, async payload => {
      const msg = payload.new
      if (msg.user_id === props.currentUser.id) return // ya lo añadimos al enviar

      // Enriquecer con perfil
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', msg.user_id)
        .single()

      messages.value.push({ ...msg, profiles: prof })
      scrollToBottom()
      emit('unread', 1)
    })
    .subscribe()
}

onMounted(loadCommunities)
onUnmounted(() => { if (commSub) supabase.removeChannel(commSub) })
</script>

<template>
  <div class="communities">

    <!-- ── Panel izquierdo ── -->
    <div class="left-panel">
      <div class="panel-head">
        <span class="panel-title">Comunidades</span>
        <button class="icon-btn" @click="showCreate = !showCreate" title="Crear comunidad">
          <i class="ti ti-plus" aria-hidden="true"></i>
        </button>
      </div>

      <!-- Crear comunidad -->
      <Transition name="slide-down">
        <div v-if="showCreate" class="create-form">
          <input
            v-model="form.name"
            type="text"
            class="cf-input"
            placeholder="Nombre de la comunidad"
            maxlength="40"
          />
          <input
            v-model="form.description"
            type="text"
            class="cf-input"
            placeholder="Descripción (opcional)"
            maxlength="100"
          />
          <div class="cf-cats">
            <button
              v-for="cat in CATEGORIES" :key="cat.key"
              class="cf-cat"
              :class="{ active: form.category === cat.key }"
              :style="form.category === cat.key ? { background: cat.color, borderColor: cat.color, color: '#fff' } : { borderColor: cat.color + '55' }"
              @click="form.category = cat.key"
            >{{ cat.label }}</button>
          </div>
          <p v-if="formError" class="cf-error">{{ formError }}</p>
          <div class="cf-actions">
            <button class="cf-btn-create" @click="createCommunity" :disabled="creating">
              {{ creating ? 'Creando...' : 'Crear' }}
            </button>
            <button class="cf-btn-cancel" @click="showCreate = false">Cancelar</button>
          </div>
        </div>
      </Transition>

      <!-- Lista de comunidades -->
      <div class="comm-list">
        <div v-if="!communities.length" class="list-empty">
          <i class="ti ti-users" aria-hidden="true"></i>
          <p>Sin comunidades aún</p>
          <span>Crea la primera</span>
        </div>

        <button
          v-for="c in communities" :key="c.id"
          class="comm-item"
          :class="{ active: activeCommunity?.id === c.id }"
          @click="openCommunity(c)"
        >
          <div class="ci-icon" :style="{ background: categoryColor(c.category) }">
            {{ initials(c.name) }}
          </div>
          <div class="ci-info">
            <span class="ci-name">{{ c.name }}</span>
            <span class="ci-cat">{{ categoryLabel(c.category) }}</span>
          </div>
          <div class="ci-right">
            <span
              class="ci-badge"
              :style="isMember(c.id) ? { background: categoryColor(c.category) } : {}"
              :class="{ member: isMember(c.id) }"
            >
              {{ isMember(c.id) ? '✓' : '+' }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- ── Panel derecho ── -->
    <div class="right-panel" :class="{ 'has-comm': activeCommunity }">

      <div v-if="!activeCommunity" class="panel-empty">
        <i class="ti ti-users-group" aria-hidden="true"></i>
        <h3>Comunidades</h3>
        <p>Selecciona una comunidad para ver el chat</p>
      </div>

      <template v-else>

        <!-- Header -->
        <div class="comm-top">
          <button class="back-btn" @click="activeCommunity = null">
            <i class="ti ti-arrow-left" aria-hidden="true"></i>
          </button>
          <div class="ct-icon" :style="{ background: categoryColor(activeCommunity.category) }">
            {{ initials(activeCommunity.name) }}
          </div>
          <div class="ct-info">
            <span class="ct-name">{{ activeCommunity.name }}</span>
            <span class="ct-cat">{{ categoryLabel(activeCommunity.category) }}</span>
          </div>
          <button
            class="join-btn"
            :style="isMember(activeCommunity.id)
              ? { background: 'rgba(34,40,78,.06)', color: 'rgba(34,40,78,.5)' }
              : { background: categoryColor(activeCommunity.category), color: '#fff' }"
            @click="toggleMember(activeCommunity.id)"
          >
            {{ isMember(activeCommunity.id) ? 'Salir' : 'Unirse' }}
          </button>
        </div>

        <!-- Descripción si existe -->
        <div v-if="activeCommunity.description" class="comm-desc">
          {{ activeCommunity.description }}
        </div>

        <!-- Mensajes -->
        <div class="messages" ref="messagesRef">
          <template v-for="item in groupedMessages" :key="item.id || item.label">

            <div v-if="item.type === 'date'" class="date-sep">
              <span>{{ item.label }}</span>
            </div>

            <div v-else class="msg-row" :class="isOwn(item) ? 'own' : 'other'">
              <div v-if="!isOwn(item)" class="msg-av">
                <img v-if="item.profiles?.avatar_url" :src="item.profiles.avatar_url" />
                <span v-else>{{ initials(item.profiles?.username || item.username) }}</span>
              </div>
              <div class="msg-bubble" :class="isOwn(item) ? 'own' : 'other'">
                <span v-if="!isOwn(item)" class="msg-author">
                  {{ item.profiles?.username || item.username }}
                </span>
                <p v-if="item.content">{{ item.content }}</p>
                <span class="msg-time">{{ formatTime(item.created_at) }}</span>
              </div>
            </div>

          </template>

          <div v-if="!messages.length" class="no-msgs">
            <i class="ti ti-message-circle" aria-hidden="true"></i>
            <p>Sé el primero en escribir</p>
          </div>
        </div>

        <!-- Input — solo si es miembro -->
        <div v-if="isMember(activeCommunity.id)" class="msg-input-bar">
          <input
            v-model="newMessage"
            type="text"
            class="msg-input"
            placeholder="Escribe un mensaje..."
            @keyup.enter="sendMessage"
            :disabled="sending"
          />
          <button
            class="send-btn"
            @click="sendMessage"
            :disabled="!newMessage.trim() || sending"
            :style="{ background: categoryColor(activeCommunity.category) }"
          >
            <i v-if="!sending" class="ti ti-send" aria-hidden="true"></i>
            <span v-else class="spinner"></span>
          </button>
        </div>

        <!-- Banner para unirse si no es miembro -->
        <div v-else class="join-banner">
          <p>Únete a la comunidad para participar en el chat</p>
          <button
            class="join-banner-btn"
            :style="{ background: categoryColor(activeCommunity.category) }"
            @click="toggleMember(activeCommunity.id)"
          >
            Unirse a {{ activeCommunity.name }}
          </button>
        </div>

      </template>
    </div>

  </div>
</template>

<style scoped>
.communities {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 100%;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 2px 20px rgba(34,40,78,.06);
  border: 1px solid rgba(34,40,78,.06);
}

/* ── Panel izquierdo ── */
.left-panel {
  display: flex; flex-direction: column;
  border-right: 1px solid rgba(34,40,78,.06);
  background: #fafafa; overflow: hidden;
}

.panel-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 12px; flex-shrink: 0;
}
.panel-title { font-size: 16px; font-weight: 800; color: #22284E; }
.icon-btn {
  width: 32px; height: 32px; border-radius: 10px;
  background: rgba(34,40,78,.06); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #22284E; font-size: 16px;
  transition: background .2s;
}
.icon-btn:hover { background: rgba(255,107,157,.12); color: #ff6b9d; }

/* Formulario crear */
.create-form {
  padding: 0 12px 12px;
  display: flex; flex-direction: column; gap: 8px;
  flex-shrink: 0;
}
.cf-input {
  padding: 9px 12px; border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 10px; font-size: 13px; color: #22284E;
  background: #fff; font-family: inherit;
  transition: border-color .2s;
}
.cf-input:focus { outline: none; border-color: #ff6b9d; }
.cf-cats { display: flex; flex-wrap: wrap; gap: 5px; }
.cf-cat {
  padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 600;
  border: 1.5px solid rgba(34,40,78,.12); background: transparent;
  color: rgba(34,40,78,.6); cursor: pointer; transition: all .15s;
}
.cf-cat:hover { border-color: rgba(34,40,78,.3); }
.cf-error { font-size: 12px; color: #dc2626; margin: 0; }
.cf-actions { display: flex; gap: 6px; }
.cf-btn-create {
  flex: 1; padding: 9px; border: none; border-radius: 10px;
  background: #22284E; color: #fff59e;
  font-size: 13px; font-weight: 700; cursor: pointer;
  transition: opacity .2s;
}
.cf-btn-create:disabled { opacity: .5; cursor: not-allowed; }
.cf-btn-cancel {
  padding: 9px 14px; border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 10px; background: transparent;
  font-size: 13px; color: rgba(34,40,78,.5); cursor: pointer;
}

/* Lista comunidades */
.comm-list { flex: 1; overflow-y: auto; padding: 4px 8px 8px; }
.list-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 40px 16px; text-align: center;
  color: rgba(34,40,78,.3);
}
.list-empty i  { font-size: 32px; }
.list-empty p  { font-size: 13px; font-weight: 600; margin: 0; }
.list-empty span { font-size: 11px; }

.comm-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px; border-radius: 12px;
  width: 100%; border: none; background: transparent;
  cursor: pointer; text-align: left; transition: background .15s;
}
.comm-item:hover  { background: rgba(34,40,78,.04); }
.comm-item.active { background: rgba(99,102,241,.08); }

.ci-icon {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.ci-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ci-name { font-size: 13px; font-weight: 700; color: #22284E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ci-cat  { font-size: 11px; color: rgba(34,40,78,.4); }
.ci-badge {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
  background: rgba(34,40,78,.06); color: rgba(34,40,78,.4);
  flex-shrink: 0; transition: all .2s;
}
.ci-badge.member { color: #fff; }

/* ── Panel derecho ── */
.right-panel {
  display: flex; flex-direction: column;
  overflow: hidden; background: #fff;
}
.panel-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px; color: rgba(34,40,78,.25); text-align: center;
}
.panel-empty i  { font-size: 48px; }
.panel-empty h3 { font-size: 16px; font-weight: 700; color: rgba(34,40,78,.4); margin: 0; }
.panel-empty p  { font-size: 13px; margin: 0; max-width: 220px; }

/* Header comunidad */
.comm-top {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(34,40,78,.06); flex-shrink: 0;
}
.back-btn {
  display: none; background: none; border: none;
  cursor: pointer; color: rgba(34,40,78,.5); font-size: 18px; padding: 4px;
}
.ct-icon {
  width: 38px; height: 38px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.ct-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.ct-name { font-size: 14px; font-weight: 800; color: #22284E; }
.ct-cat  { font-size: 11px; color: rgba(34,40,78,.4); font-weight: 600; }
.join-btn {
  padding: 7px 16px; border: none; border-radius: 99px;
  font-size: 12px; font-weight: 700; cursor: pointer;
  transition: opacity .2s; flex-shrink: 0;
}
.join-btn:hover { opacity: .85; }

/* Descripción */
.comm-desc {
  padding: 10px 16px;
  font-size: 13px; color: rgba(34,40,78,.5);
  background: rgba(34,40,78,.02);
  border-bottom: 1px solid rgba(34,40,78,.05);
  flex-shrink: 0;
}

/* Mensajes */
.messages {
  flex: 1; overflow-y: auto;
  padding: 16px; display: flex; flex-direction: column; gap: 4px;
}
.date-sep { text-align: center; margin: 10px 0; }
.date-sep span {
  font-size: 11px; font-weight: 600; color: rgba(34,40,78,.35);
  background: #f4f5f9; padding: 3px 12px; border-radius: 99px;
}
.msg-row { display: flex; align-items: flex-end; gap: 8px; margin-bottom: 4px; }
.msg-row.own   { justify-content: flex-end; }
.msg-row.other { justify-content: flex-start; }
.msg-av {
  width: 28px; height: 28px; border-radius: 50%;
  background: #22284E; color: #fff59e;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; flex-shrink: 0; overflow: hidden;
}
.msg-av img { width: 100%; height: 100%; object-fit: cover; }
.msg-bubble {
  max-width: 68%; padding: 10px 14px;
  border-radius: 18px; display: flex; flex-direction: column; gap: 3px;
}
.msg-bubble.own   { background: #22284E; color: #fff; border-bottom-right-radius: 4px; }
.msg-bubble.other { background: #f4f5f9; color: #22284E; border-bottom-left-radius: 4px; }
.msg-author { font-size: 11px; font-weight: 700; color: #ff6b9d; }
.msg-bubble.own .msg-author { color: #ffb3c6; }
.msg-bubble p { margin: 0; font-size: 14px; line-height: 1.5; word-break: break-word; }
.msg-time { font-size: 10px; opacity: .55; align-self: flex-end; }
.msg-bubble.own .msg-time { color: rgba(255,255,255,.6); }
.no-msgs {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; color: rgba(34,40,78,.25);
}
.no-msgs i { font-size: 32px; }
.no-msgs p { font-size: 13px; margin: 0; }

/* Input mensaje */
.msg-input-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(34,40,78,.06); flex-shrink: 0;
}
.msg-input {
  flex: 1; padding: 10px 14px;
  border: 1.5px solid rgba(34,40,78,.1); border-radius: 12px;
  font-size: 14px; color: #22284E; background: #fafafa;
  font-family: inherit; transition: border-color .2s;
}
.msg-input:focus { outline: none; border-color: #ff6b9d; background: #fff; }
.send-btn {
  width: 40px; height: 40px; border-radius: 12px;
  border: none; color: #fff; font-size: 17px;
  cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: transform .15s, opacity .2s;
}
.send-btn:hover:not(:disabled) { transform: scale(1.05); }
.send-btn:disabled { opacity: .4; cursor: not-allowed; }
.spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Banner unirse */
.join-banner {
  padding: 16px; border-top: 1px solid rgba(34,40,78,.06);
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

/* Responsive */
@media (max-width: 640px) {
  .communities { grid-template-columns: 1fr; }
  .right-panel { display: none; }
  .right-panel.has-comm {
    display: flex; position: absolute; inset: 0; z-index: 50;
    border-radius: 0;
  }
  .back-btn { display: flex; }
}
</style>