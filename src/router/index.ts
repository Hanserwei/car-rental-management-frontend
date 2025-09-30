import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      redirect: '/admin/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/admin/Dashboard.vue'),
          meta: { requiresAuth: true, title: '系统首页' },
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/admin/OrderManagement.vue'),
          meta: { requiresAuth: true, title: '订单管理' },
        },
        {
          path: 'resources/cars',
          name: 'cars',
          component: () => import('@/views/admin/resources/CarManagement.vue'),
          meta: { requiresAuth: true, title: '车辆管理' },
        },
        {
          path: 'resources/brands',
          name: 'brands',
          component: () => import('@/views/admin/resources/BrandManagement.vue'),
          meta: { requiresAuth: true, title: '品牌管理' },
        },
        {
          path: 'resources/types',
          name: 'types',
          component: () => import('@/views/admin/resources/TypeManagement.vue'),
          meta: { requiresAuth: true, title: '车型管理' },
        },
        {
          path: 'resources/cities',
          name: 'cities',
          component: () => import('@/views/admin/resources/CityManagement.vue'),
          meta: { requiresAuth: true, title: '城市管理' },
        },
        {
          path: 'community',
          name: 'community',
          component: () => import('@/views/admin/CommunityManagement.vue'),
          meta: { requiresAuth: true, title: '社区管理' },
        },
        {
          path: 'system/users',
          name: 'systemUsers',
          component: () => import('@/views/admin/system/UserManagement.vue'),
          meta: { requiresAuth: true, title: '用户管理' },
        },
        {
          path: 'system/roles',
          name: 'systemRoles',
          component: () => import('@/views/admin/system/RoleManagement.vue'),
          meta: { requiresAuth: true, title: '角色管理' },
        },
        {
          path: 'system/permissions',
          name: 'systemPermissions',
          component: () => import('@/views/admin/system/PermissionManagement.vue'),
          meta: { requiresAuth: true, title: '权限管理' },
        },
        {
          path: 'system/user-roles',
          name: 'systemUserRoles',
          component: () => import('@/views/admin/system/UserRoleManagement.vue'),
          meta: { requiresAuth: true, title: '用户角色关系' },
        },
        {
          path: 'system/role-permissions',
          name: 'systemRolePermissions',
          component: () => import('@/views/admin/system/RolePermissionManagement.vue'),
          meta: { requiresAuth: true, title: '角色权限关系' },
        },
      ],
    },
  ],
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  // 如果路由需要认证
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
    return
  }

  // 如果路由需要管理员权限
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next('/')
    return
  }

  next()
})

export default router
