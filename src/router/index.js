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
import ResetPasswordPage from '../pages/ResetPasswordPage.vue'

const routes = [
  { path: '/',              name: 'Home',         component: HomePage },
  { path: '/auth',          name: 'Auth',         component: AuthPage },
  { path: '/auth/callback', name: 'AuthCallback', component: AuthCallback },
  { path: '/onboarding',    name: 'Onboarding',   component: OnboardingPage },
  { path: '/reset-password', name: 'ResetPassword', component: ResetPasswordPage },
  {
    path: '/dashboard',
    component: DashboardLayout,
    children: [
      { path: '',            name: 'DashboardHome',        component: DashboardHome },
      { path: 'hobbies',     name: 'DashboardHobbies',     component: DashboardHobbies },
      { path: 'calendar',    name: 'DashboardCalendar',    component: DashboardCalendar },
      { path: 'chat',        name: 'DashboardChat',        component: DashboardChat },
      { path: 'profile',     name: 'DashboardProfile',     component: DashboardProfile },
      { path: 'profile/:username', name: 'UserProfile', component: DashboardProfile, props: true },
      { path: 'leaderboard', name: 'DashboardLeaderboard', component: DashboardLeaderboard },
      { path: 'hobbies/:hobbyId/library', name: 'Library', component: () => import('../pages/LibraryPage.vue') },
      { path: 'hobbies/:hobbyId/kitchen', name: 'Kitchen', component: () => import('../pages/KitchenPage.vue') },
      { path: 'hobbies/:hobbyId/gallery', name: 'Gallery', component: () => import('../pages/GalleryPage.vue') },
      { path: 'hobbies/:hobbyId/standard', name: 'Standard', component: () => import('../pages/StandardPage.vue') },
      { path: 'hobbies/:hobbyId', name: 'HobbyDetail', component: () => import('../pages/StandardPage.vue') },
    ]
  }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (to.path.startsWith('/dashboard') && !session) return '/'

  const publicPaths = ['/reset-password', '/auth/callback']
  if (publicPaths.includes(to.path)) return

  if (session && (to.path === '/' || to.path === '/auth')) return '/dashboard'
})

export default router