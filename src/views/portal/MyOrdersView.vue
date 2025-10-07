<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import {
  portalOrderApi,
  type RentalOrderVO,
  type RentalOrderDetailVO,
  type RentalOrderPortalQuery,
} from '@/api/portal'

const loading = ref(false)
const detailLoading = ref(false)
const cancelLoading = ref(false)

const orders = ref<RentalOrderVO[]>([])
const pagination = reactive({ current: 1, pageSize: 10, total: 0 })

const query = reactive<RentalOrderPortalQuery>({
  orderStatus: undefined,
  paymentStatus: undefined,
})

const dateRange = ref<Dayjs[] | null>(null)

const detailVisible = ref(false)
const currentOrder = ref<RentalOrderDetailVO | null>(null)

const payVisible = ref(false)
const paying = ref(false)
const payOrderId = ref<number | null>(null)
const payForm = reactive({
  paymentChannel: 'mock-wechat',
  payAmount: undefined as number | undefined,
  outTradeNo: '',
})

const statusOptions = [
  { value: 1, label: '待审核' },
  { value: 2, label: '待取车' },
  { value: 3, label: '进行中' },
  { value: 4, label: '已完成' },
  { value: 5, label: '已取消' },
]

const paymentOptions = [
  { value: 1, label: '待支付' },
  { value: 2, label: '已支付' },
  { value: 3, label: '部分退款' },
  { value: 4, label: '已退款' },
]

const statusTag = (status?: number) => {
  switch (status) {
    case 1:
      return { color: 'blue', text: '待审核' }
    case 2:
      return { color: 'cyan', text: '待取车' }
    case 3:
      return { color: 'purple', text: '进行中' }
    case 4:
      return { color: 'green', text: '已完成' }
    case 5:
      return { color: 'red', text: '已取消' }
    default:
      return { color: 'default', text: '未知' }
  }
}

const paymentTag = (status?: number) => {
  switch (status) {
    case 1:
      return { color: 'orange', text: '待支付' }
    case 2:
      return { color: 'green', text: '已支付' }
    case 3:
      return { color: 'cyan', text: '部分退款' }
    case 4:
      return { color: 'red', text: '已退款' }
    default:
      return { color: 'default', text: '未设置' }
  }
}

const canCancel = (order: RentalOrderVO) => [1, 2].includes(Number(order.orderStatus))

const fetchOrders = async () => {
  loading.value = true
  try {
    const params: RentalOrderPortalQuery = {
      orderNo: query.orderNo,
      orderStatus: query.orderStatus ?? undefined,
      paymentStatus: query.paymentStatus ?? undefined,
      auditStatus: query.auditStatus,
      startTime: query.startTime,
      endTime: query.endTime,
      current: pagination.current,
      pageSize: pagination.pageSize,
      sortField: 'created_at',
      sortOrder: 'descend',
    }
    const response = await portalOrderApi.pageOrders(params)
    const rawRecords = response.data?.records ?? []
    orders.value = rawRecords
      .filter((record) => Number(record.orderStatus) !== 5)
      .map((record) => ({
        ...record,
        orderStatus:
          record.orderStatus === undefined || record.orderStatus === null
            ? undefined
            : Number(record.orderStatus),
      paymentStatus:
        record.paymentStatus === undefined || record.paymentStatus === null
          ? undefined
          : Number(record.paymentStatus),
      amount:
        record.amount === undefined || record.amount === null
          ? undefined
          : Number(record.amount),
      deposit:
        record.deposit === undefined || record.deposit === null
          ? undefined
          : Number(record.deposit),
      paidAmount:
        record.paidAmount === undefined || record.paidAmount === null
          ? undefined
          : Number(record.paidAmount),
      dailyPrice:
        record.dailyPrice === undefined || record.dailyPrice === null
          ? undefined
          : Number(record.dailyPrice),
      rentalDays:
        record.rentalDays === undefined || record.rentalDays === null
          ? undefined
          : Number(record.rentalDays),
    }))
    pagination.total = Number(response.data?.total ?? 0)
  } catch (error) {
    console.error('加载订单失败', error)
    message.error('加载订单失败')
  } finally {
    loading.value = false
  }
}

const openDetail = async (order: RentalOrderVO) => {
  detailVisible.value = true
  currentOrder.value = null
  detailLoading.value = true
  try {
    const response = await portalOrderApi.getOrder(Number(order.id))
    currentOrder.value = response.data ?? null
  } catch (error) {
    console.error('获取订单详情失败', error)
    message.error('获取订单详情失败')
  } finally {
    detailLoading.value = false
  }
}

