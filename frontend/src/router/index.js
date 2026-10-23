import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import HomeView from '../views/HomeView.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/products',
    name: 'products',
    component: () => import('../views/ProductsView.vue'),
  },
  {
    path: '/banner/:id',
    name: 'banner-story',
    component: () => import('../views/BannerStoryView.vue'),
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
  },
  {
    path: '/product/:slug',
    name: 'product-detail',
    component: () => import('../views/ProductDetailView.vue'),
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('../views/CheckoutView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/order/:id',
    name: 'order-detail',
    component: () => import('../views/OrderDetailView.vue'),
  },
  {
    path: '/pos',
    name: 'pos',
    component: () => import('../views/PosView.vue'),
    meta: { requiresStaff: true },
  },
  {
    path: '/admin/revenue',
    name: 'staff-revenue',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresStaff: true },
  },
  {
    path: '/admin/customers',
    name: 'staff-customers',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresStaff: true },
  },
  {
    path: '/admin/reviews',
    name: 'staff-reviews',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresStaff: true },
  },
  {
    path: '/admin/:section?',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAdmin: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('../views/AccountView.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/orders', name: 'order-history', component: () => import('../views/OrderHistoryView.vue'), meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return {
      name: 'login',
      query: { redirect: to.fullPath, reason: authStore.isAuthenticated ? 'forbidden' : 'login' },
    };
  }

  if (to.meta.requiresStaff && !authStore.isStaff) {
    return {
      name: 'login',
      query: { redirect: to.fullPath, reason: authStore.isAuthenticated ? 'forbidden' : 'login' },
    };
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath, reason: 'login' } };
  }

  if ((to.name === 'login' || to.name === 'register') && authStore.isAuthenticated) {
    return authStore.isAdmin ? { name: 'admin' } : authStore.isStaff ? { name: 'pos' } : { name: 'home' };
  }
});

export default router;
