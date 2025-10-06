<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import type { EChartsOption } from 'echarts'
import VueECharts from 'vue-echarts'

import { useUserStore } from '@/stores/user'
import { dashboardApi, type DashboardOverview, type DashboardStats } from '@/api/dashboard'

use([TitleComponent, TooltipComponent, LegendComponent, GridComponent, DatasetComponent, PieChart, LineChart, BarChart, CanvasRenderer])

const VChart = VueECharts

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)

const loading = ref(false)
const stats = ref<DashboardStats | null>(null)
const now = ref(dayjs())
let timer: number | undefined

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) {
    return 0
  }
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const formatCurrency = (value: unknown): string => {
  const amount = toNumber(value)
  return amount.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 })
}

const overviewCards = computed(() => {
  const overview: DashboardOverview | undefined = stats.value?.overview
  return [
    {
      title: '用户总数',
      value: overview?.totalUsers ?? 0,
      color: '#1890ff',
    },
    {
      title: '车辆总数',
      value: overview?.totalCars ?? 0,
      color: '#13c2c2',
    },
    {
      title: '可租车辆',
      value: overview?.availableCars ?? 0,
      color: '#52c41a',
    },
    {
      title: '待审车辆',
      value: overview?.pendingCarAudits ?? 0,
      color: '#faad14',
    },
    {
      title: '订单总数',
      value: overview?.totalOrders ?? 0,
      color: '#9254de',
    },
    {
      title: '待审订单',
      value: overview?.pendingOrderAudits ?? 0,
      color: '#f759ab',
    },
  ]
})

const totalPaidAmount = computed(() => formatCurrency(stats.value?.overview?.totalPaidAmount))

const orderStatusOption = computed<EChartsOption | undefined>(() => {
  const list = stats.value?.orderStatusDistribution || []
  if (!list.length) {
    return undefined
  }
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br />数量: {c} ({d}%)',
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
    },
    series: [
      {
        name: '订单状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        data: list.map((item) => ({
          name: item.name,
          value: toNumber(item.count),
        })),
      },
    ],
  } as EChartsOption
})

const buildTrendOption = (
  data: DashboardStats['monthlyOrderTrend'],
  { boundaryGap = false, mode = 'dual-line' }: { boundaryGap?: boolean; mode?: 'dual-line' | 'bar-line' },
): EChartsOption | undefined => {
  const list = data || []
  if (!list.length) {
    return undefined
  }
  const periods = list.map((item) => item.period ?? '')
  const orders = list.map((item) => toNumber(item.orderCount))
  const amounts = list.map((item) => toNumber(item.paidAmount))
  const orderSeries =
    mode === 'bar-line'
      ? {
          name: '订单数',
          type: 'bar' as const,
          data: orders,
          barWidth: '45%',
        }
      : {
          name: '订单数',
          type: 'line' as const,
          smooth: true,
          data: orders,
        }
  const amountSeries = {
    name: '支付金额',
    type: 'line' as const,
    smooth: true,
    yAxisIndex: 1,
    data: amounts,
  }

  return {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['订单数', '支付金额'],
    },
    grid: {
      left: '5%',
      right: '3%',
      bottom: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: periods,
      boundaryGap,
    },
    yAxis: [
      { type: 'value', name: '订单数' },
      { type: 'value', name: '支付金额', position: 'right' },
    ],
    series: [orderSeries, amountSeries],
  } as EChartsOption
}

const monthlyTrendOption = computed(() => buildTrendOption(stats.value?.monthlyOrderTrend, { boundaryGap: false, mode: 'dual-line' }))
const recentTrendOption = computed(() => buildTrendOption(stats.value?.recentOrderTrend, { boundaryGap: true, mode: 'bar-line' }))

const topPickupOption = computed<EChartsOption | undefined>(() => {
  const list = stats.value?.topPickupCities || []
  if (!list.length) {
    return undefined
  }
  return {
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value} 单',
      },
    },
    yAxis: {
      type: 'category',
      data: list.map((item) => item.name ?? ''),
    },
    series: [
      {
        name: '订单数',
        type: 'bar',
        data: list.map((item) => toNumber(item.count)),
        itemStyle: {
          color: '#69c0ff',
        },
      },
    ],
  } as EChartsOption
})

const fetchStats = async () => {
  try {
    loading.value = true
    const response = await dashboardApi.getStats()
    if (response.code === 200 && response.data) {
      stats.value = response.data
    } else {
      message.error(response.message || '获取仪表盘数据失败')
    }
  } catch (error) {
    console.error('获取仪表盘数据失败:', error)
    message.error('获取仪表盘数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStats()
  timer = window.setInterval(() => {
    now.value = dayjs()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) {
    window.clearInterval(timer)
  }
})

const currentTime = computed(() => now.value.format('YYYY-MM-DD HH:mm:ss'))
</script>

<template>
  <div class="dashboard">
    <a-card :bordered="false" class="dashboard__welcome">
      <div class="dashboard__welcome-header">
        <div>
          <h2 class="dashboard__title">欢迎回来，{{ userInfo?.nickname || userInfo?.username || '管理员' }}！</h2>
          <p class="dashboard__subtitle">当前时间：{{ currentTime }}</p>
        </div>
        <a-space>
          <span class="dashboard__paid">累计支付金额：<strong>{{ totalPaidAmount }}</strong></span>
          <a-button type="link" :loading="loading" @click="fetchStats">刷新数据</a-button>
        </a-space>
      </div>
    </a-card>

    <a-row :gutter="16" class="dashboard__cards">
      <a-col :xs="24" :sm="12" :md="8" :lg="8" :xl="4" v-for="item in overviewCards" :key="item.title">
        <a-card :bordered="false" class="dashboard__stat-card">
          <a-statistic :title="item.title" :value="item.value" :value-style="{ color: item.color }" />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="dashboard__section">
      <a-col :xs="24" :lg="12" class="dashboard__section-item">
        <a-card title="订单状态分布" :bordered="false" :loading="loading">
          <VChart v-if="orderStatusOption" :option="orderStatusOption" autoresize style="height: 320px" />
          <a-empty v-else description="暂无数据" />
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12" class="dashboard__section-item">
        <a-card title="取车城市 TOP5" :bordered="false" :loading="loading">
          <VChart v-if="topPickupOption" :option="topPickupOption" autoresize style="height: 320px" />
          <a-empty v-else description="暂无数据" />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="dashboard__section">
      <a-col :xs="24" :lg="12" class="dashboard__section-item">
        <a-card title="每月订单趋势" :bordered="false" :loading="loading">
          <VChart v-if="monthlyTrendOption" :option="monthlyTrendOption" autoresize style="height: 320px" />
          <a-empty v-else description="暂无数据" />
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12" class="dashboard__section-item">
        <a-card title="最近7天订单走势" :bordered="false" :loading="loading">
          <VChart v-if="recentTrendOption" :option="recentTrendOption" autoresize style="height: 320px" />
          <a-empty v-else description="暂无数据" />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard__welcome-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dashboard__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.dashboard__subtitle {
  margin: 4px 0 0;
  color: #8c8c8c;
}

.dashboard__paid {
  color: #595959;
}

.dashboard__paid strong {
  color: #fa541c;
  font-size: 16px;
}

.dashboard__cards .ant-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.dashboard__stat-card {
  height: 100%;
}

.dashboard__section {
  margin-bottom: 8px;
}

.dashboard__section-item {
  margin-bottom: 16px;
}

.dashboard__welcome {
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
}

@media (max-width: 768px) {
  .dashboard__title {
    font-size: 18px;
  }
}
</style>
