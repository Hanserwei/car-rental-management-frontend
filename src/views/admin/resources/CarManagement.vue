<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message, Modal, type FormInstance, type TableProps } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import type { UploadRequestOption as RcCustomRequestOption } from 'ant-design-vue/es/vc-upload/interface'

import { carInfoApi, type CarInfoVO } from '@/api/car-info'
import { resolveFileUrl } from '@/utils/file'
import { getCarBrandController } from '@/api-client/src/api-client/car-brand-controller/car-brand-controller'
import { getCarTypeController } from '@/api-client/src/api-client/car-type-controller/car-type-controller'
import { getBaseCityController } from '@/api-client/src/api-client/base-city-controller/base-city-controller'
import type {
  BaseCityVO,
  CarBrandVO,
  CarTypeVO,
  PageBrandsParams,
  PageCarTypesParams,
  PageCitiesParams,
} from '@/api-client/src/api-client/models'

const carBrandController = getCarBrandController()
const carTypeController = getCarTypeController()
const baseCityController = getBaseCityController()

const dataSource = ref<CarInfoVO[]>([])
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
  keyword: undefined as string | undefined,
  brandId: undefined as number | undefined,
  typeId: undefined as number | undefined,
  cityId: undefined as number | undefined,
  status: undefined as string | undefined,
  auditStatus: undefined as string | undefined,
})

const brandOptions = ref<CarBrandVO[]>([])
const typeOptions = ref<CarTypeVO[]>([])
const cityOptions = ref<BaseCityVO[]>([])

const modalVisible = ref(false)
const modalTitle = ref('新增车辆')
const modalLoading = ref(false)
const isEditMode = ref(false)
const currentCarId = ref<number | null>(null)

const formRef = ref<FormInstance>()
const formState = reactive({
  carCode: '',
  carName: '',
  brandId: undefined as number | undefined,
  typeId: undefined as number | undefined,
  cityId: undefined as number | undefined,
  coverImage: '',
  dailyPrice: null as number | null,
  deposit: undefined as number | undefined,
  seatCount: undefined as number | undefined,
  gearboxType: undefined as string | undefined,
  fuelType: '',
  mileage: undefined as number | undefined,
  stock: undefined as number | undefined,
  status: '1',
  auditStatus: '1',
  description: '',
})

const formRules = {
  carCode: [{ required: true, message: '请输入车辆编码', trigger: 'blur' }],
  carName: [{ required: true, message: '请输入车辆名称', trigger: 'blur' }],
  brandId: [{ required: true, message: '请选择品牌', trigger: 'change' }],
  typeId: [{ required: true, message: '请选择车型', trigger: 'change' }],
  cityId: [{ required: true, message: '请选择所在城市', trigger: 'change' }],
  dailyPrice: [{ required: true, message: '请输入日租金', trigger: 'change' }],
  seatCount: [{ required: true, message: '请输入座位数', trigger: 'change' }],
  stock: [{ required: true, message: '请输入库存数量', trigger: 'change' }],
}

const gearboxOptions = [
  { value: '1', label: '手动挡' },
  { value: '2', label: '自动挡' },
]

const statusOptions = [
  { value: '1', label: '可租' },
  { value: '2', label: '维护中' },
  { value: '0', label: '下架' },
]

const auditStatusOptions = [
  { value: '1', label: '待审核' },
  { value: '2', label: '审核通过' },
  { value: '3', label: '审核驳回' },
]

const carStatusTagMap: Record<number, { text: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
  0: { text: '下架', color: 'default' },
  1: { text: '可租', color: 'success' },
  2: { text: '维护中', color: 'warning' },
}

const auditStatusTagMap: Record<number, { text: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
  1: { text: '待审核', color: 'warning' },
  2: { text: '审核通过', color: 'success' },
  3: { text: '审核驳回', color: 'error' },
}

const columns: TableProps<CarInfoVO>['columns'] = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80, fixed: 'left' },
  { title: '封面图', dataIndex: 'coverImage', key: 'coverImage', width: 120 },
  { title: '车辆名称', dataIndex: 'carName', key: 'carName', width: 180 },
  { title: '车辆编码', dataIndex: 'carCode', key: 'carCode', width: 160 },
  { title: '品牌', dataIndex: 'brandName', key: 'brandName', width: 160 },
  { title: '车型', dataIndex: 'typeName', key: 'typeName', width: 160 },
  { title: '所在城市', dataIndex: 'cityName', key: 'cityName', width: 160 },
  { title: '日租金', dataIndex: 'dailyPrice', key: 'dailyPrice', width: 120 },
  { title: '押金', dataIndex: 'deposit', key: 'deposit', width: 120 },
  { title: '座位数', dataIndex: 'seatCount', key: 'seatCount', width: 100 },
  { title: '车辆状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '审核状态', dataIndex: 'auditStatus', key: 'auditStatus', width: 120 },
  { title: '库存', dataIndex: 'stock', key: 'stock', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'action', width: 280, fixed: 'right' },
]

