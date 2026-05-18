<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../../lib/supabase'

const props = defineProps({
  hobby: { type: Object, required: true },
  color: { type: String, default: '#8b5cf6' },
})
const emit = defineEmits(['close', 'add-session'])

// ── Estado ───────────────────────────────────────────
const items = ref([])
const loading = ref(false)
const uploading = ref(false)
const saving = ref(false)
const activeView = ref('gallery')
const showSearch = ref(false)
const searchQuery = ref('')
const selectedItem = ref(null)
const lightboxOpen = ref(false)
const editingItem = ref(null)
const justSaved = ref(false)

// Formulario nuevo
const formTitle = ref('')
const formDesc = ref('')
const formMedium = ref('')
const formTags = ref('')
const formFrame = ref('classic')
const fileInput = ref(null)
const previewUrl = ref(null)

// Formulario edición
const editTitle = ref('')
const editDesc = ref('')
const editMedium = ref('')
const editTags = ref('')
const editFrame = ref('classic')

// Mediums según hobby
const MEDIUMS = {
  drawing: ['Lápiz', 'Carboncillo', 'Tinta', 'Rotulador', 'Pastel', 'Digital'],
  painting: ['Óleo', 'Acrílico', 'Acuarela', 'Gouache', 'Spray', 'Digital'],
  photography: ['Retrato', 'Paisaje', 'Urbano', 'Macro', 'Nocturna', 'B/N', 'Street'],
}

const mediums = computed(() => MEDIUMS[props.hobby.hobby_id] || ['Otro'])

// Marcos disponibles
const FRAMES = [
  { key: 'classic',    label: 'Clásico dorado',  class: 'frame-classic' },
  { key: 'vintage',    label: 'Vintage madera',  class: 'frame-vintage' },
  { key: 'modern',     label: 'Moderno negro',   class: 'frame-modern' },
  { key: 'ornate',     label: 'Ornamentado',     class: 'frame-ornate' },
  { key: 'minimal',    label: 'Minimal blanco',  class: 'frame-minimal' },
  { key: 'polaroid',   label: 'Polaroid',        class: 'frame-polaroid' },
  { key: 'rounded',    label: 'Redondeado',      class: 'frame-rounded' },
  { key: 'shadow',     label: 'Sombra flotante', class: 'frame-shadow' },
]

// ── Computed ─────────────────────────────────────────
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return items.value
  const q = searchQuery.value.toLowerCase()
  return items.value.filter(i => 
    i.title?.toLowerCase().includes(q) ||
    i.description?.toLowerCase().includes(q) ||
    i.medium?.toLowerCase().includes(q) ||
    i.tags?.some(t => t.toLowerCase().includes(q))
  )
})

// ── API ──────────────────────────────────────────────
async function loadItems() {
  loading.value = true
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { loading.value = false; return }
  const { data } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('hobby_id', props.hobby.id)
    .order('created_at', { ascending: false })
  if (data) items.value = data
  loading.value = false
}

async function uploadImage() {
  if (!fileInput.value?.files?.[0]) return

  const file = fileInput.value.files[0]
  const ext = file.name.split('.').pop()
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  uploading.value = true
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('gallery-images')
    .upload(path, file)

  if (uploadError) {
    uploading.value = false
    console.error('Upload error:', uploadError)
    alert('Error al subir: ' + uploadError.message)
    return
  }

  const { data: { publicUrl } } = supabase.storage
    .from('gallery-images')
    .getPublicUrl(uploadData.path)

  const { data: { user } } = await supabase.auth.getUser()
  const tags = formTags.value.split(',').map(t => t.trim()).filter(Boolean)

  const { data } = await supabase.from('gallery_items').insert({
    user_id: user.id,
    hobby_id: props.hobby.id,
    title: formTitle.value || 'Sin título',
    description: formDesc.value,
    image_url: publicUrl,
    medium: formMedium.value,
    tags: tags.length ? tags : null,
    frame_style: formFrame.value,
  }).select()

  if (data?.[0]) {
    items.value.unshift(data[0])
    resetForm()
    activeView.value = 'gallery'
  }
  uploading.value = false
}

