import { createRouter, createWebHistory } from 'vue-router'
import HomePage             from '../pages/HomePage.vue'
import AuthPage             from '../pages/AuthPage.vue'
import AuthCallback         from '../pages/AuthCallback.vue'
import OnboardingPage       from '../pages/OnboardingPage.vue'
import DashboardLayout      from '../components/DashboardLayout.vue'
import DashboardHome        from '../pages/DashboardHome.vue'
import DashboardHobbies     from '../pages/DashboardHobbies.vue'
import DashboardCalendar    from '../pages/DashboardCalendar.vue'
import DashboardChat        from '../pages/DashboardChat.vue'
import DashboardProfile     from '../pages/DashboardProfile.vue'
import DashboardLeaderboard from '../pages/DashboardLeaderboard.vue'
import { supabase }         from '../lib/supabase'

const routes = [
  { path: '/',              name: 'Home',         component: HomePage },
  { path: '/auth',          name: 'Auth',         component: AuthPage },
  { path: '/auth/callback', name: 'AuthCallback', component: AuthCallback },
  { path: '/onboarding',    name: 'Onboarding',   component: OnboardingPage },
  {
    path: '/dashboard',
    component: DashboardLayout,
    children: [
      { path: '',            name: 'DashboardHome',        component: DashboardHome },
      { path: 'hobbies',     name: 'DashboardHobbies',     component: DashboardHobbies },
      { path: 'calendar',    name: 'DashboardCalendar',    component: DashboardCalendar },
      { path: 'chat',        name: 'DashboardChat',        component: DashboardChat },
      { path: 'profile',     name: 'DashboardProfile',     component: DashboardProfile },
      { path: 'leaderboard', name: 'DashboardLeaderboard', component: DashboardLeaderboard },
    ]
  }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()

  // Solo proteger el dashboard — onboarding puede accederse sin sesión
  // porque justo después del registro la sesión puede tardar en activarse
  if (to.path.startsWith('/dashboard') && !session) {
    return '/'
  }

  // Con sesión activa — si va al home o auth, redirigir según onboarding
  if (session && (to.path === '/' || to.path === '/auth')) {
    const done = localStorage.getItem('onboarding_done')
    return done ? '/dashboard' : '/onboarding'
  }
})

export default router