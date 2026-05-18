<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { supabase } from '../../../lib/supabase'

const props = defineProps({
  hobby: { type: Object, required: true },
  color: { type: String, default: '#dc2626' },
})
const emit = defineEmits(['close', 'add-session'])

// ── Estado ───────────────────────────────────────────
const isBaking     = computed(() => props.hobby.hobby_id === 'baking')
const activeView   = ref('browse')
const selectedMeal = ref(null)
const savedRecipes = ref([])
const meals        = ref([])
const loading      = ref(false)
const saving       = ref(false)
const searchQuery  = ref('')
const activeCategory = ref(null)
const showSearch   = ref(false)
const timerActive  = ref(false)
const timerSeconds = ref(0)
let timerInterval  = null
const recipeNotes = ref({})
const noteSaved = ref(false)
const showImageLightbox = ref(false)

// Escalar recetas
const recipeScale = ref(1)
const scaleOptions = [0.5, 1, 1.5, 2, 3]

// Lista de compras
const shoppingList = ref(new Set())

// Modo cocinando
const cookingMode = ref(false)
const currentStep = ref(0)

const currentNote = computed({
  get: () => selectedMeal.value ? (recipeNotes.value[selectedMeal.value.idMeal] || '') : '',
  set: (val) => { if (selectedMeal.value) recipeNotes.value[selectedMeal.value.idMeal] = val }
})

const scaledIngredients = computed(() => {
  const ings = getIngredientsForDetail(selectedMeal.value)
  if (recipeScale.value === 1) return ings
  return ings.map(ing => ({
    ...ing,
    measure: scaleMeasure(ing.measure, recipeScale.value)
  }))
})

const prepSteps = computed(() => {
  if (!selectedMeal.value?.strInstructions) return []
  return selectedMeal.value.strInstructions
    .split(/\n|\.(?=\s|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 5)
})

function scaleMeasure(measure, scale) {
  if (!measure) return ''
  const num = parseFloat(measure.replace(/[^\d./]/g, ''))
  if (isNaN(num)) return measure
  const unit = measure.replace(/[\d./]/g, '').trim()
  const scaled = Math.round(num * scale * 10) / 10
  return `${scaled} ${unit}`.trim()
}

function toggleShoppingItem(name) {
  if (shoppingList.value.has(name)) {
    shoppingList.value.delete(name)
  } else {
    shoppingList.value.add(name)
  }
}

async function randomRecipe() {
  loading.value = true
  try {
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php')
    const data = await res.json()
    if (data.meals?.[0]) {
      await fetchDetail(data.meals[0].idMeal)
    }
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

async function saveNote() {
  if (!selectedMeal.value) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('saved_recipes')
    .update({ note: currentNote.value })
    .eq('user_id', user.id)
    .eq('meal_id', selectedMeal.value.idMeal)
  const r = savedRecipes.value.find(r => r.meal_id === selectedMeal.value.idMeal)
  if (r) r.note = currentNote.value
  noteSaved.value = true
  setTimeout(() => noteSaved.value = false, 2000)
}

const timerDisplay = computed(() => {
  const m = Math.floor(timerSeconds.value / 60)
  const s = timerSeconds.value % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
})

function startTimer() {
  if (timerActive.value) return
  timerActive.value = true
  timerInterval = setInterval(() => timerSeconds.value++, 1000)
}
function stopTimer()  { timerActive.value = false; clearInterval(timerInterval) }
function resetTimer() { stopTimer(); timerSeconds.value = 0 }

function logCookingSession() {
  const mins = Math.max(1, Math.round(timerSeconds.value / 60))
  emit('add-session', {
    hobbyId: props.hobby.id,
    minutes: mins,
    note: selectedMeal.value ? `Cociné "${selectedMeal.value.strMeal}"` : 'Sesión de cocina'
  })
  resetTimer()
}

// ── Categorías ───────────────────────────────────────
const COOKING_CATS = [
  { key: 'Beef',       label: 'Carne' },
  { key: 'Chicken',    label: 'Pollo' },
  { key: 'Seafood',    label: 'Mariscos' },
  { key: 'Pasta',      label: 'Pasta' },
  { key: 'Vegetarian', label: 'Vegetariano' },
  { key: 'Lamb',       label: 'Cordero' },
  { key: 'Pork',       label: 'Cerdo' },
  { key: 'Side',       label: 'Acompañamientos' },
  { key: 'Vegan',      label: 'Vegano' },
  { key: 'Breakfast',  label: 'Desayuno' },
]
const BAKING_CATS = [
  { key: 'Dessert',    label: 'Postres' },
  { key: 'Breakfast',  label: 'Desayuno' },
  { key: 'Starter',    label: 'Entrantes' },
  { key: 'Side',       label: 'Acompañamientos' },
  { key: 'Vegan',      label: 'Vegano' },
  { key: 'Vegetarian', label: 'Vegetariano' },
  { key: 'Pasta',      label: 'Pasta' },
  { key: 'Chicken',    label: 'Pollo' },
]

const categories = computed(() => isBaking.value ? BAKING_CATS : COOKING_CATS)

function getIngredients(meal) {
  const list = []
  for (let i = 1; i <= 20; i++) {
    const ing    = meal[`strIngredient${i}`]
    const measure = meal[`strMeasure${i}`]
    if (ing && ing.trim()) list.push({ name: ing.trim(), measure: measure?.trim() || '' })
  }
  return list
}

async function fetchByCategory(cat) {
  loading.value = true
  activeCategory.value = cat
  showSearch.value = false
  searchQuery.value = ''
  try {
    const res  = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${cat}`)
    const data = await res.json()
    meals.value = (data.meals || []).slice(0, 20)
  } catch { meals.value = [] }
  loading.value = false
}

async function fetchDetail(id) {
  loading.value = true
  try {
    const res  = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)
    const data = await res.json()
    selectedMeal.value = data.meals?.[0] || null
  } catch { selectedMeal.value = null }
  loading.value = false
  activeView.value = 'detail'
  recipeScale.value = 1
  shoppingList.value.clear()
  currentStep.value = 0
  cookingMode.value = false
  nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
}

let searchTimer = null
async function onSearch() {
  if (!searchQuery.value.trim()) { meals.value = []; return }
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    loading.value = true
    activeCategory.value = null
    try {
      const res  = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchQuery.value)}`)
      const data = await res.json()
      meals.value = (data.meals || []).slice(0, 20)
    } catch { meals.value = [] }
    loading.value = false
  }, 500)
}