async function saveEdit() {
  if (!editingItem.value) return

  saving.value = true

  const tags = editTags.value.split(',').map(t => t.trim()).filter(Boolean)

  const { data } = await supabase.from('gallery_items')
    .update({
      title: editTitle.value,
      description: editDesc.value,
      medium: editMedium.value,
      tags: tags.length ? tags : null,
      frame_style: editFrame.value,
    })
    .eq('id', editingItem.value.id)
    .select()

  if (data?.[0]) {
    const idx = items.value.findIndex(i => i.id === editingItem.value.id)
    if (idx !== -1) items.value[idx] = data[0]

    if (selectedItem.value?.id === editingItem.value.id) {
      selectedItem.value = { ...data[0] }
    }

    justSaved.value = true
    setTimeout(() => justSaved.value = false, 2000)
    editingItem.value = null
  }
  saving.value = false
}

async function deleteItem(id) {
  await supabase.from('gallery_items').delete().eq('id', id)
  items.value = items.value.filter(i => i.id !== id)
  closeLightbox()
}

function resetForm() {
  formTitle.value = ''
  formDesc.value = ''
  formMedium.value = ''
  formTags.value = ''
  formFrame.value = 'classic'
  previewUrl.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function startEdit(item) {
  editingItem.value = item
  editTitle.value = item.title || ''
  editDesc.value = item.description || ''
  editMedium.value = item.medium || ''
  editTags.value = item.tags?.join(', ') || ''
  editFrame.value = item.frame_style || 'classic'
  closeLightbox()
}

function cancelEdit() {
  editingItem.value = null
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (file) previewUrl.value = URL.createObjectURL(file)
}

function openLightbox(item) {
  selectedItem.value = item
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
  selectedItem.value = null
}

function getFrameClass(frame) {
  const f = FRAMES.find(f => f.key === (frame || 'classic'))
  return f ? f.class : 'frame-classic'
}

onMounted(loadItems)
</script>

<template>
<div class="gallery-page">

  <!-- ══ HEADER ═══════════════════════════════════════ -->
  <div class="gp-header">
    <div class="gp-header-left">
      <button class="gp-btn-close" @click="lightboxOpen ? closeLightbox() : editingItem ? cancelEdit() : activeView === 'add' ? activeView = 'gallery' : emit('close')">
        <svg viewBox="0 0 16 16" fill="none" width="16">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="gp-tabs">
        <button class="gp-tab" :class="{ active: activeView === 'gallery' && !lightboxOpen && !editingItem }" @click="activeView = 'gallery'; closeLightbox(); editingItem = null">
          Galería {{ items.length > 0 ? `(${items.length})` : '' }}
        </button>
        <button class="gp-tab" :class="{ active: activeView === 'add' }" @click="activeView = 'add'; closeLightbox(); editingItem = null">
          Añadir
        </button>
      </div>
    </div>
    <div class="gp-header-right">
      <button class="gp-btn-search" @click="showSearch = !showSearch">
        <svg viewBox="0 0 20 20" fill="none" width="16">
          <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.8"/>
          <path d="M15 15l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- ══ SEARCH BAR ════════════════════════════════════ -->
  <Transition name="sd">
    <div v-if="showSearch" class="gp-search-wrap">
      <div class="gp-search-inner">
        <svg viewBox="0 0 20 20" fill="none" width="14" class="gp-search-ico">
          <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.7"/>
          <path d="M15 15l3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
        <input v-model="searchQuery" class="gp-search-inp" placeholder="Buscar obra..." autofocus />
        <button class="gp-search-close" @click="showSearch=false; searchQuery=''">✕</button>
      </div>
    </div>
  </Transition>

  <!-- ══ GALLERY VIEW ══════════════════════════════════ -->
  <div v-if="activeView === 'gallery' && !lightboxOpen && !editingItem" class="gp-gallery">
    <div v-if="loading" class="gp-loading">
      <div class="gp-spinner" :style="{ borderTopColor: color }"></div>
      <span>Cargando galería...</span>
    </div>
    <div v-else-if="filteredItems.length === 0" class="gp-empty">
      <p>{{ searchQuery ? 'No se encontraron resultados' : 'Tu galería está vacía. ¡Añade tu primera obra!' }}</p>
    </div>
    <div v-else class="gp-wall">
      <div class="gp-wall-bg"></div>
      <div class="gp-masonry">
        <button
          v-for="item in filteredItems" :key="item.id"
          class="gp-masonry-item"
          :class="getFrameClass(item.frame_style)"
          @click="openLightbox(item)"
        >
          <div class="gp-frame-box">
            <img :src="item.image_url" :alt="item.title" loading="lazy" />
          </div>
          <div class="gp-frame-label" v-if="item.title">
            <span>{{ item.title }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>

  <!-- ══ ADD VIEW ══════════════════════════════════════ -->
  <div v-if="activeView === 'add'" class="gp-add">
    <div class="gp-add-card">
      <h3 class="gp-add-title">Nueva obra para la galería</h3>

      <div class="gp-upload-zone" @click="fileInput?.click()" :class="{ hasPreview: previewUrl }">
        <input ref="fileInput" type="file" accept="image/*" @change="onFileChange" hidden />
        <img v-if="previewUrl" :src="previewUrl" class="gp-preview" />
        <template v-else>
          <svg viewBox="0 0 24 24" fill="none" width="40" class="gp-upload-icon">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Toca para subir imagen</span>
        </template>
      </div>

      <!-- Frame Picker -->
      <div class="gp-picker-section">
        <label class="gp-picker-label">🖼️ Marco</label>
        <div class="gp-frame-options">
          <button
            v-for="frame in FRAMES" :key="frame.key"
            class="gp-frame-option"
            :class="{ active: formFrame === frame.key, [frame.class]: true }"
            @click="formFrame = frame.key"
          >
            <div class="gp-frame-preview">
              <div class="gp-frame-preview-inner"></div>
            </div>
            <span>{{ frame.label }}</span>
          </button>
        </div>
      </div>

      <div class="gp-form">
        <div class="gp-field">
          <label>Título</label>
          <input v-model="formTitle" placeholder="Nombre de la obra" />
        </div>
        <div class="gp-field">
          <label>Técnica / Medium</label>
          <select v-model="formMedium">
            <option value="">Selecciona...</option>
            <option v-for="m in mediums" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="gp-field">
          <label>Descripción</label>
          <textarea v-model="formDesc" placeholder="¿Qué inspiró esta obra?..." rows="3"></textarea>
        </div>
        <div class="gp-field">
          <label>Tags (separados por coma)</label>
          <input v-model="formTags" placeholder="retrato, naturaleza, boceto..." />
        </div>
      </div>

      <button class="gp-submit-btn" :style="{ background: color }" @click="uploadImage" :disabled="!previewUrl || uploading">
        <div v-if="uploading" class="gp-spinner-small"></div>
        <span v-else>Colgar en la galería</span>
      </button>
    </div>
  </div>

  <!-- ══ EDIT VIEW ═════════════════════════════════════ -->
  <div v-if="editingItem" class="gp-edit">
    <div class="gp-edit-card">
      <h3 class="gp-edit-title">Editar obra</h3>

      <div class="gp-edit-preview" :class="getFrameClass(editingItem.frame_style)">
        <div class="gp-frame-box">
          <img :src="editingItem.image_url" :alt="editingItem.title" />
        </div>
      </div>

      <!-- Frame Picker Edit -->
      <div class="gp-picker-section">
        <label class="gp-picker-label">🖼️ Marco</label>
        <div class="gp-frame-options">
          <button
            v-for="frame in FRAMES" :key="frame.key"
            class="gp-frame-option"
            :class="{ active: editFrame === frame.key, [frame.class]: true }"
            @click="editFrame = frame.key"
          >
            <div class="gp-frame-preview">
              <div class="gp-frame-preview-inner"></div>
            </div>
            <span>{{ frame.label }}</span>
          </button>
        </div>
      </div>

      <div class="gp-form">
        <div class="gp-field">
          <label>Título</label>
          <input v-model="editTitle" placeholder="Nombre de la obra" />
        </div>
        <div class="gp-field">
          <label>Técnica / Medium</label>
          <select v-model="editMedium">
            <option value="">Selecciona...</option>
            <option v-for="m in mediums" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="gp-field">
          <label>Descripción</label>
          <textarea v-model="editDesc" placeholder="¿Qué inspiró esta obra?..." rows="3"></textarea>
        </div>
        <div class="gp-field">
          <label>Tags (separados por coma)</label>
          <input v-model="editTags" placeholder="retrato, naturaleza, boceto..." />
        </div>
      </div>

      <div class="gp-edit-actions">
        <button class="gp-submit-btn" :class="{ saved: justSaved }" :style="justSaved ? { background: '#22c55e' } : { background: color }" @click="saveEdit" :disabled="saving">
          <div v-if="saving" class="gp-spinner-small"></div>
          <span v-else>{{ justSaved ? '✓ Guardado' : 'Guardar cambios' }}</span>
        </button>
        <button class="gp-cancel-btn" @click="cancelEdit">Cancelar</button>
      </div>
    </div>
  </div>

  <!-- ══ LIGHTBOX ══════════════════════════════════════ -->
  <Transition name="sd">
    <div v-if="lightboxOpen && selectedItem" class="gp-lightbox" @click="closeLightbox">
      <button class="gp-lightbox-close" @click.stop="closeLightbox">✕</button>
      <button class="gp-lightbox-edit" @click.stop="startEdit(selectedItem)">
        <svg viewBox="0 0 20 20" fill="none" width="16">
          <path d="M3 17h4l8-8a2 2 0 000-2.8l-.7-.7a2 2 0 00-2.8 0L4 13.5V17z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="gp-lightbox-delete" @click.stop="deleteItem(selectedItem.id)">
        <svg viewBox="0 0 20 20" fill="none" width="18">
          <path d="M3 6h14M8 6V4a2 2 0 012-2h0a2 2 0 012 2v2m3 0v11a2 2 0 01-2 2H7a2 2 0 01-2-2V6h11z" stroke="currentColor" stroke-width="1.8"/>
        </svg>
      </button>

      <div class="gp-lightbox-content" :class="getFrameClass(selectedItem.frame_style)" @click.stop>
        <div class="gp-frame-box">
          <img :src="selectedItem.image_url" :alt="selectedItem.title" />
        </div>
        <div class="gp-lightbox-info">
          <h3>{{ selectedItem.title }}</h3>
          <p v-if="selectedItem.medium" class="gp-lightbox-medium">{{ selectedItem.medium }}</p>
          <p v-if="selectedItem.description" class="gp-lightbox-desc">{{ selectedItem.description }}</p>
          <div v-if="selectedItem.tags?.length" class="gp-lightbox-tags">
            <span v-for="tag in selectedItem.tags" :key="tag" class="gp-tag">{{ tag }}</span>
          </div>
          <p class="gp-lightbox-date">{{ new Date(selectedItem.created_at).toLocaleDateString('es-ES') }}</p>
        </div>
      </div>
    </div>
  </Transition>

</div>
</template>

<style scoped>
/* ════════════════════════════════════════════════════════════════════════
   GALLERYMODE - MASONRY INFINITO SIN POSICIONES
   ════════════════════════════════════════════════════════════════════════ */

.gallery-page {
  background: #f5f0e8;
  min-height: 100vh;
  padding: 0;
  padding-bottom: 80px;
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #1a1a2e;
  -webkit-font-smoothing: antialiased;
}

/* ── Header ── */
.gp-header {
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
.gp-header-left { display: flex; align-items: center; gap: 10px; }
.gp-header-right { display: flex; align-items: center; gap: 8px; }

.gp-tabs {
  display: flex;
  background: rgba(34,40,78,.07);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}
.gp-tab {
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
.gp-tab.active {
  background: #fff;
  color: #22284E;
  box-shadow: 0 2px 6px rgba(34,40,78,.1);
}

.gp-btn-close {
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
.gp-btn-close:hover { background: rgba(34,40,78,.14); }

.gp-btn-search {
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
.gp-btn-search:hover { background: rgba(34,40,78,.14); }

/* ── Search ── */
.gp-search-wrap {
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.gp-search-inner { position: relative; }
.gp-search-ico {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}
.gp-search-inp {
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
.gp-search-inp:focus {
  outline: none;
  border-color: v-bind(color);
  background: #ffffff;
  box-shadow: 0 0 0 3px v-bind(color + '20');
}
.gp-search-close {
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
.gp-search-close:hover {
  background: #d1d5db;
  color: #374151;
}

/* ── Loading / Empty ── */
.gp-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 20px;
  color: #9ca3af;
  font-size: 15px;
  font-weight: 500;
}
.gp-spinner {
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
.gp-empty {
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
   GALLERY MASONRY - INFINITO SIN LÍMITE
   ═══════════════════════════════════════════════════ */
.gp-gallery {
  padding: 20px;
  min-height: calc(100vh - 60px);
}

.gp-wall {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 20px;
}

.gp-wall-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #f5f0e8 0%, #ebe4d8 100%);
  border-radius: 20px;
  box-shadow: inset 0 0 60px rgba(0,0,0,0.05);
}
.gp-wall-bg::before {
  content: '';
  position: absolute;
  inset: 15px;
  border: 2px solid rgba(139, 119, 89, 0.12);
  border-radius: 14px;
  pointer-events: none;
}

/* Masonry layout - infinito */
.gp-masonry {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 15px;
}

.gp-masonry-item {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  position: relative;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  aspect-ratio: 1;
  overflow: hidden;
}
.gp-masonry-item:hover {
  transform: translateY(-6px) scale(1.02);
  z-index: 2;
}

/* Contenedor de imagen */
.gp-frame-box {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gp-frame-box img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

.gp-frame-label {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255,255,255,0.95);
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 10px;
  font-weight: 600;
  color: #5c4a32;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  z-index: 3;
}
.gp-masonry-item:hover .gp-frame-label {
  opacity: 1;
}

/* ── MARCOS ── */

/* Marco Clásico Dorado */
.frame-classic {
  padding: 8px;
  background: linear-gradient(145deg, #d4af37, #b8941f, #d4af37, #e5c158);
  border-radius: 2px;
  box-shadow: 
    0 4px 16px rgba(0,0,0,0.25),
    inset 0 0 0 1px rgba(255,255,255,0.3),
    inset 0 0 0 2px rgba(180,140,30,0.4);
}
.frame-classic .gp-frame-box {
  border: 1px solid #8b7355;
}

/* Marco Vintage Madera */
.frame-vintage {
  padding: 10px;
  background: linear-gradient(145deg, #8b6914, #6b4e23, #8b6914);
  border-radius: 3px;
  box-shadow: 
    0 5px 20px rgba(0,0,0,0.3),
    inset 0 0 0 2px rgba(139, 90, 43, 0.5);
}
.frame-vintage .gp-frame-box {
  border: 2px solid #5c4033;
}

/* Marco Moderno Negro */
.frame-modern {
  padding: 5px;
  background: #1a1a1a;
  border-radius: 1px;
  box-shadow: 
    0 2px 12px rgba(0,0,0,0.35),
    inset 0 0 0 1px rgba(255,255,255,0.08);
}
.frame-modern .gp-frame-box {
  border: 1px solid #333;
}

/* Marco Ornamentado */
.frame-ornate {
  padding: 10px;
  background: linear-gradient(145deg, #c9a961, #a0823a, #c9a961);
  border-radius: 4px;
  box-shadow: 
    0 6px 24px rgba(0,0,0,0.25),
    inset 0 0 0 1px rgba(255,255,255,0.2);
  position: relative;
}
.frame-ornate::before,
.frame-ornate::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,0.35);
}
.frame-ornate::before {
  top: 3px; left: 3px;
  border-right: none; border-bottom: none;
}
.frame-ornate::after {
  bottom: 3px; right: 3px;
  border-left: none; border-top: none;
}
.frame-ornate .gp-frame-box {
  border: 1px solid #8b7355;
}

/* Marco Minimal Blanco */
.frame-minimal {
  padding: 12px;
  background: #ffffff;
  border-radius: 0;
  box-shadow: 
    0 2px 10px rgba(0,0,0,0.08),
    inset 0 0 0 1px rgba(0,0,0,0.06);
}
.frame-minimal .gp-frame-box {
  border: none;
}

/* Marco Polaroid */
.frame-polaroid {
  padding: 8px 8px 24px 8px;
  background: #ffffff;
  border-radius: 2px;
  box-shadow: 
    0 3px 12px rgba(0,0,0,0.15),
    0 1px 3px rgba(0,0,0,0.1);
}
.frame-polaroid .gp-frame-box {
  border: none;
}
.frame-polaroid .gp-frame-label {
  bottom: 2px;
  background: transparent;
  box-shadow: none;
  font-size: 10px;
  color: #666;
}

/* Marco Redondeado */
.frame-rounded {
  padding: 6px;
  background: linear-gradient(145deg, #e8e0d5, #d5c8b8);
  border-radius: 12px;
  box-shadow: 
    0 5px 16px rgba(0,0,0,0.15),
    inset 0 0 0 2px rgba(255,255,255,0.4);
}
.frame-rounded .gp-frame-box {
  border-radius: 8px;
  border: none;
}

/* Marco Sombra Flotante */
.frame-shadow {
  padding: 0;
  background: transparent;
  border-radius: 4px;
  box-shadow: 
    0 16px 32px rgba(0,0,0,0.12),
    0 6px 12px rgba(0,0,0,0.08);
}
.frame-shadow .gp-frame-box {
  border-radius: 4px;
  border: 2px solid #fff;
}

/* ═══════════════════════════════════════════════════
   FRAME PICKER
   ═══════════════════════════════════════════════════ */
.gp-picker-section {
  margin-bottom: 20px;
}
.gp-picker-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: rgba(34,40,78,.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 10px;
}

.gp-frame-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.gp-frame-option {
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.gp-frame-option:hover {
  border-color: #d1d5db;
  transform: translateY(-2px);
}
.gp-frame-option.active {
  border-color: v-bind(color);
  box-shadow: 0 0 0 3px v-bind(color + '20');
}
.gp-frame-option span {
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  text-align: center;
}
.gp-frame-preview {
  width: 36px;
  height: 36px;
}
.gp-frame-preview-inner {
  width: 100%;
  height: 100%;
  background: #f3f4f6;
}

/* ═══════════════════════════════════════════════════
   ADD / EDIT / FORM STYLES
   ═══════════════════════════════════════════════════ */
.gp-add, .gp-edit { padding: 20px; }
.gp-add-card, .gp-edit-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  border: 1.5px solid #f3f4f6;
  max-width: 600px;
  margin: 0 auto;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}
.gp-add-title, .gp-edit-title {
  font-size: 18px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0 0 20px;
}

.gp-upload-zone {
  width: 100%;
  aspect-ratio: 4/3;
  border: 2px dashed #e5e7eb;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 20px;
  overflow: hidden;
  position: relative;
  background: #f9fafb;
}
.gp-upload-zone:hover {
  border-color: v-bind(color);
  background: v-bind(color + '05');
}
.gp-upload-zone.hasPreview {
  border-style: solid;
  border-color: v-bind(color);
}
.gp-upload-icon { color: #9ca3af; }
.gp-upload-zone span { font-size: 14px; color: #9ca3af; font-weight: 500; }
.gp-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 14px;
}

.gp-form { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
.gp-field { display: flex; flex-direction: column; gap: 6px; }
.gp-field label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(34,40,78,.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.gp-field input,
.gp-field select,
.gp-field textarea {
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  color: #1a1a2e;
  font-family: inherit;
  background: #ffffff;
  transition: all 0.2s;
  box-sizing: border-box;
  width: 100%;
}
.gp-field input:focus,
.gp-field select:focus,
.gp-field textarea:focus {
  outline: none;
  border-color: v-bind(color);
  box-shadow: 0 0 0 3px v-bind(color + '15');
}
.gp-field textarea { resize: vertical; }

.gp-submit-btn {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.2s, transform 0.15s;
}
.gp-submit-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}
.gp-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.gp-submit-btn.saved {
  background: #22c55e !important;
}
.gp-spinner-small {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

.gp-edit-actions {
  display: flex;
  gap: 10px;
}
.gp-cancel-btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  background: #ffffff;
  color: #6b7280;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.gp-cancel-btn:hover {
  border-color: #d1d5db;
  color: #374151;
  background: #f9fafb;
}

.gp-edit-preview {
  width: 100%;
  max-width: 300px;
  aspect-ratio: 1;
  margin: 0 auto 20px;
  overflow: hidden;
}
.gp-edit-preview .gp-frame-box {
  height: 100%;
}
.gp-edit-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* ── Lightbox ── */
.gp-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.gp-lightbox-close {
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
.gp-lightbox-close:hover { background: rgba(255,255,255,.3); }

.gp-lightbox-edit {
  position: absolute;
  top: 16px;
  left: 64px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,.15);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  z-index: 1002;
  transition: background 0.2s;
}
.gp-lightbox-edit:hover { background: rgba(255,255,255,.3); }

.gp-lightbox-delete {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(220,38,38,.2);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  z-index: 1002;
  transition: background 0.2s;
}
.gp-lightbox-delete:hover { background: rgba(220,38,38,.4); }

.gp-lightbox-content {
  max-width: 700px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  background: transparent;
}
.gp-lightbox-content .gp-frame-box {
  max-height: 60vh;
  background: #000;
}
.gp-lightbox-content .gp-frame-box img {
  max-width: 100%;
  max-height: 60vh;
  width: auto;
  height: auto;
  object-fit: contain;
}
.gp-lightbox-info {
  background: #fff;
  padding: 20px;
  border-radius: 0 0 16px 16px;
  margin-top: -4px;
}
.gp-lightbox-info h3 {
  font-size: 18px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0 0 6px;
}
.gp-lightbox-medium {
  font-size: 13px;
  color: v-bind(color);
  font-weight: 700;
  margin: 0 0 10px;
}
.gp-lightbox-desc {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;
  margin: 0 0 12px;
}
.gp-lightbox-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.gp-tag {
  padding: 4px 10px;
  border-radius: 99px;
  background: #f3f4f6;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}
.gp-lightbox-date {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
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
  .gp-masonry {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 10px;
  }
  .gp-frame-options { grid-template-columns: repeat(2, 1fr); }
  .gp-gallery { padding: 12px; }
  .gp-wall { padding: 20px 10px; }
  .gp-add { padding: 16px; }
  .gp-edit { padding: 16px; }
  .gp-add-card, .gp-edit-card { padding: 20px; }
  .gp-header { padding: 12px 16px; }
  .gp-search-wrap { padding: 12px 16px; }
}

@media (min-width: 641px) {
  .gp-gallery { padding: 24px 32px; }
  .gp-add { padding: 24px 32px; }
  .gp-edit { padding: 24px 32px; }
}

@media (min-width: 769px) {
  .gp-header {
    padding-left: 28px;
    padding-right: 28px;
  }
  .gp-btn-close {
    margin-left: 8px;
  }
}

@media (min-width: 1024px) {
  .gp-masonry {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    max-width: 1000px;
    margin: 0 auto;
  }
}
</style>