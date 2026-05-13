<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AppLogo from '../ui/AppLogo.vue'

defineEmits(['signin', 'start'])

const isScrolled = ref(false)
const isMenuOpen = ref(false)
const langOpen   = ref(false)
const lang       = ref('ES')

const langs = [
  { code: 'ES', label: 'Español' },
  { code: 'EN', label: 'English' },
]

function selectLang(code) {
  lang.value = code
  langOpen.value = false
}

function handleOutside(e) {
  if (!e.target.closest('.lang-wrap')) langOpen.value = false
}

function handleScroll() {
  isScrolled.value = window.scrollY > 50
  if (isMenuOpen.value) isMenuOpen.value = false
  if (langOpen.value)   langOpen.value   = false
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('click', handleOutside)
  handleScroll()
})
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleOutside)
})
</script>

<template>
  <nav class="navbar" :class="{ scrolled: isScrolled }" role="navigation" aria-label="Navegación principal">

    <div class="brand">
      <img src="@/assets/logo.png" alt="HobitGo" class="logo-img" />
      <AppLogo :size="26" />
    </div>

    <div class="nav-btns desktop">

      <div class="lang-wrap">
        <button class="btn-lang" @click.stop="langOpen = !langOpen" :aria-expanded="langOpen">
          <svg viewBox="0 0 18 18" fill="none" width="14">
            <circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.4"/>
            <path d="M9 1.5C9 1.5 6.5 5 6.5 9s2.5 7.5 2.5 7.5M9 1.5c0 0 2.5 3.5 2.5 7.5S9 16.5 9 16.5M1.5 9h15" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <span>{{ lang }}</span>
          <svg viewBox="0 0 10 10" fill="none" width="9"
            :style="{ transform: langOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }">
            <path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        <Transition name="drop">
          <div v-if="langOpen" class="lang-dropdown">
            <button
              v-for="l in langs" :key="l.code"
              class="lang-option" :class="{ active: lang === l.code }"
              @click="selectLang(l.code)"
            >
              <span class="lang-code">{{ l.code }}</span>
              <span class="lang-label">{{ l.label }}</span>
              <svg v-if="lang === l.code" viewBox="0 0 14 14" fill="none" width="13" class="lang-check">
                <path d="M2 7l4 4 6-6" stroke="#ff6b9d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </Transition>
      </div>

      <button class="btn-nav-sec"  @click="$emit('signin')">{{ lang === 'ES' ? 'Iniciar sesión' : 'Log in' }}</button>
      <button class="btn-nav-main" @click="$emit('start')">{{ lang === 'ES' ? 'Empezar gratis' : 'Start free' }}</button>
    </div>

    <button class="hamburger" @click="isMenuOpen = !isMenuOpen" aria-label="Menú">
      <span :class="{ open: isMenuOpen }"></span>
      <span :class="{ open: isMenuOpen }"></span>
      <span :class="{ open: isMenuOpen }"></span>
    </button>

    <div class="mobile-menu" :class="{ open: isMenuOpen }">
      <div class="mobile-lang-row">
        <span class="mobile-lang-title">
          <svg viewBox="0 0 18 18" fill="none" width="13">
            <circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.4"/>
            <path d="M9 1.5C9 1.5 6.5 5 6.5 9s2.5 7.5 2.5 7.5M9 1.5c0 0 2.5 3.5 2.5 7.5S9 16.5 9 16.5M1.5 9h15" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          Idioma
        </span>
        <div class="mobile-lang-pills">
          <button
            v-for="l in langs" :key="l.code"
            class="ml-pill"
            :class="{ active: lang === l.code }"
            @click="selectLang(l.code)"
          >
            {{ l.code }}
          </button>
        </div>
      </div>

      <!-- Botones nav -->
      <button class="mm-sec"  @click="$emit('signin'); isMenuOpen = false">{{ lang === 'ES' ? 'Iniciar sesión' : 'Log in' }}</button>
      <button class="mm-main" @click="$emit('start');  isMenuOpen = false">{{ lang === 'ES' ? 'Empezar gratis' : 'Start free' }}</button>

    </div>

  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 18px 40px;
  z-index: 200;
  background: transparent;
  transition: background .3s, box-shadow .3s;
}
.navbar.scrolled {
  background: rgba(255,255,255,.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 20px rgba(0,0,0,.08);
}

.brand { display: flex; align-items: center; gap: 10px; }
.logo-img { width: 36px; height: 36px; object-fit: contain; }

.nav-btns { display: flex; align-items: center; gap: 12px; }

.lang-wrap { position: relative; }

.btn-lang {
  display: flex; align-items: center; gap: 5px;
  background: rgba(34,40,78,.06);
  border: 1.5px solid rgba(34,40,78,.12);
  color: #22284E;
  font-size: 12px; font-weight: 700; letter-spacing: .04em;
  padding: 7px 11px; border-radius: 99px;
  cursor: pointer;
  transition: background .2s, border-color .2s;
  white-space: nowrap;
}
.btn-lang:hover { background: rgba(34,40,78,.1); border-color: rgba(34,40,78,.2); }

.lang-dropdown {
  position: absolute;
  top: calc(100% + 8px); left: 0;
  min-width: 148px;
  background: #fff;
  border: 1.5px solid rgba(34,40,78,.1);
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 8px 28px rgba(34,40,78,.14);
  z-index: 300;
}

.lang-option {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  background: transparent; border: none; border-radius: 10px;
  cursor: pointer; text-align: left;
  transition: background .15s;
}
.lang-option:hover { background: rgba(34,40,78,.05); }
.lang-option.active { background: rgba(255,107,157,.07); }

.lang-code  { font-size: 12px; font-weight: 800; color: #22284E; letter-spacing: .04em; min-width: 24px; }
.lang-label { font-size: 13px; font-weight: 500; color: rgba(34,40,78,.6); flex: 1; }
.lang-check { margin-left: auto; flex-shrink: 0; }

.drop-enter-active, .drop-leave-active { transition: opacity .18s ease, transform .18s ease; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-6px) scale(.97); }

.btn-nav-sec {
  background: transparent;
  border: 2px solid rgba(34,40,78,.22);
  color: #22284E; font-size: 14px; font-weight: 600;
  padding: 10px 22px; border-radius: 10px; cursor: pointer;
  transition: border-color .2s, background .2s;
}
.btn-nav-sec:hover { background: rgba(34,40,78,.06); }
.navbar:not(.scrolled) .btn-nav-sec { border-color: rgba(255,255,255,.5); }

.btn-nav-main {
  background: #22284E; color: #fff59e;
  border: none; font-size: 14px; font-weight: 700;
  padding: 10px 22px; border-radius: 10px; cursor: pointer;
  box-shadow: 0 4px 16px rgba(34,40,78,.25);
  transition: transform .2s, box-shadow .2s;
}
.btn-nav-main:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(34,40,78,.32); }