async function loadSaved() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data } = await supabase
    .from('saved_recipes').select('*')
    .eq('user_id', user.id).eq('hobby_id', props.hobby.id)
    .order('saved_at', { ascending: false })
  if (data) {
    savedRecipes.value = data
    data.forEach(r => {
      if (r.note) recipeNotes.value[r.meal_id] = r.note
    })
  }
}

const isSaved = computed(() =>
  selectedMeal.value
    ? savedRecipes.value.some(r => r.meal_id === selectedMeal.value.idMeal)
    : false
)

async function toggleSave() {
  if (!selectedMeal.value) return
  saving.value = true
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { saving.value = false; return }

  if (isSaved.value) {
    await supabase.from('saved_recipes').delete()
      .eq('user_id', user.id).eq('meal_id', selectedMeal.value.idMeal)
    savedRecipes.value = savedRecipes.value.filter(r => r.meal_id !== selectedMeal.value.idMeal)
  } else {
    const recipe = {
      user_id:      user.id,
      hobby_id:     props.hobby.id,
      meal_id:      selectedMeal.value.idMeal,
      title:        selectedMeal.value.strMeal,
      category:     selectedMeal.value.strCategory,
      area:         selectedMeal.value.strArea,
      thumbnail:    selectedMeal.value.strMealThumb,
      instructions: selectedMeal.value.strInstructions,
      ingredients:  getIngredients(selectedMeal.value),
      source_url:   selectedMeal.value.strSource || null,
      note: currentNote.value
    }
    const { data } = await supabase.from('saved_recipes').insert(recipe).select()
    if (data?.[0]) savedRecipes.value.unshift(data[0])
  }
  saving.value = false
}

function openSaved(recipe) {
  selectedMeal.value = {
    idMeal:          recipe.meal_id,
    strMeal:         recipe.title,
    strCategory:     recipe.category,
    strArea:         recipe.area,
    strMealThumb:    recipe.thumbnail,
    strInstructions: recipe.instructions,
    _ingredients:    recipe.ingredients,
  }
  activeView.value = 'detail'
  recipeScale.value = 1
  shoppingList.value.clear()
}

function getIngredientsForDetail(meal) {
  if (!meal) return []
  if (meal._ingredients) return meal._ingredients
  return getIngredients(meal)
}

function goBack() {
  selectedMeal.value = null
  activeView.value = 'browse'
  resetTimer()
}

onMounted(() => {
  loadSaved()
  fetchByCategory(categories.value[0].key)
})

onUnmounted(() => clearInterval(timerInterval))
</script>

