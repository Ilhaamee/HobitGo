<template>
  <div class="dashboard-tips">
    <div class="page-header">
      <div>
        <h1>💡 Consejos diarios</h1>
        <p class="subtitle">Motivación y guía para tus hobbies y retos</p>
      </div>
      <div class="tip-date">{{ todayFormatted }}</div>
    </div>

    <!-- Consejo del día destacado -->
    <div class="featured-tip" v-if="dailyTip">
      <div class="featured-tip-header">
        <span class="featured-label">⭐ Consejo del día</span>
        <span class="tip-category-badge" :class="dailyTip.category">{{ categoryLabels[dailyTip.category] }}</span>
      </div>
      <p class="featured-tip-text">"{{ dailyTip.tip }}"</p>
      <div class="tip-author">— {{ dailyTip.author || 'HobitGo' }}</div>
      <button class="btn-share" @click="shareTip(dailyTip)">
        <font-awesome-icon icon="share-alt" /> Compartir en comunidad
      </button>
    </div>

    <!-- Filtro de categorías -->
    <div class="categories-filter">
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="cat-btn"
        :class="{ active: selectedCategory === cat.id }"
        @click="selectedCategory = cat.id"
      >
        {{ cat.icon }} {{ cat.name }}
      </button>
    </div>

    <!-- Lista de consejos -->
    <div class="tips-grid">
      <div
        v-for="tip in filteredTips"
        :key="tip.id"
        class="tip-card"
        :class="tip.category"
      >
        <div class="tip-card-header">
          <span class="tip-icon">{{ categoryIcons[tip.category] }}</span>
          <span class="tip-cat-label">{{ categoryLabels[tip.category] }}</span>
        </div>
        <p class="tip-text">{{ tip.tip }}</p>
        <div class="tip-footer">
          <span class="tip-author-small">{{ tip.author || 'HobitGo' }}</span>
          <button class="tip-action" @click="saveTip(tip)" :class="{ saved: savedTips.has(tip.id) }" title="Guardar">
            <font-awesome-icon :icon="savedTips.has(tip.id) ? 'bookmark' : ['far', 'bookmark']" />
          </button>
        </div>
      </div>
    </div>

    <!-- Guardados -->
    <div v-if="savedList.length > 0" class="section-card saved-section">
      <h3>🔖 Consejos guardados</h3>
      <div class="saved-list">
        <div v-for="tip in savedList" :key="tip.id" class="saved-item">
          <span class="saved-icon">{{ categoryIcons[tip.category] }}</span>
          <p class="saved-text">{{ tip.tip }}</p>
          <button class="unsave-btn" @click="saveTip(tip)">✕</button>
        </div>
      </div>
    </div>

    <!-- Share toast -->
    <div v-if="shareMessage" class="share-toast">{{ shareMessage }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const selectedCategory = ref('all')
const savedTips = ref(new Set())
const shareMessage = ref('')
const myUserId = ref(null)
const myUsername = ref('Usuario')

const categories = [
  { id: 'all', name: 'Todos', icon: '🌟' },
  { id: 'motivation', name: 'Motivación', icon: '💪' },
  { id: 'habits', name: 'Hábitos', icon: '📅' },
  { id: 'hobbies', name: 'Hobbies', icon: '🎯' },
  { id: 'mindset', name: 'Mentalidad', icon: '🧠' },
  { id: 'social', name: 'Social', icon: '🤝' },
]

const categoryLabels = { motivation: 'Motivación', habits: 'Hábitos', hobbies: 'Hobbies', mindset: 'Mentalidad', social: 'Social' }
const categoryIcons = { motivation: '💪', habits: '📅', hobbies: '🎯', mindset: '🧠', social: '🤝' }

const allTips = [
  // Motivación
  { id: 1, category: 'motivation', tip: 'La consistencia es más poderosa que la perfección. Un pequeño paso cada día construye montañas.', author: 'James Clear' },
  { id: 2, category: 'motivation', tip: 'No esperes la motivación. Actúa, y la motivación llegará después.', author: 'Mark Manson' },
  { id: 3, category: 'motivation', tip: 'El progreso, no la perfección, es lo que hay que celebrar.', author: 'HobitGo' },
  { id: 4, category: 'motivation', tip: 'Cada experto fue una vez un principiante. Lo que te separa de tu meta es simplemente tiempo y práctica.', author: 'HobitGo' },
  { id: 5, category: 'motivation', tip: 'No pierdas dos días seguidos. Un día malo no rompe tus hábitos, pero dos sí pueden hacerlo.', author: 'James Clear' },
  // Hábitos
  { id: 6, category: 'habits', tip: 'Vincula tu nuevo hábito a uno ya existente. "Después de hacer X, haré Y."', author: 'BJ Fogg' },
  { id: 7, category: 'habits', tip: 'Haz el hábito más fácil de empezar. Reduce la fricción al mínimo posible.', author: 'James Clear' },
  { id: 8, category: 'habits', tip: 'Los primeros 21 días son los más difíciles. Después tu cerebro empieza a automatizar el comportamiento.', author: 'HobitGo' },
  { id: 9, category: 'habits', tip: 'Celebra cada pequeña victoria. El cerebro aprende a través de la recompensa.', author: 'BJ Fogg' },
  { id: 10, category: 'habits', tip: 'Establece un horario fijo para tus rutinas. La hora del día importa casi tanto como el hábito mismo.', author: 'HobitGo' },
  // Hobbies
  { id: 11, category: 'hobbies', tip: 'Un hobby no tiene que ser productivo para ser valioso. Disfrutarlo ya es suficiente razón.', author: 'HobitGo' },
  { id: 12, category: 'hobbies', tip: 'Dedica al menos 20 minutos diarios a tu hobby favorito. La cantidad no importa tanto como la constancia.', author: 'HobitGo' },
  { id: 13, category: 'hobbies', tip: 'Encuentra a alguien con quien compartir tu hobby. La comunidad multiplica el disfrute.', author: 'HobitGo' },
  { id: 14, category: 'hobbies', tip: 'No compares tu capítulo 1 con el capítulo 20 de otra persona. Cada uno tiene su propio ritmo.', author: 'HobitGo' },
  { id: 15, category: 'hobbies', tip: 'Documenta tu progreso. Ver cuánto has avanzado es uno de los mayores motivadores.', author: 'HobitGo' },
  // Mentalidad
  { id: 16, category: 'mindset', tip: 'Cambia "tengo que" por "elijo". Esa pequeña diferencia transforma la obligación en agencia.', author: 'Carol Dweck' },
  { id: 17, category: 'mindset', tip: 'El fracaso no es lo opuesto al éxito. Es parte del camino hacia él.', author: 'Arianna Huffington' },
  { id: 18, category: 'mindset', tip: 'Una mentalidad de crecimiento cree que las habilidades se desarrollan. Una fija cree que nacemos con ellas.', author: 'Carol Dweck' },
  { id: 19, category: 'mindset', tip: 'Pregúntate: ¿Qué aprendí hoy? No: ¿Tuve éxito hoy?', author: 'HobitGo' },
  { id: 20, category: 'mindset', tip: 'Compárate solo con quien eras ayer. Esa es la única comparación que importa.', author: 'Jordan Peterson' },
  // Social
  { id: 21, category: 'social', tip: 'Compartir tu progreso públicamente aumenta tu compromiso en un 65% según estudios.', author: 'Dr. Gail Matthews' },
  { id: 22, category: 'social', tip: 'Encuentra un compañero de hábito. La accountability mutua funciona mejor que la individual.', author: 'HobitGo' },
  { id: 23, category: 'social', tip: 'Celebra los logros de los demás. La energía positiva es contagiosa y vuelve a ti.', author: 'HobitGo' },
  { id: 24, category: 'social', tip: 'Enseñar lo que aprendes es la mejor manera de consolidar el conocimiento.', author: 'Richard Feynman' },
]

// Consejo del día basado en la fecha
const dailyTip = computed(() => {
  const day = new Date().getDate() + new Date().getMonth() * 31
  return allTips[day % allTips.length]
})

const todayFormatted = computed(() => {
  return new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
})

const filteredTips = computed(() => {
  if (selectedCategory.value === 'all') return allTips
  return allTips.filter(t => t.category === selectedCategory.value)
})

const savedList = computed(() => allTips.filter(t => savedTips.value.has(t.id)))

function saveTip(tip) {
  const newSet = new Set(savedTips.value)
  if (newSet.has(tip.id)) newSet.delete(tip.id)
  else newSet.add(tip.id)
  savedTips.value = newSet
  localStorage.setItem('hobitgo_saved_tips', JSON.stringify([...newSet]))
}

async function shareTip(tip) {
  if (!myUserId.value) return
  const { error } = await supabase.from('community_posts').insert({
    user_id: myUserId.value,
    content: `💡 Consejo del día:\n\n"${tip.tip}"\n— ${tip.author || 'HobitGo'}`,
    tag: null,
    likes_count: 0,
    comments_count: 0
  })
  if (!error) {
    shareMessage.value = '✅ Compartido en la comunidad'
    await supabase.from('activity_log').insert({ user_id: myUserId.value, type: 'message', title: 'Compartió un consejo del día', points: 5, activity_date: new Date().toISOString().slice(0,10) })
    setTimeout(() => shareMessage.value = '', 3000)
  }
}

onMounted(async () => {
  const saved = localStorage.getItem('hobitgo_saved_tips')
  if (saved) savedTips.value = new Set(JSON.parse(saved))
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    myUserId.value = user.id
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    if (profile) myUsername.value = profile.username
  }
})
</script>

