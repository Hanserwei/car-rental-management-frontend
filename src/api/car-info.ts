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

export interface CarInfoVO {
  id?: number
  carCode?: string
  carName?: string
  brandId?: number
  brandName?: string
  typeId?: number
  typeName?: string
  cityId?: number
  cityName?: string
  coverImage?: string
  dailyPrice?: number
  deposit?: number
  seatCount?: number
  gearboxType?: number
  fuelType?: string
  mileage?: number
  stock?: number
  rentedCount?: number
  viewCount?: number
  status?: number
  auditStatus?: number
  description?: string
  createdBy?: number
  updatedBy?: number
  createdAt?: string
  updatedAt?: string
}

export interface CarInfoQueryParams {
  keyword?: string
  brandId?: number
  typeId?: number
  cityId?: number
  status?: number
  auditStatus?: number
  minDailyPrice?: number
  maxDailyPrice?: number
  minDeposit?: number
  maxDeposit?: number
  seatCount?: number
  gearboxType?: number
  fuelType?: string
  minStock?: number
  maxStock?: number
  minMileage?: number
  maxMileage?: number
  current?: number
  pageSize?: number
  sortField?: string
  sortOrder?: string
}

export interface CarInfoCreatePayload {
  carCode: string
  carName: string
  brandId: number
  typeId: number
  cityId: number
  coverImage?: string
  dailyPrice: number
  deposit?: number
  seatCount: number
  gearboxType?: number
  fuelType?: string
  mileage?: number
  stock: number
  status?: number
  auditStatus?: number
  description?: string
}

export interface CarInfoUpdatePayload {
  carCode?: string
  carName?: string
  brandId?: number
  typeId?: number
  cityId?: number
  coverImage?: string
  dailyPrice?: number
  deposit?: number
  seatCount?: number
  gearboxType?: number
  fuelType?: string
  mileage?: number
  stock?: number
  status?: number
  auditStatus?: number
  description?: string
}

export interface CarInfoAuditPayload {
  auditStatus: number
}

const request = <T>(config: AxiosRequestConfig) => axiosInstance<ApiResponse<T>>(config)

export const carInfoApi = {
  pageCars: (params: CarInfoQueryParams) =>
    request<PageResult<CarInfoVO>>({
      url: '/resource/cars',
      method: 'GET',
      params,
    }),

  getCar: (carId: number) =>
    request<CarInfoVO>({
      url: `/resource/cars/${carId}`,
      method: 'GET',
    }),

  createCar: (payload: CarInfoCreatePayload) =>
    request<CarInfoVO>({
      url: '/resource/cars',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),

  updateCar: (carId: number, payload: CarInfoUpdatePayload) =>
    request<CarInfoVO>({
      url: `/resource/cars/${carId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),

  deleteCar: (carId: number) =>
    request<void>({
      url: `/resource/cars/${carId}`,
      method: 'DELETE',
    }),

  auditCar: (carId: number, payload: CarInfoAuditPayload) =>
    request<CarInfoVO>({
      url: `/resource/cars/${carId}/audit`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),

  uploadCover: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<{ bucket?: string; objectKey?: string; url?: string }>({
      url: '/resource/cars/cover/upload',
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      data: formData,
    })
  },
}
