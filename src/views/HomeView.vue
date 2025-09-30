<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getUserController } from '@/api-client/src/api-client/user-controller/user-controller'
import { message } from 'ant-design-vue'

const router = useRouter()
const userStore = useUserStore()
const userController = getUserController()

const userInfo = computed(() => userStore.userInfo)
const isLoggedIn = computed(() => userStore.isLoggedIn)
const isAdmin = computed(() => userStore.isAdmin)

const handleLogout = async () => {
  try {
    await userController.logout()
    message.success('登出成功')
    userStore.clearUserInfo()
    await router.push('/login')
  } catch (error) {
    console.error('登出失败:', error)
    // 即使接口失败，也清除本地信息
    userStore.clearUserInfo()
    await router.push('/login')
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="home-container">
    <div class="home-content">
      <h1>汽车租赁管理系统</h1>

      <div v-if="isLoggedIn" class="user-info-card">
        <a-card title="用户信息" :bordered="false">
          <a-descriptions :column="1" bordered>
            <a-descriptions-item label="用户名">
              {{ userInfo?.username }}
            </a-descriptions-item>
            <a-descriptions-item label="昵称">
              {{ userInfo?.nickname || '未设置' }}
            </a-descriptions-item>
            <a-descriptions-item label="用户类型">
              <a-tag :color="isAdmin ? 'red' : 'blue'">
                {{ isAdmin ? '管理员' : '普通用户' }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag :color="Number(userInfo?.status) === 1 ? 'green' : 'red'">
                {{ Number(userInfo?.status) === 1 ? '启用' : '禁用' }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="最后登录时间">
              {{ userInfo?.lastLoginTime || '未知' }}
            </a-descriptions-item>
          </a-descriptions>

          <div style="margin-top: 24px; text-align: center">
            <a-button type="primary" danger @click="handleLogout"> 退出登录 </a-button>
          </div>
        </a-card>
      </div>

      <div v-else class="welcome-card">
        <a-card :bordered="false">
          <div class="welcome-content">
            <h2>欢迎使用汽车租赁管理系统</h2>
            <p>请先登录以继续使用系统功能</p>
            <a-button type="primary" size="large" @click="goToLogin"> 前往登录 </a-button>
          </div>
        </a-card>
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.home-content {
  width: 100%;
  max-width: 800px;
}

.home-content h1 {
  text-align: center;
  color: white;
  font-size: 36px;
  margin-bottom: 40px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-info-card,
.welcome-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.welcome-content {
  text-align: center;
  padding: 40px 20px;
}

.welcome-content h2 {
  font-size: 24px;
  color: #1a1a1a;
  margin-bottom: 16px;
}

.welcome-content p {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
}

:deep(.ant-card-head) {
  background: linear-gradient(135deg, #ffffff 0%, #b9b9b9 100%);
  color: white;
}

:deep(.ant-card-head-title) {
  color: white;
  font-size: 20px;
  font-weight: 600;
}
</style>
