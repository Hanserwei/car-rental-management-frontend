<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getUserController } from '@/api-client/src/api-client/user-controller/user-controller'
import type {
  UserEmailLoginCodeRequest,
  UserEmailLoginRequest,
  UserLoginRequest,
} from '@/api-client/src/api-client/models'
import type { Rule } from 'ant-design-vue/es/form'

const router = useRouter()
const userStore = useUserStore()
const userController = getUserController()

const activeLoginTab = ref<'password' | 'email'>('password')

// 表单数据
const passwordFormState = reactive<UserLoginRequest>({
  username: '',
  password: '',
  userType: '2', // 默认普通用户
  verificationCodeId: '',
  verificationCode: '',
})

const emailFormState = reactive<UserEmailLoginRequest>({
  email: '',
  verificationCode: '',
  userType: '2',
})

// 验证码相关
const verificationCodeImage = ref<string>('')
const loadingVerificationCode = ref<boolean>(false)

// 登录加载状态
const passwordLoading = ref<boolean>(false)
const emailLoading = ref<boolean>(false)
const sendingEmailCode = ref<boolean>(false)
const emailCodeCountdown = ref<number>(0)

let emailCountdownTimer: ReturnType<typeof setInterval> | null = null

// 表单验证规则
const passwordRules: Record<string, Rule[]> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 1, message: '用户名不能为空', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 1, message: '密码不能为空', trigger: 'blur' },
  ],
  userType: [{ required: true, message: '请选择用户类型', trigger: 'change' }],
  verificationCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { min: 1, message: '验证码不能为空', trigger: 'blur' },
  ],
}

const emailRules: Record<string, Rule[]> = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  userType: [{ required: true, message: '请选择用户类型', trigger: 'change' }],
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
    const params = passwordFormState.verificationCodeId
      ? { codeId: passwordFormState.verificationCodeId }
      : undefined
    const response = await userController.getVerificationCode(params)

    if (response.data?.codeId && response.data?.imageBase64) {
      passwordFormState.verificationCodeId = response.data.codeId
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
  passwordFormState.verificationCode = ''
  getVerificationCode()
}

/**
 * 处理登录
 */
const handlePasswordLogin = async () => {
  try {
    passwordLoading.value = true

    const response = await userController.userLogin(passwordFormState)

    if (response.code === 200 && response.data) {
      message.success('登录成功')

      // 保存用户信息和 token
      userStore.setUserInfo(response.data)

      // 根据用户类型跳转：管理员跳转到后台管理，普通用户跳转到首页
      if (response.data.userType === '1') {
        // 管理员跳转到后台管理（默认跳转到系统首页）
        await router.push('/admin/dashboard')
      } else {
        // 普通用户跳转到租车页面
        await router.push('/cars')
      }
    } else {
      message.error(response.message || '登录失败')
      // 登录失败后刷新验证码
      refreshVerificationCode()
    }
  } catch (error: unknown) {
    console.error('登录失败:', error)
    // 错误已在 axios 拦截器中处理，这里只需刷新验证码
    refreshVerificationCode()
  } finally {
    passwordLoading.value = false
  }
}

const startEmailCountdown = () => {
  emailCodeCountdown.value = 60
  if (emailCountdownTimer) {
    clearInterval(emailCountdownTimer)
  }
  emailCountdownTimer = setInterval(() => {
    if (emailCodeCountdown.value <= 1) {
      emailCodeCountdown.value = 0
      if (emailCountdownTimer) {
        clearInterval(emailCountdownTimer)
        emailCountdownTimer = null
      }
    } else {
      emailCodeCountdown.value -= 1
    }
  }, 1000)
}

const handleSendEmailCode = async () => {
  if (!emailFormState.email) {
    message.warning('请先输入邮箱')
    return
  }
  try {
    sendingEmailCode.value = true
    const payload: UserEmailLoginCodeRequest = {
      email: emailFormState.email,
      userType: emailFormState.userType ?? '2',
    }
    const response = await userController.sendEmailLoginCode(payload)
    if (response.code === 200) {
      message.success('验证码已发送，请检查邮箱')
      startEmailCountdown()
    } else {
      message.error(response.message || '发送验证码失败')
    }
  } catch (error) {
    console.error('发送邮箱验证码失败:', error)
  } finally {
    sendingEmailCode.value = false
  }
}

const handleEmailLogin = async () => {
  try {
    emailLoading.value = true
    const loginPayload: UserEmailLoginRequest = {
      ...emailFormState,
      userType: emailFormState.userType ?? '2',
    }
    const response = await userController.userLoginByEmail(loginPayload)
    if (response.code === 200 && response.data) {
      message.success('登录成功')
      userStore.setUserInfo(response.data)
      if (response.data.userType === '1') {
        await router.push('/admin/dashboard')
      } else {
        await router.push('/cars')
      }
    } else {
      message.error(response.message || '登录失败')
    }
  } catch (error) {
    console.error('邮箱登录失败:', error)
  } finally {
    emailLoading.value = false
  }
}

