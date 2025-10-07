<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { message, Modal, type FormInstance, type TableProps } from 'ant-design-vue'
import { newsApi, type NewsVO } from '@/api/news'

const dataSource = ref<NewsVO[]>([])
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
  keyword: '',
  status: undefined as number | undefined,
  isTop: undefined as number | undefined,
})

const publishedRange = ref<Dayjs[]>([])

const selectedRowKeys = ref<number[]>([])

const handleRowSelectionChange = (keys: (string | number)[]) => {
  selectedRowKeys.value = keys.map((key) => Number(key))
}

const tablePagination = computed(() => ({
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: total.value,
  showSizeChanger: pagination.showSizeChanger,
  showQuickJumper: pagination.showQuickJumper,
  showTotal: pagination.showTotal,
}))

const tableRowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: handleRowSelectionChange,
}))

const modalVisible = ref(false)
const modalLoading = ref(false)
const modalTitle = ref('新增新闻')
const isEditMode = ref(false)
const currentNewsId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const formState = reactive({
  title: '',
  summary: '',
  coverImage: '',
  content: '',
  status: 1,
  isTop: 0,
  publishedAt: null as Dayjs | null,
})

const formRules = {
  title: [{ required: true, message: '请输入新闻标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入正文内容', trigger: 'blur' }],
}

const statusTagMap: Record<number, { text: string; color: 'default' | 'success' | 'processing' | 'error' | 'warning' }> = {
  0: { text: '草稿', color: 'default' },
  1: { text: '已发布', color: 'success' },
}

const columns: TableProps<NewsVO>['columns'] = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '标题', dataIndex: 'title', key: 'title', width: 220 },
  { title: '置顶', dataIndex: 'isTop', key: 'isTop', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '发布时间', dataIndex: 'publishedAt', key: 'publishedAt', width: 180 },
  { title: '浏览量', dataIndex: 'viewCount', key: 'viewCount', width: 100 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 180 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' },
]

const resetFormState = () => {
  formState.title = ''
  formState.summary = ''
  formState.coverImage = ''
  formState.content = ''
  formState.status = 1
  formState.isTop = 0
  formState.publishedAt = null
  formRef.value?.clearValidate()
}

const buildQueryParams = () => {
  const params = {
    keyword: searchForm.keyword?.trim() || undefined,
    status: searchForm.status,
    isTop: searchForm.isTop,
    publishedStart:
      publishedRange.value?.length === 2
        ? dayjs(publishedRange.value[0]).format('YYYY-MM-DD HH:mm:ss')
        : undefined,
    publishedEnd:
      publishedRange.value?.length === 2
        ? dayjs(publishedRange.value[1]).format('YYYY-MM-DD HH:mm:ss')
        : undefined,
    current: pagination.current,
    pageSize: pagination.pageSize,
  }
  return params
}

