<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { DownOutlined } from '@ant-design/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import type { TablePaginationConfig, TableProps } from 'ant-design-vue'
import { getCommunityController } from '@/api-client/src/api-client/community-controller/community-controller'
import type {
  ForumPostDetailVO,
  ForumReplyVO,
  QaAnswerVO,
  QaQuestionDetailVO,
} from '@/api-client/src/api-client/models'
import type {
  ForumPostAuditRequest,
  ForumOfficialReplyRequest,
  PagePostsParams,
  PageQuestionsParams,
  QaAnswerCreateRequest,
  QaQuestionStatusUpdateRequest,
} from '@/api-client/src/api-client/models'
import { useUserStore } from '@/stores/user'

interface ForumPostItem {
  id?: number
  title?: string
  status?: string
  coverImage?: string
  viewCount?: number
  likeCount?: number
  commentCount?: number
  userId?: number
  userName?: string
  lastReplyTime?: string
  createdAt?: string
  updatedAt?: string
}

interface QaQuestionItem {
  id?: number
  title?: string
  status?: string
  answerCount?: number
  userId?: number
  userName?: string
  lastAnswerTime?: string
  createdAt?: string
}

const communityController = getCommunityController()
const userStore = useUserStore()

const route = useRoute()
const router = useRouter()

const resolveTabByRoute = (path: string): 'posts' | 'questions' =>
  path.includes('/community/questions') ? 'questions' : 'posts'

const activeTab = ref<'posts' | 'questions'>(resolveTabByRoute(route.path))

const postStatusOptions = [
  { value: '1', label: '草稿', color: 'default' },
  { value: '2', label: '待审核', color: 'orange' },
  { value: '3', label: '已发布', color: 'green' },
  { value: '4', label: '驳回', color: 'red' },
  { value: '5', label: '已删除', color: 'magenta' },
]
const postStatusMap = new Map(postStatusOptions.map((item) => [item.value, item]))
const postAuditTargets = postStatusOptions.filter((item) => ['3', '4', '5'].includes(item.value))

const questionStatusOptions = [
  { value: '1', label: '待解答', color: 'default' },
  { value: '2', label: '解答中', color: 'blue' },
  { value: '3', label: '已解决', color: 'green' },
  { value: '4', label: '已关闭', color: 'red' },
]
const questionStatusMap = new Map(questionStatusOptions.map((item) => [item.value, item]))

const postFilters = reactive({
  keyword: '',
  status: undefined as string | undefined,
})
const postDateRange = ref<[Dayjs, Dayjs] | null>(null)

const questionFilters = reactive({
  keyword: '',
  status: undefined as string | undefined,
})
const questionDateRange = ref<[Dayjs, Dayjs] | null>(null)

const posts = ref<ForumPostItem[]>([])
const postLoading = ref(false)
const postPagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showQuickJumper: true,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})
const postSort = reactive({
  field: undefined as string | undefined,
  order: undefined as 'ascend' | 'descend' | undefined,
})

const questions = ref<QaQuestionItem[]>([])
const questionLoading = ref(false)
const questionPagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showQuickJumper: true,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})
const questionSort = reactive({
  field: undefined as string | undefined,
  order: undefined as 'ascend' | 'descend' | undefined,
})
const questionLoaded = ref(false)

const postColumns: TableProps<ForumPostItem>['columns'] = [
  { title: '帖子标题', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '发帖人', dataIndex: 'userName', key: 'userName', width: 120 },
  { title: '浏览', dataIndex: 'viewCount', key: 'viewCount', width: 90, sorter: true },
  { title: '点赞', dataIndex: 'likeCount', key: 'likeCount', width: 90, sorter: true },
  { title: '评论', dataIndex: 'commentCount', key: 'commentCount', width: 90, sorter: true },
  { title: '最后回复时间', dataIndex: 'lastReplyTime', key: 'lastReplyTime', width: 180, sorter: true },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180, sorter: true },
  { title: '操作', key: 'action', width: 220, fixed: 'right' },
]

