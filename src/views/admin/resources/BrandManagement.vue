<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message, Modal, type FormInstance, type TableProps } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import { getCarBrandController } from '@/api-client/src/api-client/car-brand-controller/car-brand-controller'
import type {
  CarBrandVO,
  CarBrandCreateRequest,
  CarBrandUpdateRequest,
  PageBrandsParams,
} from '@/api-client/src/api-client/models'
import type { UploadRequestOption as RcCustomRequestOption } from 'ant-design-vue/es/vc-upload/interface'
import { resolveFileUrl } from '@/utils/file'

const carBrandController = getCarBrandController()

const dataSource = ref<CarBrandVO[]>([])
const loading = ref(false)
const total = ref(0)

const pagination = reactive({
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (count: number) => `共 ${count} 条`,
})

const searchForm = reactive<PageBrandsParams>({
  keyword: undefined,
  country: undefined,
  status: undefined,
})

const modalVisible = ref(false)
const modalTitle = ref('新增品牌')
const modalLoading = ref(false)
const isEditMode = ref(false)
const currentBrandId = ref<number | null>(null)

const formRef = ref<FormInstance>()
const formState = reactive({
  brandName: '',
  brandCode: '',
  country: '',
  description: '',
  logoUrl: '',
  status: '1',
  sortOrder: 0,
})

const formRules = {
  brandName: [{ required: true, message: '请输入品牌名称', trigger: 'blur' }],
  brandCode: [{ required: true, message: '请输入品牌编码', trigger: 'blur' }],
}

const columns: TableProps<CarBrandVO>['columns'] = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '品牌LOGO', dataIndex: 'logoUrl', key: 'logoUrl', width: 120 },
  { title: '品牌名称', dataIndex: 'brandName', key: 'brandName', width: 160 },
  { title: '品牌编码', dataIndex: 'brandCode', key: 'brandCode', width: 140 },
  { title: '国家/地区', dataIndex: 'country', key: 'country', width: 140 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '排序值', dataIndex: 'sortOrder', key: 'sortOrder', width: 100 },
  { title: '简介', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' },
]

const fetchBrands = async () => {
  try {
    loading.value = true
    const params: PageBrandsParams = {
      ...searchForm,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }
    const response = await carBrandController.pageBrands(params)
    if (response.code === 200 && response.data) {
      const records = (response.data.records || []) as CarBrandVO[]
      dataSource.value = records.map((item) => ({
        ...item,
        status: item?.status != null ? String(item.status) : undefined,
      }))
      total.value = response.data.total || 0
      pagination.current = response.data.current || pagination.current
    } else {
      message.error(response.message || '获取品牌列表失败')
    }
  } catch (error) {
    console.error('获取品牌列表失败:', error)
    message.error('获取品牌列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchBrands()
}

const handleReset = () => {
  searchForm.keyword = undefined
  searchForm.country = undefined
  searchForm.status = undefined
  pagination.current = 1
  fetchBrands()
}

const handleTableChange: TableProps<CarBrandVO>['onChange'] = (pag) => {
  if (pag?.current) {
    pagination.current = pag.current
  }
  if (pag?.pageSize) {
    pagination.pageSize = pag.pageSize
  }
  fetchBrands()
}

const resetFormState = () => {
  formState.brandName = ''
  formState.brandCode = ''
  formState.country = ''
  formState.description = ''
  formState.logoUrl = ''
  formState.status = '1'
  formState.sortOrder = 0
  formRef.value?.clearValidate()
}

const handleAdd = () => {
  isEditMode.value = false
  modalTitle.value = '新增品牌'
  currentBrandId.value = null
  resetFormState()
  modalVisible.value = true
}

const handleEdit = async (record: CarBrandVO) => {
  if (!record.id) {
    return
  }
  try {
    isEditMode.value = true
    modalTitle.value = '编辑品牌'
    currentBrandId.value = Number(record.id)
    const response = await carBrandController.getBrand(currentBrandId.value)
    if (response.code === 200 && response.data) {
      const data = response.data
      formState.brandName = data.brandName || ''
      formState.brandCode = data.brandCode || ''
      formState.country = data.country || ''
      formState.description = data.description || ''
      formState.logoUrl = data.logoUrl || ''
      formState.status = data.status != null ? String(data.status) : '1'
      formState.sortOrder = data.sortOrder ?? 0
      formRef.value?.clearValidate()
      modalVisible.value = true
    } else {
      message.error(response.message || '获取品牌详情失败')
    }
  } catch (error) {
    console.error('获取品牌详情失败:', error)
    message.error('获取品牌详情失败')
  }
}

const handleDelete = (record: CarBrandVO) => {
  if (!record.id) {
    return
  }
  Modal.confirm({
    title: `确认删除品牌“${record.brandName}”吗？`,
    content: '删除前请确认该品牌未关联车辆，此操作不可恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const response = await carBrandController.deleteBrand(Number(record.id))
        if (response.code === 200) {
          message.success('删除成功')
          fetchBrands()
        } else {
          message.error(response.message || '删除品牌失败')
        }
      } catch (error) {
        console.error('删除品牌失败:', error)
        message.error('删除品牌失败')
      }
    },
  })
}

