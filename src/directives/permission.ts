import type { Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/stores/user'

/**
 * 权限指令
 * 使用方式：v-permission="'system:user:list'"
 * 或者：v-permission="['system:user:list', 'system:user:create']"
 */
export const permission: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding
    const userStore = useUserStore()
    const permissionCodes = userStore.userInfo?.permissionCodes || []

    if (value) {
      let hasPermission = false

      if (typeof value === 'string') {
        // 单个权限码
        hasPermission = permissionCodes.includes(value)
      } else if (Array.isArray(value)) {
        // 多个权限码，满足其中一个即可
        hasPermission = value.some((code) => permissionCodes.includes(code))
      }

      if (!hasPermission) {
        // 没有权限，移除元素
        el.parentNode?.removeChild(el)
      }
    }
  },
}

/**
 * 检查是否有指定权限的工具函数
 * @param permission 权限码或权限码数组
 * @returns 是否有权限
 */
export function hasPermission(permission: string | string[]): boolean {
  const userStore = useUserStore()
  const permissionCodes = userStore.userInfo?.permissionCodes || []

  if (typeof permission === 'string') {
    return permissionCodes.includes(permission)
  } else if (Array.isArray(permission)) {
    return permission.some((code) => permissionCodes.includes(code))
  }

  return false
}

/**
 * 检查是否拥有所有指定权限
 * @param permissions 权限码数组
 * @returns 是否拥有所有权限
 */
export function hasAllPermissions(permissions: string[]): boolean {
  const userStore = useUserStore()
  const permissionCodes = userStore.userInfo?.permissionCodes || []

  return permissions.every((code) => permissionCodes.includes(code))
}