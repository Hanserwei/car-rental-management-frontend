<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message, Modal } from 'ant-design-vue'
import {
  portalCommunityApi,
  type PortalForumPostDetailVO,
  type PortalForumPostPayload,
  type PortalForumReplyPayload,
} from '@/api/portal'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const replySubmitting = ref(false)
const post = ref<PortalForumPostDetailVO | null>(null)
const replyContent = ref('')

const editorVisible = ref(false)
const editorSubmitting = ref(false)
const editorForm = reactive({
  title: '',
  content: '',
  coverImage: '',
})

const postStatusMap: Record<number, string> = {
  1: '草稿',
  2: '待审核',
  3: '已发布',
  4: '已驳回',
  5: '已删除',
}

const isLoggedIn = computed(() => userStore.isLoggedIn)
const currentUserId = computed(() =>
  userStore.userInfo?.id != null ? Number(userStore.userInfo.id) : null,
)

const isOwner = computed(
  () => currentUserId.value != null && post.value?.userId === currentUserId.value,
)

const canEdit = computed(() => isOwner.value && (post.value?.status === 1 || post.value?.status === 4))

const ensureLoggedIn = () => {
  if (!isLoggedIn.value) {
    message.warning('请先登录后再进行互动')
    router.push('/login')
    return false
  }
  return true
}

const normalizeDetail = (detail: PortalForumPostDetailVO): PortalForumPostDetailVO => ({
  ...detail,
  id: detail.id != null ? Number(detail.id) : undefined,
  status: detail.status != null ? Number(detail.status) : undefined,
  userId: detail.userId != null ? Number(detail.userId) : undefined,
  replies: (detail.replies || []).map((reply) => ({
    ...reply,
    id: reply.id != null ? Number(reply.id) : undefined,
    postId: reply.postId != null ? Number(reply.postId) : undefined,
    userId: reply.userId != null ? Number(reply.userId) : undefined,
    status: reply.status != null ? Number(reply.status) : undefined,
  })),
})

const fetchDetail = async () => {
  const postId = Number(route.params.id)
  if (!postId) {
    message.error('帖子不存在')
    router.replace('/community/posts')
    return
  }
  try {
    loading.value = true
    const response = await portalCommunityApi.getPost(postId)
    if (response.code === 200 && response.data) {
      post.value = normalizeDetail(response.data)
      editorForm.title = post.value?.title ?? ''
      editorForm.content = post.value?.content ?? ''
      editorForm.coverImage = post.value?.coverImage ?? ''
    } else {
      message.error(response.message || '获取帖子详情失败')
    }
  } catch (error) {
    console.error('获取帖子详情失败', error)
    message.error('获取帖子详情失败')
  } finally {
    loading.value = false
  }
}

const openEditor = () => {
  if (!ensureLoggedIn() || !canEdit.value) {
    return
  }
  editorForm.title = post.value?.title ?? ''
  editorForm.content = post.value?.content ?? ''
  editorForm.coverImage = post.value?.coverImage ?? ''
  editorVisible.value = true
}

const savePost = async (submitForReview: boolean) => {
  if (!post.value?.id) {
    return
  }
  if (!editorForm.title.trim() || !editorForm.content.trim()) {
    message.warning('请完善帖子标题和内容')
    return
  }
  const cover = editorForm.coverImage?.trim()
  const payload: PortalForumPostPayload = {
    title: editorForm.title.trim(),
    content: editorForm.content.trim(),
    coverImage: cover ? cover : null,
    submit: submitForReview,
  }
  try {
    editorSubmitting.value = true
    await portalCommunityApi.updatePost(Number(post.value.id), payload)
    message.success(submitForReview ? '已提交审核' : '草稿更新成功')
    editorVisible.value = false
    await fetchDetail()
  } catch (error) {
    console.error('更新帖子失败', error)
    message.error('更新帖子失败，请稍后再试')
  } finally {
    editorSubmitting.value = false
  }
}

const confirmDelete = () => {
  if (!post.value?.id) {
    return
  }
  Modal.confirm({
    title: '确认删除帖子？',
    content: '删除后帖子将不可见，是否继续？',
    okText: '删除',
    okButtonProps: { danger: true },
    async onOk() {
      try {
        await portalCommunityApi.deletePost(Number(post.value?.id))
        message.success('删除成功')
        router.push('/community/posts')
      } catch (error) {
        console.error('删除帖子失败', error)
        message.error('删除帖子失败，请稍后再试')
      }
    },
  })
}

const submitReply = async () => {
  if (!ensureLoggedIn()) {
    return
  }
  if (!post.value?.id) {
    return
  }
  if (!replyContent.value.trim()) {
    message.warning('请输入回复内容')
    return
  }
  const payload: PortalForumReplyPayload = {
    content: replyContent.value.trim(),
  }
  try {
    replySubmitting.value = true
    await portalCommunityApi.replyPost(Number(post.value.id), payload)
    message.success('回复成功')
    replyContent.value = ''
    await fetchDetail()
  } catch (error) {
    console.error('回复帖子失败', error)
    message.error('回复失败，请稍后再试')
  } finally {
    replySubmitting.value = false
  }
}

const formatTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—')

onMounted(() => {
  fetchDetail()
})
</script>

<template>
  <div class="community-post-detail">
    <a-spin :spinning="loading">
      <a-card v-if="post" class="post-card" :bordered="false">
        <div class="post-header">
          <div>
            <a-breadcrumb style="margin-bottom: 12px">
              <a-breadcrumb-item @click="router.push('/community/posts')" class="link">社区广场</a-breadcrumb-item>
              <a-breadcrumb-item>帖子详情</a-breadcrumb-item>
            </a-breadcrumb>
            <h1>{{ post.title }}</h1>
            <div class="meta">
              <span>作者：{{ post.userName || '匿名用户' }}</span>
              <span>创建时间：{{ formatTime(post.createdAt) }}</span>
              <span>浏览 {{ post.viewCount ?? 0 }}</span>
              <span>评论 {{ post.commentCount ?? 0 }}</span>
              <a-tag v-if="post.status != null">{{ postStatusMap[post.status] ?? '未知状态' }}</a-tag>
            </div>
          </div>
          <a-space v-if="isOwner" :size="12">
            <a-button v-if="canEdit" @click="openEditor">编辑</a-button>
            <a-button danger @click="confirmDelete">删除</a-button>
          </a-space>
        </div>
        <a-divider />
        <div v-if="post.coverImage" class="cover">
          <img :src="post.coverImage" alt="post cover" />
        </div>
        <a-typography-paragraph class="content">
          {{ post.content || '暂无内容' }}
        </a-typography-paragraph>
      </a-card>

      <a-card title="全部回复" class="reply-card">
        <template #extra>
          <span class="reply-count">共 {{ post?.replies?.length ?? 0 }} 条</span>
        </template>
        <a-empty v-if="!post?.replies?.length" description="当前暂无回复" />
        <a-list v-else :data-source="post?.replies" item-layout="horizontal" :split="true">
          <template #renderItem="{ item }">
            <a-list-item :key="item.id">
              <a-list-item-meta
                :title="item.userName || '匿名用户'"
                :description="formatTime(item.createdAt)"
              />
              <div class="reply-content">{{ item.content }}</div>
            </a-list-item>
          </template>
        </a-list>

        <div class="reply-editor">
          <h3>我也来说两句</h3>
          <a-textarea
            v-model:value="replyContent"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            placeholder="发布建设性评论，文明交流从我做起"
            show-count
            :maxlength="2000"
          />
          <div class="reply-actions">
            <a-button type="primary" :loading="replySubmitting" @click="submitReply">发布回复</a-button>
          </div>
        </div>
      </a-card>
    </a-spin>

    <a-modal
      v-model:open="editorVisible"
      title="编辑帖子"
      :confirmLoading="editorSubmitting"
      :footer="null"
      destroy-on-close
      width="640px"
    >
      <a-form layout="vertical" :model="editorForm">
        <a-form-item label="帖子标题" required>
          <a-input v-model:value="editorForm.title" maxlength="150" show-count />
        </a-form-item>
        <a-form-item label="内容" required>
          <a-textarea
            v-model:value="editorForm.content"
            :auto-size="{ minRows: 6, maxRows: 12 }"
            show-count
            :maxlength="5000"
          />
        </a-form-item>
        <a-form-item label="封面图片">
          <a-input v-model:value="editorForm.coverImage" allow-clear />
        </a-form-item>
      </a-form>
      <div class="modal-footer">
        <a-space>
          <a-button @click="editorVisible = false">取消</a-button>
          <a-button :loading="editorSubmitting" @click="savePost(false)">保存草稿</a-button>
          <a-button type="primary" :loading="editorSubmitting" @click="savePost(true)">提交审核</a-button>
        </a-space>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="css">
.community-post-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.post-card {
  border-radius: 16px;
}

.post-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.post-header h1 {
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

.meta span {
  display: inline-flex;
  align-items: center;
}

.link {
  cursor: pointer;
}

.cover {
  margin-bottom: 16px;
  border-radius: 12px;
  overflow: hidden;
}

.cover img {
  width: 100%;
  max-height: 320px;
  object-fit: cover;
}

.content {
  white-space: pre-line;
  font-size: 16px;
  line-height: 1.8;
  color: rgba(15, 23, 42, 0.85);
}

.reply-card {
  border-radius: 16px;
}

.reply-count {
  color: rgba(15, 23, 42, 0.65);
}

.reply-content {
  white-space: pre-line;
  color: rgba(15, 23, 42, 0.85);
}

.reply-editor {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

@media (max-width: 768px) {
  .post-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
