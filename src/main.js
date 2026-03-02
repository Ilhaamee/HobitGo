import { createApp } from 'vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faApple, faAndroid } from '@fortawesome/free-brands-svg-icons'
import { faEye, faEyeSlash, faHome, faHeart, faCalendar, faComments, faUser, faSignOutAlt, faTrophy, faFire, faStar, faPlus, faCheck, faBook, faPalette, faDumbbell, faSpa, faChevronLeft, faChevronRight, faPaperPlane, faCamera } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import App from './App.vue'
import router from './router'
import { supabase } from './lib/supabase'

// Add icons to library
library.add(faApple, faAndroid, faEye, faEyeSlash, faHome, faHeart, faCalendar, faComments, faUser, faSignOutAlt, faTrophy, faFire, faStar, faPlus, faCheck, faBook, faPalette, faDumbbell, faSpa, faChevronLeft, faChevronRight, faPaperPlane, faCamera)

// Global authentication state
const app = createApp(App)

// Provide Supabase client globally
app.provide('supabase', supabase)

// Track auth state
supabase.auth.onAuthStateChange((event, session) => {
  app.config.globalProperties.$user = session?.user || null
  if (event === 'SIGNED_IN' && session?.user) {
    router.push('/')
  }
  if (event === 'SIGNED_OUT') {
    app.config.globalProperties.$user = null
  }
})

app.component('font-awesome-icon', FontAwesomeIcon)
app.use(router)
app.mount('#app')
