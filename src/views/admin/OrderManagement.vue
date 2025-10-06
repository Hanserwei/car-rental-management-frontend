<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { message, Modal, type FormInstance, type TableProps } from 'ant-design-vue'

import {
  rentalOrderApi,
  type RentalOrderDetailVO,
  type RentalOrderVO,
} from '@/api/rental-order'
import { getBaseCityController } from '@/api-client/src/api-client/base-city-controller/base-city-controller'
import type { BaseCityVO, PageCitiesParams } from '@/api-client/src/api-client/models'

const baseCityController = getBaseCityController()

const dataSource = ref<RentalOrderVO[]>([])
const loading = ref(false)
const total = ref(0)

const pagination = reactive({
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (count: number) => `共 ${count} 条`,
})

const searchForm = reactive({
  orderNo: undefined as string | undefined,
  paymentStatus: undefined as string | undefined,
  orderStatus: undefined as string | undefined,
  auditStatus: undefined as string | undefined,
  pickupCityId: undefined as number | undefined,
  returnCityId: undefined as number | undefined,
})

const orderDateRange = ref<Dayjs[]>([])

const cityOptions = ref<BaseCityVO[]>([])

const modalVisible = ref(false)
const modalLoading = ref(false)
const modalTitle = ref('订单编辑')
const currentOrderId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const formState = reactive({
  startTime: null as Dayjs | null,
  endTime: null as Dayjs | null,
  rentalDays: null as number | null,
  dailyPrice: null as number | null,
  amount: null as number | null,
  deposit: undefined as number | undefined,
  paidAmount: undefined as number | undefined,
  paymentStatus: '1',
  orderStatus: '1',
  pickupCityId: undefined as number | undefined,
  returnCityId: undefined as number | undefined,
  pickupLocation: '',
  returnLocation: '',
  cancelReason: '',
})

