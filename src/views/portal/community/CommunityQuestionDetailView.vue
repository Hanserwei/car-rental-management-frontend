<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message, Modal } from 'ant-design-vue'
import {
  portalCommunityApi,
  type PortalQaAnswerPayload,
  type PortalQaAnswerVO,
  type PortalQaQuestionDetailVO,
} from '@/api/portal'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const answerSubmitting = ref(false)
const question = ref<PortalQaQuestionDetailVO | null>(null)
const answerContent = ref('')

const questionStatusMap: Record<number, string> = {
  1: '待解答',
  2: '解答中',
  3: '已解决',
  4: '已关闭',
}

const isLoggedIn = computed(() => userStore.isLoggedIn)
const currentUserId = computed(() =>
  userStore.userInfo?.id != null ? Number(userStore.userInfo.id) : null,
)
const isOwner = computed(
  () => currentUserId.value != null && question.value?.userId === currentUserId.value,
)

const canAnswer = computed(
  () => (question.value?.status ?? 1) !== 4 && (question.value?.status ?? 1) !== 3,
)

const ensureLoggedIn = () => {
  if (!isLoggedIn.value) {
    message.warning('请先登录后再操作')
    router.push('/login')
    return false
  }
  return true
}

const normalizeQuestion = (detail: PortalQaQuestionDetailVO): PortalQaQuestionDetailVO => ({
  ...detail,
  id: detail.id != null ? Number(detail.id) : undefined,
  status: detail.status != null ? Number(detail.status) : undefined,
  answerCount: detail.answerCount != null ? Number(detail.answerCount) : undefined,
  userId: detail.userId != null ? Number(detail.userId) : undefined,
  answers: (detail.answers || []).map((item) => ({
    ...item,
    id: item.id != null ? Number(item.id) : undefined,
    questionId: item.questionId != null ? Number(item.questionId) : undefined,
    userId: item.userId != null ? Number(item.userId) : undefined,
    status: item.status != null ? Number(item.status) : undefined,
    isAccepted: item.isAccepted != null ? Number(item.isAccepted) : undefined,
  })),
})

const fetchDetail = async () => {
  const questionId = Number(route.params.id)
  if (!questionId) {
    message.error('问题不存在')
    router.replace('/community/questions')
    return
  }
  try {
    loading.value = true
    const response = await portalCommunityApi.getQuestion(questionId)
    if (response.code === 200 && response.data) {
      question.value = normalizeQuestion(response.data)
    } else {
      message.error(response.message || '获取问题详情失败')
    }
  } catch (error) {
    console.error('获取问题详情失败', error)
    message.error('获取问题详情失败')
  } finally {
    loading.value = false
  }
}

const submitAnswer = async () => {
  if (!ensureLoggedIn() || !question.value?.id) {
    return
  }
  if (!answerContent.value.trim()) {
    message.warning('请输入回答内容')
    return
  }
  const payload: PortalQaAnswerPayload = {
    content: answerContent.value.trim(),
  }
  try {
    answerSubmitting.value = true
    await portalCommunityApi.answerQuestion(Number(question.value.id), payload)
    message.success('回答成功')
    answerContent.value = ''
    await fetchDetail()
  } catch (error) {
    console.error('回答问题失败', error)
    message.error('回答失败，请稍后重试')
  } finally {
    answerSubmitting.value = false
  }
}

const acceptAnswer = (answer: PortalQaAnswerVO) => {
  if (!isOwner.value || !question.value?.id || !answer.id) {
    return
  }
  Modal.confirm({
    title: '确认采纳该回答？',
    content: '采纳后问题将标记为已解决。',
    async onOk() {
      try {
        await portalCommunityApi.acceptAnswer(Number(question.value?.id), Number(answer.id))
        message.success('已采纳该回答')
        await fetchDetail()
      } catch (error) {
        console.error('采纳回答失败', error)
        message.error('采纳失败，请稍后重试')
      }
    },
  })
}

