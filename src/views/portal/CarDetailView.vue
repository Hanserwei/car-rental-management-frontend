<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs, { type Dayjs } from 'dayjs'
import { message } from 'ant-design-vue'
import type { CarInfoVO } from '@/api/car-info'
import {
  portalCarApi,
  portalMetaApi,
  portalOrderApi,
  type BaseCityVO,
  type RentalOrderCreatePayload,
} from '@/api/portal'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const carId = computed(() => Number(route.params.id))

const loading = ref(true)
const submitting = ref(false)
const car = ref<CarInfoVO | null>(null)

const cities = ref<BaseCityVO[]>([])

const bookingVisible = ref(false)
const bookingForm = reactive({
  dateRange: [] as Dayjs[],
  pickupCityId: undefined as number | undefined,
  returnCityId: undefined as number | undefined,
  pickupLocation: '',
  returnLocation: '',
})

const fetchCarDetail = async () => {
  loading.value = true
  try {
    const response = await portalCarApi.getCar(carId.value)
    if (!response.data) {
      message.error('车辆不存在或已下架')
      router.replace('/cars')
      return
    }
    car.value = response.data
  } catch (error) {
    console.error('加载车辆详情失败', error)
    message.error('加载车辆详情失败')
  } finally {
    loading.value = false
  }
}

const fetchCities = async () => {
  try {
    const res = await portalMetaApi.listCities()
    cities.value = res.data ?? []
  } catch (error) {
    console.error('加载城市失败', error)
  }
}

const openBooking = () => {
  if (!userStore.isLoggedIn) {
    message.info('请登录后再预订车辆')
    router.push('/login')
    return
  }
  bookingVisible.value = true
  if (car.value?.cityId) {
    bookingForm.pickupCityId = car.value.cityId
    bookingForm.returnCityId = car.value.cityId
  }
  bookingForm.pickupLocation = car.value?.cityName ? `${car.value.cityName}热门商圈取车点` : ''
  bookingForm.returnLocation = bookingForm.pickupLocation
}

const haveValidRange = (values: Dayjs[]): values is [Dayjs, Dayjs] =>
  Array.isArray(values) && values.length === 2 && !!values[0] && !!values[1]

const rentalDays = computed(() => {
  const range = bookingForm.dateRange
  if (!haveValidRange(range)) {
    return 0
  }
  const [start, end] = range
  return Math.max(end.diff(start, 'day'), 0)
})

const totalAmount = computed(() => {
  if (!car.value?.dailyPrice || rentalDays.value <= 0) {
    return 0
  }
  return Number(car.value.dailyPrice) * rentalDays.value
})

const disabledDate = (current: Dayjs) => current && current < dayjs().startOf('day')

