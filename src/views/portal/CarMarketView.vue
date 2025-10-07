<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import type { CarInfoVO } from '@/api/car-info'
import {
  portalCarApi,
  portalMetaApi,
  portalNewsApi,
  type BaseCityVO,
  type CarBrandVO,
  type CarTypeVO,
  type PortalCarQuery,
  type PortalNewsItem,
} from '@/api/portal'

const router = useRouter()

interface SearchFilters {
  keyword?: string
  cityId?: number
  brandId?: number
  typeId?: number
  minDailyPrice?: number
  maxDailyPrice?: number
  seatCount?: number
  gearboxType?: number
  fuelType?: string
}

const filters = reactive<SearchFilters>({})

const pagination = reactive({
  current: 1,
  pageSize: 9,
  total: 0,
})

const loading = ref(false)
const carList = ref<CarInfoVO[]>([])

const cities = ref<BaseCityVO[]>([])
const brands = ref<CarBrandVO[]>([])
const types = ref<CarTypeVO[]>([])
const topNews = ref<PortalNewsItem[]>([])

const seatOptions = Array.from({ length: 5 }).map((_, index) => ({
  value: index + 2,
  label: `${index + 2} 座`,
}))

const gearboxOptions = [
  { value: 1, label: '手动' },
  { value: 2, label: '自动' },
]

const fuelOptions = ['汽油', '柴油', '混动', '纯电']

const hasActiveFilter = computed(() =>
  Boolean(
    filters.keyword ||
      filters.cityId ||
      filters.brandId ||
      filters.typeId ||
      filters.minDailyPrice ||
      filters.maxDailyPrice ||
      filters.seatCount ||
      filters.gearboxType ||
      filters.fuelType,
  ),
)

const fetchMeta = async () => {
  try {
    const [cityRes, brandRes, typeRes] = await Promise.all([
      portalMetaApi.listCities(),
      portalMetaApi.listBrands(),
      portalMetaApi.listTypes(),
    ])
    cities.value = cityRes.data ?? []
    brands.value = brandRes.data ?? []
    types.value = typeRes.data ?? []
  } catch (error) {
    console.error('获取筛选项失败', error)
    message.error('加载筛选条件失败，请稍后重试')
  }
}

const fetchCars = async () => {
  loading.value = true
  try {
    const params: PortalCarQuery = {
      ...filters,
      current: pagination.current,
      pageSize: pagination.pageSize,
      sortField: 'created_at',
      sortOrder: 'descend',
    }
    const response = await portalCarApi.pageCars(params)
    carList.value = response.data?.records ?? []
    pagination.total = Number(response.data?.total ?? 0)
  } catch (error) {
    console.error('获取车辆失败', error)
    message.error('加载车辆列表失败')
  } finally {
    loading.value = false
  }
}

