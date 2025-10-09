<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import {
  portalCommunityApi,
  type PortalQaQuestionPayload,
  type PortalQaQuestionQuery,
  type PortalQaQuestionVO,
} from '@/api/portal'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const questions = ref<PortalQaQuestionVO[]>([])
const keyword = ref('')
const showMine = ref(false)
const statusFilter = ref<number | undefined>()
const createVisible = ref(false)
const createSubmitting = ref(false)
const createForm = reactive({
  title: '',
  content: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 8,
  total: 0,
})

const questionStatusMap: Record<number, string> = {
  1: '待解答',
  2: '解答中',
  3: '已解决',
  4: '已关闭',
}

const isLoggedIn = computed(() => userStore.isLoggedIn)

const ensureLoggedIn = () => {
  if (!isLoggedIn.value) {
    message.warning('请先登录')
    router.push('/login')
    return false
  }
  return true
}

const buildQueryParams = (): PortalQaQuestionQuery => {
  const params: PortalQaQuestionQuery = {
    keyword: keyword.value?.trim() || undefined,
    current: pagination.current,
    pageSize: pagination.pageSize,
  }
  if (showMine.value) {
    params.mine = true
    if (statusFilter.value != null) {
      params.status = statusFilter.value
    }
  }
  return params
}

const normalizeQuestion = (item: PortalQaQuestionVO): PortalQaQuestionVO => ({
  ...item,
  id: item.id != null ? Number(item.id) : undefined,
  status: item.status != null ? Number(item.status) : undefined,
  answerCount: item.answerCount != null ? Number(item.answerCount) : undefined,
  userId: item.userId != null ? Number(item.userId) : undefined,
})