<<template>
<div class="kitchen-page">

  <!-- ══ HEADER ═══════════════════════════════════════ -->
  <div class="kp-header">
    <div class="kp-header-left">
      <button class="kp-btn-close" @click="activeView === 'detail' ? goBack() : emit('close')">
        <svg viewBox="0 0 16 16" fill="none" width="16">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="kp-tabs">
        <button class="kp-tab" :class="{ active: activeView !== 'saved' }" @click="activeView = 'browse'">
          {{ isBaking ? 'Repostería' : 'Recetas' }}
        </button>
        <button class="kp-tab" :class="{ active: activeView === 'saved' }" @click="activeView = 'saved'">
          Guardadas {{ savedRecipes.length > 0 ? `(${savedRecipes.length})` : '' }}
        </button>
      </div>
    </div>
    <div class="kp-header-right">
      <button class="kp-btn-search" @click="showSearch = !showSearch">
        <svg viewBox="0 0 20 20" fill="none" width="16">
          <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.8"/>
          <path d="M15 15l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- ══ SEARCH BAR ════════════════════════════════════ -->
  <Transition name="sd">
  <div v-if="showSearch" class="kp-search-wrap">
    <div class="kp-search-inner">
      <svg viewBox="0 0 20 20" fill="none" width="14" class="kp-search-ico">
        <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.7"/>
        <path d="M15 15l3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>
      <input v-model="searchQuery" @input="onSearch" class="kp-search-inp"
        placeholder="Buscar receta..." autofocus />
      <button class="kp-search-close" @click="showSearch=false; searchQuery=''; meals.value=[]">✕</button>
    </div>
  </div>
  </Transition>

  <!-- ══ CATEGORÍAS + ALEATORIO ════════════════════════ -->
  <div v-if="activeView !== 'saved' && activeView !== 'detail'" class="kp-cats">
    <button
      v-for="cat in categories" :key="cat.key"
      class="kp-cat-btn"
      :class="{ active: activeCategory === cat.key }"
      :style="activeCategory === cat.key ? { background: color, color: '#fff', borderColor: color } : {}"
      @click="fetchByCategory(cat.key)"
    >{{ cat.label }}</button>
    <button class="kp-cat-btn kp-random-btn" @click="randomRecipe" title="Receta aleatoria">
      🎲 Aleatorio
    </button>
  </div>

  <!-- ══ BROWSE VIEW ════════════════════════════════════ -->
  <div v-if="activeView === 'browse'" class="kp-browse">
    <div v-if="loading" class="kp-loading">
      <div class="kp-spinner" :style="{ borderTopColor: color }"></div>
      <span>Buscando recetas...</span>
    </div>
    <div v-else-if="meals.length === 0" class="kp-empty">
      <p>Selecciona una categoría o busca una receta</p>
    </div>
    <div v-else class="kp-grid">
      <button
        v-for="meal in meals" :key="meal.idMeal"
        class="kp-card"
        @click="fetchDetail(meal.idMeal)"
      >
        <div class="kp-card-img">
          <img :src="meal.strMealThumb" :alt="meal.strMeal" />
          <div class="kp-card-overlay"></div>
          <div v-if="savedRecipes.some(r => r.meal_id === meal.idMeal)" class="kp-saved-badge">
            <svg viewBox="0 0 14 14" fill="none" width="10">
              <path d="M2 7l3 3 7-7" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
        <div class="kp-card-info">
          <p class="kp-card-name">{{ meal.strMeal }}</p>
          <p class="kp-card-cat" v-if="meal.strCategory">{{ meal.strCategory }}</p>
        </div>
      </button>
    </div>
  </div>

  <!-- ══ SAVED VIEW ════════════════════════════════════ -->
  <div v-if="activeView === 'saved'" class="kp-saved-view">
    <div v-if="savedRecipes.length === 0" class="kp-empty">
      <svg viewBox="0 0 48 48" fill="none" width="48">
        <path d="M12 8h24a2 2 0 012 2v32l-14-7-14 7V10a2 2 0 012-2z" stroke="rgba(34,40,78,.2)" stroke-width="1.5"/>
      </svg>
      <p>No tienes recetas guardadas aún</p>
    </div>
    <div v-else class="kp-grid">
      <button
        v-for="r in savedRecipes" :key="r.id"
        class="kp-card"
        @click="openSaved(r)"
      >
        <div class="kp-card-img">
          <img :src="r.thumbnail" :alt="r.title" />
          <div class="kp-card-overlay"></div>
          <div class="kp-saved-badge">
            <svg viewBox="0 0 14 14" fill="none" width="10">
              <path d="M2 7l3 3 7-7" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
        <div class="kp-card-info">
          <p class="kp-card-name">{{ r.title }}</p>
          <p class="kp-card-cat">{{ r.category }}</p>
        </div>
      </button>
    </div>
  </div>

  <!-- ══ DETAIL VIEW ════════════════════════════════════ -->
  <div v-if="activeView === 'detail' && selectedMeal" class="kp-detail">
    <div v-if="loading" class="kp-loading">
      <div class="kp-spinner" :style="{ borderTopColor: color }"></div>
    </div>
    <template v-else>
      <!-- Hero imagen (clickable para lightbox) -->
      <div class="kp-detail-hero" @click="showImageLightbox = true">
        <img :src="selectedMeal.strMealThumb" :alt="selectedMeal.strMeal" />
        <div class="kp-detail-hero-overlay"></div>
        <div class="kp-detail-hero-info">
          <span v-if="selectedMeal.strCategory" class="kp-detail-tag">{{ selectedMeal.strCategory }}</span>
          <span v-if="selectedMeal.strArea" class="kp-detail-tag">🌍 {{ selectedMeal.strArea }}</span>
          <h2>{{ selectedMeal.strMeal }}</h2>
        </div>
        <button class="kp-save-btn"
          :style="isSaved ? { background: color } : {}"
          @click.stop="toggleSave" :disabled="saving">
          <svg v-if="saving" class="kp-spin" viewBox="0 0 20 20" fill="none" width="14">
            <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" stroke-dasharray="44" stroke-dashoffset="11"/>
          </svg>
          <svg v-else viewBox="0 0 20 20" fill="none" width="14">
            <path d="M5 3h10a1 1 0 011 1v13l-6-3-6 3V4a1 1 0 011-1z"
              :fill="isSaved ? '#fff' : 'none'"
              stroke="currentColor" stroke-width="1.8"/>
          </svg>
          {{ saving ? '' : (isSaved ? 'Guardada' : 'Guardar') }}
        </button>
      </div>

      <!-- Temporizador de cocina -->
      <div class="kp-section">
        <h3 class="kp-section-title">⏱ Temporizador</h3>
        <div class="kp-timer-box">
          <span class="kp-timer-display" :style="timerActive ? { color } : {}">
            {{ timerDisplay }}
          </span>
          <div class="kp-timer-btns">
            <button class="kp-tbt play" :style="{ background: color }" @click="startTimer" :disabled="timerActive">▶</button>
            <button class="kp-tbt pause" @click="stopTimer" :disabled="!timerActive">⏸</button>
            <button class="kp-tbt reset" @click="resetTimer">↺</button>
          </div>
        </div>
        <button v-if="timerSeconds > 0" class="kp-log-btn" :style="{ borderColor: color, color }" @click="logCookingSession">
          Registrar {{ Math.max(1, Math.round(timerSeconds/60)) }} min cocinando
        </button>
      </div>

      <!-- Mis notas -->
      <div class="kp-section" v-if="isSaved">
        <h3 class="kp-section-title">📝 Mis notas</h3>
        <textarea v-model="currentNote" class="kp-note"
          placeholder="¿Cómo te quedó? ¿Qué cambiaste?..." rows="3">
        </textarea>
        <button class="kp-save-note-btn" :class="{ saved: noteSaved }"
          :style="noteSaved ? { background: '#22c55e' } : { background: color }"
          @click="saveNote">
          {{ noteSaved ? '✓ Nota guardada' : 'Guardar nota' }}
        </button>
      </div>

      <!-- Ingredientes + Escalar + Shopping -->
      <div class="kp-section">
        <div class="kp-section-header">
          <h3 class="kp-section-title">🥘 Ingredientes</h3>
          <div class="kp-scale">
            <button
              v-for="s in scaleOptions" :key="s"
              class="kp-scale-btn"
              :class="{ active: recipeScale === s }"
              :style="recipeScale === s ? { background: color, color: '#fff' } : {}"
              @click="recipeScale = s"
            >×{{ s }}</button>
          </div>
        </div>
        <div class="kp-ingredients">
          <div
            v-for="(ing, i) in scaledIngredients" :key="i"
            class="kp-ing-row"
            :class="{ bought: shoppingList.has(ing.name) }"
            @click="toggleShoppingItem(ing.name)"
          >
            <div class="kp-ing-check">
              <svg v-if="shoppingList.has(ing.name)" viewBox="0 0 14 14" fill="none" width="12">
                <path d="M2 7l3 3 7-7" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="kp-ing-content">
              <span class="kp-ing-name">{{ ing.name }}</span>
              <span class="kp-ing-measure">{{ ing.measure }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Preparación + Modo cocinar -->
      <div class="kp-section">
        <div class="kp-section-header">
          <h3 class="kp-section-title">👨‍🍳 Preparación</h3>
          <button class="kp-cook-mode-btn" :style="{ background: color }" @click="cookingMode = true">
            <svg viewBox="0 0 20 20" fill="none" width="14">
              <path d="M10 2v16M2 10h16" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Modo cocinar
          </button>
        </div>
        <div class="kp-steps">
          <div
            v-for="(step, i) in prepSteps"
            :key="i"
            class="kp-step"
          >
            <span class="kp-step-num" :style="{ background: color }">{{ i + 1 }}</span>
            <p class="kp-step-text">{{ step }}</p>
          </div>
        </div>
      </div>

      <!-- Link fuente -->
      <div class="kp-section kp-links-row" style="padding-bottom: 24px">
        <a v-if="selectedMeal.strSource" :href="selectedMeal.strSource" target="_blank" class="kp-link-btn">
          <svg viewBox="0 0 20 20" fill="none" width="16">
            <path d="M11 3H17V9M17 3L9 11M5 5H3V17H15V13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          Receta original
        </a>
        <a :href="`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedMeal.strMeal + ' receta')}`"
          target="_blank" class="kp-link-btn kp-link-yt">
          <svg viewBox="0 0 24 24" fill="#ff0000" width="18">
            <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8z"/>
            <path d="M9.75 15.5l6.25-3.5-6.25-3.5v7z" fill="#fff"/>
          </svg>
          Ver en YouTube
        </a>
      </div>
    </template>
  </div>

  <!-- ══ MODO COCINANDO OVERLAY ════════════════════════ -->
  <Transition name="sd">
    <div v-if="cookingMode" class="kp-cooking-overlay">
      <div class="kp-cooking-header">
        <button class="kp-cooking-close" @click="cookingMode = false">✕</button>
        <span class="kp-cooking-title">{{ selectedMeal?.strMeal }}</span>
        <span class="kp-cooking-progress">{{ currentStep + 1 }} / {{ prepSteps.length }}</span>
      </div>
      
      <div class="kp-cooking-step-display">
        <span class="kp-cooking-step-num" :style="{ background: color }">{{ currentStep + 1 }}</span>
        <p class="kp-cooking-step-text">{{ prepSteps[currentStep] }}</p>
      </div>
      
      <div class="kp-cooking-nav">
        <button class="kp-cooking-nav-btn" :disabled="currentStep === 0" @click="currentStep--">
          ← Ant.
        </button>
        <div class="kp-cooking-dots">
          <span
            v-for="(_, i) in prepSteps"
            :key="i"
            :class="{ active: i === currentStep }"
            :style="i === currentStep ? { background: color } : {}"
          />
        </div>
        <button class="kp-cooking-nav-btn" :disabled="currentStep === prepSteps.length - 1" @click="currentStep++">
          Sig. →
        </button>
      </div>
    </div>
  </Transition>

  <!-- ══ LIGHTBOX IMAGEN (FUERA del cookingMode) ════════ -->
  <Transition name="sd">
    <div v-if="showImageLightbox" class="kp-lightbox" @click="showImageLightbox = false">
      <button class="kp-lightbox-close" @click.stop="showImageLightbox = false">✕</button>
      <img :src="selectedMeal?.strMealThumb" :alt="selectedMeal?.strMeal" @click.stop />
    </div>
  </Transition>

</div>
</template>

<style scoped>
.kitchen-page {
  background: #ffffff;
  min-height: 100vh;
  padding: 0;
  padding-bottom: 80px;
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #1a1a2e;
  -webkit-font-smoothing: antialiased;
}

.kp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #faf8f5;
  border-bottom: 1px solid rgba(34,40,78,.08);
  position: sticky;
  top: 0;
  z-index: 10;
}
.kp-header-left { display: flex; align-items: center; gap: 10px; }
.kp-header-right { display: flex; align-items: center; gap: 8px; }

