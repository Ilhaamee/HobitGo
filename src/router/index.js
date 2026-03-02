import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import AuthPage from '../pages/AuthPage.vue'
import DashboardLayout from '../components/DashboardLayout.vue'
import DashboardHome from '../pages/DashboardHome.vue'
import DashboardHobbies from '../pages/DashboardHobbies.vue'
import DashboardCalendar from '../pages/DashboardCalendar.vue'
import DashboardChat from '../pages/DashboardChat.vue'
import DashboardProfile from '../pages/DashboardProfile.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/auth',
    name: 'Auth',
    component: AuthPage
  },
  {
    path: '/dashboard',
    component: DashboardLayout,
    children: [
      {
        path: '',
        name: 'DashboardHome',
        component: DashboardHome
      },
      {
        path: 'hobbies',
        name: 'DashboardHobbies',
        component: DashboardHobbies
      },
      {
        path: 'calendar',
        name: 'DashboardCalendar',
        component: DashboardCalendar
      },
      {
        path: 'chat',
        name: 'DashboardChat',
        component: DashboardChat
      },
      {
        path: 'profile',
        name: 'DashboardProfile',
        component: DashboardProfile
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
