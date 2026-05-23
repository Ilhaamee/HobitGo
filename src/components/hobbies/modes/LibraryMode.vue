<script setup>
import { ref, computed, onUnmounted, nextTick } from 'vue'
import { supabase } from '../../../lib/supabase'

const props = defineProps({
  hobby: { type: Object, required: true },
  color: { type: String, default: '#1d4ed8' },
})
const emit = defineEmits(['close', 'add-session'])

// ── Estado ──────────────────────────────────────────────────────────────
const books         = ref([])
const searchQuery   = ref('')
const searchResults = ref([])
const searching     = ref(false)
const showSearch    = ref(false)
const selectedBook  = ref(null)
const loading       = ref(false)
const activeView    = ref('shelves')
const timerActive   = ref(false)
const timerSeconds  = ref(0)
let timerInterval   = null

// NUEVO: Modo lectora
const readerMode    = ref(false)

// NUEVO: Feedback al guardar
const justSaved     = ref(false)

// NUEVO: Editar páginas total
const editingPages  = ref(false)

const SPINES = ['#1d4ed8','#7c3aed','#dc2626','#15803d','#b45309','#0891b2','#be185d','#374151','#0f766e','#92400e','#d97706','#4c1d95']
const randomSpine = () => SPINES[Math.floor(Math.random() * SPINES.length)]

const shelves = [
  { key: 'reading',  label: 'Leyendo' },
  { key: 'wishlist', label: 'Por leer' },
  { key: 'read',     label: 'Terminados' },
]

// ── Computed ────────────────────────────────────────────────────────────
const readingBooks  = computed(() => books.value.filter(b => b.status === 'reading'))
const wishlistBooks = computed(() => books.value.filter(b => b.status === 'wishlist'))
const readBooks     = computed(() => books.value.filter(b => b.status === 'read'))

const allBooks = computed(() =>
  searchQuery.value.trim()
    ? books.value.filter(b => b.title.toLowerCase().includes(searchQuery.value.toLowerCase()) || b.author?.toLowerCase().includes(searchQuery.value.toLowerCase()))
    : books.value
)

const timerDisplay = computed(() => {
  const m = Math.floor(timerSeconds.value / 60)
  const s = timerSeconds.value % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
})

const readingProgress = computed(() => {
  if (!selectedBook.value?.total_pages) return 0
  return Math.round(selectedBook.value.current_page / selectedBook.value.total_pages * 100)
})

// ── Timer ───────────────────────────────────────────────────────────────
function startTimer() {
  if (timerActive.value) return
  timerActive.value = true
  timerInterval = setInterval(() => timerSeconds.value++, 1000)
}
function stopTimer() { timerActive.value = false; clearInterval(timerInterval) }
function resetTimer() { stopTimer(); timerSeconds.value = 0 }

function logSession() {
  const mins = Math.max(1, Math.round(timerSeconds.value / 60))
  emit('add-session', { hobbyId: props.hobby.id, minutes: mins, note: selectedBook.value ? `Leyendo "${selectedBook.value.title}"` : 'Sesión de lectura' })
  resetTimer()
}

// NUEVO: Modo lectora
function toggleReaderMode() {
  readerMode.value = !readerMode.value
  if (readerMode.value) {
    stopTimer()
    timerSeconds.value = 0
  }
}

// ── API Supabase ────────────────────────────────────────────────────────
async function loadBooks() {
  loading.value = true
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { loading.value = false; return }
  const { data } = await supabase
    .from('library_books').select('*')
    .eq('user_id', user.id).eq('hobby_id', props.hobby.id)
    .order('added_at', { ascending: false })
  if (data) books.value = data
  loading.value = false
}

async function saveBook(book) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  if (book.id) {
    await supabase.from('library_books').update({
      status: book.status, current_page: book.current_page,
      total_pages: book.total_pages,
      rating: book.rating, note: book.note,
      finished_at: book.status === 'read' ? new Date().toISOString() : null,
    }).eq('id', book.id)
  } else {
    const { data } = await supabase.from('library_books').insert({
      user_id: user.id, hobby_id: props.hobby.id,
      google_book_id: book.google_book_id, title: book.title,
      author: book.author, cover_url: book.cover_url,
      total_pages: book.total_pages, current_page: 0,
      status: book.status, rating: 0, note: '',
      spine_color: book.spine_color,
    }).select()
    if (data?.[0]) books.value.unshift(data[0])
  }
}

async function removeBook(id) {
  await supabase.from('library_books').delete().eq('id', id)
  books.value = books.value.filter(b => b.id !== id)
  selectedBook.value = null
}

// ── Search ──────────────────────────────────────────────────────────────
let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  if (!searchQuery.value.trim()) { searchResults.value = []; return }
  searchTimer = setTimeout(fetchBooks, 500)
}