const numberOrUndefined = (value: number | null | undefined): number | undefined =>
  value === null || value === undefined ? undefined : Number(value)

const fetchCarList = async () => {
  try {
    loading.value = true
    const params = {
      keyword: searchForm.keyword?.trim() || undefined,
      brandId: searchForm.brandId,
      typeId: searchForm.typeId,
      cityId: searchForm.cityId,
      status: searchForm.status != null ? Number(searchForm.status) : undefined,
      auditStatus: searchForm.auditStatus != null ? Number(searchForm.auditStatus) : undefined,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }
    const response = await carInfoApi.pageCars(params)
    if (response.code === 200 && response.data) {
      dataSource.value = (response.data.records || []) as CarInfoVO[]
      total.value = response.data.total || 0
      pagination.current = response.data.current || pagination.current
    } else {
      message.error(response.message || '获取车辆列表失败')
    }
  } catch (error) {
    console.error('获取车辆列表失败:', error)
    message.error('获取车辆列表失败')
  } finally {
    loading.value = false
  }
}

const fetchBrandOptions = async () => {
  try {
    const params: PageBrandsParams = { current: 1, pageSize: 100, status: '1' }
    const response = await carBrandController.pageBrands(params)
    if (response.code === 200 && response.data) {
      brandOptions.value = (response.data.records || []) as CarBrandVO[]
    }
  } catch (error) {
    console.error('获取品牌选项失败:', error)
  }
}

const fetchTypeOptions = async () => {
  try {
    const params: PageCarTypesParams = { current: 1, pageSize: 100, status: '1' }
    const response = await carTypeController.pageCarTypes(params)
    if (response.code === 200 && response.data) {
      typeOptions.value = (response.data.records || []) as CarTypeVO[]
    }
  } catch (error) {
    console.error('获取车型选项失败:', error)
  }
}

const fetchCityOptions = async () => {
  try {
    const params: PageCitiesParams = { current: 1, pageSize: 100, status: '1' }
    const response = await baseCityController.pageCities(params)
    if (response.code === 200 && response.data) {
      cityOptions.value = (response.data.records || []) as BaseCityVO[]
    }
  } catch (error) {
    console.error('获取城市选项失败:', error)
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchCarList()
}

const handleReset = () => {
  searchForm.keyword = undefined
  searchForm.brandId = undefined
  searchForm.typeId = undefined
  searchForm.cityId = undefined
  searchForm.status = undefined
  searchForm.auditStatus = undefined
  pagination.current = 1
  fetchCarList()
}

const handleTableChange: TableProps<CarInfoVO>['onChange'] = (pag) => {
  if (pag?.current) {
    pagination.current = pag.current
  }
  if (pag?.pageSize) {
    pagination.pageSize = pag.pageSize
  }
  fetchCarList()
}

const resetFormState = () => {
  formState.carCode = ''
  formState.carName = ''
  formState.brandId = undefined
  formState.typeId = undefined
  formState.cityId = undefined
  formState.coverImage = ''
  formState.dailyPrice = null
  formState.deposit = undefined
  formState.seatCount = undefined
  formState.gearboxType = undefined
  formState.fuelType = ''
  formState.mileage = undefined
  formState.stock = undefined
  formState.status = '1'
  formState.auditStatus = '1'
  formState.description = ''
  formRef.value?.clearValidate()
}

const handleAdd = () => {
  isEditMode.value = false
  modalTitle.value = '新增车辆'
  currentCarId.value = null
  resetFormState()
  modalVisible.value = true
}

const handleEdit = async (record: CarInfoVO) => {
  if (!record.id) {
    return
  }
  try {
    isEditMode.value = true
    modalTitle.value = '编辑车辆'
    currentCarId.value = Number(record.id)
    const response = await carInfoApi.getCar(currentCarId.value)
    if (response.code === 200 && response.data) {
      const data = response.data
      formState.carCode = data.carCode || ''
      formState.carName = data.carName || ''
      formState.brandId = data.brandId ?? undefined
      formState.typeId = data.typeId ?? undefined
      formState.cityId = data.cityId ?? undefined
      formState.coverImage = data.coverImage || ''
      formState.dailyPrice = data.dailyPrice != null ? Number(data.dailyPrice) : null
      formState.deposit = data.deposit != null ? Number(data.deposit) : undefined
      formState.seatCount = data.seatCount != null ? Number(data.seatCount) : undefined
      formState.gearboxType = data.gearboxType != null ? String(data.gearboxType) : undefined
      formState.fuelType = data.fuelType || ''
      formState.mileage = data.mileage != null ? Number(data.mileage) : undefined
      formState.stock = data.stock != null ? Number(data.stock) : undefined
      formState.status = data.status != null ? String(data.status) : '1'
      formState.auditStatus = data.auditStatus != null ? String(data.auditStatus) : '1'
      formState.description = data.description || ''
      formRef.value?.clearValidate()
      modalVisible.value = true
    } else {
      message.error(response.message || '获取车辆详情失败')
    }
  } catch (error) {
    console.error('获取车辆详情失败:', error)
    message.error('获取车辆详情失败')
  }
}

const handleDelete = (record: CarInfoVO) => {
  if (!record.id) {
    return
  }
  Modal.confirm({
    title: `确认删除车辆“${record.carName}”吗？`,
    content: '删除前请确认该车辆未关联订单或评论，此操作不可恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const response = await carInfoApi.deleteCar(Number(record.id))
        if (response.code === 200) {
          message.success('删除成功')
          fetchCarList()
        } else {
          message.error(response.message || '删除车辆失败')
        }
      } catch (error) {
        console.error('删除车辆失败:', error)
        message.error('删除车辆失败')
      }
    },
  })
}