const fetchNews = async () => {
  try {
    loading.value = true
    const response = await newsApi.pageNews(buildQueryParams())
    if (response.code === 200 && response.data) {
      const pageData = response.data
      const rawRecords = pageData.records || []
      dataSource.value = rawRecords.map((item) => ({
        ...item,
        id: item.id != null ? Number(item.id) : undefined,
        status: item.status != null ? Number(item.status) : undefined,
        isTop: item.isTop != null ? Number(item.isTop) : undefined,
        viewCount: item.viewCount != null ? Number(item.viewCount) : undefined,
      }))
      total.value = Number(pageData.total ?? rawRecords.length)
      pagination.current = Number(pageData.current ?? pagination.current)
      pagination.pageSize = Number(
        pageData.pageSize ?? (pageData as { size?: number }).size ?? pagination.pageSize,
      )
    } else {
      message.error(response.message || '获取新闻列表失败')
    }
  } catch (error) {
    console.error('获取新闻列表失败:', error)
    message.error('获取新闻列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchNews()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.status = undefined
  searchForm.isTop = undefined
  publishedRange.value = []
  selectedRowKeys.value = []
  pagination.current = 1
  fetchNews()
}

const handleTableChange: TableProps<NewsVO>['onChange'] = (pag) => {
  if (pag?.current) {
    pagination.current = pag.current
  }
  if (pag?.pageSize) {
    pagination.pageSize = pag.pageSize
  }
  fetchNews()
}

const handleAdd = () => {
  isEditMode.value = false
  modalTitle.value = '新增新闻'
  currentNewsId.value = null
  resetFormState()
  modalVisible.value = true
}

const handleEdit = async (record: NewsVO) => {
  if (!record.id) {
    return
  }
  try {
    isEditMode.value = true
    modalTitle.value = '编辑新闻'
    currentNewsId.value = Number(record.id)
    const response = await newsApi.getNews(currentNewsId.value)
    if (response.code === 200 && response.data) {
      const data = response.data
      formState.title = data.title || ''
      formState.summary = data.summary || ''
      formState.coverImage = data.coverImage || ''
      formState.content = data.content || ''
      formState.status = data.status != null ? Number(data.status) : 0
      formState.isTop = data.isTop != null ? Number(data.isTop) : 0
      formState.publishedAt = data.publishedAt ? dayjs(data.publishedAt) : null
      formRef.value?.clearValidate()
      modalVisible.value = true
    } else {
      message.error(response.message || '获取新闻详情失败')
    }
  } catch (error) {
    console.error('获取新闻详情失败:', error)
    message.error('获取新闻详情失败')
  }
}

const handleDelete = (record: NewsVO) => {
  if (!record.id) {
    return
  }
  Modal.confirm({
    title: `确定删除新闻“${record.title}”吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const response = await newsApi.deleteNews(Number(record.id))
        if (response.code === 200) {
          message.success('删除成功')
          fetchNews()
        } else {
          message.error(response.message || '删除失败')
        }
      } catch (error) {
        console.error('删除新闻失败:', error)
        message.error('删除新闻失败')
      }
    },
  })
}

const handleBatchDelete = () => {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择需要删除的新闻')
    return
  }
  Modal.confirm({
    title: '批量删除新闻',
    content: `确认删除选中的 ${selectedRowKeys.value.length} 条新闻吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const response = await newsApi.batchDeleteNews({ newsIds: selectedRowKeys.value })
        if (response.code === 200) {
          message.success('删除成功')
          selectedRowKeys.value = []
          fetchNews()
        } else {
          message.error(response.message || '删除失败')
        }
      } catch (error) {
        console.error('批量删除失败:', error)
        message.error('批量删除失败')
      }
    },
  })
}

const handleSubmit = async () => {
  const form = formRef.value
  if (!form) {
    return
  }

  try {
    await form.validate()
  } catch (error) {
    return
  }

  modalLoading.value = true
  const payload = {
    title: formState.title.trim(),
    summary: formState.summary?.trim() || undefined,
    coverImage: formState.coverImage?.trim() || undefined,
    content: formState.content,
    status: Number(formState.status),
    isTop: Number(formState.isTop),
    publishedAt: formState.publishedAt ? formState.publishedAt.format('YYYY-MM-DD HH:mm:ss') : undefined,
  }

  try {
    if (isEditMode.value && currentNewsId.value) {
      const response = await newsApi.updateNews(currentNewsId.value, payload)
      if (response.code === 200) {
        message.success('更新成功')
        modalVisible.value = false
        fetchNews()
      } else {
        message.error(response.message || '更新失败')
      }
    } else {
      const response = await newsApi.createNews(payload)
      if (response.code === 200) {
        message.success('新增成功')
        modalVisible.value = false
        fetchNews()
      } else {
        message.error(response.message || '新增失败')
      }
    }
  } catch (error) {
    console.error('保存新闻失败:', error)
    message.error('保存新闻失败')
  } finally {
    modalLoading.value = false
  }
}

