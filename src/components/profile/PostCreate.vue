<template>
  <!-- Botón trigger -->
  <div class="create-trigger" @click="open = true">
    <div class="ct-left">
      <div class="ct-avatar">
        <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" />
        <span v-else>{{ initial }}</span>
      </div>
      <span class="ct-placeholder">¿Cómo fue tu sesión hoy?</span>
    </div>
    <div class="ct-icon">
      <svg viewBox="0 0 20 20" fill="none" width="18">
        <path d="M3 17l4-4 3 3 4-5 4 6H3z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" stroke-width="1.5"/>
        <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.5"/>
      </svg>
    </div>
  </div>

  <!-- Modal -->
  <Transition name="modal">
    <div v-if="open" class="overlay" @click.self="close">
      <div class="modal">

        <!-- Header -->
        <div class="modal-head">
          <h3>Nuevo post</h3>
          <button class="btn-close" @click="close">
            <svg viewBox="0 0 14 14" fill="none" width="11">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- Imagen preview -->
        <div class="img-zone" :class="{ 'has-img': imagePreview }" @click="$refs.fileInput.click()">
          <img v-if="imagePreview" :src="imagePreview" alt="preview" class="img-preview" />
          <template v-else>
            <svg viewBox="0 0 24 24" fill="none" width="32" stroke="currentColor" stroke-width="1.4">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
              <path d="M21 15l-5-5L5 21" stroke-linecap="round"/>
            </svg>
            <span>Añadir foto</span>
          </template>
          <button v-if="imagePreview" class="btn-remove-img" @click.stop="clearImage">
            <svg viewBox="0 0 12 12" fill="none" width="10">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleImage" />

        <!-- Selector hobby -->
        <div class="field">
          <label>Hobby</label>
          <div class="hobby-pills">
            <button
              v-for="h in hobbies" :key="h.id"
              class="hpill"
              :class="{ selected: form.hobbyId === h.id }"
              :style="form.hobbyId === h.id
                ? { background: h.gradient?.[0] || '#ff6b9d', color: '#fff', borderColor: 'transparent' }
                : {}"
              @click="form.hobbyId = h.id; form.hobbyName = h.name; form.hobbyColor = h.gradient?.[0] || '#ff6b9d'"
            >{{ h.name }}</button>
          </div>
        </div>

        <!-- Texto -->
        <div class="field">
          <label>¿Qué quieres compartir?</label>
          <textarea
            v-model="form.text"
            class="textarea"
            placeholder="Hoy practiqué 30 minutos y noté que..."
            maxlength="280"
            rows="3"
          ></textarea>
          <span class="char-count">{{ form.text.length }}/280</span>
        </div>

        <!-- Racha y minutos -->
        <div class="row-fields">
          <div class="field field-small">
            <label>Minutos</label>
            <div class="counter">
              <button @click="form.minutes = Math.max(0, form.minutes - 5)">−</button>
              <span>{{ form.minutes }}</span>
              <button @click="form.minutes += 5">+</button>
            </div>
          </div>
          <div class="field field-small">
            <label>Racha actual</label>
            <div class="streak-display">
              <span class="streak-fire">🔥</span>
              <span class="streak-num">{{ streak }} días</span>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <button class="btn-post" @click="handleSubmit" :disabled="!canPost || submitting">
          <span v-if="submitting" class="dots"><i></i><i></i><i></i></span>
          <template v-else>
            <svg viewBox="0 0 16 16" fill="none" width="14">
              <path d="M14 2L2 7l4 3 2 5 6-13z" fill="currentColor"/>
            </svg>
            Publicar
          </template>
        </button>

      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

const props = defineProps({
  avatarUrl: { type: String, default: '' },
  username:  { type: String, default: '' },
  hobbies:   { type: Array,  default: () => [] },
  streak:    { type: Number, default: 0 },
  submitting:{ type: Boolean, default: false },
})

const emit = defineEmits(['submit'])

const open         = ref(false)
const imagePreview = ref(null)
const imageFile    = ref(null)
const fileInput    = ref(null)

const form = reactive({
  hobbyId:   null,
  hobbyName: '',
  hobbyColor:'#ff6b9d',
  text:      '',
  minutes:   20,
})

const initial  = computed(() => (props.username || 'U')[0].toUpperCase())
const canPost  = computed(() => form.text.trim().length > 0 || imagePreview.value)

function handleImage(e) {
  const file = e.target.files[0]
  if (!file) return
  imageFile.value = file
  const reader = new FileReader()
  reader.onload = ev => { imagePreview.value = ev.target.result }
  reader.readAsDataURL(file)
}

function clearImage() {
  imagePreview.value = null
  imageFile.value    = null
  if (fileInput.value) fileInput.value.value = ''
}

function handleSubmit() {
  emit('submit', {
    hobbyId:   form.hobbyId,
    hobbyName: form.hobbyName,
    hobbyColor:form.hobbyColor,
    text:      form.text.trim(),
    minutes:   form.minutes,
    imageFile: imageFile.value,
  })
  close()
}

function close() {
  open.value         = false
  imagePreview.value = null
  imageFile.value    = null
  form.hobbyId       = null
  form.hobbyName     = ''
  form.hobbyColor    = '#ff6b9d'
  form.text          = ''
  form.minutes       = 0
  if (fileInput.value) fileInput.value.value = ''
}

defineExpose({ close })
</script>