const buildCreatePayload = () => ({
  carCode: formState.carCode.trim(),
  carName: formState.carName.trim(),
  brandId: formState.brandId!,
  typeId: formState.typeId!,
  cityId: formState.cityId!,
  coverImage: formState.coverImage || undefined,
  dailyPrice: Number(formState.dailyPrice),
  deposit: numberOrUndefined(formState.deposit),
  seatCount: Number(formState.seatCount),
  gearboxType: formState.gearboxType != null ? Number(formState.gearboxType) : undefined,
  fuelType: formState.fuelType?.trim() || undefined,
  mileage: numberOrUndefined(formState.mileage),
  stock: Number(formState.stock),
  status: formState.status != null ? Number(formState.status) : undefined,
  auditStatus: formState.auditStatus != null ? Number(formState.auditStatus) : undefined,
  description: formState.description?.trim() || undefined,
})

const buildUpdatePayload = () => ({
  carCode: formState.carCode.trim(),
  carName: formState.carName.trim(),
  brandId: formState.brandId,
  typeId: formState.typeId,
  cityId: formState.cityId,
  coverImage: formState.coverImage || undefined,
  dailyPrice: formState.dailyPrice != null ? Number(formState.dailyPrice) : undefined,
  deposit: numberOrUndefined(formState.deposit),
  seatCount: formState.seatCount != null ? Number(formState.seatCount) : undefined,
  gearboxType: formState.gearboxType != null ? Number(formState.gearboxType) : undefined,
  fuelType: formState.fuelType?.trim() || undefined,
  mileage: numberOrUndefined(formState.mileage),
  stock: formState.stock != null ? Number(formState.stock) : undefined,
  status: formState.status != null ? Number(formState.status) : undefined,
  auditStatus: formState.auditStatus != null ? Number(formState.auditStatus) : undefined,
  description: formState.description?.trim() || undefined,
})

