<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import StandardMode from '../components/hobbies/modes/StandardMode.vue'
import { supabase } from '../lib/supabase'
import { HOBBIES_LIST } from '../data/hobbiesData.js'

const route = useRoute()

const hobby = ref(null)
const loading = ref(true)

async function loadHobby() {
  const hobbyId = route.params.hobbyId

  // 1. Buscar en Supabase tabla 'hobbies' (UUID)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data } = await supabase
      .from('hobbies')
      .select('*')
      .eq('id', hobbyId)
      .single()

    if (data) {
      hobby.value = data
      loading.value = false
      return
    }
  }

  // 2. Fallback: buscar en hobbies predefinidos (hobbiesData.js)
  const found = HOBBIES_LIST.find(h => h.id === hobbyId)
  if (found) {
    hobby.value = {
      id: found.id,
      name: found.name,
      hobby_id: found.id,
      gradient: found.gradient,
      image_url: found.img,
      daily_minutes: 20,
      total_days: 30,
      total_minutes: 0,
    }
    loading.value = false
    return
  }

  // 3. No encontrado
  loading.value = false
}

const color = computed(() => hobby.value?.gradient?.[0] || hobby.value?.color || '#8b5cf6')

onMounted(async () => {
  const main = document.querySelector('.dash-main')
  if (main) main.style.padding = '0'   
  await loadHobby()
})

onUnmounted(() => {
  const main = document.querySelector('.dash-main')
  if (main) main.style.padding = ''    
})
</script>

<template>
  <div v-if="loading" class="loading">
    <div class="spinner"></div>
    <span>Cargando...</span>
  </div>
  <StandardMode 
    v-else-if="hobby"
    :hobby="hobby" 
    :color="color"
    @close="$router.push('/dashboard/hobbies')"
  />
  <div v-else class="not-found">
    <p>Hobby no encontrado</p>
    <button @click="$router.push('/dashboard/hobbies')">Volver</button>
  </div>
</template>

<style scoped>
.loading { display:flex; align-items:center; justify-content:center; min-height:100vh; color:rgba(34,40,78,.4); font-size:14px; }

.spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid #f3f4f6;
  border-top-color: #8b5cf6;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
  color: #9ca3af;
}
.not-found button {
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: #8b5cf6;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
</style>