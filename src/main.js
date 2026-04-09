import { createApp } from 'vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faApple, faAndroid } from '@fortawesome/free-brands-svg-icons'
import { faEye, faEyeSlash, faHome, faHeart, faCalendar, faComments, faUser, faSignOutAlt, faTrophy, faFire, faStar, faPlus, faCheck, faBook, faPalette, faDumbbell, faSpa, faChevronLeft, faChevronRight, faPaperPlane, faCamera, faPen, faTrash, faClock, faMusic } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import App from './App.vue'
import router from './router'
import { supabase } from './lib/supabase'

library.add(faApple, faAndroid, faEye, faEyeSlash, faHome, faHeart, faCalendar, faComments, faUser, faSignOutAlt, faTrophy, faFire, faStar, faPlus, faCheck, faBook, faPalette, faDumbbell, faSpa, faChevronLeft, faChevronRight, faPaperPlane, faCamera, faPen, faTrash, faClock, faMusic)

const app = createApp(App)
app.provide('supabase', supabase)

supabase.auth.onAuthStateChange((event, session) => {
  app.config.globalProperties.$user = session?.user || null
  if (event === 'SIGNED_IN' && session?.user) {
    if (router.currentRoute.value.path === '/' || router.currentRoute.value.path === '/auth') {
      router.push('/dashboard')
    }
  }
  if (event === 'SIGNED_OUT') {
    app.config.globalProperties.$user = null
  }
})

app.component('font-awesome-icon', FontAwesomeIcon)
app.use(router)
app.mount('#app')
