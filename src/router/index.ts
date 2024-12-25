import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import DecoderStaticView from '../views/DecoderStaticView.vue'
import EncoderStaticView from '@/views/EncoderStaticView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/decoder-static',
      name: 'decoder-static',
      component: DecoderStaticView,
    },
    {
      path: '/encoder-static',
      name: 'encoder-static',
      component: EncoderStaticView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