const handleSubmit = async () => {
  if (!formRef.value) {
    return
  }
  try {
    await formRef.value.validate()
    modalLoading.value = true
    if (isEditMode.value && currentCarId.value) {
      const response = await carInfoApi.updateCar(currentCarId.value, buildUpdatePayload())
      if (response.code === 200) {
        message.success('更新成功')
        modalVisible.value = false
        fetchCarList()
      } else {
        message.error(response.message || '更新车辆失败')
      }
    } else {
      const response = await carInfoApi.createCar(buildCreatePayload())
      if (response.code === 200) {
        message.success('新增成功')
        modalVisible.value = false
        fetchCarList()
      } else {
        message.error(response.message || '新增车辆失败')
      }
    }
  } catch (error) {
    if (error) {
      console.error('提交车辆表单失败:', error)
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

const confirmAudit = (record: CarInfoVO, auditStatus: number) => {
  if (!record.id) {
    return
  }
  const actionText = auditStatus === 2 ? '审核通过' : '审核驳回'
  Modal.confirm({
    title: `${actionText}确认`,
    content: `确定要将车辆“${record.carName}”标记为${actionText}吗？`,
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      try {
        const response = await carInfoApi.auditCar(Number(record.id), { auditStatus })
        if (response.code === 200) {
          message.success(`${actionText}成功`)
          fetchCarList()
        } else {
          message.error(response.message || `${actionText}失败`)
        }
      } catch (error) {
        console.error(`${actionText}失败:`, error)
        message.error(`${actionText}失败`)
      }
    },
  })
}

const handleUploadCover = async (options: RcCustomRequestOption) => {
  const { file, onSuccess, onError } = options
  try {
    const rawFile = (file as File & { originFileObj?: File }).originFileObj ?? (file as File)
    if (!(rawFile instanceof File)) {
      throw new Error('文件格式不正确')
    }
    const response = await carInfoApi.uploadCover(rawFile)
    if (response.code === 200 && response.data?.url) {
      formState.coverImage = response.data.url
      message.success('封面上传成功')
      onSuccess?.(response as unknown as Record<string, unknown>)
    } else {
      const error = new Error(response.message || '封面上传失败')
      message.error(error.message)
      onError?.(error)
    }
  } catch (error) {
    console.error('封面上传失败:', error)
    message.error('封面上传失败')
    onError?.(error as Error)
  }
}

onMounted(() => {
  fetchCarList()
  fetchBrandOptions()
  fetchTypeOptions()
  fetchCityOptions()
})
</script>

<template>
  <div class="car-management">
    <a-card :bordered="false" class="search-card">
      <div class="search-card__content">
        <a-form :model="searchForm" layout="inline">
          <a-form-item label="关键字" name="keyword">
            <a-input
              v-model:value="searchForm.keyword"
              allow-clear
              placeholder="车辆名称/编码"
              style="width: 200px"
            />
          </a-form-item>
          <a-form-item label="品牌" name="brandId">
            <a-select
              v-model:value="searchForm.brandId"
              allow-clear
              placeholder="全部品牌"
              style="width: 180px"
              show-search
              option-filter-prop="children"
            >
              <a-select-option v-for="brand in brandOptions" :key="brand.id" :value="brand.id">
                {{ brand.brandName }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="车型" name="typeId">
            <a-select
              v-model:value="searchForm.typeId"
              allow-clear
              placeholder="全部车型"
              style="width: 180px"
              show-search
              option-filter-prop="children"
            >
              <a-select-option v-for="type in typeOptions" :key="type.id" :value="type.id">
                {{ type.typeName }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="所在城市" name="cityId">
            <a-select
              v-model:value="searchForm.cityId"
              allow-clear
              placeholder="全部城市"
              style="width: 180px"
              show-search
              option-filter-prop="children"
            >
              <a-select-option v-for="city in cityOptions" :key="city.id" :value="city.id">
                {{ city.cityName }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="车辆状态" name="status">
            <a-select
              v-model:value="searchForm.status"
              allow-clear
              placeholder="全部状态"
              style="width: 160px"
            >
              <a-select-option v-for="item in statusOptions" :key="item.value" :value="item.value">
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
          <a-form-item>
            <a-space>
              <a-button type="primary" :loading="loading" @click="handleSearch">查询</a-button>
              <a-button @click="handleReset">重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>
        <div class="search-card__actions">
          <a-button type="primary" v-permission="'resource:car:create'" @click="handleAdd">
            新增车辆
          </a-button>
        </div>
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
          <template v-if="column.key === 'coverImage'">
            <a-image
              v-if="record.coverImage"
              :src="resolveFileUrl(record.coverImage)"
              :preview="false"
              width="64"
              height="48"
              fallback="https://via.placeholder.com/64x48?text=CAR"
            />
            <span v-else class="table-cover-placeholder">未上传</span>
          </template>
          <template v-else-if="column.key === 'dailyPrice'">
            <span v-if="record.dailyPrice != null">￥{{ Number(record.dailyPrice).toFixed(2) }}</span>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'deposit'">
            <span v-if="record.deposit != null">￥{{ Number(record.deposit).toFixed(2) }}</span>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="carStatusTagMap[Number(record.status ?? -1)]?.color || 'default'">
              {{ carStatusTagMap[Number(record.status ?? -1)]?.text || '未知' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'auditStatus'">
            <a-tag :color="auditStatusTagMap[Number(record.auditStatus ?? -1)]?.color || 'default'">
              {{ auditStatusTagMap[Number(record.auditStatus ?? -1)]?.text || '未知' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space wrap>
              <a-button
                type="primary"
                size="small"
                v-permission="'resource:car:update'"
                @click="handleEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                danger
                type="primary"
                size="small"
                v-permission="'resource:car:delete'"
                @click="handleDelete(record)"
              >
                删除
              </a-button>
              <a-button
                ghost
                type="primary"
                size="small"
                v-permission="'resource:car:audit'"
                @click="confirmAudit(record, 2)"
              >
                审核通过
              </a-button>
              <a-button
                type="default"
                size="small"
                danger
                v-permission="'resource:car:audit'"
                @click="confirmAudit(record, 3)"
              >
                驳回
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
            <a-form-item label="车辆名称" name="carName" required>
              <a-input v-model:value="formState.carName" placeholder="请输入车辆名称" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="车辆编码" name="carCode" required>
              <a-input v-model:value="formState.carCode" placeholder="请输入车辆编码/车牌号" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :xs="24" :md="8">
            <a-form-item label="品牌" name="brandId" required>
              <a-select
                v-model:value="formState.brandId"
                placeholder="请选择品牌"
                allow-clear
                show-search
                option-filter-prop="children"
              >
                <a-select-option v-for="brand in brandOptions" :key="brand.id" :value="brand.id">
                  {{ brand.brandName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="车型" name="typeId" required>
              <a-select
                v-model:value="formState.typeId"
                placeholder="请选择车型"
                allow-clear
                show-search
                option-filter-prop="children"
              >
                <a-select-option v-for="type in typeOptions" :key="type.id" :value="type.id">
                  {{ type.typeName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="所在城市" name="cityId" required>
              <a-select
                v-model:value="formState.cityId"
                placeholder="请选择城市"
                allow-clear
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
          <a-col :xs="24" :md="12">
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
        </a-row>

        <a-row :gutter="16">
          <a-col :xs="24" :md="8">
            <a-form-item label="座位数" name="seatCount" required>
              <a-input-number
                v-model:value="formState.seatCount"
                :min="1"
                :step="1"
                style="width: 100%"
                placeholder="请输入座位数"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="库存数量" name="stock" required>
              <a-input-number
                v-model:value="formState.stock"
                :min="0"
                :step="1"
                style="width: 100%"
                placeholder="请输入库存"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="里程数 (km)" name="mileage">
              <a-input-number
                v-model:value="formState.mileage"
                :min="0"
                :step="100"
                style="width: 100%"
                placeholder="请输入车辆里程"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :xs="24" :md="8">
            <a-form-item label="变速箱" name="gearboxType">
              <a-select v-model:value="formState.gearboxType" allow-clear placeholder="请选择变速箱类型">
                <a-select-option v-for="item in gearboxOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="燃油类型" name="fuelType">
              <a-input v-model:value="formState.fuelType" placeholder="如：汽油、柴油、混动" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="车辆状态" name="status">
              <a-radio-group v-model:value="formState.status">
                <a-radio-button value="1">可租</a-radio-button>
                <a-radio-button value="2">维护中</a-radio-button>
                <a-radio-button value="0">下架</a-radio-button>
              </a-radio-group>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="审核状态" name="auditStatus">
              <a-radio-group v-model:value="formState.auditStatus">
                <a-radio-button value="1">待审核</a-radio-button>
                <a-radio-button value="2">审核通过</a-radio-button>
                <a-radio-button value="3">审核驳回</a-radio-button>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="车辆封面" name="coverImage">
              <div class="cover-upload">
                <a-upload :show-upload-list="false" :custom-request="handleUploadCover" accept="image/*">
                  <a-button>
                    <upload-outlined />
                    选择图片
                  </a-button>
                </a-upload>
                <a-image
                  v-if="formState.coverImage"
                  :src="resolveFileUrl(formState.coverImage)"
                  :preview="false"
                  width="96"
                  height="72"
                  fallback="https://via.placeholder.com/96x72?text=CAR"
                  class="cover-upload__preview"
                />
                <span v-else class="cover-upload__placeholder">暂未上传封面</span>
              </div>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="车辆描述" name="description">
          <a-textarea
            v-model:value="formState.description"
            :rows="4"
            allow-clear
            placeholder="请输入车辆描述"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.car-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-card__content {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px;
}

.search-card__actions {
  margin-left: auto;
}

.table-cover-placeholder {
  color: #999;
}

.cover-upload {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cover-upload__preview {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.cover-upload__placeholder {
  color: #999;
}
</style>
