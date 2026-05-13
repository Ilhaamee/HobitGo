<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '../../../lib/supabase'

const props = defineProps({
  hobby: { type: Object, required: true },
  color: { type: String, default: '#1d4ed8' },
})
const emit = defineEmits(['close', 'add-session'])

const books         = ref([])
const searchQuery   = ref('')
const searchResults = ref([])
const searching     = ref(false)
const showSearch    = ref(false)
const selectedBook  = ref(null)
const loading       = ref(false)
const activeView    = ref('shelves') // shelves | all

const timerActive  = ref(false)
const timerSeconds = ref(0)
let timerInterval  = null

const SPINES = ['#1d4ed8','#7c3aed','#dc2626','#15803d','#b45309','#0891b2','#be185d','#374151','#0f766e','#92400e','#d97706','#4c1d95']
const randomSpine = () => SPINES[Math.floor(Math.random() * SPINES.length)]

const shelves = [
  { key: 'reading',  label: 'Leyendo' },
  { key: 'wishlist', label: 'Por leer' },
  { key: 'read',     label: 'Terminados' },
]

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

let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  if (!searchQuery.value.trim()) { searchResults.value = []; return }
  searchTimer = setTimeout(fetchBooks, 500)
}

async function fetchBooks() {
  searching.value = true
  try {
    const res  = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery.value)}&maxResults=12`)
    const data = await res.json()
    searchResults.value = (data.items || []).map(item => ({
      google_book_id: item.id,
      title:       item.volumeInfo.title || 'Sin título',
      author:      (item.volumeInfo.authors || ['Autor desconocido']).join(', '),
      cover_url:   item.volumeInfo.imageLinks?.thumbnail?.replace('http:','https:') || null,
      total_pages: item.volumeInfo.pageCount || 0,
      year:        item.volumeInfo.publishedDate?.slice(0,4) || '',
    }))
  } catch { searchResults.value = [] }
  searching.value = false
}

function addBook(apiBook, status = 'wishlist') {
  if (books.value.find(b => b.google_book_id === apiBook.google_book_id)) return
  saveBook({ ...apiBook, status, spine_color: randomSpine(), rating: 0, note: '', current_page: 0 })
  showSearch.value = false; searchQuery.value = ''; searchResults.value = []
}

function openBook(book) { selectedBook.value = { ...book }; stopTimer() }
function closeBook() { selectedBook.value = null; stopTimer() }

async function updateBook() {
  if (!selectedBook.value) return
  await saveBook(selectedBook.value)
  const idx = books.value.findIndex(b => b.id === selectedBook.value.id)
  if (idx !== -1) books.value[idx] = { ...selectedBook.value }
}

async function markFinished() {
  selectedBook.value.status = 'read'
  selectedBook.value.current_page = selectedBook.value.total_pages
  await updateBook()
  const mins = Math.max(1, Math.round(timerSeconds.value / 60))
  emit('add-session', { hobbyId: props.hobby.id, minutes: mins, note: `Terminé "${selectedBook.value.title}"` })
  stopTimer()
}

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

function booksForShelf(key) {
  return books.value.filter(b => b.status === key)
}

onUnmounted(() => clearInterval(timerInterval))
loadBooks()
</script>

<template>
<div class="library-page">

  <!-- ══ HEADER ═══════════════════════════════════════ -->
  <div class="lp-header">
    <div class="lp-header-left">
      <!-- Tabs -->
      <div class="lp-tabs">
        <button class="lp-btn-close" @click="emit('close')">
        <svg viewBox="0 0 16 16" fill="none" width="16">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
        <button class="lp-tab" :class="{ active: activeView === 'shelves' }" @click="activeView = 'shelves'">Estantes</button>
        <button class="lp-tab" :class="{ active: activeView === 'all' }" @click="activeView = 'all'">Todos los libros</button>
      </div>
    </div>
    <div class="lp-header-right">
      <button class="lp-btn-add" :style="{ background: color }" @click="showSearch = !showSearch">
        <svg viewBox="0 0 14 14" fill="none" width="12"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        Añadir libro
      </button>
    </div>
  </div>

  <!-- ══ SEARCH DROPDOWN ══════════════════════════════ -->
  <Transition name="sd">
  <div v-if="showSearch" class="search-drop">
    <div class="sd-inp-wrap">
      <svg viewBox="0 0 20 20" fill="none" width="14" class="sd-ico">
        <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.7"/>
        <path d="M15 15l3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>
      <input v-model="searchQuery" @input="onSearchInput" class="sd-inp" placeholder="Título, autor o ISBN..." autofocus />
      <button class="sd-close" @click="showSearch=false; searchQuery=''; searchResults=[]">✕</button>
    </div>
    <div v-if="searchResults.length" class="sd-results">
      <div v-for="r in searchResults" :key="r.google_book_id" class="sd-row">
        <div class="sd-cover">
          <img v-if="r.cover_url" :src="r.cover_url" :alt="r.title" />
          <div v-else class="sd-cover-ph" :style="{ background: randomSpine() }"></div>
        </div>
        <div class="sd-info">
          <span class="sd-title">{{ r.title }}</span>
          <span class="sd-author">{{ r.author }}{{ r.year ? ' · ' + r.year : '' }}</span>
          <span v-if="r.total_pages" class="sd-pages">{{ r.total_pages }} páginas</span>
        </div>
        <div class="sd-actions">
          <button class="sd-btn" :style="{ background: color, color: '#fff' }" @click="addBook(r,'reading')">Leyendo</button>
          <button class="sd-btn outline" @click="addBook(r,'wishlist')">Por leer</button>
        </div>
      </div>
    </div>
    <p v-else-if="searchQuery && !searching" class="sd-empty">No se encontraron resultados.</p>
  </div>
  </Transition>

  <!-- ══ SHELVES VIEW ══════════════════════════════════ -->
  <div v-if="activeView === 'shelves'" class="shelves-view">
    <div v-if="loading" class="lp-loading">Cargando tu biblioteca...</div>
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
                  <!-- Progress bar on side -->
                  <div v-if="book.status === 'reading' && book.total_pages > 0" class="book-progress-side">
                    <div class="bps-fill" :style="{ height: (book.current_page/book.total_pages*100)+'%', background: color }"></div>
                  </div>
                  <!-- Done badge -->
                  <div v-if="book.status === 'read'" class="book-done-badge">✓</div>
                </div>
                <div class="book-spine-3d" :style="{ background: book.spine_color || '#1d4ed8' }"></div>
              </div>
            </button>
          </div>
          <!-- Shelf plank -->
          <div class="shelf-plank"></div>
        </div>
      </div>
    </template>
  </div>

  <!-- ══ ALL BOOKS VIEW ════════════════════════════════ -->
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

  <!-- ══ BOOK DETAIL PANEL ═════════════════════════════ -->
  <Transition name="panel-up">
  <div v-if="selectedBook" class="book-detail-overlay" @click.self="closeBook">
    <div class="book-detail">

      <div class="bd-handle"></div>
      <button class="bd-close" @click="closeBook">✕</button>

      <!-- Top: cover + info -->
      <div class="bd-top">
        <div class="bd-cover-wrap">
          <img v-if="selectedBook.cover_url" :src="selectedBook.cover_url" class="bd-cover-img" />
          <div v-else class="bd-cover-ph" :style="{ background: selectedBook.spine_color }">
            <span>{{ selectedBook.title }}</span>
          </div>
        </div>
        <div class="bd-info">
          <h3 class="bd-title">{{ selectedBook.title }}</h3>
          <p class="bd-author">{{ selectedBook.author }}</p>
          <p class="bd-pages" v-if="selectedBook.total_pages">{{ selectedBook.total_pages }} páginas</p>
          <div class="bd-status-pills">
            <button v-for="s in shelves" :key="s.key"
              class="bd-pill" :class="{ active: selectedBook.status === s.key }"
              :style="selectedBook.status === s.key ? { background: color, color:'#fff', borderColor: color } : {}"
              @click="selectedBook.status = s.key">
              {{ s.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Progress -->
      <div v-if="selectedBook.total_pages > 0 && selectedBook.status === 'reading'" class="bd-section">
        <label class="bd-label">Progreso de lectura</label>
        <div class="bd-page-row">
          <span class="bd-page-num">Pág. {{ selectedBook.current_page }}</span>
          <input type="range" v-model.number="selectedBook.current_page"
            :min="0" :max="selectedBook.total_pages" class="bd-slider"
            :style="{ accentColor: color }" />
          <span class="bd-page-num">{{ selectedBook.total_pages }}</span>
        </div>
        <div class="bd-prog-bar">
          <div class="bd-prog-fill" :style="{ width: readingProgress+'%', background: color }"></div>
        </div>
        <p class="bd-prog-pct">{{ readingProgress }}% leído</p>
      </div>

      <!-- Timer -->
      <div class="bd-section bd-timer-section">
        <label class="bd-label">Temporizador</label>
        <div class="bd-timer-row">
          <span class="bd-timer-display" :style="timerActive ? { color } : {}">{{ timerDisplay }}</span>
          <div class="bd-timer-btns">
            <button class="tbt play" :style="{ background: color }" @click="startTimer" :disabled="timerActive">▶</button>
            <button class="tbt pause" @click="stopTimer" :disabled="!timerActive">⏸</button>
            <button class="tbt reset" @click="resetTimer">↺</button>
          </div>
        </div>
        <button v-if="timerSeconds > 0" class="bd-log-btn"
          :style="{ borderColor: color, color }" @click="logSession">
          Registrar  {{ Math.max(1,Math.round(timerSeconds/60)) }} min de lectura
        </button>
      </div>

      <!-- Rating -->
      <div class="bd-section">
        <label class="bd-label">Mi valoración</label>
        <div class="bd-stars">
          <button v-for="n in 5" :key="n" class="bd-star"
            :class="{ lit: n <= selectedBook.rating }"
            :style="n <= selectedBook.rating ? { color } : {}"
            @click="selectedBook.rating = n">★</button>
        </div>
      </div>

      <!-- Note -->
      <div class="bd-section">
        <label class="bd-label">Mis notas</label>
        <textarea v-model="selectedBook.note" class="bd-note"
          placeholder="¿Qué te ha parecido? ¿Qué aprendiste?..." rows="3"></textarea>
      </div>

      <!-- Actions -->
      <div class="bd-actions">
        <button class="bd-act save" :style="{ background: color }" @click="updateBook">Guardar</button>
        <button v-if="selectedBook.status !== 'read'" class="bd-act done" @click="markFinished">✓ Terminado</button>
        <button class="bd-act del" @click="removeBook(selectedBook.id)">Eliminar</button>
      </div>

    </div>
  </div>
  </Transition>

</div>
</template>

<style scoped>
/* ── Page ── */
.library-page {
  background: #f5f0e8;
  min-height: 100vh;
  padding: 0;
  padding-bottom: 80px;
  margin: 0;
  position: relative;
  font-family: inherit;
}

/* ── Header ── */
.lp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  background: #f5f0e8;
  border-bottom: 1px solid rgba(34,40,78,.08);
  position: sticky; top: 0; z-index: 10;
}
.lp-header-left { display: flex; align-items: center; gap: 16px; }
.lp-header-right { display: flex; align-items: center; gap: 10px; }

.lp-tabs { display: flex; background: rgba(34,40,78,.07); border-radius: 10px; padding: 3px; gap: 2px;}
.lp-tab {
  padding: 7px 16px; border: none; background: transparent; border-radius: 8px;
  font-size: 13px; font-weight: 600; color: rgba(34,40,78,.5); cursor: pointer;
  transition: all .18s;
}
.lp-tab.active { background: #fff; color: #22284E; box-shadow: 0 2px 6px rgba(34,40,78,.1); }

.lp-btn-add {
  display: flex; align-items: center; gap: 6px;
  color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 700;
  padding: 9px 16px; cursor: pointer; transition: opacity .2s; height: 36px;
}
.lp-btn-add:hover { opacity: .88; }
.lp-btn-close {
  width: 36px; height: 36px; border-radius: 8px;
  background: rgba(34,40,78,.08); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(34,40,78,.6);
  flex-shrink: 0; padding: 0;
}
.lp-btn-close:hover { background: rgba(34,40,78,.14); }

/* ── Search dropdown ── */
.search-drop {
  position: sticky; top: 0; left: 0; right: 0;
  border-radius: 0; margin: 0;
  border-left: none; border-right: none; border-top: none;
  box-shadow: 0 4px 16px rgba(34,40,78,.1);
}
.sd-inp-wrap { position: relative; margin-bottom: 12px; }
.sd-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: rgba(34,40,78,.35); }
.sd-inp {
  width: 100%; padding: 10px 36px; border: 1.5px solid rgba(34,40,78,.1); border-radius: 10px;
  font-size: 14px; color: #22284E; font-family: inherit; box-sizing: border-box; background: #fafafa;
}
.sd-inp:focus { outline: none; border-color: #22284E; background: #fff; }
.sd-close {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; color: rgba(34,40,78,.4); font-size: 16px;
}
.sd-results { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
.sd-row { display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 10px; transition: background .15s; }
.sd-row:hover { background: #fafafa; }
.sd-cover { width: 42px; height: 60px; border-radius: 4px; overflow: hidden; flex-shrink: 0; }
.sd-cover img { width: 100%; height: 100%; object-fit: cover; }
.sd-cover-ph { width: 100%; height: 100%; }
.sd-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.sd-title { font-size: 14px; font-weight: 700; color: #22284E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sd-author { font-size: 12px; color: rgba(34,40,78,.5); }
.sd-pages { font-size: 11px; color: rgba(34,40,78,.35); }
.sd-actions { display: flex; gap: 6px; flex-shrink: 0; }
.sd-btn {
  padding: 6px 12px; border-radius: 8px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity .2s;
}
.sd-btn.outline { background: rgba(34,40,78,.07); color: #22284E; }
.sd-btn:hover { opacity: .8; }
.sd-empty { text-align: center; font-size: 13px; color: rgba(34,40,78,.4); padding: 16px 0; margin: 0; }

/* ── Shelves view ── */
.shelves-view { padding: 16px 28px 40px; display: flex; flex-direction: column; gap: 40px; }
.lp-loading { text-align: center; padding: 60px; color: rgba(34,40,78,.4); font-size: 14px; }
.lp-empty { text-align: center; padding: 60px; color: rgba(34,40,78,.4); font-size: 14px; }

.shelf-block { }
.shelf-block-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.shelf-block-title { font-size: 18px; font-weight: 700; color: #22284E; margin: 0; letter-spacing: -.3px; }
.full-shelf-btn { background: none; border: none; font-size: 13px; font-weight: 600; color: rgba(34,40,78,.4); cursor: pointer; transition: color .2s; }
.full-shelf-btn:hover { color: #22284E; }

.shelf-empty-inline {
  padding: 24px; text-align: center;
  background: rgba(255,255,255,.5); border-radius: 12px;
  font-size: 13px; color: rgba(34,40,78,.35);
  border: 1.5px dashed rgba(34,40,78,.12);
}

.shelf-container { }
.shelf-books-row {
  display: flex; gap: 16px; align-items: flex-end;
  padding: 20px 20px 0; min-height: 180px;
  background: rgba(255,255,255,.4);
  border-radius: 8px 8px 0 0;
  overflow-x: auto; scrollbar-width: thin;
}

/* 3D book */
.book-item { background: none; border: none; padding: 0; cursor: pointer; flex-shrink: 0; transition: transform .2s; }
.book-item:hover { transform: translateY(-10px); }
.book-item:hover .book-spine-3d { width: 14px; }

.book-3d { display: flex; align-items: flex-end; filter: drop-shadow(3px 6px 12px rgba(0,0,0,.22)); }
.book-face {
  position: relative; width: 90px; height: 130px;
  border-radius: 2px 4px 4px 2px; overflow: hidden;
}
.book-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.book-no-cover {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  padding: 8px;
}
.book-no-cover span { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.9); text-align: center; word-break: break-word; line-height: 1.3; }

.book-progress-side {
  position: absolute; right: 0; top: 0; bottom: 0; width: 5px;
  background: rgba(0,0,0,.12);
}
.bps-fill { position: absolute; bottom: 0; width: 100%; border-radius: 3px 3px 0 0; transition: height .4s ease; }

.book-done-badge {
  position: absolute; top: 5px; right: 5px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #22c55e; color: #fff; font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #fff;
}

.book-spine-3d {
  width: 10px; height: 130px; border-radius: 0 2px 2px 0;
  transition: width .2s;
  filter: brightness(.7);
}

/* Shelf plank */
.shelf-plank {
  height: 16px;
  background: linear-gradient(to bottom, #d4a96a, #c49459);
  border-radius: 0 0 4px 4px;
  box-shadow: 0 4px 10px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.2);
}

/* ── All books grid ── */
.all-books-view { padding: 24px 28px 40px; }
.all-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 20px; }
.all-book-item { background: none; border: none; padding: 0; cursor: pointer; text-align: left; transition: transform .18s; }
.all-book-item:hover { transform: translateY(-4px); }
.all-cover { width: 100%; aspect-ratio: 2/3; border-radius: 4px 8px 8px 4px; overflow: hidden; box-shadow: 3px 4px 12px rgba(0,0,0,.2); margin-bottom: 8px; }
.all-cover img { width: 100%; height: 100%; object-fit: cover; }
.all-cover-ph { width: 100%; height: 100%; }
.all-book-title { font-size: 11px; font-weight: 700; color: #22284E; margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.all-book-author { font-size: 10px; color: rgba(34,40,78,.45); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.all-status-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 4px; }
.all-status-dot.reading  { background: #3b82f6; }
.all-status-dot.wishlist { background: #f59e0b; }
.all-status-dot.read     { background: #22c55e; }

/* ── Book detail panel ── */
.book-detail-overlay {
  position: fixed; inset: 0; background: rgba(34,40,78,.45);
  backdrop-filter: blur(6px); z-index: 100;
  display: flex; align-items: flex-end; justify-content: center;
}
.book-detail {
  background: #fff; border-radius: 24px 24px 0 0;
  width: 100%; max-width: 560px; max-height: 90vh;
  overflow-y: auto; padding: 20px 24px 80px;
  position: relative; box-shadow: 0 -12px 48px rgba(34,40,78,.2);
}
.bd-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(34,40,78,.12); margin: 0 auto 16px; }
.bd-close {
  position: absolute; top: 14px; right: 16px;
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(34,40,78,.06); border: none;
  cursor: pointer; color: rgba(34,40,78,.5); font-size: 13px;
  display: flex; align-items: center; justify-content: center; transition: background .2s;
}
.bd-close:hover { background: rgba(34,40,78,.12); }

.bd-top { display: flex; gap: 16px; margin-bottom: 20px; }
.bd-cover-wrap { width: 90px; height: 130px; border-radius: 3px 8px 8px 3px; overflow: hidden; flex-shrink: 0; box-shadow: 3px 4px 12px rgba(0,0,0,.2); border-left: 5px solid rgba(0,0,0,.1); }
.bd-cover-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bd-cover-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: rgba(255,255,255,.9); text-align: center; padding: 6px; word-break: break-word; }
.bd-info { flex: 1; min-width: 0; }
.bd-title  { font-size: 16px; font-weight: 800; color: #22284E; margin: 0 0 4px; line-height: 1.3; }
.bd-author { font-size: 13px; color: rgba(34,40,78,.5); margin: 0 0 2px; }
.bd-pages  { font-size: 11px; color: rgba(34,40,78,.35); margin: 0 0 10px; }
.bd-status-pills { display: flex; gap: 5px; flex-wrap: wrap; }
.bd-pill { padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; border: 1.5px solid rgba(34,40,78,.12); background: transparent; cursor: pointer; color: rgba(34,40,78,.5); transition: all .15s; }

.bd-section { margin-bottom: 18px; }
.bd-label { display: block; font-size: 10px; font-weight: 700; color: rgba(34,40,78,.4); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 8px; }

.bd-page-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.bd-page-num { font-size: 12px; font-weight: 700; color: #22284E; min-width: 40px; }
.bd-slider { flex: 1; }
.bd-prog-bar { height: 5px; background: rgba(34,40,78,.08); border-radius: 99px; overflow: hidden; }
.bd-prog-fill { height: 100%; border-radius: 99px; transition: width .3s; }
.bd-prog-pct { font-size: 11px; color: rgba(34,40,78,.4); margin-top: 4px; }

.bd-timer-section { background: rgba(34,40,78,.025); border-radius: 14px; padding: 14px; border: 1px solid rgba(34,40,78,.06); }
.bd-timer-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.bd-timer-display { font-size: 36px; font-weight: 900; color: #22284E; letter-spacing: .05em; font-variant-numeric: tabular-nums; transition: color .3s; }
.bd-timer-btns { display: flex; gap: 8px; }
.tbt { width: 38px; height: 38px; border-radius: 10px; border: none; cursor: pointer; font-size: 15px; transition: opacity .2s, transform .15s; }
.tbt:hover:not(:disabled) { opacity: .85; transform: scale(1.06); }
.tbt:disabled { opacity: .3; cursor: not-allowed; }
.tbt.play { color: #fff; }
.tbt.pause { background: rgba(34,40,78,.08); color: #22284E; }
.tbt.reset { background: rgba(34,40,78,.06); color: rgba(34,40,78,.5); }
.bd-log-btn { width: 100%; padding: 10px; border-radius: 10px; border: 1.5px solid; background: transparent; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .2s; }
.bd-log-btn:hover { background: rgba(34,40,78,.04); }

.bd-stars { display: flex; gap: 4px; }
.bd-star { background: none; border: none; font-size: 30px; cursor: pointer; color: rgba(34,40,78,.12); transition: color .15s, transform .1s; }
.bd-star:hover, .bd-star.lit { transform: scale(1.1); }

.bd-note { width: 100%; padding: 10px 12px; border: 1.5px solid rgba(34,40,78,.1); border-radius: 10px; font-size: 13px; color: #22284E; background: #fafafa; font-family: inherit; resize: none; box-sizing: border-box; line-height: 1.6; }
.bd-note:focus { outline: none; border-color: #22284E; background: #fff; }

.bd-actions { display: flex; gap: 8px; }
.bd-act { flex: 1; padding: 12px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: opacity .2s; }
.bd-act.save { color: #fff; }
.bd-act.done { background: #22c55e; color: #fff; }
.bd-act.del  { background: rgba(34,40,78,.06); color: rgba(34,40,78,.5); }
.bd-act:hover { opacity: .85; }

/* Transitions */
.sd-enter-active, .sd-leave-active { transition: all .22s ease; }
.sd-enter-from, .sd-leave-to { opacity: 0; transform: translateY(-8px); }
.panel-up-enter-active, .panel-up-leave-active { transition: opacity .25s; }
.panel-up-enter-from, .panel-up-leave-to { opacity: 0; }

@media (min-width: 600px) {
  .book-detail-overlay { align-items: center; padding: 20px; }
  .book-detail { border-radius: 24px; max-height: 95vh; padding-bottom: 100px; }
}

@media (max-width: 600px) {
  .book-face { width: 65px; height: 95px; }
  .book-spine-3d { height: 95px; }
  .shelf-books-row { gap: 10px; padding: 14px 14px 0; min-height: 120px; }
  .shelves-view { padding: 16px 16px 40px; gap: 28px; }
  .lp-header { padding: 14px 16px 12px; }
  .search-drop { left: 0; right: 0; border-radius: 0; }
}

@media (max-width: 600px) {
  .lp-tab { padding: 6px 10px; font-size: 11px; }
  .lp-btn-add { padding: 8px 10px; font-size: 12px; }
  .lp-tabs { flex-shrink: 0; }
  .lp-header { flex-wrap: nowrap; gap: 8px; }
  .lp-header-left { flex: 1; min-width: 0; }
  .lp-header-right { flex-shrink: 0; }
}

@media (min-width: 600px) {
  .lp-tabs { margin-left: 12px; }
}

@media (min-width: 600px) {
  .search-drop {
    max-width: 520px;
    margin: 0 auto;
    border-radius: 0 0 16px 16px;
    border-left: 1px solid rgba(34,40,78,.08);
    border-right: 1px solid rgba(34,40,78,.08);
    border-bottom: 1px solid rgba(34,40,78,.08);
    left: 50%;
    transform: translateX(-50%);
  }
}
</style>