const handleBookingSubmit = async () => {
  if (!car.value) return
  const range = bookingForm.dateRange
  if (!haveValidRange(range)) {
    message.warning('请选择完整的取还车时间')
    return
  }
  if (!bookingForm.pickupCityId || !bookingForm.returnCityId) {
    message.warning('请选择取还车城市')
    return
  }
  if (!bookingForm.pickupLocation) {
    message.warning('请填写取车地点')
    return
  }

  submitting.value = true
  try {
    const [start, end] = range
    const payload: RentalOrderCreatePayload = {
      carId: carId.value,
      startTime: start.format('YYYY-MM-DDTHH:mm:ss'),
      endTime: end.format('YYYY-MM-DDTHH:mm:ss'),
      rentalDays: Math.max(rentalDays.value, 1),
      pickupCityId: bookingForm.pickupCityId,
      pickupLocation: bookingForm.pickupLocation,
      returnCityId: bookingForm.returnCityId,
      returnLocation: bookingForm.returnLocation || bookingForm.pickupLocation,
    }
    await portalOrderApi.createOrder(payload)
    message.success('车辆预订成功，待审核')
    bookingVisible.value = false
    router.push('/orders')
  } catch (error) {
    console.error('创建订单失败', error)
    message.error('创建订单失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

const gearboxLabel = computed(() => {
  if (car.value?.gearboxType === 1) return '手动'
  if (car.value?.gearboxType === 2) return '自动'
  return '未知'
})

onMounted(async () => {
  await Promise.all([fetchCarDetail(), fetchCities()])
})
</script>

<template>
  <a-spin :spinning="loading">
    <div v-if="car" class="car-detail">
      <a-row :gutter="32">
        <a-col :xs="24" :lg="14">
          <div class="gallery-card">
            <img
              :src="car.coverImage || 'https://cdn.jsdelivr.net/gh/napthedev/placeholder/car-rental.png'"
              :alt="car.carName"
            />
          </div>
        </a-col>
        <a-col :xs="24" :lg="10">
          <a-card class="info-card" bordered>
            <div class="header">
              <div>
                <h2>{{ car.carName }}</h2>
                <p v-if="car.brandName || car.typeName" class="subtitle">
                  {{ car.brandName }} · {{ car.typeName }}
                </p>
              </div>
              <div class="price">¥{{ car.dailyPrice?.toFixed(0) ?? '—' }} / 天</div>
            </div>

            <a-divider />

            <a-row :gutter="16" class="feature-grid">
              <a-col :span="12">
                <div class="feature-item">
                  <span class="label">座位数</span>
                  <span class="value">{{ car.seatCount ?? '—' }} 座</span>
                </div>
              </a-col>
              <a-col :span="12">
                <div class="feature-item">
                  <span class="label">变速箱</span>
                  <span class="value">{{ gearboxLabel }}</span>
                </div>
              </a-col>
              <a-col :span="12">
                <div class="feature-item">
                  <span class="label">能源类型</span>
                  <span class="value">{{ car.fuelType || '未注明' }}</span>
                </div>
              </a-col>
              <a-col :span="12">
                <div class="feature-item">
                  <span class="label">押金</span>
                  <span class="value">
                    {{ car.deposit != null ? `¥${car.deposit.toFixed(0)}` : '免押金' }}
                  </span>
                </div>
              </a-col>
              <a-col :span="12">
                <div class="feature-item">
                  <span class="label">已租次数</span>
                  <span class="value">{{ car.rentedCount ?? 0 }} 次</span>
                </div>
              </a-col>
              <a-col :span="12">
                <div class="feature-item">
                  <span class="label">浏览量</span>
                  <span class="value">{{ car.viewCount ?? 0 }}</span>
                </div>
              </a-col>
            </a-row>

            <a-alert
              v-if="car.cityName"
              type="info"
              show-icon
              :message="`支持在 ${car.cityName} 取还车`"
              style="margin: 16px 0"
            />

            <a-button type="primary" size="large" block @click="openBooking">立即预订</a-button>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="24" style="margin-top: 24px">
        <a-col :xs="24" :lg="14">
          <a-card title="车辆介绍" bordered class="section-card">
            <p v-if="car.description" class="description">{{ car.description }}</p>
            <p v-else class="description muted">暂无详细描述，您可直接联系租赁顾问了解更多。</p>
          </a-card>
        </a-col>
        <a-col :xs="24" :lg="10">
          <a-card title="费用说明" bordered class="section-card">
            <ul class="fee-list">
              <li>日租金：按自然日计算，不足一天按一天计费</li>
              <li>押金：车辆状态确认无误后原路退回</li>
              <li>支持在线下单，平台客服将在 30 分钟内联系确认</li>
            </ul>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </a-spin>

  <a-modal
    v-model:open="bookingVisible"
    title="预订车辆"
    :confirmLoading="submitting"
    width="520px"
    @ok="handleBookingSubmit"
  >
    <a-form layout="vertical">
      <a-form-item label="取车 / 还车时间">
        <a-range-picker
          v-model:value="bookingForm.dateRange"
          style="width: 100%"
          :show-time="{ format: 'HH:mm' }"
          format="YYYY-MM-DD HH:mm"
          :disabled-date="disabledDate"
        />
      </a-form-item>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="取车城市">
            <a-select v-model:value="bookingForm.pickupCityId" placeholder="选择城市">
              <a-select-option v-for="city in cities" :key="city.id" :value="city.id">
                {{ city.cityName }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="还车城市">
            <a-select v-model:value="bookingForm.returnCityId" placeholder="选择城市">
              <a-select-option v-for="city in cities" :key="city.id" :value="city.id">
                {{ city.cityName }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="取车地点">
        <a-input
          v-model:value="bookingForm.pickupLocation"
          placeholder="请输入详细取车地址"
        />
      </a-form-item>
      <a-form-item label="还车地点 (可选)">
        <a-input
          v-model:value="bookingForm.returnLocation"
          placeholder="默认与取车地点一致"
        />
      </a-form-item>
      <a-alert
        v-if="rentalDays > 0 && car?.dailyPrice"
        type="success"
        show-icon
        :message="`预计租期 ${rentalDays} 天，总费用约 ¥${totalAmount.toFixed(0)}`"
      />
    </a-form>
  </a-modal>
</template>

<style scoped lang="css">
.car-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.gallery-card {
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
  background: linear-gradient(135deg, #f0f5ff 0%, #f9f0ff 100%);
}

.gallery-card img {
  width: 100%;
  height: 100%;
  max-height: 420px;
  object-fit: cover;
}

.info-card {
  border-radius: 18px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.header h2 {
  margin-bottom: 4px;
}

.subtitle {
  color: rgba(0, 0, 0, 0.45);
}

.price {
  font-size: 22px;
  color: #fa8c16;
  font-weight: 600;
}

.feature-grid {
  margin-bottom: 16px;
}

.feature-item {
  padding: 12px;
  border-radius: 10px;
  background: rgba(230, 247, 255, 0.6);
}

.feature-item .label {
  display: block;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 4px;
}

.feature-item .value {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
}

.section-card {
  border-radius: 14px;
  height: 100%;
}

.description {
  font-size: 15px;
  line-height: 1.8;
  color: rgba(0, 0, 0, 0.7);
}

.description.muted {
  color: rgba(0, 0, 0, 0.45);
  font-style: italic;
}

.fee-list {
  padding-left: 18px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.8;
}

@media (max-width: 992px) {
  .gallery-card img {
    max-height: 260px;
  }
}
</style>
