<script setup>
import { ref, computed } from 'vue'
import { HOBBY_CATEGORIES, HOBBIES_LIST, filterByCategory } from '../../data/hobbiesData.js'
import HobbySetup from './HobbySetup.vue'

const emit = defineEmits(['select', 'close'])

const search         = ref('')
const activeCategory = ref(null)
const imageErrors    = ref({})
const selectedHobby  = ref(null)

const filtered = computed(() => {
  let list = activeCategory.value ? filterByCategory(activeCategory.value) : HOBBIES_LIST
  if (search.value.trim())
    list = list.filter(h => h.name.toLowerCase().includes(search.value.toLowerCase()))
  return list
})

function toggleCategory(key) {
  activeCategory.value = activeCategory.value === key ? null : key
}
function pickHobby(h) { selectedHobby.value = h }
function onSetupConfirm(cfg) { emit('select', cfg) }
function onSetupBack() { selectedHobby.value = null }
function onImgError(id) { imageErrors.value[id] = true }
function openCustom() {
  selectedHobby.value = { id: 'custom', name: '', category: 'creatividad', gradient: ['#ff6b9d','#ffb3c6'], img: null, custom: true }
}
</script>

<template>
  <HobbySetup
    v-if="selectedHobby"
    :hobby="selectedHobby"
    @confirm="onSetupConfirm"
    @back="onSetupBack"
    @close="emit('close')"
  />

  <div v-else class="overlay" @click.self="emit('close')">
    <div class="picker">

      <div class="picker-header">
        <h3>Elige un hobby</h3>
        <button class="close-btn" @click="emit('close')">
          <svg viewBox="0 0 14 14" fill="none" width="11">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="search-wrap">
        <svg viewBox="0 0 20 20" fill="none" width="14" class="search-icon">
          <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.7"/>
          <path d="M15 15l3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
        <input v-model="search" class="search-input" placeholder="Buscar hobby..." />
      </div>

      <div class="cats-scroll">
        <button class="cat-btn" :class="{ active: activeCategory === null }" @click="activeCategory = null">Todo</button>
        <button
          v-for="cat in HOBBY_CATEGORIES" :key="cat.key"
          class="cat-btn" :class="{ active: activeCategory === cat.key }"
          :style="activeCategory === cat.key
            ? { background: `linear-gradient(135deg, ${cat.gradient[0]}, ${cat.gradient[1]})`, color: '#fff', borderColor: 'transparent' }
            : {}"
          @click="toggleCategory(cat.key)"
        >{{ cat.name }}</button>
      </div>

      <!-- Grid area — tamaño fijo siempre -->
      <div class="grid-wrap">
        <div class="hobbies-grid">
          <button
            v-for="h in filtered" :key="h.id"
            class="hobby-btn"
            @click="pickHobby(h)"
          >
            <div class="hobby-img" :style="{ background: `linear-gradient(135deg, ${h.gradient[0]}, ${h.gradient[1]})` }">
              <img v-if="!imageErrors[h.id]" :src="h.img" :alt="h.name" loading="lazy" @error="onImgError(h.id)" />
              <div class="img-overlay"></div>
              <span class="hobby-name">{{ h.name }}</span>
            </div>
          </button>
        </div>
        <p v-if="filtered.length === 0" class="no-results">No encontrado. Prueba con otro nombre.</p>
      </div>

      <div class="custom-section">
        <p class="custom-label">¿No encuentras el tuyo?</p>
        <button class="custom-btn" @click="openCustom">
          <svg viewBox="0 0 14 14" fill="none" width="13">
            <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Crear hobby personalizado
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0;
  background: rgba(34,40,78,.55); backdrop-filter: blur(12px);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 1000;
}

/* Móvil: ocupa 90vh desde abajo */
.picker {
  background: #fff; border-radius: 24px 24px 0 0;
  width: 100%; max-width: 620px;
  height: 90vh;
  display: flex; flex-direction: column;
  padding: 24px 20px 0; overflow: hidden;
  box-shadow: 0 -12px 48px rgba(34,40,78,.18);
}

