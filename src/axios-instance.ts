import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { message } from 'ant-design-vue'

// 复用的 Axios 实例
const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8088/api',
  timeout: 10000,
})

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // 从 localStorage 中获取 sa-token 的 tokenName 和 tokenValue
    const tokenName = localStorage.getItem('tokenName')
    const tokenValue = localStorage.getItem('tokenValue')
    
    // 如果存在 token，则添加到请求头
    if (tokenName && tokenValue) {
      config.headers[tokenName] = tokenValue
    }
    
    return config
  },
  (error) => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  },
)

// 响应拦截器（统一返回 data）
instance.interceptors.response.use(
  (response) => {
    // 检查是否有新的 token（sa-token 可能会刷新 token）
    const tokenName = localStorage.getItem('tokenName')
    if (tokenName && response.headers[tokenName.toLowerCase()]) {
      const newTokenValue = response.headers[tokenName.toLowerCase()]
      localStorage.setItem('tokenValue', newTokenValue)
      console.log('Token 已从响应头更新')
    }
    
    return response.data
  },
  (error) => {
    // 统一处理错误
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          message.error('未授权，请重新登录')
          // 清除 token
          localStorage.removeItem('tokenName')
          localStorage.removeItem('tokenValue')
          localStorage.removeItem('userInfo')
          // 可以在这里跳转到登录页
          break
        case 403:
          message.error('无权限访问')
          break
        case 404:
          message.error('请求的资源不存在')
          break
        case 500:
          message.error('服务器错误')
          break
        default:
          message.error(data?.message || '请求失败')
      }
    } else if (error.request) {
      message.error('网络错误，请检查网络连接')
    } else {
      message.error('请求配置错误')
    }
    
    return Promise.reject(error)
  },
)

// Orval mutator 期望的签名：axiosInstance<T>(config) => Promise<T>
// noinspection JSUnusedGlobalSymbols
export const axiosInstance = async <T = unknown>(config: AxiosRequestConfig): Promise<T> => {
  const response = await instance.request<T>(config)
  // 上面的响应拦截器已将返回值转为 data，这里为了类型安全再断言一次
  return response as unknown as T
}
