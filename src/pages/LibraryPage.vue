<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import LibraryMode from '../components/hobbies/modes/LibraryMode.vue'

const route  = useRoute()
const router = useRouter()
const hobby  = ref(null)

onMounted(async () => {
    window.scrollTo(0, 0)
    const main = document.querySelector('.dash-main')
    if (main) { main.dataset.prevPadding = main.style.padding; main.style.padding = '0' }
    const { data } = await supabase
        .from('hobbies')
        .select('*')
        .eq('id', route.params.hobbyId)
        .single()
    if (data) hobby.value = data
})
onUnmounted(() => {
  const main = document.querySelector('.dash-main')
  if (main) main.style.padding = ''
})

function onAddSession(sessionData) {
  // Guardar sesión desde la biblioteca
  supabase.from('hobby_sessions').insert({
    hobby_id: sessionData.hobbyId,
    user_id:  hobby.value.user_id,
    minutes:  sessionData.minutes,
    note:     sessionData.note
  })
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
.loading { display:flex; align-items:center; justify-content:center; min-height: 100vh; padding: 0; margin: 0; color:rgba(34,40,78,.4); font-size:14px; }
</style>