.kp-tabs {
  display: flex;
  background: rgba(34,40,78,.07);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}
.kp-tab {
  padding: 7px 14px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(34,40,78,.5);
  cursor: pointer;
  transition: all .18s;
}
.kp-tab.active {
  background: #fff;
  color: #22284E;
  box-shadow: 0 2px 6px rgba(34,40,78,.1);
}

.kp-btn-close {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(34,40,78,.08);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(34,40,78,.6);
  flex-shrink: 0;
}
.kp-btn-close:hover { background: rgba(34,40,78,.14); }

.kp-btn-search {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(34,40,78,.08);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(34,40,78,.6);
}
.kp-btn-search:hover { background: rgba(34,40,78,.14); }

/* ── Search ── */
.kp-search-wrap {
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.kp-search-inner { position: relative; }
.kp-search-ico {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}
.kp-search-inp {
  width: 100%;
  padding: 12px 44px;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  font-size: 15px;
  color: #1a1a2e;
  font-family: inherit;
  box-sizing: border-box;
  background: #f9fafb;
  transition: all 0.2s ease;
}
.kp-search-inp:focus {
  outline: none;
  border-color: v-bind(color);
  background: #ffffff;
  box-shadow: 0 0 0 3px v-bind(color + '20');
}
.kp-search-close {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: #e5e7eb;
  border: none;
  cursor: pointer;
  color: #6b7280;
  font-size: 14px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.kp-search-close:hover {
  background: #d1d5db;
  color: #374151;
}

/* ── Categorías + Aleatorio ── */
.kp-cats {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 16px 20px;
  scrollbar-width: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  background: #ffffff;
}
.kp-cats::-webkit-scrollbar { display: none; }
.kp-cat-btn {
  padding: 8px 18px;
  border-radius: 9999px;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1.5px solid #e5e7eb;
  background: #ffffff;
  color: #6b7280;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 6px;
}
.kp-cat-btn:hover {
  border-color: #d1d5db;
  color: #374151;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.kp-cat-btn.active {
  background: v-bind(color);
  color: #ffffff;
  border-color: v-bind(color);
  box-shadow: 0 4px 12px v-bind(color + '40');
  font-weight: 700;
}

/* Aleatorio con emoji */
.kp-random-btn {
  background: #fef3c7;
  border-color: #fbbf24;
  color: #92400e;
}
.kp-random-btn:hover {
  background: #fde68a;
  border-color: #f59e0b;
}

/* ── Grid recetas ── */
.kp-browse,
.kp-saved-view {
  padding: 20px;
}
.kp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 16px;
}
.kp-card {
  background: #ffffff;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}
.kp-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08);
}
.kp-card-img {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
}
.kp-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.kp-card:hover .kp-card-img img {
  transform: scale(1.08);
}
.kp-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 50%);
  transition: opacity 0.3s;
}
.kp-saved-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2.5px solid #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: badgePop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
@keyframes badgePop {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}
.kp-card-info {
  padding: 14px 16px;
  background: #ffffff;
}
.kp-card-name {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
}
.kp-card-cat {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Loading / Empty ── */
.kp-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 20px;
  color: #9ca3af;
  font-size: 15px;
  font-weight: 500;
}
.kp-spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid #f3f4f6;
  border-top-color: v-bind(color);
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.kp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 15px;
  font-weight: 500;
}

