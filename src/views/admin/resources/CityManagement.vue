<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal, type FormInstance, type TableProps } from 'ant-design-vue'
import { getBaseCityController } from '@/api-client/src/api-client/base-city-controller/base-city-controller'
import type {
  BaseCityVO,
  BaseCityCreateRequest,
  BaseCityUpdateRequest,
  PageCitiesParams,
} from '@/api-client/src/api-client/models'

const baseCityController = getBaseCityController()

const dataSource = ref<BaseCityVO[]>([])
const loading = ref(false)
const total = ref(0)

const pagination = reactive({
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (count: number) => `共 ${count} 条`,
})

const searchForm = reactive<PageCitiesParams>({
  keyword: undefined,
  provinceName: undefined,
  status: undefined,
})

const modalVisible = ref(false)
const modalTitle = ref('新增城市')
const modalLoading = ref(false)
const isEditMode = ref(false)
const currentCityId = ref<number | null>(null)

const formRef = ref<FormInstance>()
const formState = reactive({
  cityName: '',
  provinceName: '',
  cityCode: '',
  sortOrder: 0,
  status: '1',
  remark: '',
})

const formRules = {
  cityName: [{ required: true, message: '请输入城市名称', trigger: 'blur' }],
  sortOrder: [{ type: 'number', min: 0, message: '排序值不能小于0', trigger: 'change' }],
}

const columns: TableProps['columns'] = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '城市名称', dataIndex: 'cityName', key: 'cityName', width: 160 },
  { title: '省份', dataIndex: 'provinceName', key: 'provinceName', width: 160 },
  { title: '城市编码', dataIndex: 'cityCode', key: 'cityCode', width: 120 },
  { title: '排序值', dataIndex: 'sortOrder', key: 'sortOrder', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
]

const fetchCities = async () => {
  try {
    loading.value = true
    const params: PageCitiesParams = {
      ...searchForm,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }
    const response = await baseCityController.pageCities(params)
    if (response.code === 200 && response.data) {
      const records = ((response.data.records || []) as BaseCityVO[]).map((item) => ({
        ...item,
        status: item?.status != null ? String(item.status) : undefined,
      }))
      dataSource.value = records
      total.value = response.data.total || 0
      pagination.current = response.data.current || pagination.current
    } else {
      message.error(response.message || '获取城市列表失败')
    }
  } catch (error) {
    console.error('获取城市列表失败:', error)
    message.error('获取城市列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchCities()
}

const handleReset = () => {
  searchForm.keyword = undefined
  searchForm.provinceName = undefined
  searchForm.status = undefined
  pagination.current = 1
  fetchCities()
}

const handleTableChange: TableProps['onChange'] = (pag) => {
  if (pag?.current) {
    pagination.current = pag.current
  }
  if (pag?.pageSize) {
    pagination.pageSize = pag.pageSize
  }
  fetchCities()
}

const resetFormState = () => {
  formState.cityName = ''
  formState.provinceName = ''
  formState.cityCode = ''
  formState.sortOrder = 0
  formState.status = '1'
  formState.remark = ''
  formRef.value?.clearValidate()
}

const handleAdd = () => {
  isEditMode.value = false
  modalTitle.value = '新增城市'
  currentCityId.value = null
  resetFormState()
  modalVisible.value = true
}

const handleEdit = async (record: BaseCityVO) => {
  if (!record.id) {
    return
  }
  try {
    isEditMode.value = true
    modalTitle.value = '编辑城市'
    currentCityId.value = Number(record.id)
    const response = await baseCityController.getCity(Number(record.id))
    if (response.code === 200 && response.data) {
      formState.cityName = response.data.cityName || ''
      formState.provinceName = response.data.provinceName || ''
      formState.cityCode = response.data.cityCode || ''
      formState.sortOrder = response.data.sortOrder ?? 0
      formState.status = response.data.status ? String(response.data.status) : '1'
      formState.remark = response.data.remark || ''
      formRef.value?.clearValidate()
      modalVisible.value = true
    } else {
      message.error(response.message || '获取城市详情失败')
    }
  } catch (error) {
    console.error('获取城市详情失败:', error)
    message.error('获取城市详情失败')
  }
}

const handleDelete = (record: BaseCityVO) => {
  if (!record.id) {
    return
  }
  Modal.confirm({
    title: `确认删除城市“${record.cityName}”吗？`,
    content: '删除前请确认该城市未关联车辆，此操作不可恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const response = await baseCityController.deleteCity(Number(record.id))
        if (response.code === 200) {
          message.success('删除成功')
          fetchCities()
        } else {
          message.error(response.message || '删除城市失败')
        }
      } catch (error) {
        console.error('删除城市失败:', error)
        message.error('删除城市失败')
      }
    },
  })
}

