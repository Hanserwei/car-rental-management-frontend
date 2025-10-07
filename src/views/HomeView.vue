<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const isAdmin = computed(() => userStore.isAdmin)
const displayName = computed(
  () => userStore.userInfo?.nickname || userStore.userInfo?.username || '尊贵的用户',
)

const goToCars = () => {
  router.push('/cars')
}

const goToOrders = () => {
  if (!isLoggedIn.value) {
    router.push('/login')
    return
  }
  router.push('/orders')
}

const goToAdmin = () => {
  router.push('/admin')
}

const goToLogin = () => {
  router.push('/login')
}

const quickActions = computed(() => [
  {
    title: '海量热销车型',
    description: '覆盖商务出行、家庭旅行到新能源体验，多维度满足租车需求。',
    icon: '🚗',
  },
  {
    title: '7x24 小时客服',
    description: '下单后专属顾问跟进，全流程服务，让出行安心无忧。',
    icon: '🕑',
  },
  {
    title: '灵活取还点',
    description: '城市核心商圈随心取还，支持跨城还车，出行更自由。',
    icon: '📍',
  },
])

const benefitItems = [
  {
    title: '快速下单',
    desc: '三步完成在线预订，系统自动锁定车源并同步库存。',
  },
  {
    title: '透明费用',
    desc: '所有费用在线可视，无隐形消费，支持电子合同。',
  },
  {
    title: '多维保障',
    desc: '订单状态实时可查，平台与线下门店联合保障行程安全。',
  },
]
</script>

<template>
  <div class="portal-home">
    <section class="hero">
      <div class="hero-text">
        <a-tag color="blue" class="hero-badge">智能租车 · 高效出行</a-tag>
        <h1>你好，{{ displayName }}</h1>
        <p>
          一站式智能租车平台，集车辆浏览、在线预订与订单管理于一体。让每一次出发都更加省心，从城市通勤到长途旅行，都有合适的车辆为你守候。
        </p>
        <div class="hero-actions">
          <a-space size="middle">
            <a-button type="primary" size="large" @click="goToCars"> 浏览可租车辆 </a-button>
            <a-button size="large" @click="goToOrders">
              {{ isLoggedIn ? '查看我的订单' : '立即登录' }}
            </a-button>
            <a-button v-if="isAdmin" size="large" type="link" @click="goToAdmin">
              进入后台
            </a-button>
          </a-space>
        </div>
      </div>
      <div class="hero-visual">
        <div class="glow" />
        <div class="chip" />
        <div class="grid" />
      </div>
    </section>

    <section class="stats">
      <a-row :gutter="24">
        <a-col :xs="24" :md="8" v-for="(item, index) in quickActions" :key="index">
          <a-card class="stat-card" bordered>
            <div class="stat-icon">{{ item.icon }}</div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
          </a-card>
        </a-col>
      </a-row>
    </section>

    <section class="benefits">
      <a-card title="为什么选择我们" :bordered="false" class="benefit-card">
        <a-row :gutter="24">
          <a-col :xs="24" :md="8" v-for="item in benefitItems" :key="item.title">
            <div class="benefit-item">
              <h4>{{ item.title }}</h4>
              <p>{{ item.desc }}</p>
            </div>
          </a-col>
        </a-row>
      </a-card>
    </section>

    <section class="cta" v-if="!isLoggedIn">
      <a-card class="cta-card" bordered>
        <div>
          <h2>首次来到 CarRental 平台？</h2>
          <p>注册账户即可解锁完整的在线预订功能，随时掌握订单动态与专属优惠。</p>
        </div>
        <a-button type="primary" size="large" @click="goToLogin">立即登录 / 注册</a-button>
      </a-card>
    </section>
  </div>
</template>

<style scoped lang="css">
.portal-home {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
  background: linear-gradient(135deg, #111827 0%, #1e3a8a 70%, #2563eb 100%);
  border-radius: 20px;
  padding: 48px;
  color: #fff;
  position: relative;
  overflow: hidden;
}

.hero-badge {
  margin-bottom: 16px;
}

.hero-text h1 {
  font-size: 40px;
  font-weight: 700;
  margin-bottom: 16px;
}

.hero-text p {
  font-size: 16px;
  line-height: 1.8;
  max-width: 520px;
  opacity: 0.85;
}

.hero-actions {
  margin-top: 32px;
}

.hero-visual {
  position: relative;
  min-height: 220px;
}

.hero-visual .glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.9), transparent 60%),
    radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.35), transparent 55%);
  filter: blur(10px);
  opacity: 0.6;
}

.hero-visual .chip,
.hero-visual .grid {
  position: absolute;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(6px);
}

.hero-visual .chip {
  width: 180px;
  height: 110px;
  top: 30px;
  right: 20px;
  background: rgba(255, 255, 255, 0.08);
}

.hero-visual .grid {
  width: 220px;
  height: 160px;
  bottom: 30px;
  left: 10px;
  background: rgba(255, 255, 255, 0.05);
}

.stats .stat-card {
  border-radius: 12px;
  height: 100%;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 16px;
}

.stat-card h3 {
  font-size: 20px;
  margin-bottom: 8px;
}

.stat-card p {
  color: rgba(0, 0, 0, 0.55);
  line-height: 1.7;
}

.benefit-card {
  border-radius: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
}

.benefit-item {
  padding: 12px;
}

.benefit-item h4 {
  font-size: 18px;
  margin-bottom: 6px;
}

.benefit-item p {
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.8;
}

.cta-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.cta-card h2 {
  margin-bottom: 8px;
}

.cta-card p {
  color: rgba(0, 0, 0, 0.58);
}

@media (max-width: 992px) {
  .hero {
    padding: 32px;
  }

  .hero-text h1 {
    font-size: 32px;
  }

  .cta-card {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 576px) {
  .hero {
    padding: 24px;
  }

  .hero-actions {
    width: 100%;
  }

  .hero-actions .ant-space {
    width: 100%;
    flex-wrap: wrap;
  }

  .hero-actions .ant-space-item {
    flex: 1 1 auto;
  }
}
</style>