/* ═══════════════════════════════════════════════════
   DETAIL VIEW — COMPACTO + SIN RATING/SHARE
   ═══════════════════════════════════════════════════ */
.kp-detail {
  padding-bottom: 32px;
  overflow: hidden;
}

.kp-detail-hero {
  position: relative;
  height: 220px;
  overflow: hidden;
  border-radius: 0 0 24px 24px;
}
.kp-detail-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.kp-detail-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.15) 50%, transparent 100%);
}
.kp-detail-hero-info {
  position: absolute;
  bottom: 16px;
  left: 20px;
  right: 110px;
}
.kp-detail-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  color: #ffffff;
  padding: 3px 10px;
  border-radius: 999px;
  margin-right: 5px;
  margin-bottom: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.kp-detail-hero-info h2 {
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.4);
}

.kp-save-btn {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.kp-save-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}
.kp-save-btn:active {
  transform: scale(0.95);
}
.kp-save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
.kp-spin {
  animation: spin 0.8s linear infinite;
}

/* ── Secciones ── */
.kp-section {
  padding: 20px 20px 0;
}
.kp-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.kp-section-title {
  font-size: 15px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Escalar recetas */
.kp-scale {
  display: flex;
  gap: 4px;
}
.kp-scale-btn {
  padding: 4px 10px;
  border-radius: 8px;
  border: 1.5px solid #e5e7eb;
  background: #fff;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all .2s;
}
.kp-scale-btn:hover {
  border-color: #d1d5db;
  color: #374151;
}
.kp-scale-btn.active {
  border-color: v-bind(color);
  box-shadow: 0 2px 8px v-bind(color + '30');
}

/* Timer */
.kp-timer-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f9fafb;
  border-radius: 16px;
  padding: 14px 18px;
  border: 2px solid #f3f4f6;
  margin-bottom: 10px;
  transition: border-color 0.3s;
}
.kp-timer-box:hover {
  border-color: #e5e7eb;
}
.kp-timer-display {
  font-size: 32px;
  font-weight: 800;
  color: #1a1a2e;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  font-family: 'SF Mono', Monaco, monospace;
  transition: color 0.3s;
  line-height: 1;
}
.kp-timer-btns {
  display: flex;
  gap: 8px;
}
.kp-tbt {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.kp-tbt:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
.kp-tbt:active:not(:disabled) {
  transform: scale(0.95);
}
.kp-tbt:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  box-shadow: none;
}
.kp-tbt.play {
  color: #ffffff;
  background: v-bind(color);
}
.kp-tbt.pause {
  background: #ffffff;
  color: #374151;
  border: 2px solid #e5e7eb;
}
.kp-tbt.reset {
  background: #f3f4f6;
  color: #6b7280;
}