.picker-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px; flex-shrink: 0;
}
.picker-header h3 { font-size: 18px; font-weight: 800; color: #22284E; margin: 0; }
.close-btn {
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(34,40,78,.06); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(34,40,78,.5); transition: background .2s, color .2s;
}
.close-btn:hover { background: rgba(255,107,157,.12); color: #ff6b9d; }

.search-wrap { position: relative; margin-bottom: 12px; flex-shrink: 0; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: rgba(34,40,78,.3); pointer-events: none; }
.search-input {
  width: 100%; padding: 10px 14px 10px 36px;
  border: 1.5px solid rgba(34,40,78,.1); border-radius: 12px;
  font-size: 14px; color: #22284E; background: #fafafa;
  box-sizing: border-box; font-family: inherit; transition: border-color .2s;
}
.search-input:focus { outline: none; border-color: #ff6b9d; background: #fff; }

.cats-scroll {
  display: flex; gap: 7px; overflow-x: auto;
  padding-bottom: 10px; scrollbar-width: none; flex-shrink: 0;
}
.cats-scroll::-webkit-scrollbar { display: none; }
.cat-btn {
  padding: 6px 14px; border-radius: 99px; white-space: nowrap;
  border: 1.5px solid rgba(34,40,78,.12);
  background: transparent; color: rgba(34,40,78,.6);
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: all .18s; flex-shrink: 0;
}
.cat-btn:hover { border-color: #ff6b9d; color: #ff6b9d; }
.cat-btn.active { background: #22284E; color: #fff59e; border-color: transparent; }

/* CLAVE: grid-wrap siempre ocupa el espacio restante con scroll */
.grid-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin: 0 -20px;
  padding: 4px 20px 8px;
}

.hobbies-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  /* align-content: start para que las tarjetas no se estiren cuando hay pocas */
  align-content: start;
}

.hobby-btn {
  border: none; background: none; padding: 0; cursor: pointer;
  border-radius: 14px; overflow: hidden; display: block; width: 100%;
  outline: 2.5px solid transparent; outline-offset: 2px;
  transition: outline-color .18s, transform .15s;
}
.hobby-btn:hover { outline-color: #ff6b9d; transform: translateY(-2px); }

.hobby-img {
  position: relative; width: 100%; aspect-ratio: 4/3;
  overflow: hidden; display: flex; align-items: flex-end;
}
.hobby-img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.img-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, transparent 25%, rgba(20,22,50,.78) 100%);
}
.hobby-name {
  position: relative; z-index: 2; padding: 6px 8px;
  font-size: 11px; font-weight: 700; color: #fff;
  line-height: 1.2; text-shadow: 0 1px 3px rgba(0,0,0,.5); width: 100%;
}

.no-results { text-align: center; font-size: 13px; color: rgba(34,40,78,.4); padding: 40px 0; margin: 0; }

.custom-section {
  border-top: 1px solid rgba(34,40,78,.07); padding: 14px 0 20px;
  display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
}
.custom-label { font-size: 13px; color: rgba(34,40,78,.45); margin: 0; }
.custom-btn {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,107,157,.08); border: 1.5px solid rgba(255,107,157,.2);
  color: #ff6b9d; font-size: 13px; font-weight: 700;
  padding: 8px 14px; border-radius: 10px; cursor: pointer; transition: background .2s;
}
.custom-btn:hover { background: rgba(255,107,157,.15); }

/* Web: centrado, tamaño fijo */
@media (min-width: 600px) {
  .overlay { align-items: center; padding: 20px; }
  .picker {
    border-radius: 24px;
    height: 80vh;        /* fijo también en web */
    max-height: 680px;   /* tope máximo */
  }
  .hobbies-grid { grid-template-columns: repeat(4, 1fr); }
}
</style>