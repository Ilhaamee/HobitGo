import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import AuthPage from '../pages/AuthPage.vue'
import AuthCallback from '../pages/AuthCallback.vue'
import OnboardingPage from '../pages/OnboardingPage.vue'
import DashboardLayout from '../components/DashboardLayout.vue'
import DashboardHome from '../pages/DashboardHome.vue'
import DashboardHobbies from '../pages/DashboardHobbies.vue'
import DashboardCalendar from '../pages/DashboardCalendar.vue'
import DashboardChat from '../pages/DashboardChat.vue'
import DashboardProfile from '../pages/DashboardProfile.vue'
import DashboardLeaderboard from '../pages/DashboardLeaderboard.vue'
import DashboardCommunity from '../pages/DashboardCommunity.vue'
import DashboardRewards from '../pages/DashboardRewards.vue'
import DashboardTips from '../pages/DashboardTips.vue'
import DashboardAdmin from '../pages/DashboardAdmin.vue'
import { supabase } from '../lib/supabase'

const routes = [
  { path: '/', name: 'Home', component: HomePage },
  { path: '/auth', name: 'Auth', component: AuthPage },
  { path: '/auth/callback', name: 'AuthCallback', component: AuthCallback },
  { path: '/onboarding', name: 'Onboarding', component: OnboardingPage },
  {
    path: '/dashboard',
    component: DashboardLayout,
    children: [
      { path: '', name: 'DashboardHome', component: DashboardHome },
      { path: 'hobbies', name: 'DashboardHobbies', component: DashboardHobbies },
      { path: 'calendar', name: 'DashboardCalendar', component: DashboardCalendar },
      { path: 'chat', name: 'DashboardChat', component: DashboardChat },
      { path: 'profile', name: 'DashboardProfile', component: DashboardProfile },
      { path: 'leaderboard', name: 'DashboardLeaderboard', component: DashboardLeaderboard },
      { path: 'community', name: 'DashboardCommunity', component: DashboardCommunity },
      { path: 'rewards', name: 'DashboardRewards', component: DashboardRewards },
      { path: 'tips', name: 'DashboardTips', component: DashboardTips },
      { path: 'admin', name: 'DashboardAdmin', component: DashboardAdmin },
    ]
  }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    if (to.path.startsWith('/dashboard') || to.path === '/onboarding') return '/'
    return true
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', session.user.id)
    .single()

  const onboardingDone = profile?.onboarding_done === true

  if (to.path.startsWith('/dashboard') && !onboardingDone) return '/onboarding'
  if (to.path === '/onboarding' && onboardingDone) return '/dashboard'
  if ((to.path === '/' || to.path === '/auth') && session) {
    return onboardingDone ? '/dashboard' : '/onboarding'
  }

  return true
})

export default router