const questionColumns: TableProps<QaQuestionItem>['columns'] = [
  { title: '问题标题', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '提问人', dataIndex: 'userName', key: 'userName', width: 120 },
  { title: '回答数', dataIndex: 'answerCount', key: 'answerCount', width: 100, sorter: true },
  { title: '最后回答时间', dataIndex: 'lastAnswerTime', key: 'lastAnswerTime', width: 180, sorter: true },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180, sorter: true },
  { title: '操作', key: 'action', width: 220, fixed: 'right' },
]

const formatDateTime = (value?: string) => {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'
}

const getPostStatusText = (status?: string) => postStatusMap.get(String(status ?? ''))?.label ?? '未知'
const getPostStatusColor = (status?: string) => postStatusMap.get(String(status ?? ''))?.color ?? 'default'

const getQuestionStatusText = (status?: string) => questionStatusMap.get(String(status ?? ''))?.label ?? '未知'
const getQuestionStatusColor = (status?: string) => questionStatusMap.get(String(status ?? ''))?.color ?? 'default'

const buildPostParams = (): PagePostsParams => {
  const params: PagePostsParams = {
    keyword: postFilters.keyword || undefined,
    status: postFilters.status || undefined,
    current: postPagination.current ?? 1,
    pageSize: postPagination.pageSize ?? 10,
    sortField: postSort.field,
    sortOrder: postSort.order,
  }
  if (postDateRange.value && postDateRange.value.length === 2) {
    params.startTime = dayjs(postDateRange.value[0]).format('YYYY-MM-DD HH:mm:ss')
    params.endTime = dayjs(postDateRange.value[1]).format('YYYY-MM-DD HH:mm:ss')
  }
  return params
}

const buildQuestionParams = (): PageQuestionsParams => {
  const params: PageQuestionsParams = {
    keyword: questionFilters.keyword || undefined,
    status: questionFilters.status || undefined,
    current: questionPagination.current ?? 1,
    pageSize: questionPagination.pageSize ?? 10,
    sortField: questionSort.field,
    sortOrder: questionSort.order,
  }
  if (questionDateRange.value && questionDateRange.value.length === 2) {
    params.startTime = dayjs(questionDateRange.value[0]).format('YYYY-MM-DD HH:mm:ss')
    params.endTime = dayjs(questionDateRange.value[1]).format('YYYY-MM-DD HH:mm:ss')
  }
  return params
}

const fetchPosts = async () => {
  try {
    postLoading.value = true
    const response = await communityController.pagePosts(buildPostParams())
    if (response.code === 200 && response.data) {
      posts.value = (response.data.records || []) as ForumPostItem[]
      postPagination.total = response.data.total ?? 0
      postPagination.current = response.data.current ?? 1
      postPagination.pageSize = response.data.pageSize ?? postPagination.pageSize
    } else {
      message.error(response.message || '获取帖子列表失败')
    }
  } catch (error) {
    console.error('fetchPosts error', error)
    message.error('获取帖子列表失败')
  } finally {
    postLoading.value = false
  }
}

const fetchQuestions = async () => {
  try {
    questionLoading.value = true
    const response = await communityController.pageQuestions(buildQuestionParams())
    if (response.code === 200 && response.data) {
      questions.value = (response.data.records || []) as QaQuestionItem[]
      questionPagination.total = response.data.total ?? 0
      questionPagination.current = response.data.current ?? 1
      questionPagination.pageSize = response.data.pageSize ?? questionPagination.pageSize
      questionLoaded.value = true
    } else {
      message.error(response.message || '获取问答列表失败')
    }
  } catch (error) {
    console.error('fetchQuestions error', error)
    message.error('获取问答列表失败')
  } finally {
    questionLoading.value = false
  }
}

const handlePostSearch = () => {
  postPagination.current = 1
  fetchPosts()
}