<style scoped>
/* ── Trigger ────────────────────────────── */
.create-trigger {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff;
  border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 16px; padding: 14px 16px;
  cursor: pointer; margin-bottom: 16px;
  box-shadow: 0 2px 10px rgba(34,40,78,.05);
  transition: border-color .2s, box-shadow .2s;
}
.create-trigger:hover {
  border-color: #ff6b9d;
  box-shadow: 0 4px 16px rgba(255,107,157,.12);
}
.ct-left { display: flex; align-items: center; gap: 12px; }
.ct-avatar {
  width: 36px; height: 36px; border-radius: 10px; overflow: hidden;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 800; color: #fff; flex-shrink: 0;
}
.ct-avatar img { width: 100%; height: 100%; object-fit: cover; }
.ct-placeholder { font-size: 14px; color: rgba(34,40,78,.35); }
.ct-icon { color: rgba(34,40,78,.3); }

/* ── Overlay ─────────────────────────────── */
.overlay {
  position: fixed; inset: 0;
  background: rgba(34,40,78,.5); backdrop-filter: blur(10px);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 200; padding: 0;
}
@media (min-width: 600px) {
  .overlay { align-items: center; padding: 20px; }
  .modal   { border-radius: 24px; max-height: 88vh; }
}

/* ── Modal ──────────────────────────────── */
.modal {
  background: #fff;
  border-radius: 24px 24px 0 0;
  width: 100%; max-width: 500px;
  max-height: 92vh; overflow-y: auto;
  padding: 22px 20px 36px;
  display: flex; flex-direction: column; gap: 16px;
  box-shadow: 0 -16px 48px rgba(34,40,78,.18);
}

.modal-head {
  display: flex; align-items: center; justify-content: space-between;
}
.modal-head h3 { font-size: 17px; font-weight: 800; color: #22284E; margin: 0; }
.btn-close {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(34,40,78,.06); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(34,40,78,.5);
  transition: background .2s;
}
.btn-close:hover { background: rgba(255,107,157,.12); color: #ff6b9d; }

/* ── Imagen ──────────────────────────────── */
.img-zone {
  height: 140px; border-radius: 16px;
  border: 2px dashed rgba(34,40,78,.12);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; cursor: pointer; position: relative;
  color: rgba(34,40,78,.35); overflow: hidden;
  transition: border-color .2s, background .2s;
}
.img-zone:hover { border-color: #ff6b9d; background: rgba(255,107,157,.03); }
.img-zone.has-img { border-style: solid; border-color: transparent; }
.img-zone span { font-size: 13px; }
.img-preview { width: 100%; height: 100%; object-fit: cover; border-radius: 14px; }
.btn-remove-img {
  position: absolute; top: 8px; right: 8px;
  width: 24px; height: 24px; border-radius: 50%;
  background: rgba(0,0,0,.55); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #fff;
}

/* ── Fields ──────────────────────────────── */
.field { display: flex; flex-direction: column; gap: 7px; }
.field label {
  font-size: 11px; font-weight: 700;
  color: rgba(34,40,78,.4);
  text-transform: uppercase; letter-spacing: .06em;
}

.hobby-pills { display: flex; flex-wrap: wrap; gap: 7px; }
.hpill {
  padding: 6px 14px; border-radius: 99px;
  border: 1.5px solid rgba(34,40,78,.12);
  background: transparent; font-size: 12px; font-weight: 600;
  color: rgba(34,40,78,.6); cursor: pointer; font-family: inherit;
  transition: all .18s;
}
.hpill:hover { border-color: #ff6b9d; color: #ff6b9d; }

.textarea {
  width: 100%; padding: 11px 14px;
  border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 12px; font-size: 14px;
  color: #22284E; background: #fafafa;
  font-family: inherit; resize: none; line-height: 1.6;
  box-sizing: border-box;
  transition: border-color .2s, background .2s;
}
.textarea:focus { outline: none; border-color: #ff6b9d; background: #fff; }
.char-count { font-size: 11px; color: rgba(34,40,78,.3); text-align: right; }

.row-fields { display: flex; gap: 12px; }
.field-small { flex: 1; }

.counter {
  display: flex; align-items: center;
  background: rgba(34,40,78,.04);
  border-radius: 12px; overflow: hidden;
  border: 1.5px solid rgba(34,40,78,.08);
}
.counter button {
  width: 38px; height: 38px; border: none; background: none;
  font-size: 18px; font-weight: 700; color: rgba(34,40,78,.5);
  cursor: pointer; transition: background .15s;
}
.counter button:hover { background: rgba(34,40,78,.07); }
.counter span {
  flex: 1; text-align: center;
  font-size: 15px; font-weight: 800; color: #22284E;
}

.streak-display {
  display: flex; align-items: center; gap: 6px;
  background: rgba(34,40,78,.04);
  border: 1.5px solid rgba(34,40,78,.08);
  border-radius: 12px; padding: 8px 14px;
}
.streak-fire { font-size: 18px; }
.streak-num  { font-size: 15px; font-weight: 800; color: #22284E; }

/* ── Botón publicar ──────────────────────── */
.btn-post {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff; border: none; font-size: 15px; font-weight: 800;
  padding: 14px; border-radius: 14px; cursor: pointer;
  font-family: inherit;
  box-shadow: 0 6px 20px rgba(255,107,157,.3);
  transition: transform .18s, box-shadow .18s, opacity .2s;
}
.btn-post:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(255,107,157,.4); }
.btn-post:disabled { opacity: .5; cursor: not-allowed; transform: none; }

/* ── Dots loader ─────────────────────────── */
.dots { display: flex; gap: 3px; align-items: center; }
.dots i { display: block; width: 5px; height: 5px; border-radius: 50%; background: currentColor; animation: dot .8s ease-in-out infinite; }
.dots i:nth-child(2) { animation-delay: .15s; }
.dots i:nth-child(3) { animation-delay: .30s; }
@keyframes dot { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }

/* ── Transición modal ────────────────────── */
.modal-enter-active, .modal-leave-active { transition: opacity .25s; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
</style>