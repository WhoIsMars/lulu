import { createRouter, createWebHistory } from 'vue-router'
import { useGateStore } from '@/stores/gate'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/gate', name: 'gate', component: () => import('@/views/GateView.vue') },
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/p/:slug', name: 'polaroid', component: () => import('@/views/PolaroidView.vue') },
  ],
})

router.beforeEach((to) => {
  const gate = useGateStore()
  if (to.name === 'gate') return true
  if (!gate.unlocked) return { name: 'gate', replace: true }
  return true
})

export default router