const handlePostReset = () => {
  postFilters.keyword = ''
  postFilters.status = undefined
  postDateRange.value = null
  postSort.field = undefined
  postSort.order = undefined
  postPagination.current = 1
  fetchPosts()
}

const handleQuestionSearch = () => {
  questionPagination.current = 1
  fetchQuestions()
}

const handleQuestionReset = () => {
  questionFilters.keyword = ''
  questionFilters.status = undefined
  questionDateRange.value = null
  questionSort.field = undefined
  questionSort.order = undefined
  questionPagination.current = 1
  fetchQuestions()
}

const handlePostTableChange: TableProps<ForumPostItem>['onChange'] = (pagination, _filters, sorter) => {
  postPagination.current = pagination.current ?? 1
  postPagination.pageSize = pagination.pageSize ?? 10
  if (!Array.isArray(sorter) && sorter?.order) {
    postSort.field = (sorter.field as string) || undefined
    postSort.order = sorter.order
  } else {
    postSort.field = undefined
    postSort.order = undefined
  }
  fetchPosts()
}

const handleQuestionTableChange: TableProps<QaQuestionItem>['onChange'] = (pagination, _filters, sorter) => {
  questionPagination.current = pagination.current ?? 1
  questionPagination.pageSize = pagination.pageSize ?? 10
  if (!Array.isArray(sorter) && sorter?.order) {
    questionSort.field = (sorter.field as string) || undefined
    questionSort.order = sorter.order
  } else {
    questionSort.field = undefined
    questionSort.order = undefined
  }
  fetchQuestions()
}

const postDetailVisible = ref(false)
const postDetailLoading = ref(false)
const currentPostDetail = ref<ForumPostDetailVO | null>(null)

const loadPostDetail = async (postId: number) => {
  try {
    postDetailLoading.value = true
    const response = await communityController.getPostDetail(postId)
    if (response.code === 200) {
      currentPostDetail.value = response.data ?? null
    } else {
      message.error(response.message || '获取帖子详情失败')
    }
  } catch (error) {
    console.error('loadPostDetail error', error)
    message.error('获取帖子详情失败')
  } finally {
    postDetailLoading.value = false
  }
}

const openPostDetail = (record: ForumPostItem) => {
  if (!record.id) {
    return
  }
  postDetailVisible.value = true
  loadPostDetail(record.id)
}

const closePostDetail = () => {
  postDetailVisible.value = false
  currentPostDetail.value = null
}

const replyModalVisible = ref(false)
const replySubmitting = ref(false)
const currentReplyPostId = ref<number | null>(null)
const replyForm = reactive<{ content: string; parentReplyId?: number | null }>({
  content: '',
  parentReplyId: null,
})

const openReplyModal = (record: ForumPostItem) => {
  if (!record.id) {
    message.warning('无效的帖子ID')
    return
  }
  currentReplyPostId.value = record.id
  replyForm.content = ''
  replyForm.parentReplyId = null
  replyModalVisible.value = true
}

const submitOfficialReply = async () => {
  const postId = currentReplyPostId.value
  if (!postId) {
    message.error('未找到帖子信息，请重试')
    return
  }
  const replyUserId = Number(userStore.userInfo?.id)
  if (!replyUserId) {
    message.error('请先重新登录管理员账号')
    return
  }
  const content = replyForm.content.trim()
  if (!content) {
    message.warning('回复内容不能为空')
    return
  }
  const payload: ForumOfficialReplyRequest = {
    replyUserId,
    content,
  }
  if (replyForm.parentReplyId) {
    payload.parentReplyId = replyForm.parentReplyId
  }
  try {
    replySubmitting.value = true
    const response = await communityController.officialReply(postId, payload)
    if (response.code === 200) {
      message.success('回复已发送')
      replyModalVisible.value = false
      await fetchPosts()
      if (postDetailVisible.value && currentPostDetail.value?.id === postId) {
        await loadPostDetail(postId)
      }
    } else {
      message.error(response.message || '回复失败')
    }
  } catch (error) {
    console.error('submitOfficialReply error', error)
    message.error('回复失败，请稍后重试')
  } finally {
    replySubmitting.value = false
  }
}