.hamburger {
  display: none; flex-direction: column; gap: 5px;
  background: none; border: none; cursor: pointer; padding: 6px;
}
.hamburger span {
  display: block; width: 22px; height: 2px;
  background: #22284E; border-radius: 2px;
  transition: all .3s ease;
}
.hamburger span:nth-child(1).open { transform: rotate(45deg) translate(5px, 5px); }
.hamburger span:nth-child(2).open { opacity: 0; }
.hamburger span:nth-child(3).open { transform: rotate(-45deg) translate(5px, -5px); }

.mobile-menu {
  display: none;
  position: absolute; top: 100%; left: 0; right: 0;
  background: rgba(255,255,255,.98);
  backdrop-filter: blur(10px);
  padding: 16px 20px 20px;
  flex-direction: column; gap: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,.08);
  border-top: 1px solid rgba(34,40,78,.06);
}
.mobile-menu.open { display: flex; }

.mobile-lang-row {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(34,40,78,.04);
  border: 1px solid rgba(34,40,78,.08);
  border-radius: 12px;
}

.mobile-lang-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600;
  color: rgba(34,40,78,.6);
}

.mobile-lang-pills {
  display: flex; gap: 4px;
}

.ml-pill {
  padding: 5px 14px;
  border-radius: 99px;
  font-size: 12px; font-weight: 700; letter-spacing: .04em;
  border: 1.5px solid rgba(34,40,78,.15);
  background: transparent; color: rgba(34,40,78,.5);
  cursor: pointer;
  transition: all .18s ease;
}
.ml-pill.active {
  background: #22284E;
  color: #fff59e;
  border-color: #22284E;
  box-shadow: 0 2px 8px rgba(34,40,78,.22);
}

.mm-sec {
  width: 100%; padding: 13px; border: none;
  border-radius: 10px; font-size: 15px; font-weight: 600;
  cursor: pointer;
  background: transparent; color: #22284E;
  border: 2px solid rgba(34,40,78,.18);
  transition: background .2s;
}
.mm-sec:hover { background: rgba(34,40,78,.04); }

.mm-main {
  width: 100%; padding: 13px; border: none;
  border-radius: 10px; font-size: 15px; font-weight: 700;
  cursor: pointer; background: #22284E; color: #fff59e;
  transition: opacity .2s;
}
.mm-main:hover { opacity: .9; }

@media (max-width: 768px) {
  .navbar { padding: 16px 20px; }
  .desktop { display: none; }
  .hamburger { display: flex; }
}
</style>