const closeQuestion = () => {
  if (!isOwner.value || !question.value?.id) {
    return
  }
  Modal.confirm({
    title: '确认关闭该问题？',
    content: '关闭后将不再接受新的回答。',
    async onOk() {
      try {
        await portalCommunityApi.closeQuestion(Number(question.value?.id))
        message.success('问题已关闭')
        await fetchDetail()
      } catch (error) {
        console.error('关闭问题失败', error)
        message.error('关闭问题失败，请稍后重试')
      }
    },
  })
}

const formatTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—')

onMounted(() => {
  fetchDetail()
})
</script>

<template>
  <div class="community-question-detail">
    <a-spin :spinning="loading">
      <a-card v-if="question" class="question-card" :bordered="false">
        <div class="question-header">
          <div>
            <a-breadcrumb style="margin-bottom: 12px">
              <a-breadcrumb-item @click="router.push('/community/questions')" class="link">问答社区</a-breadcrumb-item>
              <a-breadcrumb-item>问题详情</a-breadcrumb-item>
            </a-breadcrumb>
            <h1>{{ question.title }}</h1>
            <div class="meta">
              <span>提问者：{{ question.userName || '匿名用户' }}</span>
              <span>提问时间：{{ formatTime(question.createdAt) }}</span>
              <span>状态：</span>
              <a-tag color="blue">{{ questionStatusMap[question.status ?? 1] }}</a-tag>
            </div>
          </div>
          <a-space v-if="isOwner" :size="12">
            <a-button v-if="question.status !== 4" danger @click="closeQuestion">关闭问题</a-button>
          </a-space>
        </div>
        <a-divider />
        <a-typography-paragraph class="question-content">
          {{ question.content || '未提供补充描述' }}
        </a-typography-paragraph>
      </a-card>

      <a-card class="answer-card" title="回答列表" :bordered="false">
        <template #extra>
          <span class="answer-count">共 {{ question?.answers?.length ?? 0 }} 条回答</span>
        </template>

        <a-empty v-if="!question?.answers?.length" description="暂时还没有回答，快来抢先回答吧！" />

        <a-list v-else :data-source="question?.answers" item-layout="vertical" :split="true">
          <template #renderItem="{ item }">
            <a-list-item :key="item.id" class="answer-item">
              <template #actions>
                <a-button
                  v-if="isOwner && item.isAccepted !== 1"
                  type="link"
                  @click="acceptAnswer(item)"
                >
                  采纳回答
                </a-button>
              </template>
              <a-list-item-meta
                :title="item.userName || '匿名用户'"
                :description="formatTime(item.createdAt)"
              />
              <div class="answer-content">
                <a-tag v-if="item.isAccepted === 1" color="green" style="margin-bottom: 12px">已采纳</a-tag>
                <p>{{ item.content }}</p>
              </div>
            </a-list-item>
          </template>
        </a-list>

        <div v-if="canAnswer" class="answer-editor">
          <h3>我来回答</h3>
          <a-textarea
            v-model:value="answerContent"
            :auto-size="{ minRows: 4, maxRows: 8 }"
            placeholder="分享你的经验或解决方案，帮助提问者解决问题。"
            show-count
            :maxlength="4000"
          />
          <div class="answer-actions">
            <a-button type="primary" :loading="answerSubmitting" @click="submitAnswer">提交回答</a-button>
          </div>
        </div>
        <a-alert v-else type="info" show-icon message="该问题已解决或已关闭，无法继续回答。" />
      </a-card>
    </a-spin>
  </div>
</template>

<style scoped lang="css">
.community-question-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.question-card,
.answer-card {
  border-radius: 16px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.question-header h1 {
  margin-bottom: 8px;
  font-size: 28px;
  font-weight: 700;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: rgba(15, 23, 42, 0.65);
}

.link {
  cursor: pointer;
}

.question-content {
  white-space: pre-line;
  font-size: 16px;
  line-height: 1.8;
  color: rgba(15, 23, 42, 0.85);
}

.answer-count {
  color: rgba(15, 23, 42, 0.65);
}

.answer-item {
  border-radius: 12px;
  padding: 16px 0;
}

.answer-content {
  white-space: pre-line;
  color: rgba(15, 23, 42, 0.85);
}

.answer-editor {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.answer-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .question-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