const buildCreatePayload = (): BaseCityCreateRequest => ({
  cityName: formState.cityName.trim(),
  provinceName: formState.provinceName?.trim() || undefined,
  cityCode: formState.cityCode?.trim() || undefined,
  sortOrder: formState.sortOrder ?? 0,
  status: formState.status,
  remark: formState.remark?.trim() || undefined,
})

const buildUpdatePayload = (): BaseCityUpdateRequest => ({
  cityName: formState.cityName.trim(),
  provinceName: formState.provinceName?.trim() || undefined,
  cityCode: formState.cityCode?.trim() || undefined,
  sortOrder: formState.sortOrder ?? 0,
  status: formState.status,
  remark: formState.remark?.trim() || undefined,
})

const handleSubmit = async () => {
  if (!formRef.value) {
    return
  }
  try {
    await formRef.value.validate()
    modalLoading.value = true
    if (isEditMode.value && currentCityId.value) {
      const response = await baseCityController.updateCity(currentCityId.value, buildUpdatePayload())
      if (response.code === 200) {
        message.success('更新成功')
        modalVisible.value = false
        fetchCities()
      } else {
        message.error(response.message || '更新城市失败')
      }
    } else {
      const response = await baseCityController.createCity(buildCreatePayload())
      if (response.code === 200) {
        message.success('新增成功')
        modalVisible.value = false
        fetchCities()
      } else {
        message.error(response.message || '新增城市失败')
      }
    }
  } catch (error) {
    if (error) {
      console.error('提交城市表单失败:', error)
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

onMounted(() => {
  fetchCities()
})
</script>

<template>
  <div class="city-management">
    <a-card :bordered="false" class="search-card">
      <div class="search-card__content">
        <a-form :model="searchForm" layout="inline">
          <a-form-item label="关键字" name="keyword">
            <a-input
              v-model:value="searchForm.keyword"
              allow-clear
              placeholder="城市名称/编码"
              style="width: 200px"
            />
          </a-form-item>
          <a-form-item label="省份" name="provinceName">
            <a-input
              v-model:value="searchForm.provinceName"
              allow-clear
              placeholder="请输入省份"
              style="width: 160px"
            />
          </a-form-item>
          <a-form-item label="状态" name="status">
            <a-select
              v-model:value="searchForm.status"
              allow-clear
              placeholder="全部状态"
              style="width: 140px"
            >
              <a-select-option value="1">启用</a-select-option>
              <a-select-option value="0">停用</a-select-option>
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
          <a-button type="primary" v-permission="'resource:city:edit'" @click="handleAdd">
            新增城市
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
        :scroll="{ x: 1100 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag v-if="record.status === '1'" color="success">启用</a-tag>
            <a-tag v-else color="error">停用</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button
                type="primary"
                size="small"
                v-permission="'resource:city:edit'"
                @click="handleEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                danger
                type="primary"
                size="small"
                v-permission="'resource:city:edit'"
                @click="handleDelete(record)"
              >
                删除
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
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form ref="formRef" :model="formState" :rules="formRules" layout="vertical">
        <a-form-item label="城市名称" name="cityName" required>
          <a-input v-model:value="formState.cityName" placeholder="请输入城市名称" />
        </a-form-item>
        <a-form-item label="所属省份" name="provinceName">
          <a-input v-model:value="formState.provinceName" placeholder="请输入省份" />
        </a-form-item>
        <a-form-item label="城市编码" name="cityCode">
          <a-input v-model:value="formState.cityCode" placeholder="请输入编码" />
        </a-form-item>
        <a-form-item label="排序值" name="sortOrder">
          <a-input-number v-model:value="formState.sortOrder" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group v-model:value="formState.status">
            <a-radio-button value="1">启用</a-radio-button>
            <a-radio-button value="0">停用</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea
            v-model:value="formState.remark"
            :rows="4"
            allow-clear
            placeholder="请输入备注"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.city-management {
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
</style>
