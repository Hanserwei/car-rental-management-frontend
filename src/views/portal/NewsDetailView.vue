<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { portalNewsApi, type PortalNewsItem } from '@/api/portal'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const news = ref<PortalNewsItem | null>(null)

const fetchDetail = async () => {
  const id = Number(route.params.id)
  if (!id) {
    message.error('新闻不存在或已被删除')
    router.replace('/news')
    return
  }
    try {
      loading.value = true
      const response = await portalNewsApi.getNews(id)
      if (response.code === 200 && response.data) {
        news.value = response.data
    } else {
      message.error(response.message || '获取新闻详情失败')
      router.replace('/news')
    }
  } catch (error) {
    console.error('获取新闻详情失败', error)
    message.error('获取新闻详情失败')
    router.replace('/news')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.back()
}

const formatPublishTime = (value?: string) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '未发布'

onMounted(() => {
  fetchDetail()
})

watch(
  () => route.params.id,
  () => {
    fetchDetail()
  },
)
</script>

<template>
  <a-spin :spinning="loading">
    <div v-if="news" class="news-detail">
      <div class="header">
        <div>
          <h1>{{ news.title }}</h1>
          <div class="meta">
            <span>发布时间：{{ formatPublishTime(news.publishedAt) }}</span>
            <span v-if="news.viewCount != null">浏览 {{ news.viewCount }}</span>
          </div>
        </div>
        <a-button type="default" @click="goBack">返回列表</a-button>
      </div>
      <div v-if="news.coverImage" class="cover">
        <img :src="news.coverImage" alt="news cover" />
      </div>
      <div class="summary" v-if="news.summary">
        <a-alert type="info" show-icon :message="news.summary" />
      </div>
      <div class="content" v-html="news.content" />
    </div>
  </a-spin>
</template>

<style scoped lang="css">
.news-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.header h1 {
  font-size: 30px;
  margin-bottom: 12px;
}

.meta {
  display: flex;
  gap: 16px;
  color: rgba(0, 0, 0, 0.45);
}

.cover img {
  width: 100%;
  border-radius: 12px;
  object-fit: cover;
}

.summary {
  margin-top: 8px;
}

.content {
  color: rgba(15, 23, 42, 0.78);
  line-height: 1.8;
}

.content :deep(img) {
  max-width: 100%;
  border-radius: 12px;
  margin: 12px 0;
}

.content :deep(p) {
  margin: 12px 0;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
