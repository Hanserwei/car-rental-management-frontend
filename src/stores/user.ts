import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { UserVO } from '@/api-client/src/api-client/models'

const TOKEN_NAME_KEY = 'tokenName'
const TOKEN_VALUE_KEY = 'tokenValue'
const USER_INFO_KEY = 'userInfo'

export const useUserStore = defineStore('userStore', () => {
  // 用户信息
  const userInfo = ref<UserVO | null>(null)

  // Token 信息
  const tokenName = ref<string | null>(null)
  const tokenValue = ref<string | null>(null)

  // 计算属性：判断是否已登录
  const isLoggedIn = computed(() => !!tokenValue.value && !!tokenName.value)

  // 计算属性：判断是否为管理员
  const isAdmin = computed(() => userInfo.value?.userType === '1')

  /**
   * 设置用户信息和 token
   */
  function setUserInfo(user: UserVO) {
    userInfo.value = user
    console.log('User info set:', userInfo.value)

    // 保存 token 信息
    if (user.token?.tokenName && user.token?.tokenValue) {
      tokenName.value = user.token.tokenName
      tokenValue.value = user.token.tokenValue
      console.log('Token set:', tokenName.value, tokenValue.value)

      // 持久化到 localStorage
      localStorage.setItem(TOKEN_NAME_KEY, user.token.tokenName)
      localStorage.setItem(TOKEN_VALUE_KEY, user.token.tokenValue)
    }

    // 持久化用户信息（不包含 token）
    const userInfoToStore = { ...user }
    delete userInfoToStore.token
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfoToStore))
  }

  /**
   * 从 localStorage 恢复用户信息
   */
  function restoreUserInfo() {
    const storedTokenName = localStorage.getItem(TOKEN_NAME_KEY)
    const storedTokenValue = localStorage.getItem(TOKEN_VALUE_KEY)
    const storedUserInfo = localStorage.getItem(USER_INFO_KEY)

    if (storedTokenName && storedTokenValue) {
      tokenName.value = storedTokenName
      tokenValue.value = storedTokenValue
    }

    if (storedUserInfo) {
      try {
        userInfo.value = JSON.parse(storedUserInfo)
      } catch (e) {
        console.error('Failed to parse user info from localStorage', e)
      }
    }
  }

  /**
   * 清除用户信息和 token
   */
  function clearUserInfo() {
    userInfo.value = null
    tokenName.value = null
    tokenValue.value = null

    localStorage.removeItem(TOKEN_NAME_KEY)
    localStorage.removeItem(TOKEN_VALUE_KEY)
    localStorage.removeItem(USER_INFO_KEY)
  }

  /**
   * 获取 token 用于请求头
   */
  function getToken(): { name: string; value: string } | null {
    if (tokenName.value && tokenValue.value) {
      return {
        name: tokenName.value,
        value: tokenValue.value,
      }
    }
    return null
  }

  // 初始化时恢复用户信息
  restoreUserInfo()

  return {
    userInfo,
    tokenName,
    tokenValue,
    isLoggedIn,
    isAdmin,
    setUserInfo,
    restoreUserInfo,
    clearUserInfo,
    getToken,
  }
})
