<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message, Modal } from 'ant-design-vue'
import {
  portalCommunityApi,
  type PortalForumPostDetailVO,
  type PortalForumPostPayload,
  type PortalForumPostQuery,
  type PortalForumPostVO,
} from '@/api/portal'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const posts = ref<PortalForumPostVO[]>([])
const keyword = ref('')
const showMine = ref(false)
const statusFilter = ref<number | undefined>()

const pagination = reactive({
  current: 1,
  pageSize: 6,
  total: 0,
})

const editorVisible = ref(false)
const editorSubmitting = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editingPostId = ref<number | null>(null)
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

const ensureLoggedIn = () => {
  if (!isLoggedIn.value) {
    message.warning('请先登录后再执行该操作')
    router.push('/login')
    return false
  }
  return true
}

const resetEditorForm = () => {
  editorForm.title = ''
  editorForm.content = ''
  editorForm.coverImage = ''
}

const openCreateModal = () => {
  if (!ensureLoggedIn()) {
    return
  }
  editorMode.value = 'create'
  editingPostId.value = null
  resetEditorForm()
  editorVisible.value = true
}

const openEditModal = async (post: PortalForumPostVO) => {
  if (!ensureLoggedIn()) {
    return
  }
  if (!post.id) {
    return
  }
  editorMode.value = 'edit'
  editingPostId.value = Number(post.id)
  const detail = await fetchPostDetail(post.id).catch(() => null)
  editorForm.title = detail?.title ?? post.title ?? ''
  editorForm.content = detail?.content ?? ''
  editorForm.coverImage = detail?.coverImage ?? post.coverImage ?? ''
  editorVisible.value = true
}

const handleDelete = (post: PortalForumPostVO) => {
  if (!post.id) {
    return
  }
  Modal.confirm({
    title: '确认删除该帖子？',
    content: '删除后帖子将不可见，确定要继续吗？',
    okText: '删除',
    okButtonProps: { danger: true },
    async onOk() {
      try {
        await portalCommunityApi.deletePost(Number(post.id))
        message.success('删除成功')
        await fetchPosts()
      } catch (error) {
        console.error('删除帖子失败', error)
        message.error('删除帖子失败，请稍后再试')
      }
    },
  })
}

