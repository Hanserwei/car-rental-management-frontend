<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)

// 统计数据（示例）
const statistics = ref([
  { title: '用户总数', value: 0, icon: 'team', color: '#1890ff' },
  { title: '角色总数', value: 0, icon: 'solution', color: '#52c41a' },
  { title: '权限总数', value: 0, icon: 'safety', color: '#faad14' },
  { title: '在线用户', value: 0, icon: 'user', color: '#f5222d' },
])

onMounted(() => {
  // TODO: 从后端获取统计数据
})
</script>

<template>
  <div class="dashboard">
    <a-card :bordered="false" style="margin-bottom: 24px">
      <h2>欢迎回来，{{ userInfo?.nickname || userInfo?.username }}！</h2>
      <p style="color: #8c8c8c">
        当前时间：{{ new Date().toLocaleString('zh-CN', { hour12: false }) }}
      </p>
    </a-card>

    <a-row :gutter="16" style="margin-bottom: 24px">
      <a-col :xs="24" :sm="12" :md="6" v-for="(item, index) in statistics" :key="index">
        <a-card :bordered="false">
          <a-statistic
            :title="item.title"
            :value="item.value"
            :value-style="{ color: item.color }"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :xs="24" :lg="12" style="margin-bottom: 16px">
        <a-card title="快捷入口" :bordered="false">
          <a-space direction="vertical" style="width: 100%">
            <a-button block type="primary" @click="$router.push('/admin/system/users')">
              用户管理
            </a-button>
            <a-button block @click="$router.push('/admin/system/roles')">角色管理</a-button>
            <a-button block @click="$router.push('/admin/system/permissions')">权限管理</a-button>
          </a-space>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="12" style="margin-bottom: 16px">
        <a-card title="系统信息" :bordered="false">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="用户类型">
              <a-tag v-if="userInfo?.userType === '1'" color="red">管理员</a-tag>
              <a-tag v-else color="blue">普通用户</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="角色">
              <a-tag v-for="role in userInfo?.roleCodes" :key="role" color="blue">
                {{ role }}
              </a-tag>
              <span v-if="!userInfo?.roleCodes || userInfo.roleCodes.length === 0">-</span>
            </a-descriptions-item>
            <a-descriptions-item label="权限数量">
              {{ userInfo?.permissionCodes?.length || 0 }}
            </a-descriptions-item>
            <a-descriptions-item label="最后登录">
              {{ userInfo?.lastLoginTime || '-' }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped></style>