const buildCreatePayload = (): CarBrandCreateRequest => ({
  brandName: formState.brandName.trim(),
  brandCode: formState.brandCode.trim(),
  country: formState.country?.trim() || undefined,
  description: formState.description?.trim() || undefined,
  logoUrl: formState.logoUrl || undefined,
  status: formState.status,
  sortOrder: formState.sortOrder ?? 0,
})

const buildUpdatePayload = (): CarBrandUpdateRequest => ({
  brandName: formState.brandName.trim(),
  brandCode: formState.brandCode.trim(),
  country: formState.country?.trim() || undefined,
  description: formState.description?.trim() || undefined,
  logoUrl: formState.logoUrl || undefined,
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
    if (isEditMode.value && currentBrandId.value) {
      const response = await carBrandController.updateBrand(
        currentBrandId.value,
        buildUpdatePayload(),
      )
      if (response.code === 200) {
        message.success('更新成功')
        modalVisible.value = false
        fetchBrands()
      } else {
        message.error(response.message || '更新品牌失败')
      }
    } else {
      const response = await carBrandController.createBrand(buildCreatePayload())
      if (response.code === 200) {
        message.success('新增成功')
        modalVisible.value = false
        fetchBrands()
      } else {
        message.error(response.message || '新增品牌失败')
      }
    }
  } catch (error) {
    if (error) {
      console.error('提交品牌表单失败:', error)
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

const handleUploadLogo = async (options: RcCustomRequestOption) => {
  const { file, onSuccess, onError } = options
  try {
    const rawFile = (file as File & { originFileObj?: File }).originFileObj ?? (file as File)
    if (!(rawFile instanceof File)) {
      throw new Error('文件格式不正确')
    }
    const response = await carBrandController.uploadBrandLogo(rawFile)
    if (response.code === 200 && response.data?.url) {
      formState.logoUrl = response.data.url
      message.success('LOGO上传成功')
      onSuccess?.(response as unknown as Record<string, unknown>)
    } else {
      const error = new Error(response.message || 'LOGO上传失败')
      message.error(error.message)
      onError?.(error)
    }
  } catch (error) {
    console.error('LOGO上传失败:', error)
    message.error('LOGO上传失败')
    onError?.(error as Error)
  }
}

onMounted(() => {
  fetchBrands()
})
</script>

<template>
  <div class="brand-management">
    <a-card :bordered="false" class="search-card">
      <div class="search-card__content">
        <a-form :model="searchForm" layout="inline">
          <a-form-item label="关键字" name="keyword">
            <a-input
              v-model:value="searchForm.keyword"
              allow-clear
              placeholder="品牌名称/编码"
              style="width: 200px"
            />
          </a-form-item>
          <a-form-item label="国家/地区" name="country">
            <a-input
              v-model:value="searchForm.country"
              allow-clear
              placeholder="请输入国家或地区"
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
          <a-button type="primary" v-permission="'resource:brand:edit'" @click="handleAdd">
            新增品牌
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
        :scroll="{ x: 1200 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'logoUrl'">
            <a-image
              v-if="record.logoUrl"
              :src="resolveFileUrl(record.logoUrl)"
              :preview="false"
              width="64"
              height="64"
              fallback="https://via.placeholder.com/64x64?text=LOGO"
            />
            <span v-else class="table-logo-placeholder">未上传</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag v-if="record.status === '1'" color="success">启用</a-tag>
            <a-tag v-else color="error">停用</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button
                type="primary"
                size="small"
                v-permission="'resource:brand:edit'"
                @click="handleEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                danger
                type="primary"
                size="small"
                v-permission="'resource:brand:edit'"
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
      width="560px"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form ref="formRef" :model="formState" :rules="formRules" layout="vertical">
        <a-form-item label="品牌名称" name="brandName" required>
          <a-input v-model:value="formState.brandName" placeholder="请输入品牌名称" />
        </a-form-item>
        <a-form-item label="品牌编码" name="brandCode" required>
          <a-input v-model:value="formState.brandCode" placeholder="请输入品牌编码" />
        </a-form-item>
        <a-form-item label="国家/地区" name="country">
          <a-input v-model:value="formState.country" placeholder="请输入国家或地区" />
        </a-form-item>
        <a-form-item label="品牌LOGO" name="logoUrl">
          <div class="logo-upload">
            <a-upload
              :show-upload-list="false"
              :custom-request="handleUploadLogo"
              accept="image/*"
            >
              <a-button>
                <upload-outlined />
                选择图片
              </a-button>
            </a-upload>
            <a-image
              v-if="formState.logoUrl"
              :src="resolveFileUrl(formState.logoUrl)"
              :preview="false"
              width="80"
              height="80"
              fallback="https://via.placeholder.com/80x80?text=LOGO"
              class="logo-upload__preview"
            />
            <span v-else class="logo-upload__placeholder">暂未上传LOGO</span>
          </div>
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
        <a-form-item label="品牌简介" name="description">
          <a-textarea
            v-model:value="formState.description"
            :rows="4"
            allow-clear
            placeholder="请输入品牌简介"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.brand-management {
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

.table-logo-placeholder {
  color: #999;
}

.logo-upload {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-upload__preview {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.logo-upload__placeholder {
  color: #999;
}
</style>