const fetchQuestions = async () => {
  try {
    loading.value = true
    const response = await portalCommunityApi.pageQuestions(buildQueryParams())
    if (response.code === 200 && response.data) {
      const pageData = response.data
      const records = pageData.records || []
      questions.value = records.map((item) => normalizeQuestion(item))
      pagination.total = Number(pageData.total ?? records.length)
      pagination.current = Number(pageData.current ?? pagination.current)
      pagination.pageSize = Number(
        pageData.pageSize ?? (pageData as { size?: number }).size ?? pagination.pageSize,
      )
    } else {
      message.error(response.message || '加载问题列表失败')
    }
  } catch (error) {
    console.error('加载问题列表失败', error)
    message.error('加载问题列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchQuestions()
}

const handlePageChange = (page: number, pageSize?: number) => {
  pagination.current = page
  if (pageSize) {
    pagination.pageSize = pageSize
  }
  fetchQuestions()
}

const openCreateModal = () => {
  if (!ensureLoggedIn()) {
    return
  }
  createForm.title = ''
  createForm.content = ''
  createVisible.value = true
}

const submitQuestion = async () => {
  if (!createForm.title.trim() || !createForm.content.trim()) {
    message.warning('请完整填写问题标题和描述')
    return
  }
  const payload: PortalQaQuestionPayload = {
    title: createForm.title.trim(),
    content: createForm.content.trim(),
  }
  try {
    createSubmitting.value = true
    const response = await portalCommunityApi.createQuestion(payload)
    if (response.code === 200 && response.data?.id != null) {
      message.success('提问成功，耐心等待解答')
      createVisible.value = false
      await fetchQuestions()
      router.push(`/community/questions/${response.data.id}`)
    } else {
      message.error(response.message || '提问失败，请稍后再试')
    }
  } catch (error) {
    console.error('提问失败', error)
    message.error('提问失败，请稍后再试')
  } finally {
    createSubmitting.value = false
  }
}

const goDetail = (questionId?: number | string) => {
  if (!questionId) {
    return
  }
  router.push(`/community/questions/${questionId}`)
}

const formatTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—')

watch(
  () => showMine.value,
  (mine) => {
    if (mine && !ensureLoggedIn()) {
      showMine.value = false
      return
    }
    if (!mine) {
      statusFilter.value = undefined
    }
    pagination.current = 1
    fetchQuestions()
  },
)

watch(
  () => statusFilter.value,
  () => {
    if (showMine.value) {
      pagination.current = 1
      fetchQuestions()
    }
  },
)

onMounted(() => {
  fetchQuestions()
})
</script>

<template>
  <div class="community-question-list">
    <section class="hero">
      <div>
        <h1>问答社区</h1>
        <p>车辆使用、租赁流程、城市攻略... 提问专业人士和热心车友。</p>
      </div>
      <a-space :size="12">
        <a-input-search
          v-model:value="keyword"
          placeholder="搜索问题标题或内容"
          enter-button="搜索"
          allow-clear
          style="width: 280px"
          @search="handleSearch"
        />
        <a-button type="primary" @click="openCreateModal">我要提问</a-button>
      </a-space>
    </section>

    <section class="filters">
      <a-space :size="16" align="center" wrap>
        <a-switch v-model:checked="showMine" checked-children="只看我的" un-checked-children="全部问题" />
        <a-select
          v-if="showMine"
          v-model:value="statusFilter"
          placeholder="按状态筛选"
          allow-clear
          style="width: 160px"
        >
          <a-select-option :value="1">待解答</a-select-option>
          <a-select-option :value="2">解答中</a-select-option>
          <a-select-option :value="3">已解决</a-select-option>
          <a-select-option :value="4">已关闭</a-select-option>
        </a-select>
      </a-space>
    </section>

    <a-spin :spinning="loading">
      <a-list
        item-layout="vertical"
        :data-source="questions"
        :split="true"
        :locale="{ emptyText: '当前暂无问题' }"
      >
        <template #renderItem="{ item }">
          <a-list-item :key="item.id" class="question-item" @click="goDetail(item.id)">
            <a-list-item-meta :title="item.title">
              <template #description>
                <div class="question-meta">
                  <span>提问者：{{ item.userName || '匿名用户' }}</span>
                  <span>时间：{{ formatTime(item.createdAt) }}</span>
                  <span>回答数：{{ item.answerCount ?? 0 }}</span>
                  <a-tag :color="item.status === 3 ? 'success' : item.status === 4 ? 'default' : 'processing'">
                    {{ questionStatusMap[item.status ?? 1] }}
                  </a-tag>
                </div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>

      <div v-if="pagination.total > pagination.pageSize" class="pagination">
        <a-pagination
          :current="pagination.current"
          :pageSize="pagination.pageSize"
          :total="pagination.total"
          :showSizeChanger="true"
          :pageSizeOptions="['8', '12', '20']"
          @change="handlePageChange"
          @showSizeChange="handlePageChange"
        />
      </div>
    </a-spin>

    <a-modal
      v-model:open="createVisible"
      title="发起提问"
      :confirmLoading="createSubmitting"
      destroy-on-close
      @ok="submitQuestion"
    >
      <a-form layout="vertical" :model="createForm">
        <a-form-item label="问题标题" required>
          <a-input v-model:value="createForm.title" maxlength="150" show-count placeholder="一句话描述你的问题" />
        </a-form-item>
        <a-form-item label="问题描述" required>
          <a-textarea
            v-model:value="createForm.content"
            placeholder="描述问题背景、已尝试的解决办法等"
            :auto-size="{ minRows: 4, maxRows: 10 }"
            show-count
            :maxlength="4000"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="css">
.community-question-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ede9fe 0%, #e0f2fe 100%);
}

.hero h1 {
  margin-bottom: 8px;
  font-size: 30px;
  font-weight: 700;
}

.hero p {
  margin: 0;
  color: rgba(15, 23, 42, 0.7);
}

.filters {
  display: flex;
  justify-content: flex-start;
}

.question-item {
  cursor: pointer;
  border-radius: 12px;
  padding: 16px 24px;
  transition: box-shadow 0.2s;
}

.question-item:hover {
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.1);
}

.question-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: rgba(15, 23, 42, 0.6);
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 16px 0 8px;
}

@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