const buildQueryParams = (): PortalForumPostQuery => {
  const params: PortalForumPostQuery = {
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

const normalizePost = (item: PortalForumPostVO): PortalForumPostVO => {
  const normalized: PortalForumPostVO = {
    ...item,
    id: item.id != null ? Number(item.id) : undefined,
    status: item.status != null ? Number(item.status) : undefined,
    viewCount: item.viewCount != null ? Number(item.viewCount) : undefined,
    likeCount: item.likeCount != null ? Number(item.likeCount) : undefined,
    commentCount: item.commentCount != null ? Number(item.commentCount) : undefined,
    userId: item.userId != null ? Number(item.userId) : undefined,
  }
  return normalized
}

const fetchPostDetail = async (postId: number) => {
  try {
    const response = await portalCommunityApi.getPost(Number(postId))
    if (response.code === 200 && response.data) {
      const detail = response.data as PortalForumPostDetailVO
      return {
        ...detail,
        id: detail.id != null ? Number(detail.id) : undefined,
        status: detail.status != null ? Number(detail.status) : undefined,
        userId: detail.userId != null ? Number(detail.userId) : undefined,
      }
    }
  } catch (error) {
    console.warn('获取帖子详情失败', error)
  }
  return null
}

const fetchPosts = async () => {
  try {
    loading.value = true
    const response = await portalCommunityApi.pagePosts(buildQueryParams())
    if (response.code === 200 && response.data) {
      const pageData = response.data
      const records = pageData.records || []
      posts.value = records.map((item) => normalizePost(item))
      pagination.total = Number(pageData.total ?? records.length)
      pagination.current = Number(pageData.current ?? pagination.current)
      pagination.pageSize = Number(
        pageData.pageSize ?? (pageData as { size?: number }).size ?? pagination.pageSize,
      )
    } else {
      message.error(response.message || '加载帖子列表失败')
    }
  } catch (error) {
    console.error('加载帖子列表失败', error)
    message.error('加载帖子列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchPosts()
}

const handlePageChange = (page: number, pageSize?: number) => {
  pagination.current = page
  if (pageSize) {
    pagination.pageSize = pageSize
  }
  fetchPosts()
}

const goDetail = (postId?: number | string) => {
  if (!postId) {
    return
  }
  router.push(`/community/posts/${postId}`)
}

const submitPost = async (submitForReview: boolean) => {
  if (!ensureLoggedIn()) {
    return
  }
  if (!editorForm.title.trim()) {
    message.warning('请填写帖子标题')
    return
  }
  if (!editorForm.content.trim()) {
    message.warning('请填写帖子内容')
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
    if (editorMode.value === 'create') {
      await portalCommunityApi.createPost(payload)
      message.success(submitForReview ? '提交审核成功，等待发布' : '草稿保存成功')
    } else if (editingPostId.value != null) {
      await portalCommunityApi.updatePost(editingPostId.value, payload)
      message.success(submitForReview ? '已重新提交审核' : '草稿更新成功')
    }
    editorVisible.value = false
    await fetchPosts()
  } catch (error) {
    console.error('保存帖子失败', error)
    message.error('保存帖子失败，请稍后再试')
  } finally {
    editorSubmitting.value = false
  }
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
    fetchPosts()
  },
)

watch(
  () => statusFilter.value,
  () => {
    if (showMine.value) {
      pagination.current = 1
      fetchPosts()
    }
  },
)

onMounted(() => {
  fetchPosts()
})
</script>

<template>
  <div class="community-post-list">
    <section class="hero">
      <div>
        <h1>社区广场</h1>
        <p>分享用车体验、提问求助、结识同好，让交流点亮旅途。</p>
      </div>
      <a-space :size="12">
        <a-input-search
          v-model:value="keyword"
          placeholder="搜索帖子标题或内容关键字"
          enter-button="搜索"
          allow-clear
          style="width: 280px"
          @search="handleSearch"
        />
        <a-button type="primary" @click="openCreateModal">写帖子</a-button>
      </a-space>
    </section>

    <section class="filters">
      <a-space :size="16" align="center" wrap>
        <a-switch v-model:checked="showMine" checked-children="只看我的" un-checked-children="全部帖子" />
        <a-select
          v-if="showMine"
          v-model:value="statusFilter"
          placeholder="按状态筛选"
          allow-clear
          style="width: 160px"
        >
          <a-select-option :value="1">草稿</a-select-option>
          <a-select-option :value="2">待审核</a-select-option>
          <a-select-option :value="3">已发布</a-select-option>
          <a-select-option :value="4">已驳回</a-select-option>
        </a-select>
      </a-space>
    </section>

    <a-spin :spinning="loading">
      <a-row :gutter="[24, 24]">
        <a-col v-for="item in posts" :key="item.id" :xs="24" :md="12" :xl="8">
          <a-card class="post-card" hoverable @click="goDetail(item.id)">
            <template v-if="item.coverImage" #cover>
              <img :src="item.coverImage" alt="cover" class="cover-image" />
            </template>
            <div class="post-body">
              <div class="post-header">
                <h3>{{ item.title }}</h3>
                <a-tag v-if="showMine && item.status != null" :color="item.status === 3 ? 'success' : 'default'">
                  {{ postStatusMap[item.status] ?? '未知状态' }}
                </a-tag>
              </div>
              <p class="post-meta">
                <span>作者：{{ item.userName || '匿名用户' }}</span>
                <span>发布于：{{ formatTime(item.createdAt) }}</span>
              </p>
              <div class="post-stats">
                <span>浏览 {{ item.viewCount ?? 0 }}</span>
                <span>评论 {{ item.commentCount ?? 0 }}</span>
              </div>
              <div
                v-if="showMine"
                class="post-actions"
                @click.stop
              >
                <a-button
                  type="link"
                  size="small"
                  :disabled="!(item.status === 1 || item.status === 4)"
                  @click="openEditModal(item)"
                >
                  编辑
                </a-button>
                <a-divider type="vertical" />
                <a-button type="link" danger size="small" @click="handleDelete(item)">删除</a-button>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <a-empty v-if="!loading && !posts.length" description="暂无帖子" />

      <div v-if="pagination.total > pagination.pageSize" class="pagination">
        <a-pagination
          :current="pagination.current"
          :pageSize="pagination.pageSize"
          :total="pagination.total"
          :showSizeChanger="true"
          :pageSizeOptions="['6', '9', '12']"
          @change="handlePageChange"
          @showSizeChange="handlePageChange"
        />
      </div>
    </a-spin>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '发布新帖子' : '编辑帖子'"
      :confirmLoading="editorSubmitting"
      :footer="null"
      destroy-on-close
      width="640px"
    >
      <a-form layout="vertical" :model="editorForm">
        <a-form-item label="帖子标题" required>
          <a-input v-model:value="editorForm.title" maxlength="150" show-count placeholder="请输入帖子标题" />
        </a-form-item>
        <a-form-item label="内容" required>
          <a-textarea
            v-model:value="editorForm.content"
            placeholder="分享你的观点、经验或问题，支持换行。"
            :auto-size="{ minRows: 6, maxRows: 12 }"
            show-count
            :maxlength="5000"
          />
        </a-form-item>
        <a-form-item label="封面图片">
          <a-input
            v-model:value="editorForm.coverImage"
            placeholder="可选，填写图片链接以展示封面"
            allow-clear
          />
        </a-form-item>
      </a-form>
      <div class="modal-footer">
        <a-space>
          <a-button @click="editorVisible = false">取消</a-button>
          <a-button :loading="editorSubmitting" @click="submitPost(false)">保存草稿</a-button>
          <a-button type="primary" :loading="editorSubmitting" @click="submitPost(true)">提交审核</a-button>
        </a-space>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="css">
.community-post-list {
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
  background: linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%);
}

.hero h1 {
  margin-bottom: 8px;
  font-size: 30px;
  font-weight: 700;
}

.hero p {
  margin: 0;
  color: rgba(15, 23, 42, 0.72);
}

.filters {
  display: flex;
  justify-content: flex-start;
}

.post-card {
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.post-card:hover {
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
}

.cover-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.post-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.post-header h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.4;
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: rgba(15, 23, 42, 0.6);
  font-size: 13px;
}

.post-stats {
  display: flex;
  gap: 16px;
  color: rgba(15, 23, 42, 0.65);
  font-size: 13px;
}

.post-actions {
  display: flex;
  align-items: center;
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 16px 0 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
