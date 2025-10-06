import type { AxiosRequestConfig } from 'axios'
import { axiosInstance } from '@/axios-instance'

export interface ApiResponse<T> {
  code?: number
  message?: string
  data?: T
}

export interface DashboardOverview {
  totalUsers?: number
  totalCars?: number
  availableCars?: number
  pendingCarAudits?: number
  totalOrders?: number
  pendingOrderAudits?: number
  totalPaidAmount?: number | string
}

export interface DashboardMetric {
  name?: string
  count?: number
  amount?: number | string
}

export interface DashboardTrendPoint {
  period?: string
  orderCount?: number
  paidAmount?: number | string
}

export interface DashboardStats {
  overview?: DashboardOverview
  orderStatusDistribution?: DashboardMetric[]
  monthlyOrderTrend?: DashboardTrendPoint[]
  recentOrderTrend?: DashboardTrendPoint[]
  topPickupCities?: DashboardMetric[]
}

const request = <T>(config: AxiosRequestConfig) => axiosInstance<ApiResponse<T>>(config)

export const dashboardApi = {
  getStats: () =>
    request<DashboardStats>({
      url: '/system/dashboard/overview',
      method: 'GET',
    }),
}
