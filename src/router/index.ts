// src/router/index.ts — TEMPORARY skeleton; replaced by Plan 03 with the gate-aware router.
import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('@/views/HomeView.vue') },
    { path: '/p/:slug', component: () => import('@/views/PolaroidView.vue') },
  ],
})