async function fetchBooks() {
  searching.value = true
  try {
    const res  = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery.value)}&limit=12&fields=key,title,author_name,cover_i,number_of_pages_median,first_publish_year`)
    const data = await res.json()
    searchResults.value = (data.docs || []).map(book => ({
      google_book_id: book.key,
      title:       book.title || 'Sin título',
      author:      (book.author_name || ['Autor desconocido']).slice(0,2).join(', '),
      cover_url:   book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null,
      total_pages: book.number_of_pages_median || 0,
      year:        book.first_publish_year?.toString() || '',
    }))
  } catch { searchResults.value = [] }
  searching.value = false
}

function addBook(apiBook, status = 'wishlist') {
  if (books.value.find(b => b.google_book_id === apiBook.google_book_id)) return
  saveBook({ ...apiBook, status, spine_color: randomSpine(), rating: 0, note: '', current_page: 0 })
  showSearch.value = false; searchQuery.value = ''; searchResults.value = []
}

// ── Book detail (inline) ────────────────────────────────────────────────
function openBook(book) {
  selectedBook.value = { ...book }
  editingPages.value = false
  stopTimer()
  nextTick(() => {
    const detail = document.querySelector('.book-detail-inline')
    if (detail) detail.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function closeBook() {
  selectedBook.value = null
  editingPages.value = false
  stopTimer()
  timerSeconds.value = 0
}

async function updateBook() {
  if (!selectedBook.value) return
  await saveBook(selectedBook.value)
  const idx = books.value.findIndex(b => b.id === selectedBook.value.id)
  if (idx !== -1) books.value[idx] = { ...selectedBook.value }

  // NUEVO: Feedback visual
  justSaved.value = true
  setTimeout(() => justSaved.value = false, 2000)
}

async function markFinished() {
  selectedBook.value.status = 'read'
  selectedBook.value.current_page = selectedBook.value.total_pages
  await updateBook()
  const mins = Math.max(1, Math.round(timerSeconds.value / 60))
  emit('add-session', { hobbyId: props.hobby.id, minutes: mins, note: `Terminé "${selectedBook.value.title}"` })
  stopTimer()
}

function booksForShelf(key) {
  return books.value.filter(b => b.status === key)
}

onUnmounted(() => clearInterval(timerInterval))
loadBooks()
</script>

<template>
<div class="library-page">

  <!-- ══ HEADER (IGUAL QUE KITCHENMODE) ════════════════════════ -->
  <div class="lp-header">
    <div class="lp-header-left">
      <!-- Botón volver: si hay libro seleccionado vuelve a la biblioteca, si no cierra el modo -->
      <button class="lp-btn-close" @click="selectedBook ? closeBook() : emit('close')">
        <svg viewBox="0 0 16 16" fill="none" width="16">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="lp-tabs">
        <button class="lp-tab" :class="{ active: activeView === 'shelves' && !selectedBook }" @click="activeView = 'shelves'; selectedBook = null">
          Estantes
        </button>
        <button class="lp-tab" :class="{ active: activeView === 'all' && !selectedBook }" @click="activeView = 'all'; selectedBook = null">
          Todos {{ books.length > 0 ? `(${books.length})` : '' }}
        </button>
      </div>
    </div>
    <div class="lp-header-right">
      <button class="lp-btn-search" @click="showSearch = !showSearch">
        <svg viewBox="0 0 20 20" fill="none" width="16">
          <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.8"/>
          <path d="M15 15l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- ══ SEARCH BAR (IGUAL QUE KITCHENMODE) ════════════════════ -->
  <Transition name="sd">
    <div v-if="showSearch" class="lp-search-wrap">
      <div class="lp-search-inner">
        <svg viewBox="0 0 20 20" fill="none" width="14" class="lp-search-ico">
          <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.7"/>
          <path d="M15 15l3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
        <input v-model="searchQuery" @input="onSearchInput" class="lp-search-inp"
          placeholder="Buscar libro..." autofocus />
        <button class="lp-search-close" @click="showSearch=false; searchQuery=''; searchResults=[]">✕</button>
      </div>
      <!-- Resultados de búsqueda inline -->
      <div v-if="searchResults.length" class="lp-search-results">
        <div v-for="r in searchResults" :key="r.google_book_id" class="lp-sr-row">
          <div class="lp-sr-cover">
            <img v-if="r.cover_url" :src="r.cover_url" :alt="r.title" />
            <div v-else class="lp-sr-cover-ph" :style="{ background: randomSpine() }"></div>
          </div>
          <div class="lp-sr-info">
            <span class="lp-sr-title">{{ r.title }}</span>
            <span class="lp-sr-author">{{ r.author }}{{ r.year ? ' · ' + r.year : '' }}</span>
            <span v-if="r.total_pages" class="lp-sr-pages">{{ r.total_pages }} páginas</span>
          </div>
          <div class="lp-sr-actions">
            <button class="lp-sr-btn" :style="{ background: color, color: '#fff' }" @click="addBook(r,'reading')">Leyendo</button>
            <button class="lp-sr-btn outline" @click="addBook(r,'wishlist')">Por leer</button>
          </div>
        </div>
      </div>
      <p v-else-if="searchQuery && !searching" class="lp-search-empty">No se encontraron resultados.</p>
      <div v-if="searching" class="lp-search-loading">
        <div class="lp-spinner" :style="{ borderTopColor: color }"></div>
        <span>Buscando libros...</span>
      </div>
    </div>
  </Transition>

  <!-- ══ CONTENIDO: SHELVES / ALL (solo cuando NO hay libro seleccionado) ══ -->
  <div v-if="!selectedBook" class="lp-content">

    <!-- SHELVES VIEW -->
    <div v-if="activeView === 'shelves'" class="shelves-view">
      <div v-if="loading" class="lp-loading">
        <div class="lp-spinner" :style="{ borderTopColor: color }"></div>
        <span>Cargando tu biblioteca...</span>
      </div>
      <template v-else>
        <div v-for="shelf in shelves" :key="shelf.key" class="shelf-block">
          <div class="shelf-block-header">
            <h3 class="shelf-block-title">{{ shelf.label }}</h3>
          </div>

          <div v-if="booksForShelf(shelf.key).length === 0" class="shelf-empty-inline">
            <span>Aún no hay libros — añade uno arriba</span>
          </div>

          <div v-else class="shelf-container">
            <div class="shelf-books-row">
              <button
                v-for="book in booksForShelf(shelf.key)" :key="book.id"
                class="book-item"
                @click="openBook(book)"
              >
                <div class="book-3d">
                  <div class="book-face">
                    <img v-if="book.cover_url" :src="book.cover_url" :alt="book.title" class="book-img" />
                    <div v-else class="book-no-cover" :style="{ background: book.spine_color || '#1d4ed8' }">
                      <span>{{ book.title }}</span>
                    </div>
                    <div v-if="book.status === 'reading' && book.total_pages > 0" class="book-progress-side">
                      <div class="bps-fill" :style="{ height: (book.current_page/book.total_pages*100)+'%', background: color }"></div>
                    </div>
                    <div v-if="book.status === 'read'" class="book-done-badge">✓</div>
                  </div>
                  <div class="book-spine-3d" :style="{ background: book.spine_color || '#1d4ed8' }"></div>
                </div>
              </button>
            </div>
            <div class="shelf-plank"></div>
          </div>
        </div>
      </template>
    </div>

    <!-- ALL BOOKS VIEW -->
    <div v-if="activeView === 'all'" class="all-books-view">
      <div v-if="allBooks.length === 0" class="lp-empty">
        <p>Tu biblioteca está vacía. ¡Añade tu primer libro!</p>
      </div>
      <div class="all-grid">
        <button v-for="book in allBooks" :key="book.id" class="all-book-item" @click="openBook(book)">
          <div class="all-cover">
            <img v-if="book.cover_url" :src="book.cover_url" :alt="book.title" />
            <div v-else class="all-cover-ph" :style="{ background: book.spine_color }"></div>
          </div>
          <p class="all-book-title">{{ book.title }}</p>
          <p class="all-book-author">{{ book.author }}</p>
          <div class="all-status-dot" :class="book.status"></div>
        </button>
      </div>
    </div>
  </div>

  <!-- ══ DETAIL VIEW (reemplaza todo cuando hay libro seleccionado) ══ -->
  <div v-if="selectedBook" class="lp-detail">
    <!-- Info del libro: imagen + datos -->
    <div class="lp-section lp-book-card">
      <div class="lp-book-card-inner">
        <div class="lp-book-cover-wrap">
          <img v-if="selectedBook.cover_url" :src="selectedBook.cover_url" class="lp-book-cover-img" />
          <div v-else class="lp-book-cover-ph" :style="{ background: selectedBook.spine_color }">
            <span>{{ selectedBook.title }}</span>
          </div>
        </div>
        <div class="lp-book-info">
          <h2 class="lp-book-title">{{ selectedBook.title }}</h2>
          <p class="lp-book-author">{{ selectedBook.author }}</p>
          <p v-if="selectedBook.total_pages" class="lp-book-pages">{{ selectedBook.total_pages }} páginas</p>
          <div class="lp-book-status-pills">
            <button v-for="s in shelves" :key="s.key"
              class="lp-book-pill" :class="{ active: selectedBook.status === s.key }"
              :style="selectedBook.status === s.key ? { background: color, color:'#fff', borderColor: color } : {}"
              @click="selectedBook.status = s.key">
              {{ s.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Progreso de lectura -->
    <div v-if="selectedBook.total_pages > 0 && selectedBook.status === 'reading'" class="lp-section">
      <h3 class="lp-section-title">📖 Progreso</h3>
      <div class="lp-page-row">
        <span class="lp-page-num">Pág. {{ selectedBook.current_page }}</span>
        <input type="range" v-model.number="selectedBook.current_page"
          :min="0" :max="selectedBook.total_pages" class="lp-slider"
          :style="{ accentColor: color }" />
        <span class="lp-page-num">{{ selectedBook.total_pages }}</span>
      </div>
      <div class="lp-prog-bar">
        <div class="lp-prog-fill" :style="{ width: readingProgress+'%', background: color }"></div>
      </div>
      <p class="lp-prog-pct">{{ readingProgress }}% leído</p>

      <!-- Editar total de páginas -->
      <div class="lp-edit-pages">
        <button v-if="!editingPages" class="lp-edit-btn" @click="editingPages = true">
          <svg viewBox="0 0 20 20" fill="none" width="14">
            <path d="M3 17h4l8-8a2 2 0 000-2.8l-.7-.7a2 2 0 00-2.8 0L4 13.5V17z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Editar total de páginas
        </button>
        <div v-else class="lp-edit-field">
          <span>Nuevo total:</span>
          <input 
            type="number" 
            v-model.number="selectedBook.total_pages"
            class="lp-page-inp"
            @change="selectedBook.current_page = Math.min(selectedBook.current_page, selectedBook.total_pages)"
          />
          <button class="lp-edit-ok" @click="editingPages = false">OK</button>
        </div>
      </div>
    </div>

    <!-- Temporizador -->
    <div class="lp-section">
      <h3 class="lp-section-title">⏱ Temporizador</h3>
      <div class="lp-timer-box">
        <span class="lp-timer-display" :style="timerActive ? { color } : {}">{{ timerDisplay }}</span>
        <div class="lp-timer-btns">
          <button class="lp-tbt play" :style="{ background: color }" @click="startTimer" :disabled="timerActive">▶</button>
          <button class="lp-tbt pause" @click="stopTimer" :disabled="!timerActive">⏸</button>
          <button class="lp-tbt reset" @click="resetTimer">↺</button>
        </div>
      </div>
      <button v-if="timerSeconds > 0" class="lp-log-btn"
        :style="{ borderColor: color, color }" @click="logSession">
        Registrar {{ Math.max(1,Math.round(timerSeconds/60)) }} min de lectura
      </button>
    </div>

    <!-- Valoración -->
    <div class="lp-section">
      <h3 class="lp-section-title">⭐ Valoración</h3>
      <div class="lp-stars">
        <button v-for="n in 5" :key="n" class="lp-star"
          :class="{ lit: n <= selectedBook.rating }"
          :style="n <= selectedBook.rating ? { color } : {}"
          @click="selectedBook.rating = n">★</button>
      </div>
    </div>

    <!-- Notas -->
    <div class="lp-section">
      <h3 class="lp-section-title">📝 Mis notas</h3>
      <textarea v-model="selectedBook.note" class="lp-note"
        placeholder="¿Qué te ha parecido? ¿Qué aprendiste?..." rows="3"></textarea>
    </div>

    <!-- Botón modo lectora -->
    <div class="lp-section">
      <button class="lp-reader-btn" :style="{ background: color }" @click="toggleReaderMode">
        <svg viewBox="0 0 20 20" fill="none" width="16">
          <path d="M2 5h16M2 10h16M2 15h10" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Modo lectora
      </button>
    </div>

    <!-- Acciones -->
    <div class="lp-section lp-actions">
      <button class="lp-act save" :class="{ saved: justSaved }" :style="justSaved ? { background: '#22c55e' } : { background: color }" @click="updateBook">
        {{ justSaved ? '✓ Guardado' : 'Guardar' }}
      </button>
      <button v-if="selectedBook.status !== 'read'" class="lp-act done" @click="markFinished">✓ Terminado</button>
      <button class="lp-act del" @click="removeBook(selectedBook.id)">Eliminar</button>
    </div>
  </div>

  <!-- ══ MODO LECTORA OVERLAY ═════════════ -->
  <Transition name="sd">
    <div v-if="readerMode" class="lp-reader-overlay" @click="toggleReaderMode">
      <button class="lp-reader-close" @click.stop="toggleReaderMode">✕</button>

      <div class="lp-reader-content" @click.stop>
        <div class="lp-reader-book-info">
          <img v-if="selectedBook?.cover_url" :src="selectedBook.cover_url" class="lp-reader-cover" />
          <div>
            <h3 class="lp-reader-title">{{ selectedBook?.title }}</h3>
            <p class="lp-reader-author">{{ selectedBook?.author }}</p>
          </div>
        </div>

        <div class="lp-reader-timer-section">
          <span class="lp-reader-timer" :style="timerActive ? { color } : {}">{{ timerDisplay }}</span>
          <p class="lp-reader-timer-label">Tiempo de lectura</p>
        </div>

        <div class="lp-reader-timer-btns">
          <button class="lp-rbt play" :style="{ background: color }" @click="startTimer" :disabled="timerActive">▶ Iniciar</button>
          <button class="lp-rbt pause" @click="stopTimer" :disabled="!timerActive">⏸ Pausar</button>
          <button class="lp-rbt reset" @click="resetTimer">↺ Reiniciar</button>
        </div>

        <button v-if="timerSeconds > 0" class="lp-reader-log-btn" :style="{ borderColor: color, color }" @click="logSession">
          Registrar {{ Math.max(1, Math.round(timerSeconds/60)) }} min de lectura
        </button>

        <div class="lp-reader-progress">
          <div class="lp-reader-prog-bar">
            <div class="lp-reader-prog-fill" :style="{ width: readingProgress + '%', background: color }"></div>
          </div>
          <p>{{ readingProgress }}% — Pág. {{ selectedBook?.current_page }} / {{ selectedBook?.total_pages }}</p>
        </div>
      </div>
    </div>
  </Transition>

</div>
</template>

<style scoped>
/* ════════════════════════════════════════════════════════════════════════
   LIBRARYMODE - MISMO DISEÑO QUE KITCHENMODE
   ════════════════════════════════════════════════════════════════════════ */

.library-page {
  background: #ffffff;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 0;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #1a1a2e;
  -webkit-font-smoothing: antialiased;
}

/* ── Header (IGUAL QUE KITCHENMODE) ── */
.lp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: max(12px, env(safe-area-inset-top));
  background: #faf8f5;
  border-bottom: 1px solid rgba(34,40,78,.08);
  position: sticky;
  top: 0;
  z-index: 10;
}
.lp-header-left { display: flex; align-items: center; gap: 10px; }
.lp-header-right { display: flex; align-items: center; gap: 8px; }

.lp-tabs {
  display: flex;
  background: rgba(34,40,78,.07);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}
.lp-tab {
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
.lp-tab.active {
  background: #fff;
  color: #22284E;
  box-shadow: 0 2px 6px rgba(34,40,78,.1);
}

.lp-btn-close {
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
.lp-btn-close:hover { background: rgba(34,40,78,.14); }

.lp-btn-search {
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
.lp-btn-search:hover { background: rgba(34,40,78,.14); }

/* ── Search (IGUAL QUE KITCHENMODE) ── */
.lp-search-wrap {
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.lp-search-inner { position: relative; }
.lp-search-ico {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}
.lp-search-inp {
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
.lp-search-inp:focus {
  outline: none;
  border-color: v-bind(color);
  background: #ffffff;
  box-shadow: 0 0 0 3px v-bind(color + '20');
}
.lp-search-close {
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
.lp-search-close:hover {
  background: #d1d5db;
  color: #374151;
}

/* Resultados de búsqueda inline */
.lp-search-results {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}
.lp-sr-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1.5px solid #f3f4f6;
  transition: all 0.2s;
}
.lp-sr-row:hover {
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 2px 8px rgba(0,0,0,.04);
}
.lp-sr-cover {
  width: 42px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}
.lp-sr-cover img { width: 100%; height: 100%; object-fit: cover; }
.lp-sr-cover-ph { width: 100%; height: 100%; }
.lp-sr-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.lp-sr-title { font-size: 14px; font-weight: 700; color: #1a1a2e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lp-sr-author { font-size: 12px; color: #9ca3af; }
.lp-sr-pages { font-size: 11px; color: #d1d5db; }
.lp-sr-actions { display: flex; gap: 6px; flex-shrink: 0; }
.lp-sr-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}
.lp-sr-btn.outline { background: #f3f4f6; color: #374151; }
.lp-sr-btn:hover { opacity: 0.8; }
.lp-search-empty { text-align: center; font-size: 13px; color: #9ca3af; padding: 16px 0; }
.lp-search-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  color: #9ca3af;
  font-size: 14px;
}

/* ── Loading / Empty ── */
.lp-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 20px;
  color: #9ca3af;
  font-size: 15px;
  font-weight: 500;
}
.lp-spinner {
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
.lp-empty {
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

/* ── Shelves view ── */
.shelves-view { padding: 20px; display: flex; flex-direction: column; gap: 32px; }

.shelf-block { }
.shelf-block-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.shelf-block-title { font-size: 15px; font-weight: 800; color: #1a1a2e; margin: 0; letter-spacing: -0.01em; }

.shelf-empty-inline {
  padding: 24px;
  text-align: center;
  background: #f9fafb;
  border-radius: 16px;
  font-size: 13px;
  color: #9ca3af;
  border: 1.5px dashed #e5e7eb;
}

.shelf-container { }
.shelf-books-row {
  display: flex;
  gap: 14px;
  align-items: flex-end;
  padding: 16px 16px 0;
  min-height: 160px;
  background: linear-gradient(to bottom, #faf8f5, #f5f0e8);
  border-radius: 16px 16px 0 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.shelf-books-row::-webkit-scrollbar { display: none; }

/* 3D book */
.book-item { background: none; border: none; padding: 0; cursor: pointer; flex-shrink: 0; transition: transform .2s; }
.book-item:hover { transform: translateY(-8px); }
.book-item:hover .book-spine-3d { width: 14px; }

.book-3d { display: flex; align-items: flex-end; filter: drop-shadow(3px 6px 12px rgba(0,0,0,.22)); }
.book-face {
  position: relative; width: 80px; height: 120px;
  border-radius: 2px 4px 4px 2px; overflow: hidden;
}
.book-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.book-no-cover {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  padding: 8px;
}
.book-no-cover span { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.9); text-align: center; word-break: break-word; line-height: 1.3; }

.book-progress-side {
  position: absolute; right: 0; top: 0; bottom: 0; width: 4px;
  background: rgba(0,0,0,.12);
}
.bps-fill { position: absolute; bottom: 0; width: 100%; border-radius: 3px 3px 0 0; transition: height .4s ease; }

.book-done-badge {
  position: absolute; top: 5px; right: 5px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #10b981; color: #fff; font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #fff;
}

.book-spine-3d {
  width: 10px; height: 120px; border-radius: 0 2px 2px 0;
  transition: width .2s;
  filter: brightness(.7);
}

/* Shelf plank */
.shelf-plank {
  height: 14px;
  background: linear-gradient(to bottom, #d4a96a, #c49459);
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 10px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.2);
}

/* ── All books grid ── */
.all-books-view { padding: 20px; }
.all-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 12px; }
.all-book-item { background: none; border: none; padding: 0; cursor: pointer; text-align: left; transition: transform .18s; }
.all-book-item:hover { transform: translateY(-4px); }
.all-cover { width: 100%; aspect-ratio: 2/3; border-radius: 4px 8px 8px 4px; overflow: hidden; box-shadow: 3px 4px 12px rgba(0,0,0,.2); margin-bottom: 8px; }
.all-cover img { width: 100%; height: 100%; object-fit: cover; }
.all-cover-ph { width: 100%; height: 100%; }
.all-book-title { font-size: 12px; font-weight: 700; color: #1a1a2e; margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.all-book-author { font-size: 11px; color: #9ca3af; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.all-status-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 4px; }
.all-status-dot.reading  { background: #3b82f6; }
.all-status-dot.wishlist { background: #f59e0b; }
.all-status-dot.read     { background: #10b981; }

/* ═══════════════════════════════════════════════════
   DETAIL VIEW — MISMO ESTILO QUE KITCHENMODE
   ═══════════════════════════════════════════════════ */
.lp-detail {
  padding-bottom: 32px;
  overflow: hidden;
}

/* ── Secciones ── */
.lp-section {
  padding: 20px 20px 0;
}
.lp-section-title {
  font-size: 15px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0 0 12px;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Book card (reemplaza el hero) */
.lp-book-card {
  padding-top: 20px;
}
.lp-book-card-inner {
  display: flex;
  gap: 20px;
  background: #f9fafb;
  border-radius: 20px;
  padding: 20px;
  border: 1.5px solid #f3f4f6;
}
.lp-book-cover-wrap {
  width: 100px; height: 150px;
  border-radius: 4px 10px 10px 4px; overflow: hidden;
  flex-shrink: 0;
  box-shadow: 4px 6px 16px rgba(0,0,0,.18);
}
.lp-book-cover-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lp-book-cover-ph {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: rgba(255,255,255,.9);
  text-align: center; padding: 8px; word-break: break-word;
  line-height: 1.3;
}
.lp-book-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.lp-book-title {
  font-size: 18px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0 0 6px;
  line-height: 1.3;
  letter-spacing: -0.02em;
}
.lp-book-author {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 4px;
}
.lp-book-pages {
  font-size: 12px;
  color: #9ca3af;
  margin: 0 0 12px;
  font-weight: 600;
}
.lp-book-status-pills { display: flex; gap: 5px; flex-wrap: wrap; }
.lp-book-pill {
  padding: 5px 12px; border-radius: 999px;
  font-size: 12px; font-weight: 700;
  border: 1.5px solid #e5e7eb;
  background: #fff; cursor: pointer;
  color: #6b7280; transition: all .15s;
}
.lp-book-pill:hover {
  border-color: #d1d5db;
  color: #374151;
}

/* Progress */
.lp-page-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.lp-page-num { font-size: 13px; font-weight: 700; color: #1a1a2e; min-width: 40px; }
.lp-slider { flex: 1; height: 6px; border-radius: 99px; }
.lp-prog-bar { height: 6px; background: #f3f4f6; border-radius: 99px; overflow: hidden; }
.lp-prog-fill { height: 100%; border-radius: 99px; transition: width .3s; }
.lp-prog-pct { font-size: 12px; color: #9ca3af; margin: 6px 0 0; font-weight: 500; }

/* Editar páginas */
.lp-edit-pages { margin-top: 10px; }
.lp-edit-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: #f9fafb; border: 1.5px dashed #e5e7eb;
  padding: 8px 14px; border-radius: 10px;
  font-size: 12px; font-weight: 600; color: #6b7280;
  cursor: pointer; transition: all .15s;
}
.lp-edit-btn:hover { background: #f3f4f6; border-color: #d1d5db; color: #374151; }
.lp-edit-field {
  display: flex; align-items: center; gap: 8px;
}
.lp-edit-field span { font-size: 12px; font-weight: 600; color: #6b7280; }
.lp-page-inp {
  width: 80px; padding: 8px 10px;
  border: 2px solid #e5e7eb; border-radius: 10px;
  font-size: 14px; font-weight: 700; color: #1a1a2e;
  text-align: center; background: #f9fafb;
}
.lp-page-inp:focus { outline: none; border-color: v-bind(color); background: #fff; box-shadow: 0 0 0 3px v-bind(color + '15'); }
.lp-edit-ok {
  padding: 8px 16px; border-radius: 10px; border: none;
  background: #1a1a2e; color: #fff;
  font-size: 12px; font-weight: 700; cursor: pointer;
  transition: opacity .2s;
}
.lp-edit-ok:hover { opacity: .85; }

/* Timer (IGUAL QUE KITCHENMODE) */
.lp-timer-box {
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
.lp-timer-box:hover {
  border-color: #e5e7eb;
}
.lp-timer-display {
  font-size: 32px;
  font-weight: 800;
  color: #1a1a2e;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  font-family: 'SF Mono', Monaco, monospace;
  transition: color 0.3s;
  line-height: 1;
}
.lp-timer-btns {
  display: flex;
  gap: 8px;
}
.lp-tbt {
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
.lp-tbt:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
.lp-tbt:active:not(:disabled) {
  transform: scale(0.95);
}
.lp-tbt:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  box-shadow: none;
}
.lp-tbt.play {
  color: #ffffff;
  background: v-bind(color);
}
.lp-tbt.pause {
  background: #ffffff;
  color: #374151;
  border: 2px solid #e5e7eb;
}
.lp-tbt.reset {
  background: #f3f4f6;
  color: #6b7280;
}

.lp-log-btn {
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
.lp-log-btn:hover {
  background: v-bind(color + '10');
  transform: translateY(-1px);
  box-shadow: 0 4px 12px v-bind(color + '20');
}

/* Rating */
.lp-stars { display: flex; gap: 4px; }
.lp-star { background: none; border: none; font-size: 32px; cursor: pointer; color: #e5e7eb; transition: color .15s, transform .1s; }
.lp-star.lit { transform: scale(1.1); }
.lp-star:hover { transform: scale(1.1); }

/* Note */
.lp-note { width: 100%; padding: 12px 14px; border: 2px solid #e5e7eb; border-radius: 14px; font-size: 13px; color: #1a1a2e; background: #f9fafb; font-family: inherit; resize: none; box-sizing: border-box; line-height: 1.6; transition: all 0.2s ease; }
.lp-note:focus { outline: none; border-color: v-bind(color); background: #ffffff; box-shadow: 0 0 0 3px v-bind(color + '15'); }

/* Botón modo lectora */
.lp-reader-btn {
  width: 100%; padding: 14px; border-radius: 12px; border: none;
  color: #fff; font-size: 14px; font-weight: 700;
  cursor: pointer; display: flex; align-items: center;
  justify-content: center; gap: 8px;
  transition: opacity .2s, transform .15s;
}
.lp-reader-btn:hover { opacity: .88; transform: scale(1.02); }

/* Actions */
.lp-actions { display: flex; gap: 8px; flex-wrap: wrap; padding-bottom: 24px; }
.lp-act {
  flex: 1; min-width: 100px; padding: 12px; border-radius: 12px;
  font-size: 13px; font-weight: 700; cursor: pointer;
  border: none; transition: all .2s;
}
.lp-act.save {
  color: #fff; position: relative; overflow: hidden;
}
.lp-act.save.saved {
  background: #10b981 !important;
}
.lp-act.done { background: #10b981; color: #fff; }
.lp-act.del  { background: #f3f4f6; color: #6b7280; }
.lp-act:hover { opacity: .85; transform: translateY(-1px); }

/* ═══════════════════════════════════════════════════
   MODO LECTORA OVERLAY
   ═══════════════════════════════════════════════════ */
.lp-reader-overlay {
  position: fixed; inset: 0; background: #1a1a2e;
  z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  overflow: hidden;
}
.lp-reader-close {
  position: absolute; top: 20px; right: 20px;
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(255,255,255,.1); border: none;
  color: #fff; font-size: 20px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .2s;
  flex-shrink: 0;
}
.lp-reader-close:hover { background: rgba(255,255,255,.2); }
.lp-reader-content {
  width: 100%; max-width: 400px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.lp-reader-book-info {
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 32px;
  text-align: left;
  width: 100%;
}
.lp-reader-cover {
  width: 60px; height: 85px; border-radius: 4px;
  object-fit: cover; box-shadow: 0 4px 12px rgba(0,0,0,.3);
  flex-shrink: 0;
}
.lp-reader-title { font-size: 18px; font-weight: 700; color: #fff; margin: 0 0 4px; }
.lp-reader-author { font-size: 14px; color: rgba(255,255,255,.6); margin: 0; }
.lp-reader-timer-section { margin-bottom: 24px; }
.lp-reader-timer {
  font-size: 64px; font-weight: 900; color: #fff;
  letter-spacing: .05em; font-variant-numeric: tabular-nums;
  display: block; margin-bottom: 8px;
  line-height: 1;
}
.lp-reader-timer-label { font-size: 14px; color: rgba(255,255,255,.5); margin: 0; }
.lp-reader-timer-btns { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }
.lp-rbt {
  padding: 12px 20px; border-radius: 12px; border: none;
  font-size: 14px; font-weight: 700; cursor: pointer;
  transition: opacity .2s, transform .15s;
}
.lp-rbt:hover:not(:disabled) { opacity: .85; transform: scale(1.04); }
.lp-rbt:disabled { opacity: .3; cursor: not-allowed; }
.lp-rbt.play { color: #fff; }
.lp-rbt.pause { background: rgba(255,255,255,.1); color: #fff; }
.lp-rbt.reset { background: rgba(255,255,255,.08); color: rgba(255,255,255,.6); }
.lp-reader-log-btn {
  width: 100%; padding: 14px; border-radius: 12px;
  border: 1.5px solid; background: transparent;
  font-size: 14px; font-weight: 700; cursor: pointer;
  transition: background .2s; margin-bottom: 24px;
}
.lp-reader-log-btn:hover { background: rgba(255,255,255,.05); }
.lp-reader-progress {
  width: 100%;
}
.lp-reader-prog-bar {
  height: 6px; background: rgba(255,255,255,.1);
  border-radius: 99px; overflow: hidden; margin-bottom: 10px;
}
.lp-reader-prog-fill { height: 100%; border-radius: 99px; transition: width .3s; }
.lp-reader-progress p { font-size: 13px; color: rgba(255,255,255,.5); margin: 0; }

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
  .all-books-view { padding: 12px; }
  .all-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .all-book-title { font-size: 10px; }
  .all-book-author { font-size: 9px; }
  .lp-book-card-inner {
    padding: 16px;
    gap: 14px;
  }
  .lp-book-cover-wrap {
    width: 80px; height: 120px;
  }
  .lp-book-title {
    font-size: 16px;
  }
  .lp-book-author {
    font-size: 13px;
  }
  .lp-timer-display {
    font-size: 28px;
  }
  .lp-section {
    padding: 16px 16px 0;
  }
  .lp-header {
    padding: 12px 16px;
  }
  .shelves-view {
    padding: 16px;
    gap: 24px;
  }
  .book-face { width: 65px; height: 95px; }
  .all-cover { margin-bottom: 5px; }
  .book-spine-3d { height: 95px; }
  .shelf-books-row { gap: 10px; padding: 12px 12px 0; min-height: 120px; }

  /* Modo lectora mobile */
  .lp-reader-overlay {
    padding: 16px;
  }
  .lp-reader-close {
    width: 40px; height: 40px; font-size: 18px;
    top: 16px; right: 16px;
  }
  .lp-reader-timer {
    font-size: 52px;
  }
  .lp-rbt {
    padding: 10px 16px; font-size: 13px;
  }
}

@media (min-width: 769px) {
  .lp-header {
    padding-left: 28px;
  }
  .lp-btn-close {
    margin-left: 8px;
  }
  .all-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 20px;
  }
  .shelves-view { padding: 28px 32px; }
  .all-books-view { padding: 28px 32px; }
  .lp-section {
    padding: 24px 32px 0;
  }
  .lp-book-card-inner {
    padding: 24px;
    gap: 24px;
  }
  .lp-book-cover-wrap {
    width: 120px; height: 175px;
  }
  .lp-book-title {
    font-size: 22px;
  }
  .lp-book-author {
    font-size: 15px;
  }
  .book-face { width: 90px; height: 130px; }
  .book-spine-3d { height: 130px; }
}
</style>