/**
 * 跳转到注册页面
 */
const goToRegister = () => {
  router.push('/register')
}

// 组件挂载时获取验证码
onMounted(() => {
  getVerificationCode()
})

watch(activeLoginTab, (tab) => {
  if (tab === 'password' && !verificationCodeImage.value) {
    getVerificationCode()
  }
})

onBeforeUnmount(() => {
  if (emailCountdownTimer) {
    clearInterval(emailCountdownTimer)
  }
})
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">汽车租赁管理系统</h1>
        <p class="login-subtitle">欢迎登录</p>
      </div>

      <a-tabs v-model:activeKey="activeLoginTab" class="login-tabs">
        <a-tab-pane key="password" tab="账号密码登录">
          <a-form
            :model="passwordFormState"
            :rules="passwordRules"
            layout="vertical"
            @finish="handlePasswordLogin"
          >
            <!-- 用户类型选择 -->
            <a-form-item label="用户类型" name="userType">
              <a-radio-group v-model:value="passwordFormState.userType" button-style="solid">
                <a-radio-button value="2">普通用户</a-radio-button>
                <a-radio-button value="1">管理员</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <!-- 用户名 -->
            <a-form-item label="用户名" name="username">
              <a-input
                v-model:value="passwordFormState.username"
                placeholder="请输入用户名"
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
                v-model:value="passwordFormState.password"
                placeholder="请输入密码"
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
                  v-model:value="passwordFormState.verificationCode"
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

            <!-- 登录按钮 -->
            <a-form-item>
              <a-button
                type="primary"
                html-type="submit"
                size="large"
                block
                :loading="passwordLoading"
              >
                登录
              </a-button>
            </a-form-item>
          </a-form>
        </a-tab-pane>

        <a-tab-pane key="email" tab="邮箱验证码登录">
          <a-form
            :model="emailFormState"
            :rules="emailRules"
            layout="vertical"
            @finish="handleEmailLogin"
          >
            <!-- 用户类型选择 -->
            <a-form-item label="用户类型" name="userType">
              <a-radio-group v-model:value="emailFormState.userType" button-style="solid">
                <a-radio-button value="2">普通用户</a-radio-button>
                <a-radio-button value="1">管理员</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <!-- 邮箱 -->
            <a-form-item label="邮箱" name="email">
              <a-input
                v-model:value="emailFormState.email"
                placeholder="请输入邮箱"
                size="large"
                allow-clear
              >
                <template #prefix>
                  <mail-outlined />
                </template>
              </a-input>
            </a-form-item>

            <!-- 邮箱验证码 -->
            <a-form-item label="验证码" name="verificationCode">
              <div class="verification-code-wrapper">
                <a-input
                  v-model:value="emailFormState.verificationCode"
                  placeholder="请输入验证码"
                  size="large"
                  allow-clear
                  style="flex: 1"
                >
                  <template #prefix>
                    <safety-certificate-outlined />
                  </template>
                </a-input>
                <a-button
                  type="primary"
                  ghost
                  size="large"
                  class="send-code-button"
                  :loading="sendingEmailCode"
                  :disabled="emailCodeCountdown > 0"
                  @click="handleSendEmailCode"
                >
                  {{ emailCodeCountdown > 0 ? `${emailCodeCountdown}s后重试` : '发送验证码' }}
                </a-button>
              </div>
            </a-form-item>

            <!-- 登录按钮 -->
            <a-form-item>
              <a-button
                type="primary"
                html-type="submit"
                size="large"
                block
                :loading="emailLoading"
              >
                登录
              </a-button>
            </a-form-item>
          </a-form>
        </a-tab-pane>
      </a-tabs>

      <!-- 注册链接 -->
      <div class="login-footer">
        <span>还没有账号？</span>
        <a @click="goToRegister">立即注册</a>
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #ffffff 0%, #8a8a8a 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 450px;
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.login-tabs {
  margin-top: 24px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.login-subtitle {
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

.send-code-button {
  min-width: 140px;
}

.login-footer {
  text-align: center;
  margin-top: 16px;
  color: #666;
}

.login-footer a {
  color: #1890ff;
  margin-left: 8px;
  cursor: pointer;
}

.login-footer a:hover {
  color: #40a9ff;
  text-decoration: underline;
}

:deep(.ant-form-item) {
  margin-bottom: 20px;
}

:deep(.ant-form-item-label > label) {
  font-weight: 500;
}

:deep(.ant-radio-group) {
  width: 100%;
}

:deep(.ant-radio-button-wrapper) {
  flex: 1;
  text-align: center;
}
</style>
