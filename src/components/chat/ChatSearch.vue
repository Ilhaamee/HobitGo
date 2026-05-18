<!-- ChatSearch.vue MEJORADO -->
<script setup>
import { ref, watch, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import UserProfileCard from './Userprofilecard.vue'

const props = defineProps({
  currentUserId: { type: String, required: true },
  placeholder:   { type: String, default: 'Buscar usuarios...' },
  excludeIds:    { type: Array,  default: () => [] },
  mode:          { type: String, default: 'direct' }, // 'direct' | 'invite' | 'view'
})

const emit = defineEmits(['message', 'invite', 'close'])

const query       = ref('')
const results     = ref([])
const loading     = ref(false)
const input       = ref(null)
const previewUser = ref(null)

let timer = null

watch(query, val => {
  clearTimeout(timer)
  if (!val.trim()) { results.value = []; return }
  loading.value = true
  timer = setTimeout(() => search(val), 380)
})

async function search(q) {
  // 🔒 SOLO usuarios con perfil público aparecen en búsqueda
  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, is_public')
    .ilike('username', `%${q.trim()}%`)
    .eq('is_public', true)  // ← Filtro de privacidad
    .neq('id', props.currentUserId)
    .limit(8)

  results.value = (data || []).filter(u => !props.excludeIds.includes(u.id))
  loading.value = false
}

function openProfile(user) { previewUser.value = user }

function onMessage() {
  emit('message', previewUser.value)
  previewUser.value = null
  query.value = ''
  results.value = []
}

function onInvite() {
  emit('invite', previewUser.value)
  previewUser.value = null
  query.value = ''
  results.value = []
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

onMounted(() => { setTimeout(() => input.value?.focus(), 60) })
</script>

<template>
  <div class="cs-root">

    <!-- Input con gradiente sutil -->
    <div class="cs-input-wrap">
      <svg class="cs-ico" viewBox="0 0 20 20" fill="none" width="14">
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.7"/>
        <path d="M14 14l3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>
      <input
        ref="input"
        v-model="query"
        type="text"
        class="cs-input"
        :placeholder="placeholder"
        autocomplete="off"
        @keydown.escape="emit('close')"
      />
      <button v-if="query" class="cs-clear" @click="query = ''">
        <svg viewBox="0 0 12 12" fill="none" width="10">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </button>
      <button class="cs-close-btn" @click="emit('close')">
        <svg viewBox="0 0 14 14" fill="none" width="11">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- Resultados con animación -->
    <div class="cs-results">
      <div v-if="loading" class="cs-state">
        <div class="cs-spinner"></div>
        <span>Buscando...</span>
      </div>

      <div v-else-if="query && !results.length" class="cs-state cs-empty">
        <svg viewBox="0 0 24 24" fill="none" width="28" stroke="currentColor" stroke-width="1.4">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35" stroke-linecap="round"/>
        </svg>
        <span>Sin resultados para "<strong>{{ query }}</strong>"</span>
      </div>

      <template v-else>
        <!-- Tarjeta de usuario mejorada -->
        <button
          v-for="user in results"
          :key="user.id"
          class="cs-item"
          @click="openProfile(user)"
        >
          <div class="cs-avatar" :style="user.avatar_url ? {} : { background: 'linear-gradient(135deg, #ff6b9d, #ffb3c6)' }">
            <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.username" />
            <span v-else>{{ initials(user.username) }}</span>
          </div>
          <div class="cs-info">
            <span class="cs-name">{{ user.username }}</span>
            <span class="cs-sub">{{ user.bio || 'Ver perfil público' }}</span>
          </div>
          <div class="cs-action">
            <svg viewBox="0 0 16 16" fill="none" width="13">
              <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </button>

        <div v-if="!query" class="cs-hint">
          <i class="ti ti-search" style="font-size: 20px; margin-bottom: 6px; display: block;"></i>
          Escribe un nombre para buscar usuarios públicos
        </div>
      </template>
    </div>

    <!-- Mini perfil -->
    <UserProfileCard
      v-if="previewUser"
      :user-id="previewUser.id"
      :current-user-id="currentUserId"
      :mode="mode"
      @message="onMessage"
      @invite="onInvite"
      @close="previewUser = null"
    />
  </div>
</template>

<style scoped>
.cs-root { 
  display: flex; 
  flex-direction: column; 
  overflow: hidden; 
}

/* Input con gradiente sutil */
.cs-input-wrap {
  display: flex; 
  align-items: center; 
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(34,40,78,.07);
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(255,107,157,.03), rgba(255,179,198,.03));
}
.cs-ico { 
  color: #ff6b9d; 
  flex-shrink: 0; 
}
.cs-input {
  flex: 1; 
  border: none; 
  background: transparent;
  font-size: 14px; 
  color: #22284E; 
  font-family: inherit; 
  outline: none; 
  min-width: 0;
}
.cs-input::placeholder { 
  color: rgba(34,40,78,.35); 
}
.cs-clear, .cs-close-btn {
  background: none; 
  border: none; 
  cursor: pointer; 
  color: rgba(34,40,78,.35);
  display: flex; 
  align-items: center; 
  justify-content: center;
  padding: 4px; 
  border-radius: 6px; 
  flex-shrink: 0; 
  transition: color .15s, background .15s;
}
.cs-clear:hover     { 
  color: #22284E; 
  background: rgba(34,40,78,.06); 
}
.cs-close-btn:hover { 
  color: #ff6b9d; 
  background: rgba(255,107,157,.08); 
}

/* Resultados */
.cs-results {
  flex: 1; 
  overflow-y: auto; 
  padding: 6px 8px 8px;
  display: flex; 
  flex-direction: column; 
  gap: 2px; 
  min-height: 0;
}
.cs-state {
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  gap: 10px;
  padding: 28px 16px; 
  color: rgba(34,40,78,.4); 
  font-size: 13px; 
  text-align: center;
}
.cs-empty strong { 
  color: rgba(34,40,78,.6); 
}
.cs-spinner {
  width: 22px; 
  height: 22px; 
  border: 2px solid rgba(34,40,78,.1);
  border-top-color: #ff6b9d; 
  border-radius: 50%; 
  animation: spin .7s linear infinite;
}
@keyframes spin { 
  to { transform: rotate(360deg); } 
}
.cs-hint { 
  text-align: center; 
  font-size: 12px; 
  color: rgba(34,40,78,.3); 
  padding: 24px 0; 
}

/* Tarjeta de usuario mejorada */
.cs-item {
  display: flex; 
  align-items: center; 
  gap: 11px; 
  padding: 10px;
  border: none; 
  background: transparent; 
  border-radius: 14px;
  cursor: pointer; 
  text-align: left; 
  width: 100%; 
  transition: all .2s;
}
.cs-item:hover { 
  background: rgba(255,107,157,.06); 
  transform: translateX(2px);
}
.cs-item:hover .cs-action { 
  opacity: 1; 
  transform: translateX(0); 
  background: #ff6b9d; 
  color: #fff;
}

.cs-avatar {
  width: 42px; 
  height: 42px; 
  border-radius: 12px;
  display: flex; 
  align-items: center; 
  justify-content: center;
  font-size: 14px; 
  font-weight: 700; 
  color: #fff; 
  flex-shrink: 0; 
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(255,107,157,.2);
}
.cs-avatar img { 
  width: 100%; 
  height: 100%; 
  object-fit: cover; 
}

.cs-info { 
  flex: 1; 
  min-width: 0; 
  display: flex; 
  flex-direction: column; 
  gap: 2px; 
}
.cs-name { 
  font-size: 14px; 
  font-weight: 700; 
  color: #22284E; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
}
.cs-sub  { 
  font-size: 11px; 
  color: rgba(34,40,78,.38); 
  font-weight: 500; 
}

.cs-action {
  width: 28px; 
  height: 28px; 
  border-radius: 8px; 
  background: rgba(34,40,78,.06);
  display: flex; 
  align-items: center; 
  justify-content: center; 
  color: rgba(34,40,78,.5);
  flex-shrink: 0; 
  opacity: 0; 
  transform: translateX(4px);
  transition: all .2s;
}
</style>