<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { message } from 'ant-design-vue'
import { getUserController } from '@/api-client/src/api-client/user-controller/user-controller'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const userController = getUserController()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const isAdmin = computed(() => userStore.isAdmin)
const userInfo = computed(() => userStore.userInfo)

const activeMenuKey = computed(() => {
  if (route.path.startsWith('/orders')) {
    return '/orders'
  }
  if (route.path.startsWith('/news')) {
    return '/news'
  }
  return '/'
})

const handleMenuClick = ({ key }: { key: string }) => {
  if (key === '/orders' && !isLoggedIn.value) {
    message.warning('请登录后查看我的订单')
    router.push('/login')
    return
  }
  router.push(key)
}

const handleLogout = async () => {
  try {
    await userController.logout()
    message.success('已退出登录')
  } catch (error) {
    console.warn('登出接口调用失败，忽略', error)
  } finally {
    userStore.clearUserInfo()
    await router.push('/login')
  }
}

const goToAdmin = () => {
  router.push('/admin')
}

const goToLogin = () => {
  router.push('/login')
}

const goToRegister = () => {
  router.push('/register')
}
</script>

<template>
  <a-layout class="portal-layout">
    <a-layout-header class="portal-header">
      <div class="logo" @click="() => router.push('/')">
        <span class="brand">CarRental</span>
      </div>
      <a-menu
        class="portal-menu"
        mode="horizontal"
        :selectedKeys="[activeMenuKey]"
        @click="handleMenuClick"
      >
        <a-menu-item key="/">租车服务</a-menu-item>
        <a-menu-item key="/news">新闻资讯</a-menu-item>
        <a-menu-item key="/orders">我的订单</a-menu-item>
      </a-menu>
      <div class="action-area">
        <template v-if="isLoggedIn">
          <a-space size="large" align="center">
            <a-typography-text strong>
              {{ userInfo?.nickname || userInfo?.username || '用户' }}
            </a-typography-text>
            <a-dropdown>
              <a-avatar style="background-color: #1890ff">
                {{ (userInfo?.nickname || userInfo?.username || 'U').slice(0, 1).toUpperCase() }}
              </a-avatar>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="profile" disabled>
                    <span>账户：{{ userInfo?.username }}</span>
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item v-if="isAdmin" key="admin" @click="goToAdmin">后台管理</a-menu-item>
                  <a-menu-item key="logout" @click="handleLogout">退出登录</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-space>
        </template>
        <template v-else>
          <a-space size="middle">
            <a-button type="default" @click="goToLogin">登录</a-button>
            <a-button type="primary" @click="goToRegister">注册</a-button>
          </a-space>
        </template>
      </div>
    </a-layout-header>
    <a-layout-content class="portal-content">
      <router-view />
    </a-layout-content>
    <a-layout-footer class="portal-footer">
      <span>© {{ new Date().getFullYear() }} CarRental. All rights reserved.</span>
    </a-layout-footer>
  </a-layout>
</template>

<style scoped lang="css">
.portal-layout {
  min-height: 100vh;
  background: #f5f7fa;
}

.portal-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
  padding: 0 32px;
}

.logo {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-right: 32px;
}

.brand {
  font-size: 20px;
  font-weight: 700;
  color: #1677ff;
  letter-spacing: 0.5px;
}

.portal-menu {
  flex: 1;
  background: transparent;
  border-bottom: none;
}

.action-area {
  display: flex;
  align-items: center;
  gap: 16px;
}

.portal-content {
  padding: 32px 48px;
}

.portal-footer {
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
  background: transparent;
}

@media (max-width: 992px) {
  .portal-header {
    flex-wrap: wrap;
    padding: 12px 16px;
  }

  .portal-menu {
    width: 100%;
    margin-top: 12px;
  }

  .portal-content {
    padding: 24px 16px;
  }
}
</style>
