import { createApp } from 'vue'
import { createPinia } from 'pinia'
import antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import {
  UserOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons-vue'

import App from './App.vue'
import router from './router'
import { permission } from './directives/permission'

const app = createApp(App)

// 注册图标组件
app.component('UserOutlined', UserOutlined)
app.component('LockOutlined', LockOutlined)
app.component('SafetyCertificateOutlined', SafetyCertificateOutlined)

// 注册权限指令
app.directive('permission', permission)

app.use(createPinia())
app.use(antd)
app.use(router)

app.mount('#app')
