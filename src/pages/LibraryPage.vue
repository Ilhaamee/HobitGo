<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import LibraryMode from '../components/hobbies/modes/LibraryMode.vue'

const route  = useRoute()
const router = useRouter()
const hobby  = ref(null)

onMounted(async () => {
  window.scrollTo({ top: 0, behavior: 'instant' })
  document.body.scrollTop = 0
  document.documentElement.scrollTop = 0
  const main = document.querySelector('.dash-main')
  if (main) {
    main.dataset.prevPadding = main.style.padding
    main.style.padding = '0'
    main.scrollTop = 0
  }
  
  const { data, error } = await supabase
    .from('hobbies')
    .select('*')
    .eq('id', route.params.hobbyId)
    .single()
    
  if (error) {
    console.error('Error cargando hobby:', error)
    return
  }
  
  if (data) hobby.value = data
})

onUnmounted(() => {
  const main = document.querySelector('.dash-main')
  if (main) {
    main.style.padding = main.dataset.prevPadding || ''
    delete main.dataset.prevPadding
  }
})

async function onAddSession(sessionData) {
  if (!hobby.value?.user_id) {
    console.error('No hay hobby o user_id')
    return
  }
  
  const { error } = await supabase.from('hobby_sessions').insert({
    hobby_id: sessionData.hobbyId,
    user_id:  hobby.value.user_id,
    minutes:  sessionData.minutes,
    note:     sessionData.note
  })
  
  if (error) console.error('Error guardando sesión:', error)
}
</script>

<template>
  <div v-if="hobby">
    <LibraryMode
      :hobby="hobby"
      :color="hobby.gradient?.[0] || '#1d4ed8'"
      @close="router.push('/dashboard/hobbies')"
      @add-session="onAddSession"
    />
  </div>
  <div v-else class="loading">Cargando...</div>
</template>

<style scoped>
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 0;
  padding-bottom: 80px;
  margin: 0;
  color: rgba(34,40,78,.4);
  font-size: 14px;
}
</style>