<style scoped>
.dashboard-tips { max-width: 800px; margin: 0 auto; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; }
h1 { font-size: 26px; color: var(--text-primary); margin-bottom: 4px; }
.subtitle { color: var(--text-secondary); font-size: 14px; }
.tip-date { font-size: 14px; color: #999; text-transform: capitalize; text-align: right; }

.featured-tip { background: linear-gradient(135deg, #22284E 0%, #1a1a2e 100%); color: #fff; border-radius: 20px; padding: 28px; margin-bottom: 24px; }
.featured-tip-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.featured-label { font-size: 13px; font-weight: 700; opacity: 0.8; }
.tip-category-badge { font-size: 12px; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
.tip-category-badge.motivation { background: rgba(255,152,0,0.3); color: #ffcc80; }
.tip-category-badge.habits { background: rgba(33,150,243,0.3); color: #90caf9; }
.tip-category-badge.hobbies { background: rgba(224,142,107,0.3); color: #E08E6B; }
.tip-category-badge.mindset { background: rgba(156,39,176,0.3); color: #ce93d8; }
.tip-category-badge.social { background: rgba(76,175,80,0.3); color: #a5d6a7; }
.featured-tip-text { font-size: 18px; font-style: italic; line-height: 1.6; margin-bottom: 12px; opacity: 0.95; }
.tip-author { font-size: 13px; opacity: 0.6; margin-bottom: 20px; }
.btn-share { background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.3); border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background 0.2s; }
.btn-share:hover { background: rgba(255,255,255,0.25); }

.categories-filter { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.cat-btn { border: 1px solid #e0e0e0; background: var(--bg-card); color: var(--text-secondary); border-radius: 20px; padding: 8px 14px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
.cat-btn:hover { border-color: #E08E6B; color: #E08E6B; }
.cat-btn.active { background: #E08E6B; color: #fff; border-color: #E08E6B; }

.tips-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
.tip-card { background: var(--bg-card); border-radius: 14px; padding: 18px; box-shadow: 0 2px 8px var(--shadow); border-top: 3px solid #e0e0e0; }
.tip-card.motivation { border-top-color: #ff9800; }
.tip-card.habits { border-top-color: #2196f3; }
.tip-card.hobbies { border-top-color: #E08E6B; }
.tip-card.mindset { border-top-color: #9c27b0; }
.tip-card.social { border-top-color: #4caf50; }
.tip-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.tip-icon { font-size: 18px; }
.tip-cat-label { font-size: 11px; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.tip-text { font-size: 14px; color: var(--text-primary); line-height: 1.6; margin-bottom: 12px; flex: 1; }
.tip-footer { display: flex; align-items: center; justify-content: space-between; }
.tip-author-small { font-size: 12px; color: #999; }
.tip-action { background: none; border: none; color: #ccc; cursor: pointer; font-size: 16px; padding: 4px; transition: color 0.2s; }
.tip-action:hover, .tip-action.saved { color: #E08E6B; }

.section-card { background: var(--bg-card); border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 10px var(--shadow); }
.section-card h3 { font-size: 16px; color: var(--text-primary); margin-bottom: 16px; }
.saved-section {}
.saved-list { display: flex; flex-direction: column; gap: 10px; }
.saved-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px; background: var(--bg-secondary); border-radius: 10px; }
.saved-icon { font-size: 18px; flex-shrink: 0; }
.saved-text { flex: 1; font-size: 13px; color: var(--text-primary); line-height: 1.5; margin: 0; }
.unsave-btn { background: none; border: none; color: #ccc; cursor: pointer; padding: 2px 6px; font-size: 12px; flex-shrink: 0; transition: color 0.2s; }
.unsave-btn:hover { color: #e53935; }

.share-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #333; color: #fff; padding: 12px 24px; border-radius: 20px; font-size: 14px; z-index: 9999; animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
</style>
