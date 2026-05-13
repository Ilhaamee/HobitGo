<template>
  <Transition name="modal">
    <div v-if="show" class="overlay" @click.self="$emit('close')">
      <div class="modal">

        <!-- Header -->
        <div class="modal-head">
          <h3>Editar post</h3>
          <button class="btn-close" @click="$emit('close')">
            <svg viewBox="0 0 14 14" fill="none" width="11">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- Imagen actual o nueva -->
        <div class="img-zone" :class="{ 'has-img': previewUrl }" @click="$refs.fileInput.click()">
          <img v-if="previewUrl" :src="previewUrl" alt="preview" class="img-preview"/>
          <template v-else>
            <svg viewBox="0 0 24 24" fill="none" width="32" stroke="currentColor" stroke-width="1.4">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
              <path d="M21 15l-5-5L5 21" stroke-linecap="round"/>
            </svg>
            <span>Cambiar foto</span>
          </template>
          <button v-if="previewUrl" class="btn-remove-img" @click.stop="clearImage">
            <svg viewBox="0 0 12 12" fill="none" width="10">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleImage"/>

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
              @click="form.hobbyId = h.id; form.hobbyName = h.name"
            >{{ h.name }}</button>
          </div>
        </div>

        <!-- Texto -->
        <div class="field">
          <label>Texto</label>
          <textarea
            v-model="form.text"
            class="textarea"
            placeholder="¿Qué quieres compartir?"
            maxlength="280"
            rows="3"
          ></textarea>
          <span class="char-count">{{ form.text.length }}/280</span>
        </div>

        <!-- Minutos -->
        <div class="field">
          <label>Minutos</label>
          <div class="counter">
            <button @click="form.minutes = Math.max(0, form.minutes - 5)">−</button>
            <span>{{ form.minutes }}</span>
            <button @click="form.minutes += 5">+</button>
          </div>
        </div>

        <!-- Botones -->
        <div class="btn-row">
          <button class="btn-save" @click="handleSave" :disabled="saving || !form.text.trim()">
            <span v-if="saving" class="dots"><i></i><i></i><i></i></span>
            <span v-else>Guardar cambios</span>
          </button>
          <button class="btn-ghost" @click="$emit('close')">Cancelar</button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
  show:    { type: Boolean, default: false },
  post:    { type: Object,  default: null },
  hobbies: { type: Array,   default: () => [] },
  saving:  { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save'])

const fileInput  = ref(null)
const newImage   = ref(null)
const previewUrl = ref(null)

const form = reactive({
  hobbyId:   null,
  hobbyName: '',
  text:      '',
  minutes:   0,
})

// Rellenar formulario cuando se abre con un post
watch(() => props.post, (post) => {
  if (!post) return
  form.hobbyId   = post.hobby_id   || null
  form.hobbyName = post.hobby_name || ''
  form.text      = post.text       || ''
  form.minutes   = post.minutes    || 0
  previewUrl.value = post.image_url || null
  newImage.value   = null
}, { immediate: true })

function handleImage(e) {
  const file = e.target.files[0]
  if (!file) return
  newImage.value = file
  const reader = new FileReader()
  reader.onload = ev => { previewUrl.value = ev.target.result }
  reader.readAsDataURL(file)
}

function clearImage() {
  newImage.value   = null
  previewUrl.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function handleSave() {
  emit('save', {
    id:         props.post.id,
    hobbyId:    form.hobbyId,
    hobbyName:  form.hobbyName,
    text:       form.text.trim(),
    minutes:    form.minutes,
    newImage:   newImage.value,
    removeImage: !previewUrl.value && !!props.post.image_url,
  })
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0;
  background: rgba(34,40,78,.5); backdrop-filter: blur(10px);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 300;
}
@media (min-width: 600px) {
  .overlay { align-items: center; padding: 20px; }
  .modal   { border-radius: 24px; max-height: 88vh; }
}

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
  cursor: pointer; color: rgba(34,40,78,.5); transition: background .2s;
}
.btn-close:hover { background: rgba(255,107,157,.12); color: #ff6b9d; }

/* Imagen */
.img-zone {
  height: 130px; border-radius: 14px;
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
.img-preview { width: 100%; height: 100%; object-fit: cover; }
.btn-remove-img {
  position: absolute; top: 8px; right: 8px;
  width: 24px; height: 24px; border-radius: 50%;
  background: rgba(0,0,0,.5); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #fff;
}

/* Fields */
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
.hpill.selected { box-shadow: 0 2px 8px rgba(0,0,0,.12); }

.textarea {
  width: 100%; padding: 11px 14px;
  border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 12px; font-size: 14px;
  color: #22284E; background: #fafafa;
  font-family: inherit; resize: none; line-height: 1.6;
  box-sizing: border-box; transition: border-color .2s;
}
.textarea:focus { outline: none; border-color: #ff6b9d; background: #fff; }
.char-count { font-size: 11px; color: rgba(34,40,78,.3); text-align: right; }

.counter {
  display: flex; align-items: center;
  background: rgba(34,40,78,.04);
  border-radius: 12px; overflow: hidden;
  border: 1.5px solid rgba(34,40,78,.08);
  width: fit-content;
}
.counter button {
  width: 38px; height: 38px; border: none; background: none;
  font-size: 18px; font-weight: 700; color: rgba(34,40,78,.5);
  cursor: pointer; transition: background .15s;
}
.counter button:hover { background: rgba(34,40,78,.07); }
.counter span {
  padding: 0 16px;
  font-size: 15px; font-weight: 800; color: #22284E;
}

/* Buttons */
.btn-row { display: flex; gap: 10px; align-items: center; }
.btn-save {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff; border: none; font-size: 14px; font-weight: 800;
  padding: 13px; border-radius: 13px; cursor: pointer;
  font-family: inherit;
  box-shadow: 0 4px 16px rgba(255,107,157,.28);
  transition: transform .18s, opacity .2s;
}
.btn-save:hover:not(:disabled) { transform: translateY(-1px); }
.btn-save:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.btn-ghost {
  background: none; border: none; font-size: 13px; font-weight: 600;
  color: rgba(34,40,78,.5); cursor: pointer; font-family: inherit;
}
.btn-ghost:hover { color: #ff6b9d; }

/* Dots */
.dots { display: flex; gap: 3px; align-items: center; }
.dots i { display: block; width: 5px; height: 5px; border-radius: 50%; background: currentColor; animation: dot .8s ease-in-out infinite; }
.dots i:nth-child(2) { animation-delay: .15s; }
.dots i:nth-child(3) { animation-delay: .30s; }
@keyframes dot { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }

/* Transition */
.modal-enter-active, .modal-leave-active { transition: opacity .25s; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
</style>