const handleAuditPost = (record: ForumPostItem, targetStatus: string) => {
  if (!record.id) {
    message.warning('无效的帖子ID')
    return
  }
  if (String(record.status) === targetStatus) {
    message.info('帖子已处于该状态')
    return
  }
  const statusText = getPostStatusText(targetStatus)
  const doAudit = async () => {
    const payload: ForumPostAuditRequest = { status: targetStatus }
    try {
      const response = await communityController.auditPost(record.id as number, payload)
      if (response.code === 200) {
        message.success(`帖子状态已更新为「${statusText}」`)
        await fetchPosts()
        if (postDetailVisible.value && currentPostDetail.value?.id === record.id) {
          await loadPostDetail(record.id as number)
        }
      } else {
        message.error(response.message || '更新帖子状态失败')
      }
    } catch (error) {
      console.error('handleAuditPost error', error)
      message.error('更新帖子状态失败')
    }
  }

  if (['4', '5'].includes(targetStatus)) {
    Modal.confirm({
      title: `确认将帖子状态修改为「${statusText}」吗？`,
      content: '该操作可能影响用户可见性，请谨慎处理。',
      okType: 'danger',
      centered: true,
      onOk: () => doAudit(),
    })
  } else {
    doAudit()
  }
}

const questionDetailVisible = ref(false)
const questionDetailLoading = ref(false)
const currentQuestionDetail = ref<QaQuestionDetailVO | null>(null)

const loadQuestionDetail = async (questionId: number) => {
  try {
    questionDetailLoading.value = true
    const response = await communityController.getQuestionDetail(questionId)
    if (response.code === 200) {
      currentQuestionDetail.value = response.data ?? null
    } else {
      message.error(response.message || '获取问答详情失败')
    }
  } catch (error) {
    console.error('loadQuestionDetail error', error)
    message.error('获取问答详情失败')
  } finally {
    questionDetailLoading.value = false
  }
}

const openQuestionDetail = (record: QaQuestionItem) => {
  if (!record.id) {
    return
  }
  questionDetailVisible.value = true
  loadQuestionDetail(record.id)
}

const closeQuestionDetail = () => {
  questionDetailVisible.value = false
  currentQuestionDetail.value = null
}

const answerModalVisible = ref(false)
const answerSubmitting = ref(false)
const currentAnswerQuestionId = ref<number | null>(null)
const answerForm = reactive({
  content: '',
  markAsAccepted: false,
})

const openAnswerModal = (record: QaQuestionItem) => {
  if (!record.id) {
    message.warning('无效的问题ID')
    return
  }
  currentAnswerQuestionId.value = record.id
  answerForm.content = ''
  answerForm.markAsAccepted = false
  answerModalVisible.value = true
}

const submitAnswer = async () => {
  const questionId = currentAnswerQuestionId.value
  if (!questionId) {
    message.error('未找到问题信息，请重试')
    return
  }
  const responderId = Number(userStore.userInfo?.id)
  if (!responderId) {
    message.error('请先重新登录管理员账号')
    return
  }
  const content = answerForm.content.trim()
  if (!content) {
    message.warning('回答内容不能为空')
    return
  }
  const payload: QaAnswerCreateRequest = {
    questionId,
    responderId,
    content,
    markAsAccepted: answerForm.markAsAccepted,
  }
  try {
    answerSubmitting.value = true
    const response = await communityController.answerQuestion(questionId, payload)
    if (response.code === 200) {
      message.success('回答已提交')
      answerModalVisible.value = false
      await fetchQuestions()
      if (questionDetailVisible.value && currentQuestionDetail.value?.id === questionId) {
        await loadQuestionDetail(questionId)
      }
    } else {
      message.error(response.message || '提交回答失败')
    }
  } catch (error) {
    console.error('submitAnswer error', error)
    message.error('提交回答失败，请稍后重试')
  } finally {
    answerSubmitting.value = false
  }
}

