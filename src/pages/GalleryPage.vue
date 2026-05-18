<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import GalleryMode from '../components/hobbies/modes/GalleryMode.vue'

const route  = useRoute()
const router = useRouter()
const hobby  = ref(null)

async function onAddSession(sessionData) {
  const { data } = await supabase.from('hobby_sessions').insert({
    hobby_id: sessionData.hobbyId,
    user_id:  hobby.value.user_id,
    minutes:  sessionData.minutes,
    note:     sessionData.note
  }).select()
  if (data) {
    const newTotal = (hobby.value.total_minutes || 0) + sessionData.minutes
    await supabase.from('hobbies').update({ total_minutes: newTotal }).eq('id', sessionData.hobbyId)
    hobby.value.total_minutes = newTotal
  }
}

onMounted(async () => {
  window.scrollTo(0, 0)
  const main = document.querySelector('.dash-main')
  if (main) main.style.padding = '0'
  const { data } = await supabase.from('hobbies').select('*').eq('id', route.params.hobbyId).single()
  if (data) hobby.value = data
})

onUnmounted(() => {
  const main = document.querySelector('.dash-main')
  if (main) main.style.padding = ''
})
</script>

<template>
  <div v-if="hobby">
    <GalleryMode
      :hobby="hobby"
      :color="hobby.gradient?.[0] || '#8b5cf6'"
      @close="router.push('/dashboard/hobbies')"
      @add-session="onAddSession"
    />
  </div>
  <div v-else class="loading">Cargando...</div>
</template>

<style scoped>
.loading { display:flex; align-items:center; justify-content:center; min-height:100vh; color:rgba(34,40,78,.4); font-size:14px; }
</style>