const statusOptions = [
  { value: 0, label: '草稿' },
  { value: 1, label: '已发布' },
]

const isTopOptions = [
  { value: 1, label: '置顶' },
  { value: 0, label: '不置顶' },
]

onMounted(() => {
  fetchNews()
})
</script>

<template>
  <div class="news-page">
    <a-card class="filter-card" :bordered="false">
      <a-form layout="inline" class="filter-form">
        <a-form-item label="关键词">
          <a-input
            v-model:value="searchForm.keyword"
            allow-clear
            placeholder="请输入标题或摘要关键词"
            style="width: 220px"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="searchForm.status" allow-clear placeholder="全部" style="width: 140px">
            <a-select-option v-for="item in statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="置顶">
          <a-select v-model:value="searchForm.isTop" allow-clear placeholder="全部" style="width: 140px">
            <a-select-option :value="1">置顶</a-select-option>
            <a-select-option :value="0">不置顶</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="发布时间">
          <a-range-picker
            v-model:value="publishedRange"
            show-time
            format="YYYY-MM-DD HH:mm"
            allow-clear
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false">
      <div class="table-toolbar">
        <a-space>
          <a-button type="primary" @click="handleAdd">新增新闻</a-button>
          <a-button danger @click="handleBatchDelete">批量删除</a-button>
        </a-space>
      </div>
      <a-table
        row-key="id"
        :data-source="dataSource"
        :columns="columns"
        :loading="loading"
        :pagination="tablePagination"
        :row-selection="tableRowSelection"
        @change="handleTableChange"
        :scroll="{ x: 1000 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'isTop'">
            <a-tag :color="record.isTop === 1 ? 'processing' : 'default'">
              {{ record.isTop === 1 ? '置顶' : '否' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusTagMap[Number(record.status) || 0]?.color">
              {{ statusTagMap[Number(record.status) || 0]?.text || '未知' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'publishedAt'">
            {{ record.publishedAt ? dayjs(record.publishedAt).format('YYYY-MM-DD HH:mm') : '-' }}
          </template>
          <template v-else-if="column.key === 'updatedAt'">
            {{ record.updatedAt ? dayjs(record.updatedAt).format('YYYY-MM-DD HH:mm') : '-' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="handleEdit(record)">编辑</a-button>
              <a-button type="link" danger @click="handleDelete(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      :confirmLoading="modalLoading"
      width="720px"
      @ok="handleSubmit"
    >
      <a-form
        ref="formRef"
        :model="formState"
        :rules="formRules"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 20 }"
      >
        <a-form-item label="标题" name="title">
          <a-input v-model:value="formState.title" placeholder="请输入标题" />
        </a-form-item>
        <a-form-item label="摘要">
          <a-textarea v-model:value="formState.summary" :rows="3" placeholder="请输入摘要，可选" />
        </a-form-item>
        <a-form-item label="封面图">
          <a-input v-model:value="formState.coverImage" placeholder="请输入封面图地址" />
        </a-form-item>
        <a-form-item label="正文" name="content">
          <a-textarea v-model:value="formState.content" :rows="8" placeholder="请输入新闻内容" />
        </a-form-item>
        <a-form-item label="状态">
          <a-radio-group v-model:value="formState.status">
            <a-radio :value="1">已发布</a-radio>
            <a-radio :value="0">草稿</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="是否置顶">
          <a-radio-group v-model:value="formState.isTop">
            <a-radio :value="1">置顶</a-radio>
            <a-radio :value="0">否</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="发布时间">
          <a-date-picker
            v-model:value="formState.publishedAt"
            show-time
            format="YYYY-MM-DD HH:mm"
            style="width: 100%"
            placeholder="未选择时将在发布时自动填充当前时间"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="css">
.news-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  border-radius: 12px;
}

.filter-form {
  row-gap: 16px;
}

.table-toolbar {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
}
</style>