const handleQuestionStatusChange = (record: QaQuestionItem, targetStatus: string) => {
  if (!record.id) {
    message.warning('无效的问题ID')
    return
  }
  if (String(record.status) === targetStatus) {
    message.info('问题已处于该状态')
    return
  }
  const statusText = getQuestionStatusText(targetStatus)
  const payload: QaQuestionStatusUpdateRequest = { status: targetStatus }

  const doUpdate = async () => {
    try {
      const response = await communityController.updateQuestionStatus(record.id as number, payload)
      if (response.code === 200) {
        message.success(`问题状态已更新为「${statusText}」`)
        await fetchQuestions()
        if (questionDetailVisible.value && currentQuestionDetail.value?.id === record.id) {
          await loadQuestionDetail(record.id as number)
        }
      } else {
        message.error(response.message || '更新问题状态失败')
      }
    } catch (error) {
      console.error('handleQuestionStatusChange error', error)
      message.error('更新问题状态失败')
    }
  }

  if (targetStatus === '4') {
    Modal.confirm({
      title: `确认将问题状态修改为「${statusText}」吗？`,
      content: '关闭问题后将无法继续追加回答，请谨慎操作。',
      okType: 'danger',
      centered: true,
      onOk: () => doUpdate(),
    })
  } else {
    doUpdate()
  }
}

watch(
  activeTab,
  (tab) => {
    if (tab === 'questions' && !questionLoaded.value) {
      fetchQuestions()
    }
    const targetPath = tab === 'questions' ? '/admin/community/questions' : '/admin/community/posts'
    if (route.path !== targetPath) {
      router.replace(targetPath)
    }
  },
  { immediate: true },
)

watch(
  () => route.path,
  (path) => {
    const tab = resolveTabByRoute(path)
    if (activeTab.value !== tab) {
      activeTab.value = tab
    }
  },
)

onMounted(() => {
  fetchPosts()
})

const questionAnswersWithHighlight = computed(() => {
  if (!currentQuestionDetail.value?.answers) {
    return [] as QaAnswerVO[]
  }
  return [...currentQuestionDetail.value.answers].sort((a, b) => {
    const acceptedA = Number(a.isAccepted) === 1 ? 1 : 0
    const acceptedB = Number(b.isAccepted) === 1 ? 1 : 0
    if (acceptedA === acceptedB) {
      return dayjs(b.createdAt || 0).valueOf() - dayjs(a.createdAt || 0).valueOf()
    }
    return acceptedB - acceptedA
  })
})
</script>

