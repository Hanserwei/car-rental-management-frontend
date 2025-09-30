<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getUserController } from '@/api-client/src/api-client/user-controller/user-controller'
import type { UserRegisterRequest } from '@/api-client/src/api-client/models'
import type { Rule } from 'ant-design-vue/es/form'

const router = useRouter()
const userStore = useUserStore()
const userController = getUserController()

// 表单数据
const formState = reactive<UserRegisterRequest>({
  username: '',
  password: '',
  confirmPassword: '',
  verificationCodeId: '',
  verificationCode: '',
})

// 验证码相关
const verificationCodeImage = ref<string>('')
const loadingVerificationCode = ref<boolean>(false)

// 注册加载状态
const loading = ref<boolean>(false)

// 自定义验证器：确认密码
const validateConfirmPassword = async (_rule: Rule, value: string) => {
  if (value === '') {
    return Promise.reject('请确认密码')
  }
  if (value !== formState.password) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

// 表单验证规则
const rules: Record<string, Rule[]> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 4, max: 20, message: '用户名长度为 4-20 个字符', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: '用户名仅支持字母、数字或下划线组合',
      trigger: 'blur',
    },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度为 6-32 个字符', trigger: 'blur' },
    { pattern: /^\S+$/, message: '密码不能包含空格', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
  verificationCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { min: 1, message: '验证码不能为空', trigger: 'blur' },
  ],
}

/**
 * 获取验证码
 */
const getVerificationCode = async () => {
  try {
    loadingVerificationCode.value = true
    const params = formState.verificationCodeId
      ? { codeId: formState.verificationCodeId }
      : undefined
    const response = await userController.getVerificationCode(params)

    if (response.data?.codeId && response.data?.imageBase64) {
      formState.verificationCodeId = response.data.codeId
      verificationCodeImage.value = response.data.imageBase64
    } else {
      message.error('获取验证码失败')
    }
  } catch (error) {
    console.error('获取验证码失败:', error)
    message.error('获取验证码失败，请重试')
  } finally {
    loadingVerificationCode.value = false
  }
}

/**
 * 刷新验证码
 */
const refreshVerificationCode = () => {
  formState.verificationCode = ''
  getVerificationCode()
}

/**
 * 处理注册
 */
const handleRegister = async () => {
  try {
    loading.value = true

    const response = await userController.userRegister(formState)

    if (response.code === 200 && response.data) {
      message.success('注册成功，正在自动登录...')

      // 保存用户信息和 token
      userStore.setUserInfo(response.data)

      // 跳转到首页
      setTimeout(() => {
        router.push('/')
      }, 1000)
    } else {
      message.error(response.message || '注册失败')
      // 注册失败后刷新验证码
      refreshVerificationCode()
    }
  } catch (error: unknown) {
    console.error('注册失败:', error)
    // 错误已在 axios 拦截器中处理，这里只需刷新验证码
    refreshVerificationCode()
  } finally {
    loading.value = false
  }
}

/**
 * 返回登录页面
 */
const goToLogin = () => {
  router.push('/login')
}

// 组件挂载时获取验证码
onMounted(() => {
  getVerificationCode()
})
</script>

<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h1 class="register-title">汽车租赁管理系统</h1>
        <p class="register-subtitle">用户注册</p>
      </div>

      <a-form :model="formState" :rules="rules" layout="vertical" @finish="handleRegister">
        <!-- 用户名 -->
        <a-form-item label="用户名" name="username">
          <a-input
            v-model:value="formState.username"
            placeholder="4-20个字符，支持字母、数字或下划线"
            size="large"
            allow-clear
          >
            <template #prefix>
              <user-outlined />
            </template>
          </a-input>
        </a-form-item>

        <!-- 密码 -->
        <a-form-item label="密码" name="password">
          <a-input-password
            v-model:value="formState.password"
            placeholder="6-32个字符，不能包含空格"
            size="large"
            allow-clear
          >
            <template #prefix>
              <lock-outlined />
            </template>
          </a-input-password>
        </a-form-item>

        <!-- 确认密码 -->
        <a-form-item label="确认密码" name="confirmPassword">
          <a-input-password
            v-model:value="formState.confirmPassword"
            placeholder="请再次输入密码"
            size="large"
            allow-clear
          >
            <template #prefix>
              <lock-outlined />
            </template>
          </a-input-password>
        </a-form-item>

        <!-- 验证码 -->
        <a-form-item label="验证码" name="verificationCode">
          <div class="verification-code-wrapper">
            <a-input
              v-model:value="formState.verificationCode"
              placeholder="请输入验证码"
              size="large"
              allow-clear
              style="flex: 1"
            >
              <template #prefix>
                <safety-certificate-outlined />
              </template>
            </a-input>
            <div class="verification-code-image" @click="refreshVerificationCode">
              <a-spin v-if="loadingVerificationCode" />
              <img
                v-else-if="verificationCodeImage"
                :src="verificationCodeImage"
                alt="验证码"
                title="点击刷新"
              />
              <span v-else class="verification-code-placeholder">点击获取</span>
            </div>
          </div>
        </a-form-item>

        <!-- 注册按钮 -->
        <a-form-item>
          <a-button type="primary" html-type="submit" size="large" block :loading="loading">
            注册
          </a-button>
        </a-form-item>

        <!-- 登录链接 -->
        <div class="register-footer">
          <span>已有账号？</span>
          <a @click="goToLogin">立即登录</a>
        </div>
      </a-form>
    </div>
  </div>
</template>

<style scoped lang="css">
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #ffffff 0%, #6e6e6e 100%);
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 450px;
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.register-subtitle {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.verification-code-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.verification-code-image {
  width: 120px;
  height: 40px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background: #f5f5f5;
  transition: all 0.3s;
}

.verification-code-image:hover {
  border-color: #40a9ff;
  box-shadow: 0 0 4px rgba(64, 169, 255, 0.3);
}

.verification-code-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.verification-code-placeholder {
  font-size: 12px;
  color: #999;
}

.register-footer {
  text-align: center;
  margin-top: 16px;
  color: #666;
}

.register-footer a {
  color: #1890ff;
  margin-left: 8px;
  cursor: pointer;
}

.register-footer a:hover {
  color: #40a9ff;
  text-decoration: underline;
}

:deep(.ant-form-item) {
  margin-bottom: 20px;
}

:deep(.ant-form-item-label > label) {
  font-weight: 500;
}
</style>
