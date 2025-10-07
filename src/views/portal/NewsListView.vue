<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { portalNewsApi, type PortalNewsItem } from '@/api/portal'

const router = useRouter()

const loading = ref(false)
const newsList = ref<PortalNewsItem[]>([])
const keyword = ref('')

const pagination = reactive({
  current: 1,
  pageSize: 6,
  total: 0,
})

const fetchNews = async () => {
  try {
    loading.value = true
    const response = await portalNewsApi.pageNews({
      keyword: keyword.value?.trim() || undefined,
      current: pagination.current,
      pageSize: pagination.pageSize,
      status: 1,
    })
    if (response.code === 200 && response.data) {
      const pageData = response.data
      const records = pageData.records || []
      newsList.value = records.map((item) => ({
        ...item,
        id: item.id != null ? Number(item.id) : undefined,
        isTop: item.isTop != null ? Number(item.isTop) : undefined,
        viewCount: item.viewCount != null ? Number(item.viewCount) : undefined,
      }))
      pagination.total = Number(pageData.total ?? records.length)
      pagination.current = Number(pageData.current ?? pagination.current)
      pagination.pageSize = Number(
        pageData.pageSize ?? (pageData as { size?: number }).size ?? pagination.pageSize,
      )
    } else {
      message.error(response.message || '加载新闻列表失败')
    }
  } catch (error) {
    console.error('加载新闻列表失败', error)
    message.error('加载新闻列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchNews()
}

const handlePageChange = (page: number, pageSize?: number) => {
  pagination.current = page
  if (pageSize) {
    pagination.pageSize = pageSize
  }
  fetchNews()
}

const goDetail = (newsId?: number | string) => {
  if (!newsId) {
    return
  }
  router.push(`/news/${newsId}`)
}

const formatPublishTime = (value?: string) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '未发布'

onMounted(() => {
  fetchNews()
})
</script>

<template>
  <div class="news-list-page">
    <section class="intro">
      <div>
        <h1>最新资讯</h1>
        <p>关注平台动态，第一时间了解租车优惠、功能更新与行业资讯。</p>
      </div>
      <a-input-search
        v-model:value="keyword"
        placeholder="搜索新闻标题或摘要"
        allow-clear
        enter-button="搜索"
        style="max-width: 320px"
        @search="handleSearch"
      />
    </section>

    <a-spin :spinning="loading">
      <a-row :gutter="24">
        <a-col v-for="item in newsList" :key="item.id" :xs="24" :md="12" :xl="8">
          <a-card class="news-card" hoverable @click="goDetail(item.id)">
            <div class="card-cover" v-if="item.coverImage">
              <img :src="item.coverImage" alt="cover" />
            </div>
            <div class="card-body">
              <div class="card-header">
                <h3>{{ item.title }}</h3>
                <a-tag v-if="item.isTop === 1" color="processing">置顶</a-tag>
              </div>
              <p class="summary">{{ item.summary || '暂无摘要，点击查看详情。' }}</p>
              <div class="meta">
                <span>{{ formatPublishTime(item.publishedAt) }}</span>
                <span v-if="item.viewCount != null">浏览 {{ item.viewCount }}</span>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <a-empty v-if="!loading && !newsList.length" description="暂无新闻" />

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
  </div>
</template>

<style scoped lang="css">
.news-list-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.intro {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%);
}

.intro h1 {
  margin-bottom: 8px;
  font-size: 28px;
  font-weight: 700;
}

.intro p {
  margin: 0;
  color: rgba(15, 23, 42, 0.7);
}

.news-card {
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  cursor: pointer;
}

.news-card:hover {
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
}

.card-cover {
  height: 160px;
  background: #f5f5f5;
  overflow: hidden;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.card-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

.summary {
  min-height: 56px;
  color: rgba(15, 23, 42, 0.65);
  margin: 0;
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: rgba(15, 23, 42, 0.45);
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .intro {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