const handleCancel = (order: RentalOrderVO) => {
  Modal.confirm({
    title: '取消订单',
    content: `确定取消订单 ${order.orderNo} 吗？取消后将释放车辆库存。`,
    okText: '确认取消',
    cancelText: '再想想',
    okButtonProps: { danger: true },
    onOk: async () => {
      cancelLoading.value = true
      try {
        await portalOrderApi.cancelOrder(Number(order.id), {
          cancelReason: '用户主动取消',
        })
        message.success('订单已取消')
        await fetchOrders()
      } catch (error) {
        console.error('取消订单失败', error)
        message.error('取消订单失败')
      } finally {
        cancelLoading.value = false
      }
    },
  })
}

const openPay = (order: RentalOrderVO) => {
  payOrderId.value = Number(order.id)
  payForm.paymentChannel = 'mock-wechat'
  payForm.payAmount = order.amount != null ? Number(order.amount) : undefined
  payForm.outTradeNo = `MOCK-${Date.now()}`
  payVisible.value = true
}

const handlePaySubmit = async () => {
  if (!payOrderId.value) {
    return
  }
  if (!payForm.paymentChannel) {
    message.warning('请输入支付渠道标识')
    return
  }
  paying.value = true
  try {
    await portalOrderApi.payOrder(payOrderId.value, {
      paymentChannel: payForm.paymentChannel,
      payAmount: payForm.payAmount,
      outTradeNo: payForm.outTradeNo || undefined,
    })
    message.success('支付成功')
    payVisible.value = false
    await fetchOrders()
  } catch (error) {
    console.error('模拟支付失败', error)
    message.error('支付失败，请稍后再试')
  } finally {
    paying.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchOrders()
}

const handlePageChange = (page: number, pageSize?: number) => {
  pagination.current = page
  if (pageSize) {
    pagination.pageSize = pageSize
  }
  fetchOrders()
}

const orderColumns = [
  { title: '订单编号', dataIndex: 'orderNo', key: 'orderNo' },
  { title: '车辆', dataIndex: 'carName', key: 'carName' },
  { title: '租期', key: 'duration' },
  { title: '订单状态', key: 'orderStatus' },
  { title: '支付状态', key: 'paymentStatus' },
  { title: '金额', key: 'amount' },
  { title: '操作', key: 'action' },
]

const currentAuditHistory = computed(() => currentOrder.value?.audits ?? [])

onMounted(() => {
  fetchOrders()
})

watch(
  dateRange,
  (value) => {
    if (value && value.length === 2) {
      query.startTime = value[0]?.format('YYYY-MM-DDTHH:mm:ss')
      query.endTime = value[1]?.format('YYYY-MM-DDTHH:mm:ss')
    } else {
      query.startTime = undefined
      query.endTime = undefined
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="order-page">
    <a-card class="filter-card">
      <a-form layout="inline" class="filter-form">
        <a-form-item>
          <a-input
            v-model:value="query.orderNo"
            allow-clear
            placeholder="搜索订单号"
            style="width: 220px"
          />
        </a-form-item>
        <a-form-item>
          <a-select
            v-model:value="query.orderStatus"
            allow-clear
            placeholder="订单状态"
            style="width: 150px"
          >
            <a-select-option v-for="item in statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select
            v-model:value="query.paymentStatus"
            allow-clear
            placeholder="支付状态"
            style="width: 150px"
          >
            <a-select-option v-for="item in paymentOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-range-picker
            v-model:value="dateRange"
            :show-time="{ format: 'HH:mm' }"
            format="YYYY-MM-DD HH:mm"
            allow-clear
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="handleSearch">查询</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card>
      <a-table
        :data-source="orders"
        :columns="orderColumns"
        :loading="loading"
        row-key="id"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'duration'">
            {{ dayjs(record.startTime).format('MM-DD HH:mm') }} ~
            {{ dayjs(record.endTime).format('MM-DD HH:mm') }}
          </template>
          <template v-else-if="column.key === 'orderStatus'">
            <a-tag :color="statusTag(record.orderStatus).color">
              {{ statusTag(record.orderStatus).text }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'paymentStatus'">
            <a-tag :color="paymentTag(record.paymentStatus).color">
              {{ paymentTag(record.paymentStatus).text }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'amount'">
            {{ record.amount != null ? `¥${Number(record.amount).toFixed(0)}` : '—' }}
          </template>
          <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" @click="openDetail(record)">详情</a-button>
            <a-button
              v-if="record.paymentStatus === 1"
              type="link"
              @click="openPay(record)"
            >
              模拟支付
            </a-button>
            <a-button
              v-if="canCancel(record)"
              type="link"
              danger
              :loading="cancelLoading"
                @click="handleCancel(record)"
              >
                取消
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>

      <a-empty v-if="!loading && !orders.length" description="暂无订单记录" />

      <div v-if="pagination.total > pagination.pageSize" class="pagination">
        <a-pagination
          :current="pagination.current"
          :pageSize="pagination.pageSize"
          :total="pagination.total"
          :showSizeChanger="true"
          :pageSizeOptions="['5', '10', '20']"
          @change="handlePageChange"
          @showSizeChange="handlePageChange"
        />
      </div>
    </a-card>

    <a-drawer
      v-model:open="detailVisible"
      title="订单详情"
      width="420px"
      destroy-on-close
      >
      <a-spin :spinning="detailLoading">
        <template v-if="currentOrder">
          <div class="drawer-section">
            <span class="section-title">订单编号</span>
            <span>{{ currentOrder.orderNo }}</span>
          </div>
          <div class="drawer-section">
            <span class="section-title">车辆</span>
            <span>{{ currentOrder.carName }}</span>
          </div>
          <div class="drawer-section">
            <span class="section-title">租期</span>
            <span>
              {{ dayjs(currentOrder.startTime).format('YYYY-MM-DD HH:mm') }}
              ~
              {{ dayjs(currentOrder.endTime).format('YYYY-MM-DD HH:mm') }}
            </span>
          </div>
          <div class="drawer-section">
            <span class="section-title">取车</span>
            <span>
              {{ currentOrder.pickupCityName }} · {{ currentOrder.pickupLocation || '现场约定' }}
            </span>
          </div>
          <div class="drawer-section">
            <span class="section-title">还车</span>
            <span>
              {{ currentOrder.returnCityName }} · {{ currentOrder.returnLocation || '现场约定' }}
            </span>
          </div>
          <div class="drawer-section">
            <span class="section-title">费用</span>
            <span>
              租金 ¥{{ Number(currentOrder.amount ?? 0).toFixed(0) }}
              <template v-if="currentOrder.deposit">
                ，押金 ¥{{ Number(currentOrder.deposit).toFixed(0) }}
              </template>
            </span>
          </div>

          <a-divider />
          <h4>审核记录</h4>
          <a-timeline>
            <a-timeline-item v-if="!currentAuditHistory.length">
              暂无审核记录
            </a-timeline-item>
            <a-timeline-item v-for="audit in currentAuditHistory" :key="audit.id">
              <p>
                {{ dayjs(audit.createdAt).format('YYYY-MM-DD HH:mm') }}
                - {{ audit.auditUserName || '系统' }}
              </p>
              <p>
                结果：{{ audit.auditResult === 1 ? '通过' : '拒绝' }}
              </p>
              <p v-if="audit.auditComment">备注：{{ audit.auditComment }}</p>
            </a-timeline-item>
          </a-timeline>
        </template>
      </a-spin>
    </a-drawer>

    <a-modal
      v-model:open="payVisible"
      title="模拟支付"
      :confirmLoading="paying"
      ok-text="确认支付"
      cancel-text="取消"
      @ok="handlePaySubmit"
    >
      <a-form layout="vertical">
        <a-form-item label="支付渠道">
          <a-input v-model:value="payForm.paymentChannel" placeholder="例如 mock-wechat" />
        </a-form-item>
        <a-form-item label="支付金额">
          <a-input-number
            v-model:value="payForm.payAmount"
            :min="0"
            :precision="2"
            style="width: 100%"
            placeholder="默认使用订单金额"
          />
        </a-form-item>
        <a-form-item label="外部订单号">
          <a-input
            v-model:value="payForm.outTradeNo"
            placeholder="可选，默认使用系统生成"
            allow-clear
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="css">
.order-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.filter-card {
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.filter-form {
  row-gap: 16px;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.drawer-section {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.78);
}

.section-title {
  color: rgba(0, 0, 0, 0.45);
}

@media (max-width: 768px) {
  .filter-form {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