const fetchTopNews = async () => {
  try {
    const response = await portalNewsApi.pageNews({
      current: 1,
      pageSize: 3,
      status: 1,
      isTop: 1,
    })
    if (response.code === 200 && response.data) {
      const records = response.data.records || []
      if (records.length) {
        topNews.value = records.map((item) => ({
          ...item,
          id: item.id != null ? Number(item.id) : undefined,
          isTop: item.isTop != null ? Number(item.isTop) : undefined,
        }))
        return
      }
    }
    // fallback: 若无置顶新闻，则取最新发布三条
    const fallback = await portalNewsApi.pageNews({ current: 1, pageSize: 3, status: 1 })
    if (fallback.code === 200 && fallback.data) {
      topNews.value = (fallback.data.records || []).map((item) => ({
        ...item,
        id: item.id != null ? Number(item.id) : undefined,
        isTop: item.isTop != null ? Number(item.isTop) : undefined,
      }))
    }
  } catch (error) {
    console.error('获取新闻失败', error)
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchCars()
}

const handleReset = () => {
  Object.assign(filters, {
    keyword: undefined,
    cityId: undefined,
    brandId: undefined,
    typeId: undefined,
    minDailyPrice: undefined,
    maxDailyPrice: undefined,
    seatCount: undefined,
    gearboxType: undefined,
    fuelType: undefined,
  })
  handleSearch()
}

const handlePageChange = (page: number, pageSize?: number) => {
  pagination.current = page
  if (pageSize) {
    pagination.pageSize = pageSize
  }
  fetchCars()
}

const goDetail = (carId?: number) => {
  if (!carId) return
  router.push(`/cars/${carId}`)
}

const displayPrice = (price?: number) => {
  if (price == null) return '面议'
  return `¥${price.toFixed(0)} / 天`
}

const goNews = (newsId?: number | string) => {
  if (!newsId) {
    router.push('/news')
    return
  }
  router.push(`/news/${newsId}`)
}

onMounted(async () => {
  await Promise.all([fetchMeta(), fetchCars(), fetchTopNews()])
})
</script>

<template>
  <div class="car-market">
    <section class="hero">
      <div class="hero-content">
        <h1>开启你的下一段旅程</h1>
        <p>精选优质车源，覆盖全国热门城市，在线完成预订，轻松开启高品质出行体验。</p>
        <a-space>
          <a-button type="primary" size="large" @click="() => router.push('/cars')">
            立即查看可租车辆
          </a-button>
          <a-button size="large" @click="() => router.push('/orders')">查看我的订单</a-button>
        </a-space>
      </div>
      <div class="hero-graphic" />
    </section>

    <a-card class="filter-card" bordered>
      <a-form layout="inline" class="filter-form">
        <a-form-item label="关键词">
          <a-input
            v-model:value="filters.keyword"
            allow-clear
            placeholder="输入车型、车牌等"
            style="width: 200px"
          />
        </a-form-item>
        <a-form-item label="城市">
          <a-select
            v-model:value="filters.cityId"
            allow-clear
            placeholder="请选择城市"
            style="width: 180px"
          >
            <a-select-option v-for="city in cities" :key="city.id" :value="city.id">
              {{ city.cityName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="品牌">
          <a-select
            v-model:value="filters.brandId"
            allow-clear
            placeholder="不限品牌"
            style="width: 180px"
          >
            <a-select-option v-for="brand in brands" :key="brand.id" :value="brand.id">
              {{ brand.brandName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="车型">
          <a-select
            v-model:value="filters.typeId"
            allow-clear
            placeholder="不限车型"
            style="width: 180px"
          >
            <a-select-option v-for="type in types" :key="type.id" :value="type.id">
              {{ type.typeName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="日租金">
          <div class="number-range">
            <a-input-number
              v-model:value="filters.minDailyPrice"
              :min="0"
              :precision="0"
              placeholder="最低"
            />
            <span class="range-divider">-</span>
            <a-input-number
              v-model:value="filters.maxDailyPrice"
              :min="0"
              :precision="0"
              placeholder="最高"
            />
          </div>
        </a-form-item>
        <a-form-item label="座位">
          <a-select
            v-model:value="filters.seatCount"
            allow-clear
            placeholder="不限座位"
            style="width: 140px"
          >
            <a-select-option v-for="item in seatOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="变速箱">
          <a-select
            v-model:value="filters.gearboxType"
            allow-clear
            placeholder="不限"
            style="width: 140px"
          >
            <a-select-option v-for="item in gearboxOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="能源">
          <a-select
            v-model:value="filters.fuelType"
            allow-clear
            placeholder="不限"
            style="width: 160px"
          >
            <a-select-option v-for="item in fuelOptions" :key="item" :value="item">
              {{ item }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button v-if="hasActiveFilter" @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <section v-if="topNews.length" class="news-preview">
      <div class="news-header">
        <h2>最新资讯</h2>
        <a-button type="link" @click="() => router.push('/news')">查看更多</a-button>
      </div>
      <a-row :gutter="24">
        <a-col v-for="item in topNews" :key="item.id" :xs="24" :md="12" :xl="8">
          <a-card class="news-preview-card" hoverable @click="goNews(item.id)">
            <div class="news-title">
              <h3>{{ item.title }}</h3>
              <a-tag v-if="item.isTop === 1" color="processing">置顶</a-tag>
            </div>
            <p class="news-summary">{{ item.summary || '点击查看详细内容。' }}</p>
            <div class="news-meta">
              {{ item.publishedAt ? dayjs(item.publishedAt).format('YYYY-MM-DD HH:mm') : '未发布' }}
            </div>
          </a-card>
        </a-col>
      </a-row>
    </section>

    <a-spin :spinning="loading">
      <a-row :gutter="24">
        <a-col v-for="car in carList" :key="car.id" :xs="24" :sm="12" :lg="8">
          <a-card class="car-card" hoverable @click="goDetail(car.id)">
            <template #cover>
              <div class="card-cover">
                <img
                  :src="car.coverImage || 'https://cdn.jsdelivr.net/gh/napthedev/placeholder/car-rental.png'"
                  alt="car"
                />
              </div>
            </template>
            <a-card-meta :title="car.carName">
              <template #description>
                <div class="car-meta">
                  <div class="price">{{ displayPrice(car.dailyPrice) }}</div>
                  <div class="meta-row">
                    <a-tag v-if="car.brandName" color="blue">{{ car.brandName }}</a-tag>
                    <a-tag v-if="car.typeName" color="processing">{{ car.typeName }}</a-tag>
                  </div>
                  <div class="meta-row">
                    <span><strong>座位：</strong>{{ car.seatCount ?? '—' }} 座</span>
                    <span><strong>变速：</strong>{{ car.gearboxType === 1 ? '手动' : '自动' }}</span>
                  </div>
                  <div v-if="car.cityName" class="meta-row">
                    <a-tag color="processing">{{ car.cityName }}</a-tag>
                  </div>
                </div>
              </template>
            </a-card-meta>
          </a-card>
        </a-col>
      </a-row>

      <a-empty v-if="!loading && !carList.length" description="暂无符合条件的车辆" />

      <div v-if="pagination.total > pagination.pageSize" class="pagination-wrapper">
        <a-pagination
          :current="pagination.current"
          :pageSize="pagination.pageSize"
          :total="pagination.total"
          :showSizeChanger="true"
          :pageSizeOptions="['6', '9', '12', '18']"
          @change="handlePageChange"
          @showSizeChange="handlePageChange"
        />
      </div>
    </a-spin>
  </div>
</template>

<style scoped lang="css">
.car-market {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  align-items: center;
  background: linear-gradient(135deg, #1677ff 0%, #69b1ff 100%);
  border-radius: 16px;
  padding: 48px;
  color: #fff;
  overflow: hidden;
}

.hero-content h1 {
  font-size: 36px;
  margin-bottom: 16px;
  font-weight: 700;
}

.hero-content p {
  font-size: 16px;
  opacity: 0.85;
  margin-bottom: 24px;
  max-width: 420px;
}

.hero-graphic {
  min-height: 200px;
  background: radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.4), transparent 60%),
    radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.35), transparent 55%),
    radial-gradient(circle at 50% 80%, rgba(255, 255, 255, 0.25), transparent 65%);
  border-radius: 12px;
}

.filter-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.filter-form {
  width: 100%;
  row-gap: 16px;
}

.news-preview {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.news-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.news-header h2 {
  margin: 0;
}

.news-preview-card {
  min-height: 180px;
  border-radius: 12px;
  transition: transform 0.2s ease;
}

.news-preview-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
}

.news-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.news-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.news-summary {
  min-height: 48px;
  color: rgba(0, 0, 0, 0.6);
  margin: 8px 0;
}

.news-meta {
  color: rgba(0, 0, 0, 0.35);
  font-size: 12px;
}

.number-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-divider {
  color: rgba(0, 0, 0, 0.45);
}

.car-card {
  border-radius: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

.car-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.card-cover {
  height: 180px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f0f5ff 0%, #e6fffb 100%);
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.car-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.price {
  font-size: 18px;
  font-weight: 600;
  color: #fa8c16;
}

.meta-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.pagination-wrapper {
  margin-top: 32px;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .hero {
    padding: 32px 24px;
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .hero-content h1 {
    font-size: 28px;
  }

  .filter-form {
    flex-direction: column;
    align-items: stretch;
  }

  .news-preview {
    padding: 16px;
  }
}
</style>