.kp-log-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 2px solid v-bind(color);
  background: transparent;
  color: v-bind(color);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 4px;
}
.kp-log-btn:hover {
  background: v-bind(color + '10');
  transform: translateY(-1px);
  box-shadow: 0 4px 12px v-bind(color + '20');
}

/* Notas */
.kp-note {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  font-size: 13px;
  color: #1a1a2e;
  background: #f9fafb;
  font-family: inherit;
  resize: none;
  box-sizing: border-box;
  line-height: 1.6;
  transition: all 0.2s ease;
}
.kp-note:focus {
  outline: none;
  border-color: v-bind(color);
  background: #ffffff;
  box-shadow: 0 0 0 3px v-bind(color + '15');
}
.kp-save-note-btn {
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  border: none;
  border-radius: 12px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  background: v-bind(color);
}
.kp-save-note-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px v-bind(color + '40');
}
.kp-save-note-btn.saved {
  background: #10b981 !important;
}

/* Ingredientes + Shopping */
.kp-ingredients {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.kp-ing-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 14px;
  border: 1.5px solid #f3f4f6;
  transition: all 0.2s ease;
  cursor: pointer;
}
.kp-ing-row:hover {
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transform: translateY(-2px);
}
.kp-ing-row.bought {
  opacity: 0.5;
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.kp-ing-row.bought .kp-ing-name {
  text-decoration: line-through;
  color: #6b7280;
}
.kp-ing-check {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all .2s;
}
.kp-ing-row.bought .kp-ing-check {
  background: #10b981;
  border-color: #10b981;
}
.kp-ing-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.kp-ing-name {
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
}
.kp-ing-measure {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

/* Pasos + Modo cocinar */
.kp-section-header .kp-cook-mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  border: none;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all .2s;
}
.kp-cook-mode-btn:hover {
  opacity: 0.9;
  transform: scale(1.05);
}
.kp-steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.kp-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: #f9fafb;
  padding: 14px;
  border-radius: 16px;
  border: 1.5px solid #f3f4f6;
  transition: all 0.2s ease;
}
.kp-step:hover {
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.kp-step-num {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: v-bind(color);
  box-shadow: 0 2px 8px v-bind(color + '40');
}
.kp-step-text {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;
  margin: 0;
  font-weight: 400;
}

/* Links */
.kp-links-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding-bottom: 24px;
}
.kp-link-btn {
  flex: 1;
  min-width: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #ffffff;
  border: 2px solid #e5e7eb;
  color: #374151;
  font-size: 13px;
  font-weight: 700;
  padding: 12px 16px;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.kp-link-btn:hover {
  border-color: #d1d5db;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}
.kp-link-yt {
  border-color: #fecaca;
  color: #dc2626;
}
.kp-link-yt:hover {
  border-color: #fca5a5;
  box-shadow: 0 8px 24px rgba(220, 38, 38, 0.12);
  background: #fef2f2;
}

/* ═══════════════════════════════════════════════════
   MODO COCINANDO — BOTONES MÁS PEQUEÑOS EN MOBILE
   ═══════════════════════════════════════════════════ */
.kp-cooking-overlay {
  position: fixed;
  inset: 0;
  background: #1a1a2e;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  padding: 16px;
  color: #fff;
  overflow: hidden;
}
.kp-cooking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-shrink: 0;
}
.kp-cooking-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,.1);
  border: none;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.kp-cooking-title {
  font-size: 13px;
  font-weight: 600;
  opacity: .7;
  flex: 1;
  text-align: center;
  margin: 0 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kp-cooking-progress {
  font-size: 12px;
  font-weight: 700;
  background: rgba(255,255,255,.1);
  padding: 4px 10px;
  border-radius: 99px;
  flex-shrink: 0;
}
.kp-cooking-step-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
  padding: 10px;
  min-height: 0;
  overflow-y: auto;
}
.kp-cooking-step-num {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  color: #fff;
  font-size: 20px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.kp-cooking-step-text {
  font-size: 18px;
  line-height: 1.5;
  font-weight: 500;
  max-width: 100%;
  word-wrap: break-word;
}
.kp-cooking-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 16px;
  flex-shrink: 0;
}
.kp-cooking-nav-btn {
  padding: 10px 16px;
  border-radius: 12px;
  border: none;
  background: rgba(255,255,255,.1);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all .2s;
  flex-shrink: 0;
}
.kp-cooking-nav-btn:hover:not(:disabled) {
  background: rgba(255,255,255,.2);
}
.kp-cooking-nav-btn:disabled {
  opacity: .3;
  cursor: not-allowed;
}
.kp-cooking-dots {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 120px;
}
.kp-cooking-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,.2);
  transition: all .3s;
  flex-shrink: 0;
}
.kp-cooking-dots span.active {
  width: 20px;
  border-radius: 3px;
}

