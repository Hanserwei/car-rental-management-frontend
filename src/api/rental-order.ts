import type { AxiosRequestConfig } from 'axios'
import { axiosInstance } from '@/axios-instance'

export interface ApiResponse<T> {
  code?: number
  message?: string
  data?: T
}

export interface PageResult<T> {
  total?: number
  current?: number
  size?: number
  records?: T[]
}

export interface RentalOrderVO {
  id?: number
  orderNo?: string
  userId?: number
  userName?: string
  carId?: number
  carName?: string
  startTime?: string
  endTime?: string
  pickupCityId?: number
  pickupCityName?: string
  returnCityId?: number
  returnCityName?: string
  pickupLocation?: string
  returnLocation?: string
  rentalDays?: number
  dailyPrice?: number
  amount?: number
  deposit?: number
  paidAmount?: number
  paymentStatus?: number
  orderStatus?: number
  auditStatus?: number
  auditUserId?: number
  auditTime?: string
  auditRemark?: string
  cancelReason?: string
  createdAt?: string
  updatedAt?: string
}

export interface RentalOrderAuditVO {
  id?: number
  auditResult?: number
  auditComment?: string
  auditUserId?: number
  auditUserName?: string
  createdAt?: string
}

export interface RentalOrderDetailVO extends RentalOrderVO {
  audits?: RentalOrderAuditVO[]
}

export interface RentalOrderQueryParams {
  orderNo?: string
  userId?: number
  carId?: number
  paymentStatus?: number
  orderStatus?: number
  auditStatus?: number
  pickupCityId?: number
  returnCityId?: number
  startTime?: string
  endTime?: string
  current?: number
  pageSize?: number
  sortField?: string
  sortOrder?: string
}

export interface RentalOrderUpdatePayload {
  startTime?: string
  endTime?: string
  rentalDays?: number
  dailyPrice?: number
  amount?: number
  deposit?: number
  paidAmount?: number
  paymentStatus?: number
  orderStatus?: number
  pickupCityId?: number
  returnCityId?: number
  pickupLocation?: string
  returnLocation?: string
  cancelReason?: string
}

export interface RentalOrderAuditPayload {
  auditResult: number
  auditComment?: string
}

const request = <T>(config: AxiosRequestConfig) => axiosInstance<ApiResponse<T>>(config)

export const rentalOrderApi = {
  pageOrders: (params: RentalOrderQueryParams) =>
    request<PageResult<RentalOrderVO>>({
      url: '/rental/orders',
      method: 'GET',
      params,
    }),

  getOrder: (orderId: number) =>
    request<RentalOrderDetailVO>({
      url: `/rental/orders/${orderId}`,
      method: 'GET',
    }),

  updateOrder: (orderId: number, payload: RentalOrderUpdatePayload) =>
    request<RentalOrderVO>({
      url: `/rental/orders/${orderId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),

  auditOrder: (orderId: number, payload: RentalOrderAuditPayload) =>
    request<RentalOrderVO>({
      url: `/rental/orders/${orderId}/audit`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),
}