<template>
  <a-card :bordered="false" class="community-management">
    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="posts" tab="帖子管理">
        <div class="toolbar">
          <a-form layout="inline">
            <a-form-item label="关键字">
              <a-input v-model:value="postFilters.keyword" placeholder="标题或内容关键词" allow-clear />
            </a-form-item>
            <a-form-item label="状态">
              <a-select
                v-model:value="postFilters.status"
                placeholder="全部状态"
                allow-clear
                style="width: 160px"
              >
                <a-select-option v-for="item in postStatusOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="时间范围">
              <a-range-picker v-model:value="postDateRange" show-time />
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" @click="handlePostSearch" :loading="postLoading">查询</a-button>
                <a-button @click="handlePostReset">重置</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </div>

        <a-table
          :columns="postColumns"
          :data-source="posts"
          :loading="postLoading"
          :pagination="postPagination"
          :scroll="{ x: 1000 }"
          row-key="id"
          @change="handlePostTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="getPostStatusColor(record.status)">
                {{ getPostStatusText(record.status) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'lastReplyTime' || column.key === 'createdAt'">
              {{ formatDateTime(record[column.dataIndex as keyof ForumPostItem] as string) }}
            </template>
            <template v-else-if="['viewCount', 'likeCount', 'commentCount'].includes(column.key as string)">
              {{ record[column.dataIndex as keyof ForumPostItem] ?? 0 }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="openPostDetail(record)">查看</a-button>
                <a-button type="link" size="small" @click="openReplyModal(record)">官方回复</a-button>
                <a-dropdown trigger="['click']">
                  <a-button type="link" size="small">
                    审核
                    <DownOutlined />
                  </a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item
                        v-for="item in postAuditTargets"
                        :key="item.value"
                        :disabled="String(record.status) === item.value"
                        @click="() => handleAuditPost(record, item.value)"
                      >
                        {{ item.label }}
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </a-space>
            </template>
            <template v-else>
              {{ record[column.dataIndex as keyof ForumPostItem] ?? '-' }}
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="questions" tab="问答管理">
        <div class="toolbar">
          <a-form layout="inline">
            <a-form-item label="关键字">
              <a-input v-model:value="questionFilters.keyword" placeholder="问题标题或内容" allow-clear />
            </a-form-item>
            <a-form-item label="状态">
              <a-select
                v-model:value="questionFilters.status"
                placeholder="全部状态"
                allow-clear
                style="width: 160px"
              >
                <a-select-option v-for="item in questionStatusOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="时间范围">
              <a-range-picker v-model:value="questionDateRange" show-time />
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" @click="handleQuestionSearch" :loading="questionLoading">查询</a-button>
                <a-button @click="handleQuestionReset">重置</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </div>

        <a-table
          :columns="questionColumns"
          :data-source="questions"
          :loading="questionLoading"
          :pagination="questionPagination"
          :scroll="{ x: 900 }"
          row-key="id"
          @change="handleQuestionTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="getQuestionStatusColor(record.status)">
                {{ getQuestionStatusText(record.status) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="openQuestionDetail(record)">查看</a-button>
                <a-button type="link" size="small" @click="openAnswerModal(record)">官方答复</a-button>
                <a-dropdown trigger="['click']">
                  <a-button type="link" size="small">
                    状态
                    <DownOutlined />
                  </a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item
                        v-for="item in questionStatusOptions"
                        :key="item.value"
                        :disabled="String(record.status) === item.value"
                        @click="() => handleQuestionStatusChange(record, item.value)"
                      >
                        {{ item.label }}
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </a-space>
            </template>
            <template v-else-if="['answerCount'].includes(column.key as string)">
              {{ record[column.dataIndex as keyof QaQuestionItem] ?? 0 }}
            </template>
            <template v-else-if="column.key === 'lastAnswerTime' || column.key === 'createdAt'">
              {{ formatDateTime(record[column.dataIndex as keyof QaQuestionItem] as string) }}
            </template>
            <template v-else>
              {{ record[column.dataIndex as keyof QaQuestionItem] ?? '-' }}
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>
  </a-card>

  <a-drawer
    :open="postDetailVisible"
    width="640"
    :title="currentPostDetail?.title || '帖子详情'"
    @close="closePostDetail"
    destroy-on-close
  >
    <a-spin :spinning="postDetailLoading">
      <template v-if="currentPostDetail">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="帖子状态">
            <a-tag :color="getPostStatusColor(currentPostDetail.status)">
              {{ getPostStatusText(currentPostDetail.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="发帖人">{{ currentPostDetail.userName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ formatDateTime(currentPostDetail.createdAt) }}</a-descriptions-item>
          <a-descriptions-item label="最后回复时间">{{ formatDateTime(currentPostDetail.lastReplyTime) }}</a-descriptions-item>
          <a-descriptions-item label="浏览 / 点赞 / 评论">
            {{ currentPostDetail.viewCount ?? 0 }} / {{ currentPostDetail.likeCount ?? 0 }} /
            {{ currentPostDetail.commentCount ?? 0 }}
          </a-descriptions-item>
          <a-descriptions-item label="帖子内容">{{ currentPostDetail.content || '暂无内容' }}</a-descriptions-item>
        </a-descriptions>

        <a-divider />
        <h4>回复列表</h4>
        <template v-if="currentPostDetail.replies && currentPostDetail.replies.length">
          <a-list
            :data-source="currentPostDetail.replies"
            :renderItem="({ item }: { item: ForumReplyVO }) => null"
          >
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta
                  :title="item.userName || '匿名用户'"
                  :description="formatDateTime(item.createdAt)"
                />
                <div>{{ item.content }}</div>
              </a-list-item>
            </template>
          </a-list>
        </template>
        <a-empty v-else description="暂无回复" />
      </template>
      <a-empty v-else-if="!postDetailLoading" description="暂无数据" />
    </a-spin>
  </a-drawer>

  <a-modal
    v-model:open="replyModalVisible"
    title="官方回复帖子"
    :confirm-loading="replySubmitting"
    :destroy-on-close="true"
    ok-text="提交"
    @ok="submitOfficialReply"
  >
    <a-form :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
      <a-form-item label="回复内容" required>
        <a-textarea v-model:value="replyForm.content" :rows="4" placeholder="输入官方回复内容" />
      </a-form-item>
    </a-form>
  </a-modal>

  <a-drawer
    :open="questionDetailVisible"
    width="640"
    :title="currentQuestionDetail?.title || '问题详情'"
    @close="closeQuestionDetail"
    destroy-on-close
  >
    <a-spin :spinning="questionDetailLoading">
      <template v-if="currentQuestionDetail">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="问题状态">
            <a-tag :color="getQuestionStatusColor(currentQuestionDetail.status)">
              {{ getQuestionStatusText(currentQuestionDetail.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="提问人">{{ currentQuestionDetail.userName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ formatDateTime(currentQuestionDetail.createdAt) }}</a-descriptions-item>
          <a-descriptions-item label="最后回答时间">{{ formatDateTime(currentQuestionDetail.lastAnswerTime) }}</a-descriptions-item>
          <a-descriptions-item label="问题内容">{{ currentQuestionDetail.content || '暂无描述' }}</a-descriptions-item>
        </a-descriptions>
        <a-divider />
        <h4>回答列表</h4>
        <template v-if="questionAnswersWithHighlight.length">
          <a-list :data-source="questionAnswersWithHighlight" :renderItem="({ item }: { item: QaAnswerVO }) => null">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta
                  :title="item.userName || '匿名用户'"
                  :description="formatDateTime(item.createdAt)"
                >
                  <template #title>
                    <span>
                      {{ item.userName || '匿名用户' }}
                      <a-tag v-if="Number(item.isAccepted) === 1" color="green" style="margin-left: 8px">
                        已采纳
                      </a-tag>
                    </span>
                  </template>
                </a-list-item-meta>
                <div>{{ item.content }}</div>
              </a-list-item>
            </template>
          </a-list>
        </template>
        <a-empty v-else description="暂无回答" />
      </template>
      <a-empty v-else-if="!questionDetailLoading" description="暂无数据" />
    </a-spin>
  </a-drawer>

  <a-modal
    v-model:open="answerModalVisible"
    title="官方回答"
    :confirm-loading="answerSubmitting"
    :destroy-on-close="true"
    ok-text="提交"
    @ok="submitAnswer"
  >
    <a-form :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
      <a-form-item label="回答内容" required>
        <a-textarea v-model:value="answerForm.content" :rows="4" placeholder="输入官方回答内容" />
      </a-form-item>
      <a-form-item label="标记解决">
        <a-switch v-model:checked="answerForm.markAsAccepted" checked-children="是" un-checked-children="否" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped>
.community-management {
  min-height: 600px;
}

.toolbar {
  margin-bottom: 16px;
}
</style>
