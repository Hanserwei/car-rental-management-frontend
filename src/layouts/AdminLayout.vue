<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  ShoppingOutlined,
  CarOutlined,
  TeamOutlined,
  SettingOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
  CommentOutlined,
  SafetyOutlined,
  ApartmentOutlined,
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import { getUserController } from '@/api-client/src/api-client/user-controller/user-controller'
import type { MenuProps } from 'ant-design-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const userController = getUserController()

// 折叠状态
const collapsed = ref(false)

// 用户信息
const userInfo = computed(() => userStore.userInfo)

// 用户权限码列表
const permissionCodes = computed(() => userStore.userInfo?.permissionCodes || [])

// 当前选中的菜单
const selectedKeys = ref<string[]>([route.path])

// 当前展开的菜单
const openKeys = ref<string[]>([])

/**
 * 前端定义的完整菜单结构
 */
interface MenuItem {
  key: string
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any
  permissionCode: string
  children?: MenuItem[]
}

const allMenus: MenuItem[] = [
  {
    key: '/admin/dashboard',
    label: '系统首页',
    icon: DashboardOutlined,
    permissionCode: 'system:dashboard:view',
  },
  {
    key: '/admin/orders',
    label: '订单管理',
    icon: ShoppingOutlined,
    permissionCode: 'rental:order:menu',
  },
  {
    key: '/admin/resources/cars',
    label: '车辆管理',
    icon: CarOutlined,
    permissionCode: 'resource:car:menu',
  },
  {
    key: '/admin/resources/brands',
    label: '品牌管理',
    icon: AppstoreOutlined,
    permissionCode: 'resource:brand:menu',
  },
  {
    key: '/admin/resources/types',
    label: '车型管理',
    icon: AppstoreOutlined,
    permissionCode: 'resource:type:menu',
  },
  {
    key: '/admin/resources/cities',
    label: '城市管理',
    icon: EnvironmentOutlined,
    permissionCode: 'resource:city:menu',
  },
  {
    key: '/admin/community',
    label: '社区管理',
    icon: CommentOutlined,
    permissionCode: 'community:menu',
  },
  {
    key: '/admin/system',
    label: '系统管理',
    icon: SettingOutlined,
    permissionCode: 'account:menu',
    children: [
      {
        key: '/admin/system/users',
        label: '用户管理',
        icon: TeamOutlined,
        permissionCode: 'account:user:list',
      },
      {
        key: '/admin/system/roles',
        label: '角色管理',
        icon: ApartmentOutlined,
        permissionCode: 'account:role:assign',
      },
      {
        key: '/admin/system/permissions',
        label: '权限管理',
        icon: SafetyOutlined,
        permissionCode: 'account:menu',
      },
      {
        key: '/admin/system/user-roles',
        label: '用户角色关系',
        icon: TeamOutlined,
        permissionCode: 'account:user:list',
      },
      {
        key: '/admin/system/role-permissions',
        label: '角色权限关系',
        icon: SafetyOutlined,
        permissionCode: 'account:role:assign',
      },
    ],
  },
]

/**
 * 检查是否有权限
 */
const hasPermission = (permissionCode: string): boolean => {
  return permissionCodes.value.includes(permissionCode)
}

/**
 * 过滤菜单（根据权限）
 */
const filterMenus = (menus: MenuItem[]): MenuItem[] => {
  return menus
    .filter((menu) => hasPermission(menu.permissionCode))
    .map((menu) => {
      if (menu.children && menu.children.length > 0) {
        const filteredChildren = filterMenus(menu.children)
        // 如果有子菜单但过滤后子菜单为空，则不显示父菜单
        if (filteredChildren.length === 0) {
          return null
        }
        return {
          ...menu,
          children: filteredChildren,
        }
      }
      return menu
    })
    .filter((menu) => menu !== null) as MenuItem[]
}

/**
 * 转换为 Ant Design Menu 格式
 */

const convertToAntdMenu = (menus: MenuItem[]): MenuProps['items'] => {
  return menus.map((menu) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item: any = {
      key: menu.key,
      label: menu.label,
      icon: menu.icon ? h(menu.icon) : undefined,
    }

    if (menu.children && menu.children.length > 0) {
      item.children = convertToAntdMenu(menu.children)
    }

    return item
  })
}

// 根据权限过滤后的菜单
const filteredMenus = computed(() => filterMenus(allMenus))

// 转换为 Ant Design 格式的菜单
const menuItems = computed(() => convertToAntdMenu(filteredMenus.value))

/**
 * 菜单点击事件
 */
const handleMenuClick = ({ key }: { key: string }) => {
  selectedKeys.value = [key]
  router.push(key)
}

/**
 * 子菜单展开/收起事件
 */
const handleOpenChange = (keys: string[]) => {
  openKeys.value = keys
}

/**
 * 退出登录
 */
const handleLogout = async () => {
  try {
    await userController.logout()
    message.success('退出登录成功')
    userStore.clearUserInfo()
    router.push('/login')
  } catch (error) {
    console.error('退出登录失败:', error)
    // 即使接口失败也清除本地信息
    userStore.clearUserInfo()
    router.push('/login')
  }
}

// 监听路由变化，更新选中的菜单和展开的父菜单
router.afterEach((to) => {
  selectedKeys.value = [to.path]

  // 自动展开包含当前路由的父菜单
  if (to.path.startsWith('/admin/system/')) {
    openKeys.value = ['/admin/system']
  }
})

// 初始化时设置展开的菜单
if (route.path.startsWith('/admin/system/')) {
  openKeys.value = ['/admin/system']
}
</script>

<template>
  <a-layout class="admin-layout">
    <!-- 侧边栏 -->
    <a-layout-sider v-model:collapsed="collapsed" collapsible :trigger="null" theme="light">
      <div class="logo">
        <h2 v-if="!collapsed">汽车租赁管理</h2>
        <h2 v-else>租赁</h2>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        v-model:openKeys="openKeys"
        mode="inline"
        :items="menuItems"
        @click="handleMenuClick"
        @openChange="handleOpenChange"
      />
    </a-layout-sider>

    <!-- 主内容区 -->
    <a-layout>
      <!-- 头部 -->
      <a-layout-header class="admin-header">
        <div class="header-left">
          <menu-unfold-outlined
            v-if="collapsed"
            class="trigger"
            @click="() => (collapsed = !collapsed)"
          />
          <menu-fold-outlined v-else class="trigger" @click="() => (collapsed = !collapsed)" />
        </div>

        <div class="header-right">
          <a-dropdown>
            <div class="user-info">
              <a-avatar :size="32" :src="userInfo?.avatarUrl">
                <template #icon>
                  <user-outlined />
                </template>
              </a-avatar>
              <span class="username">{{ userInfo?.nickname || userInfo?.username }}</span>
            </div>
            <template #overlay>
              <a-menu>
                <a-menu-item key="logout" @click="handleLogout">
                  <logout-outlined />
                  <span>退出登录</span>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>

      <!-- 内容区 -->
      <a-layout-content class="admin-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #f0f0f0;
}

.logo h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
}

.admin-header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
}

.trigger {
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s;
}

.trigger:hover {
  color: #1890ff;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f5f5;
}

.username {
  font-size: 14px;
  color: #262626;
}

.admin-content {
  margin: 24px;
  padding: 24px;
  background: #fff;
  border-radius: 4px;
  min-height: calc(100vh - 112px);
}
</style>
