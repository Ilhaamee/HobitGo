<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import HobbyCard   from '../components/hobbies/HobbyCard.vue'
import HobbyPicker from '../components/hobbies/HobbyPicker.vue'

const hobbies     = ref([])
const sessions    = ref([])
const showPicker  = ref(false)
const currentUser = ref(null)
const deleteId    = ref(null)

async function load() {
  const { data: h } = await supabase.from('hobbies').select('*')
    .eq('user_id', currentUser.value.id).order('created_at', { ascending: false })
  if (h) hobbies.value = h

  const { data: s } = await supabase.from('hobby_sessions').select('*')
    .eq('user_id', currentUser.value.id).order('created_at', { ascending: false })
  if (s) sessions.value = s
}

async function onHobbySelected(hobbyData) {
  showPicker.value = false

  // Hobby personalizado — campos vacíos para que el usuario rellene
  if (hobbyData.custom) {
    const name = prompt('Nombre de tu hobby personalizado:')
    if (!name?.trim()) return
    hobbyData.name = name.trim()
  }

  const { data, error } = await supabase.from('hobbies').insert({
    user_id:       currentUser.value.id,
    hobby_id:      hobbyData.id,
    name:          hobbyData.name,
    category:      hobbyData.category,
    gradient:      hobbyData.gradient,
    image_url:     hobbyData.img || null,
    total_minutes: 0,
  }).select()

  if (!error && data) {
    hobbies.value.unshift(data[0])
    await supabase.from('activity_log').insert({
      user_id: currentUser.value.id, type: 'hobby',
      title: `Nuevo hobby: "${hobbyData.name}"`, points: 100,
      activity_date: new Date().toISOString().split('T')[0]
    })
  }
}

async function onAddSession({ hobbyId, minutes, note }) {
  const { data, error } = await supabase.from('hobby_sessions').insert({
    hobby_id: hobbyId, user_id: currentUser.value.id, minutes, note
  }).select()

  if (!error && data) {
    sessions.value.unshift(data[0])
    const hobby = hobbies.value.find(h => h.id === hobbyId)
    if (hobby) {
      hobby.total_minutes = (hobby.total_minutes || 0) + minutes
      await supabase.from('hobbies').update({ total_minutes: hobby.total_minutes }).eq('id', hobbyId)
    }
    await supabase.from('activity_log').insert({
      user_id: currentUser.value.id, type: 'hobby',
      title: `Sesión de "${hobby?.name}"`, points: 10,
      activity_date: new Date().toISOString().split('T')[0]
    })
  }
}

async function deleteHobby(id) {
  await supabase.from('hobbies').delete().eq('id', id)
  hobbies.value  = hobbies.value.filter(h => h.id !== id)
  sessions.value = sessions.value.filter(s => s.hobby_id !== id)
  deleteId.value = null
}

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  currentUser.value = user
  await load()
})
</script>

<template>
  <div class="hobbies-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Mis Hobbies</h1>
        <p class="page-sub">{{ hobbies.length }} activo{{ hobbies.length !== 1 ? 's' : '' }}</p>
      </div>
      <button class="btn-add" @click="showPicker = true">
        <svg viewBox="0 0 14 14" fill="none" width="13">
          <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Añadir hobby
      </button>
    </div>

    <!-- Grid -->
    <div v-if="hobbies.length > 0" class="hobbies-grid">
      <HobbyCard
        v-for="hobby in hobbies" :key="hobby.id"
        :hobby="hobby" :sessions="sessions"
        @delete="id => deleteId = id"
        @add-session="onAddSession"
        @open-detail="() => {}"
      />
    </div>

    <!-- Empty -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 48 48" fill="none" width="44">
          <circle cx="24" cy="24" r="20" stroke="rgba(34,40,78,.1)" stroke-width="2"/>
          <path d="M24 16v8l5 3" stroke="rgba(34,40,78,.15)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <h3>Sin hobbies todavía</h3>
      <p>Añade tu primer hobby y empieza a registrar tu progreso</p>
      <button class="btn-add" @click="showPicker = true">
        <svg viewBox="0 0 14 14" fill="none" width="13">
          <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Añadir hobby
      </button>
    </div>

    <!-- Picker -->
    <HobbyPicker
      v-if="showPicker"
      @select="onHobbySelected"
      @close="showPicker = false"
    />

    <!-- Confirm delete -->
    <Transition name="fade">
      <div v-if="deleteId" class="overlay-confirm" @click.self="deleteId = null">
        <div class="confirm-card">
          <h3>¿Eliminar hobby?</h3>
          <p>Se eliminarán también todas las sesiones registradas.</p>
          <div class="confirm-row">
            <button class="btn-danger" @click="deleteHobby(deleteId)">Eliminar</button>
            <button class="btn-cancel" @click="deleteId = null">Cancelar</button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.hobbies-page { max-width: 1000px; margin: 0 auto; }

.page-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; margin-bottom: 24px;
}
.page-title { font-size: 26px; font-weight: 900; color: #22284E; letter-spacing: -1px; margin: 0 0 4px; }
.page-sub   { font-size: 13px; color: rgba(34,40,78,.45); margin: 0; }

.btn-add {
  display: flex; align-items: center; gap: 7px;
  background: #22284E; color: #fff59e; border: none;
  font-size: 14px; font-weight: 700; padding: 11px 20px;
  border-radius: 12px; cursor: pointer; white-space: nowrap;
  box-shadow: 0 4px 14px rgba(34,40,78,.22);
  transition: transform .18s, box-shadow .18s;
}
.btn-add:hover { transform: translateY(-1px); box-shadow: 0 7px 20px rgba(34,40,78,.3); }

.hobbies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 18px;
}

.empty-state {
  display: flex; flex-direction: column;
  align-items: center; gap: 12px; padding: 60px 0; text-align: center;
}
.empty-icon {
  width: 80px; height: 80px; border-radius: 50%;
  background: rgba(34,40,78,.04);
  display: flex; align-items: center; justify-content: center;
}
.empty-state h3 { font-size: 17px; font-weight: 700; color: #22284E; margin: 0; }
.empty-state p  { font-size: 13px; color: rgba(34,40,78,.45); margin: 0; }

.overlay-confirm {
  position: fixed; inset: 0;
  background: rgba(34,40,78,.5); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}
.confirm-card {
  background: #fff; border-radius: 20px; padding: 28px;
  width: 100%; max-width: 340px; text-align: center;
  box-shadow: 0 24px 60px rgba(34,40,78,.2);
}
.confirm-card h3 { font-size: 17px; font-weight: 800; color: #22284E; margin: 0 0 8px; }
.confirm-card p  { font-size: 13px; color: rgba(34,40,78,.5); margin: 0 0 20px; line-height: 1.6; }
.confirm-row { display: flex; gap: 10px; justify-content: center; }

.btn-danger {
  background: #ef4444; color: #fff; border: none;
  padding: 11px 22px; border-radius: 10px;
  font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity .2s;
}
.btn-danger:hover { opacity: .88; }
.btn-cancel {
  background: rgba(34,40,78,.06); color: #22284E; border: none;
  padding: 11px 18px; border-radius: 10px; font-size: 14px; cursor: pointer;
}
.btn-cancel:hover { background: rgba(34,40,78,.1); }

.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>