/* ── Transitions ── */
.sd-enter-active,
.sd-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.sd-enter-from,
.sd-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .kp-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .kp-detail-hero {
    height: 200px;
    border-radius: 0 0 20px 20px;
  }
  .kp-detail-hero-info {
    right: 110px;
  }
  .kp-detail-hero-info h2 {
    font-size: 18px;
  }
  .kp-timer-display {
    font-size: 28px;
  }
  .kp-section {
    padding: 16px 16px 0;
  }
  .kp-section-header {
    flex-wrap: wrap;
    gap: 8px;
  }
  .kp-header {
    padding: 12px 16px;
  }
  .kp-browse,
  .kp-saved-view {
    padding: 16px;
  }
  .kp-cats {
    padding: 12px 16px;
  }
  
  /* MODO COCINANDO MOBILE — BOTONES MÁS PEQUEÑOS */
  .kp-cooking-overlay {
    padding: 12px;
  }
  .kp-cooking-header {
    margin-bottom: 12px;
  }
  .kp-cooking-close {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
  .kp-cooking-title {
    font-size: 12px;
    margin: 0 8px;
  }
  .kp-cooking-progress {
    font-size: 11px;
    padding: 3px 8px;
  }
  .kp-cooking-step-display {
    gap: 12px;
    padding: 8px;
  }
  .kp-cooking-step-num {
    width: 40px;
    height: 40px;
    font-size: 18px;
    border-radius: 12px;
  }
  .kp-cooking-step-text {
    font-size: 16px;
    line-height: 1.4;
  }
  .kp-cooking-nav {
    gap: 8px;
    padding-bottom: 12px;
  }
  .kp-cooking-nav-btn {
    padding: 8px 12px;
    font-size: 12px;
    border-radius: 10px;
  }
  .kp-cooking-dots {
    max-width: 100px;
    gap: 4px;
  }
  .kp-cooking-dots span {
    width: 5px;
    height: 5px;
  }
  .kp-cooking-dots span.active {
    width: 16px;
  }
}

@media (min-width: 769px) {
  .kp-header {
    padding-left: 28px;
  }
  .kp-btn-close {
    margin-left: 8px;
  }
  .kp-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
  }
  .kp-browse,
  .kp-saved-view {
    padding: 28px 32px;
  }
  .kp-section {
    padding: 24px 32px 0;
  }
  .kp-cats {
    padding: 16px 32px;
  }
  .kp-detail-hero {
    height: 235px;
    overflow: hidden;
    margin: 0 40px;
    border-radius: 0 0 20px 20px;
  }
  .kp-detail-hero-info h2 {
    font-size: 24px;
  }
}

/* Lightbox imagen */
.kp-detail-hero {
  cursor: zoom-in; /* Indica que se puede clickar */
}

.kp-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  cursor: zoom-out;
}
.kp-lightbox img {
  max-width: 100%;
  max-height: 90vh;
  border-radius: 12px;
  object-fit: contain;
  cursor: default;
}
.kp-lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,.15);
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  z-index: 1002;
}
.kp-lightbox-close:hover {
  background: rgba(255,255,255,.3);
}
</style>