<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message, Modal, type FormInstance, type TableProps } from 'ant-design-vue'
import { getCarTypeController } from '@/api-client/src/api-client/car-type-controller/car-type-controller'
import type {
  CarTypeCreateRequest,
  CarTypeUpdateRequest,
  CarTypeVO,
  PageCarTypesParams,
} from '@/api-client/src/api-client/models'

const carTypeController = getCarTypeController()

const dataSource = ref<CarTypeVO[]>([])
const loading = ref(false)
const total = ref(0)

const pagination = reactive({
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (count: number) => `共 ${count} 条`,
})

const searchForm = reactive<PageCarTypesParams>({
  keyword: undefined,
  typeCode: undefined,
  status: undefined,
})

const modalVisible = ref(false)
const modalTitle = ref('新增车型')
const modalLoading = ref(false)
const isEditMode = ref(false)
const currentTypeId = ref<number | null>(null)

const formRef = ref<FormInstance>()
const formState = reactive({
  typeName: '',
  typeCode: '',
  description: '',
  status: '1',
  sortOrder: 0,
})

const formRules = {
  typeName: [{ required: true, message: '请输入车型名称', trigger: 'blur' }],
  typeCode: [{ required: true, message: '请输入车型编码', trigger: 'blur' }],
}

const columns: TableProps<CarTypeVO>['columns'] = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '车型名称', dataIndex: 'typeName', key: 'typeName', width: 160 },
  { title: '车型编码', dataIndex: 'typeCode', key: 'typeCode', width: 140 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '排序值', dataIndex: 'sortOrder', key: 'sortOrder', width: 100 },
  { title: '车型描述', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
]

const fetchCarTypes = async () => {
  try {
    loading.value = true
    const params: PageCarTypesParams = {
      ...searchForm,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }
    const response = await carTypeController.pageCarTypes(params)
    if (response.code === 200 && response.data) {
      const records = (response.data.records || []) as CarTypeVO[]
      dataSource.value = records.map((item) => ({
        ...item,
        status: item?.status != null ? String(item.status) : undefined,
      }))
      total.value = response.data.total || 0
      pagination.current = response.data.current || pagination.current
    } else {
      message.error(response.message || '获取车型列表失败')
    }
  } catch (error) {
    console.error('获取车型列表失败:', error)
    message.error('获取车型列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchCarTypes()
}

const handleReset = () => {
  searchForm.keyword = undefined
  searchForm.typeCode = undefined
  searchForm.status = undefined
  pagination.current = 1
  fetchCarTypes()
}

const handleTableChange: TableProps<CarTypeVO>['onChange'] = (pag) => {
  if (pag?.current) {
    pagination.current = pag.current
  }
  if (pag?.pageSize) {
    pagination.pageSize = pag.pageSize
  }
  fetchCarTypes()
}

const resetFormState = () => {
  formState.typeName = ''
  formState.typeCode = ''
  formState.description = ''
  formState.status = '1'
  formState.sortOrder = 0
  formRef.value?.clearValidate()
}

const handleAdd = () => {
  isEditMode.value = false
  modalTitle.value = '新增车型'
  currentTypeId.value = null
  resetFormState()
  modalVisible.value = true
}

const handleEdit = async (record: CarTypeVO) => {
  if (!record.id) {
    return
  }
  try {
    isEditMode.value = true
    modalTitle.value = '编辑车型'
    currentTypeId.value = Number(record.id)
    const response = await carTypeController.getCarType(currentTypeId.value)
    if (response.code === 200 && response.data) {
      const data = response.data
      formState.typeName = data.typeName || ''
      formState.typeCode = data.typeCode || ''
      formState.description = data.description || ''
      formState.status = data.status != null ? String(data.status) : '1'
      formState.sortOrder = data.sortOrder ?? 0
      formRef.value?.clearValidate()
      modalVisible.value = true
    } else {
      message.error(response.message || '获取车型详情失败')
    }
  } catch (error) {
    console.error('获取车型详情失败:', error)
    message.error('获取车型详情失败')
  }
}

const handleDelete = (record: CarTypeVO) => {
  if (!record.id) {
    return
  }
  Modal.confirm({
    title: `确认删除车型“${record.typeName}”吗？`,
    content: '删除前请确认该车型未关联车辆，此操作不可恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const response = await carTypeController.deleteCarType(Number(record.id))
        if (response.code === 200) {
          message.success('删除成功')
          fetchCarTypes()
        } else {
          message.error(response.message || '删除车型失败')
        }
      } catch (error) {
        console.error('删除车型失败:', error)
        message.error('删除车型失败')
      }
    },
  })
}

const buildCreatePayload = (): CarTypeCreateRequest => ({
  typeName: formState.typeName.trim(),
  typeCode: formState.typeCode.trim(),
  description: formState.description?.trim() || undefined,
  status: formState.status,
  sortOrder: formState.sortOrder ?? 0,
})

const buildUpdatePayload = (): CarTypeUpdateRequest => ({
  typeName: formState.typeName.trim(),
  typeCode: formState.typeCode.trim(),
  description: formState.description?.trim() || undefined,
  status: formState.status,
  sortOrder: formState.sortOrder ?? 0,
})

const handleSubmit = async () => {
  if (!formRef.value) {
    return
  }
  try {
    await formRef.value.validate()
    modalLoading.value = true
    if (isEditMode.value && currentTypeId.value) {
      const response = await carTypeController.updateCarType(currentTypeId.value, buildUpdatePayload())
      if (response.code === 200) {
        message.success('更新成功')
        modalVisible.value = false
        fetchCarTypes()
      } else {
        message.error(response.message || '更新车型失败')
      }
    } else {
      const response = await carTypeController.createCarType(buildCreatePayload())
      if (response.code === 200) {
        message.success('新增成功')
        modalVisible.value = false
        fetchCarTypes()
      } else {
        message.error(response.message || '新增车型失败')
      }
    }
  } catch (error) {
    if (error) {
      console.error('提交车型表单失败:', error)
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
  fetchCarTypes()
})
</script>

<template>
  <div class="type-management">
    <a-card :bordered="false" class="search-card">
      <div class="search-card__content">
        <a-form :model="searchForm" layout="inline">
          <a-form-item label="关键字" name="keyword">
            <a-input
              v-model:value="searchForm.keyword"
              allow-clear
              placeholder="车型名称/编码"
              style="width: 200px"
            />
          </a-form-item>
          <a-form-item label="车型编码" name="typeCode">
            <a-input
              v-model:value="searchForm.typeCode"
              allow-clear
              placeholder="请输入车型编码"
              style="width: 180px"
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
          <a-button type="primary" v-permission="'resource:type:edit'" @click="handleAdd">
            新增车型
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
        :scroll="{ x: 1000 }"
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
                v-permission="'resource:type:edit'"
                @click="handleEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                danger
                type="primary"
                size="small"
                v-permission="'resource:type:edit'"
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
      width="520px"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form ref="formRef" :model="formState" :rules="formRules" layout="vertical">
        <a-form-item label="车型名称" name="typeName" required>
          <a-input v-model:value="formState.typeName" placeholder="请输入车型名称" />
        </a-form-item>
        <a-form-item label="车型编码" name="typeCode" required>
          <a-input v-model:value="formState.typeCode" placeholder="请输入车型编码" />
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
        <a-form-item label="车型描述" name="description">
          <a-textarea
            v-model:value="formState.description"
            :rows="4"
            allow-clear
            placeholder="请输入车型描述"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.type-management {
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