const formRules = {
  startTime: [{ required: true, message: '请选择计划取车时间', type: 'object', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择计划还车时间', type: 'object', trigger: 'change' }],
  rentalDays: [{ required: true, message: '请输入租期天数', type: 'number', trigger: 'change' }],
  dailyPrice: [{ required: true, message: '请输入日租金', type: 'number', trigger: 'change' }],
  amount: [{ required: true, message: '请输入订单金额', type: 'number', trigger: 'change' }],
  paymentStatus: [{ required: true, message: '请选择支付状态', trigger: 'change' }],
  orderStatus: [{ required: true, message: '请选择订单状态', trigger: 'change' }],
}

const auditModalVisible = ref(false)
const auditModalLoading = ref(false)
const auditTargetId = ref<number | null>(null)
const auditForm = reactive({
  auditResult: '1',
  auditComment: '',
})

const auditModalTitle = computed(() => (auditForm.auditResult === '1' ? '审核通过' : '审核驳回'))

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<RentalOrderDetailVO | null>(null)

const paymentStatusOptions = [
  { value: '1', label: '待支付' },
  { value: '2', label: '已支付' },
  { value: '3', label: '部分退款' },
  { value: '4', label: '已退款' },
]

const orderStatusOptions = [
  { value: '1', label: '待审核' },
  { value: '2', label: '待取车' },
  { value: '3', label: '进行中' },
  { value: '4', label: '已完成' },
  { value: '5', label: '已取消' },
]

const auditStatusOptions = [
  { value: '1', label: '待审核' },
  { value: '2', label: '审核通过' },
  { value: '3', label: '审核拒绝' },
]

type TagColor = 'default' | 'success' | 'processing' | 'error' | 'warning'

const paymentStatusTagMap: Record<number, { text: string; color: TagColor }> = {
  1: { text: '待支付', color: 'warning' },
  2: { text: '已支付', color: 'success' },
  3: { text: '部分退款', color: 'processing' },
  4: { text: '已退款', color: 'default' },
}

const orderStatusTagMap: Record<number, { text: string; color: TagColor }> = {
  1: { text: '待审核', color: 'warning' },
  2: { text: '待取车', color: 'processing' },
  3: { text: '进行中', color: 'processing' },
  4: { text: '已完成', color: 'success' },
  5: { text: '已取消', color: 'error' },
}

const auditStatusTagMap: Record<number, { text: string; color: TagColor }> = {
  1: { text: '待审核', color: 'warning' },
  2: { text: '审核通过', color: 'success' },
  3: { text: '审核拒绝', color: 'error' },
}

const columns: TableProps<RentalOrderVO>['columns'] = [
  { title: '订单编号', dataIndex: 'orderNo', key: 'orderNo', width: 180, fixed: 'left' },
  { title: '用户', dataIndex: 'userName', key: 'userName', width: 140 },
  { title: '车辆', dataIndex: 'carName', key: 'carName', width: 180 },
  { title: '取车时间', dataIndex: 'startTime', key: 'startTime', width: 180 },
  { title: '还车时间', dataIndex: 'endTime', key: 'endTime', width: 180 },
  { title: '租期(天)', dataIndex: 'rentalDays', key: 'rentalDays', width: 100 },
  { title: '订单金额', dataIndex: 'amount', key: 'amount', width: 120 },
  { title: '支付状态', dataIndex: 'paymentStatus', key: 'paymentStatus', width: 120 },
  { title: '订单状态', dataIndex: 'orderStatus', key: 'orderStatus', width: 120 },
  { title: '审核状态', dataIndex: 'auditStatus', key: 'auditStatus', width: 120 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'action', width: 280, fixed: 'right' },
]

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-')

const numberOrUndefined = (value: number | null | undefined) =>
  value === null || value === undefined ? undefined : Number(value)

const fetchCityOptions = async () => {
  try {
    const params: PageCitiesParams = { current: 1, pageSize: 200, status: '1' }
    const response = await baseCityController.pageCities(params)
    if (response.code === 200 && response.data) {
      cityOptions.value = (response.data.records || []) as BaseCityVO[]
    }
  } catch (error) {
    console.error('获取城市列表失败:', error)
  }
}

const fetchOrderList = async () => {
  try {
    loading.value = true
    const params = {
      orderNo: searchForm.orderNo?.trim() || undefined,
      paymentStatus: searchForm.paymentStatus != null ? Number(searchForm.paymentStatus) : undefined,
      orderStatus: searchForm.orderStatus != null ? Number(searchForm.orderStatus) : undefined,
      auditStatus: searchForm.auditStatus != null ? Number(searchForm.auditStatus) : undefined,
      pickupCityId: searchForm.pickupCityId,
      returnCityId: searchForm.returnCityId,
      startTime:
        orderDateRange.value?.length === 2
          ? dayjs(orderDateRange.value[0]).format('YYYY-MM-DD HH:mm:ss')
          : undefined,
      endTime:
        orderDateRange.value?.length === 2
          ? dayjs(orderDateRange.value[1]).format('YYYY-MM-DD HH:mm:ss')
          : undefined,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }
    const response = await rentalOrderApi.pageOrders(params)
    if (response.code === 200 && response.data) {
      dataSource.value = (response.data.records || []) as RentalOrderVO[]
      total.value = response.data.total || 0
      pagination.current = response.data.current || pagination.current
    } else {
      message.error(response.message || '获取订单列表失败')
    }
  } catch (error) {
    console.error('获取订单列表失败:', error)
    message.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchOrderList()
}

const handleReset = () => {
  searchForm.orderNo = undefined
  searchForm.paymentStatus = undefined
  searchForm.orderStatus = undefined
  searchForm.auditStatus = undefined
  searchForm.pickupCityId = undefined
  searchForm.returnCityId = undefined
  orderDateRange.value = []
  pagination.current = 1
  fetchOrderList()
}

const handleTableChange: TableProps<RentalOrderVO>['onChange'] = (pag) => {
  if (pag?.current) {
    pagination.current = pag.current
  }
  if (pag?.pageSize) {
    pagination.pageSize = pag.pageSize
  }
  fetchOrderList()
}

const resetFormState = () => {
  formState.startTime = null
  formState.endTime = null
  formState.rentalDays = null
  formState.dailyPrice = null
  formState.amount = null
  formState.deposit = undefined
  formState.paidAmount = undefined
  formState.paymentStatus = '1'
  formState.orderStatus = '1'
  formState.pickupCityId = undefined
  formState.returnCityId = undefined
  formState.pickupLocation = ''
  formState.returnLocation = ''
  formState.cancelReason = ''
  formRef.value?.clearValidate()
}

const handleEdit = async (record: RentalOrderVO) => {
  if (!record.id) {
    return
  }
  try {
    currentOrderId.value = Number(record.id)
    modalTitle.value = `编辑订单 ${record.orderNo}`
    resetFormState()
    const response = await rentalOrderApi.getOrder(currentOrderId.value)
    if (response.code === 200 && response.data) {
      const data = response.data
      formState.startTime = data.startTime ? dayjs(data.startTime) : null
      formState.endTime = data.endTime ? dayjs(data.endTime) : null
      formState.rentalDays = data.rentalDays != null ? Number(data.rentalDays) : null
      formState.dailyPrice = data.dailyPrice != null ? Number(data.dailyPrice) : null
      formState.amount = data.amount != null ? Number(data.amount) : null
      formState.deposit = data.deposit != null ? Number(data.deposit) : undefined
      formState.paidAmount = data.paidAmount != null ? Number(data.paidAmount) : undefined
      formState.paymentStatus = data.paymentStatus != null ? String(data.paymentStatus) : '1'
      formState.orderStatus = data.orderStatus != null ? String(data.orderStatus) : '1'
      formState.pickupCityId = data.pickupCityId ?? undefined
      formState.returnCityId = data.returnCityId ?? undefined
      formState.pickupLocation = data.pickupLocation || ''
      formState.returnLocation = data.returnLocation || ''
      formState.cancelReason = data.cancelReason || ''
      formRef.value?.clearValidate()
      modalVisible.value = true
    } else {
      message.error(response.message || '获取订单详情失败')
    }
  } catch (error) {
    console.error('获取订单详情失败:', error)
    message.error('获取订单详情失败')
  }
}

const buildUpdatePayload = () => ({
  startTime: formState.startTime ? formState.startTime.format('YYYY-MM-DD HH:mm:ss') : undefined,
  endTime: formState.endTime ? formState.endTime.format('YYYY-MM-DD HH:mm:ss') : undefined,
  rentalDays: numberOrUndefined(formState.rentalDays),
  dailyPrice: numberOrUndefined(formState.dailyPrice),
  amount: numberOrUndefined(formState.amount),
  deposit: numberOrUndefined(formState.deposit),
  paidAmount: numberOrUndefined(formState.paidAmount),
  paymentStatus: formState.paymentStatus != null ? Number(formState.paymentStatus) : undefined,
  orderStatus: formState.orderStatus != null ? Number(formState.orderStatus) : undefined,
  pickupCityId: formState.pickupCityId,
  returnCityId: formState.returnCityId,
  pickupLocation: formState.pickupLocation?.trim() || undefined,
  returnLocation: formState.returnLocation?.trim() || undefined,
  cancelReason: formState.cancelReason?.trim() || undefined,
})

const handleSubmit = async () => {
  if (!formRef.value || !currentOrderId.value) {
    return
  }
  try {
    await formRef.value.validate()
    modalLoading.value = true
    const response = await rentalOrderApi.updateOrder(currentOrderId.value, buildUpdatePayload())
    if (response.code === 200) {
      message.success('订单更新成功')
      modalVisible.value = false
      fetchOrderList()
    } else {
      message.error(response.message || '订单更新失败')
    }
  } catch (error) {
    if (error) {
      console.error('提交订单失败:', error)
    }
  } finally {
    modalLoading.value = false
  }
}

const handleCancel = () => {
  modalVisible.value = false
  modalLoading.value = false
  resetFormState()
}

const openAuditModal = (record: RentalOrderVO, result: number) => {
  if (!record.id) {
    return
  }
  auditTargetId.value = Number(record.id)
  auditForm.auditResult = String(result)
  auditForm.auditComment = record.auditRemark || ''
  auditModalVisible.value = true
}

const handleAuditSubmit = async () => {
  if (!auditTargetId.value) {
    return
  }
  if (auditForm.auditResult === '2' && !auditForm.auditComment.trim()) {
    message.error('请填写审核备注')
    return
  }
  try {
    auditModalLoading.value = true
    const response = await rentalOrderApi.auditOrder(auditTargetId.value, {
      auditResult: Number(auditForm.auditResult),
      auditComment: auditForm.auditComment?.trim() || undefined,
    })
    if (response.code === 200) {
      message.success('审核操作成功')
      auditModalVisible.value = false
      fetchOrderList()
    } else {
      message.error(response.message || '审核操作失败')
    }
  } catch (error) {
    console.error('审核操作失败:', error)
    message.error('审核操作失败')
  } finally {
    auditModalLoading.value = false
  }
}

const handleAuditCancel = () => {
  auditModalVisible.value = false
  auditModalLoading.value = false
}

const handleView = async (record: RentalOrderVO) => {
  if (!record.id) {
    return
  }
  try {
    detailVisible.value = true
    detailLoading.value = true
    const response = await rentalOrderApi.getOrder(Number(record.id))
    if (response.code === 200 && response.data) {
      detailData.value = response.data
    } else {
      message.error(response.message || '获取订单详情失败')
    }
  } catch (error) {
    console.error('获取订单详情失败:', error)
    message.error('获取订单详情失败')
  } finally {
    detailLoading.value = false
  }
}

watch(
  () => [formState.startTime, formState.endTime] as const,
  ([start, end]) => {
    if (start && end && end.isAfter(start)) {
      const days = end.diff(start, 'day') || 0
      formState.rentalDays = Math.max(days, 1)
    }
  },
)

onMounted(() => {
  fetchCityOptions()
  fetchOrderList()
})
</script>

<template>
  <div class="order-management">
    <a-card :bordered="false" class="search-card">
      <div class="search-card__content">
        <a-form :model="searchForm" layout="inline">
          <a-form-item label="订单编号" name="orderNo">
            <a-input
              v-model:value="searchForm.orderNo"
              allow-clear
              placeholder="请输入订单编号"
              style="width: 200px"
            />
          </a-form-item>
          <a-form-item label="支付状态" name="paymentStatus">
            <a-select
              v-model:value="searchForm.paymentStatus"
              allow-clear
              placeholder="全部支付状态"
              style="width: 160px"
            >
              <a-select-option v-for="item in paymentStatusOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="订单状态" name="orderStatus">
            <a-select
              v-model:value="searchForm.orderStatus"
              allow-clear
              placeholder="全部订单状态"
              style="width: 160px"
            >
              <a-select-option v-for="item in orderStatusOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="审核状态" name="auditStatus">
            <a-select
              v-model:value="searchForm.auditStatus"
              allow-clear
              placeholder="全部审核状态"
              style="width: 160px"
            >
              <a-select-option v-for="item in auditStatusOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="取车城市" name="pickupCityId">
            <a-select
              v-model:value="searchForm.pickupCityId"
              allow-clear
              placeholder="全部取车城市"
              style="width: 180px"
              show-search
              option-filter-prop="children"
            >
              <a-select-option v-for="city in cityOptions" :key="city.id" :value="city.id">
                {{ city.cityName }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="还车城市" name="returnCityId">
            <a-select
              v-model:value="searchForm.returnCityId"
              allow-clear
              placeholder="全部还车城市"
              style="width: 180px"
              show-search
              option-filter-prop="children"
            >
              <a-select-option v-for="city in cityOptions" :key="city.id" :value="city.id">
                {{ city.cityName }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="下单时间" name="orderDate">
            <a-range-picker
              v-model:value="orderDateRange"
              show-time
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 320px"
            />
          </a-form-item>
          <a-form-item>
            <a-space>
              <a-button type="primary" :loading="loading" @click="handleSearch">查询</a-button>
              <a-button @click="handleReset">重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>
    </a-card>

    <a-card :bordered="false">
      <a-table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        row-key="id"
        :pagination="{ ...pagination, total }"
        :scroll="{ x: 1400 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'startTime'">
            {{ formatDateTime(record.startTime) }}
          </template>
          <template v-else-if="column.key === 'endTime'">
            {{ formatDateTime(record.endTime) }}
          </template>
          <template v-else-if="column.key === 'amount'">
            <span v-if="record.amount != null">￥{{ Number(record.amount).toFixed(2) }}</span>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'paymentStatus'">
            <a-tag :color="paymentStatusTagMap[Number(record.paymentStatus ?? -1)]?.color || 'default'">
              {{ paymentStatusTagMap[Number(record.paymentStatus ?? -1)]?.text || '未知' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'orderStatus'">
            <a-tag :color="orderStatusTagMap[Number(record.orderStatus ?? -1)]?.color || 'default'">
              {{ orderStatusTagMap[Number(record.orderStatus ?? -1)]?.text || '未知' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'auditStatus'">
            <a-tag :color="auditStatusTagMap[Number(record.auditStatus ?? -1)]?.color || 'default'">
              {{ auditStatusTagMap[Number(record.auditStatus ?? -1)]?.text || '未知' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTime(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space wrap>
              <a-button size="small" @click="handleView(record)">详情</a-button>
              <a-button
                type="primary"
                size="small"
                v-permission="'rental:order:update'"
                @click="handleEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                type="primary"
                ghost
                size="small"
                v-permission="'rental:order:audit'"
                :disabled="record.auditStatus !== 1"
                @click="openAuditModal(record, 1)"
              >
                审核通过
              </a-button>
              <a-button
                danger
                type="default"
                size="small"
                v-permission="'rental:order:audit'"
                :disabled="record.auditStatus !== 1"
                @click="openAuditModal(record, 2)"
              >
                审核拒绝
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      :confirm-loading="modalLoading"
      destroy-on-close
      width="720px"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form ref="formRef" :model="formState" :rules="formRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="计划取车时间" name="startTime" required>
              <a-date-picker
                v-model:value="formState.startTime"
                show-time
                format="YYYY-MM-DD HH:mm"
                style="width: 100%"
                placeholder="请选择取车时间"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="计划还车时间" name="endTime" required>
              <a-date-picker
                v-model:value="formState.endTime"
                show-time
                format="YYYY-MM-DD HH:mm"
                style="width: 100%"
                placeholder="请选择还车时间"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :xs="24" :md="8">
            <a-form-item label="租期(天)" name="rentalDays" required>
              <a-input-number
                v-model:value="formState.rentalDays"
                :min="1"
                :step="1"
                style="width: 100%"
                placeholder="请输入租期"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="日租金" name="dailyPrice" required>
              <a-input-number
                v-model:value="formState.dailyPrice"
                :min="0"
                :step="1"
                style="width: 100%"
                placeholder="请输入日租金"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="订单金额" name="amount" required>
              <a-input-number
                v-model:value="formState.amount"
                :min="0"
                :step="100"
                style="width: 100%"
                placeholder="请输入订单金额"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :xs="24" :md="8">
            <a-form-item label="押金" name="deposit">
              <a-input-number
                v-model:value="formState.deposit"
                :min="0"
                :step="100"
                style="width: 100%"
                placeholder="请输入押金"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="已支付金额" name="paidAmount">
              <a-input-number
                v-model:value="formState.paidAmount"
                :min="0"
                :step="100"
                style="width: 100%"
                placeholder="请输入已支付金额"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="支付状态" name="paymentStatus" required>
              <a-select v-model:value="formState.paymentStatus" placeholder="请选择支付状态">
                <a-select-option v-for="item in paymentStatusOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :xs="24" :md="8">
            <a-form-item label="订单状态" name="orderStatus" required>
              <a-select v-model:value="formState.orderStatus" placeholder="请选择订单状态">
                <a-select-option v-for="item in orderStatusOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="取车城市" name="pickupCityId">
              <a-select
                v-model:value="formState.pickupCityId"
                allow-clear
                placeholder="请选择取车城市"
                show-search
                option-filter-prop="children"
              >
                <a-select-option v-for="city in cityOptions" :key="city.id" :value="city.id">
                  {{ city.cityName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="还车城市" name="returnCityId">
              <a-select
                v-model:value="formState.returnCityId"
                allow-clear
                placeholder="请选择还车城市"
                show-search
                option-filter-prop="children"
              >
                <a-select-option v-for="city in cityOptions" :key="city.id" :value="city.id">
                  {{ city.cityName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="取车地点" name="pickupLocation">
              <a-input v-model:value="formState.pickupLocation" placeholder="请输入具体取车地点" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="还车地点" name="returnLocation">
              <a-input v-model:value="formState.returnLocation" placeholder="请输入具体还车地点" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="取消原因" name="cancelReason">
          <a-textarea
            v-model:value="formState.cancelReason"
            :rows="3"
            allow-clear
            placeholder="订单取消时填写的原因"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="auditModalVisible"
      :title="auditModalTitle"
      :confirm-loading="auditModalLoading"
      destroy-on-close
      width="480px"
      @ok="handleAuditSubmit"
      @cancel="handleAuditCancel"
    >
      <a-form layout="vertical">
        <a-form-item label="审核结果">
          <a-radio-group v-model:value="auditForm.auditResult">
            <a-radio value="1">通过</a-radio>
            <a-radio value="2">拒绝</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item :label="auditForm.auditResult === '2' ? '审核备注（必填）' : '审核备注'">
          <a-textarea
            v-model:value="auditForm.auditComment"
            :rows="4"
            allow-clear
            placeholder="请输入审核意见"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="detailVisible" :width="640" title="订单详情" destroy-on-close>
      <a-spin :spinning="detailLoading">
        <template v-if="detailData">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="订单编号">{{ detailData.orderNo }}</a-descriptions-item>
            <a-descriptions-item label="用户">{{ detailData.userName }} (ID: {{ detailData.userId }})</a-descriptions-item>
            <a-descriptions-item label="车辆">{{ detailData.carName }} (ID: {{ detailData.carId }})</a-descriptions-item>
            <a-descriptions-item label="取车时间">{{ formatDateTime(detailData.startTime) }}</a-descriptions-item>
            <a-descriptions-item label="还车时间">{{ formatDateTime(detailData.endTime) }}</a-descriptions-item>
            <a-descriptions-item label="取车地点">
              {{ detailData.pickupCityName }} {{ detailData.pickupLocation || '' }}
            </a-descriptions-item>
            <a-descriptions-item label="还车地点">
              {{ detailData.returnCityName }} {{ detailData.returnLocation || '' }}
            </a-descriptions-item>
            <a-descriptions-item label="租期(天)">{{ detailData.rentalDays }}</a-descriptions-item>
            <a-descriptions-item label="订单金额">￥{{ detailData.amount }}</a-descriptions-item>
            <a-descriptions-item label="已支付">￥{{ detailData.paidAmount ?? 0 }}</a-descriptions-item>
            <a-descriptions-item label="押金">￥{{ detailData.deposit ?? 0 }}</a-descriptions-item>
            <a-descriptions-item label="支付状态">
              {{ paymentStatusTagMap[Number(detailData.paymentStatus ?? -1)]?.text || '未知' }}
            </a-descriptions-item>
            <a-descriptions-item label="订单状态">
              {{ orderStatusTagMap[Number(detailData.orderStatus ?? -1)]?.text || '未知' }}
            </a-descriptions-item>
            <a-descriptions-item label="审核状态">
              {{ auditStatusTagMap[Number(detailData.auditStatus ?? -1)]?.text || '未知' }}
            </a-descriptions-item>
            <a-descriptions-item label="取消原因">{{ detailData.cancelReason || '-' }}</a-descriptions-item>
            <a-descriptions-item label="审核备注">{{ detailData.auditRemark || '-' }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{ formatDateTime(detailData.createdAt) }}</a-descriptions-item>
            <a-descriptions-item label="更新时间">{{ formatDateTime(detailData.updatedAt) }}</a-descriptions-item>
          </a-descriptions>

          <div class="audit-records" v-if="detailData.audits && detailData.audits.length">
            <h4>审核记录</h4>
            <a-timeline>
              <a-timeline-item v-for="audit in detailData.audits" :key="audit.id">
                <div class="audit-record">
                  <div>
                    <strong>{{ audit.auditUserName || '系统' }}</strong>
                    <span class="audit-result">
                      {{ audit.auditResult === 1 ? '通过' : '拒绝' }}
                    </span>
                  </div>
                  <div class="audit-comment">{{ audit.auditComment || '未填写备注' }}</div>
                  <div class="audit-time">{{ formatDateTime(audit.createdAt) }}</div>
                </div>
              </a-timeline-item>
            </a-timeline>
          </div>
        </template>
        <template v-else>
          <a-empty description="暂无数据" />
        </template>
      </a-spin>
    </a-drawer>
  </div>
</template>

<style scoped>
.order-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-card__content {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}

.audit-records {
  margin-top: 24px;
}

.audit-records h4 {
  margin-bottom: 12px;
}

.audit-record {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.audit-result {
  margin-left: 8px;
}

.audit-comment {
  color: #666;
}

.audit-time {
  font-size: 12px;
  color: #999;
}
</style>
