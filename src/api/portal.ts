import type { AxiosRequestConfig } from 'axios'
import { axiosInstance } from '@/axios-instance'
import type { CarInfoVO, PageResult as AdminPageResult } from '@/api/car-info'

export interface ApiResponse<T> {
  code?: number
  message?: string
  data?: T
}

export interface PageResult<T> extends AdminPageResult<T> {
  pageSize?: number | string
}

export interface BaseCityVO {
  id?: number
  cityName?: string
  provinceName?: string
}

export interface CarBrandVO {
  id?: number
  brandName?: string
  brandCode?: string
  logoUrl?: string
}

export interface CarTypeVO {
  id?: number
  typeName?: string
  typeCode?: string
}

export interface PortalCarQuery {
  keyword?: string
  cityId?: number
  brandId?: number
  typeId?: number
  minDailyPrice?: number
  maxDailyPrice?: number
  seatCount?: number
  gearboxType?: number
  fuelType?: string
  current?: number
  pageSize?: number
  sortField?: string
  sortOrder?: string
}

export interface RentalOrderVO {
  id?: number
  orderNo?: string
  userId?: number
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
  cancelReason?: string
  createdAt?: string
  updatedAt?: string
}

export interface RentalOrderDetailVO extends RentalOrderVO {
  audits?: Array<{
    id?: number
    auditResult?: number
    auditComment?: string
    auditUserName?: string
    createdAt?: string
  }>
}

export interface RentalOrderPortalQuery {
  orderNo?: string
  orderStatus?: number
  paymentStatus?: number
  auditStatus?: number
  startTime?: string
  endTime?: string
  current?: number
  pageSize?: number
  sortField?: string
  sortOrder?: string
}

export interface RentalOrderCreatePayload {
  carId: number
  startTime: string
  endTime: string
  rentalDays: number
  pickupCityId: number
  pickupLocation: string
  returnCityId: number
  returnLocation?: string
}

export interface RentalOrderCancelPayload {
  cancelReason: string
}

export interface RentalOrderPayPayload {
  paymentChannel: string
  payAmount?: number
  outTradeNo?: string
}

export interface PortalNewsQuery {
  keyword?: string
  current?: number
  pageSize?: number
  status?: number
  isTop?: number
}

export interface PortalNewsItem {
  id?: number | string
  title?: string
  summary?: string
  coverImage?: string
  content?: string
  publishedAt?: string
  isTop?: number | string
  viewCount?: number | string
}

export interface PortalForumPostQuery {
  keyword?: string
  mine?: boolean
  status?: number
  current?: number
  pageSize?: number
  sortField?: string
  sortOrder?: string
}

export interface PortalForumPostPayload {
  title: string
  content: string
  coverImage?: string | null
  submit?: boolean
}

export interface PortalForumReplyPayload {
  content: string
  parentReplyId?: number
}

export interface PortalForumReplyVO {
  id?: number
  postId?: number
  userId?: number
  userName?: string
  content?: string
  status?: number
  createdAt?: string
}

export interface PortalForumPostVO {
  id?: number
  title?: string
  status?: number
  coverImage?: string
  viewCount?: number
  likeCount?: number
  commentCount?: number
  userId?: number
  userName?: string
  lastReplyTime?: string
  createdAt?: string
  updatedAt?: string
}

export interface PortalForumPostDetailVO extends PortalForumPostVO {
  content?: string
  replies?: PortalForumReplyVO[]
}

export interface PortalQaQuestionQuery {
  keyword?: string
  mine?: boolean
  status?: number
  current?: number
  pageSize?: number
  sortField?: string
  sortOrder?: string
}

export interface PortalQaQuestionPayload {
  title: string
  content: string
}

export interface PortalQaAnswerPayload {
  content: string
}

export interface PortalQaAnswerVO {
  id?: number
  questionId?: number
  userId?: number
  userName?: string
  content?: string
  isAccepted?: number
  status?: number
  createdAt?: string
}

export interface PortalQaQuestionVO {
  id?: number
  title?: string
  status?: number
  answerCount?: number
  userId?: number
  userName?: string
  lastAnswerTime?: string
  createdAt?: string
}

export interface PortalQaQuestionDetailVO extends PortalQaQuestionVO {
  content?: string
  answers?: PortalQaAnswerVO[]
}

const request = <T>(config: AxiosRequestConfig) => axiosInstance<ApiResponse<T>>(config)

export const portalMetaApi = {
  listCities: () => request<BaseCityVO[]>({ url: '/portal/meta/cities', method: 'GET' }),
  listBrands: () => request<CarBrandVO[]>({ url: '/portal/meta/brands', method: 'GET' }),
  listTypes: () => request<CarTypeVO[]>({ url: '/portal/meta/types', method: 'GET' }),
}

export const portalCarApi = {
  pageCars: (params: PortalCarQuery) =>
    request<PageResult<CarInfoVO>>({ url: '/portal/cars', method: 'GET', params }),
  getCar: (carId: number) => request<CarInfoVO>({ url: `/portal/cars/${carId}`, method: 'GET' }),
}

export const portalOrderApi = {
  createOrder: (payload: RentalOrderCreatePayload) =>
    request<RentalOrderVO>({
      url: '/portal/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),
  pageOrders: (params: RentalOrderPortalQuery) =>
    request<PageResult<RentalOrderVO>>({ url: '/portal/orders', method: 'GET', params }),
  getOrder: (orderId: number) =>
    request<RentalOrderDetailVO>({ url: `/portal/orders/${orderId}`, method: 'GET' }),
  cancelOrder: (orderId: number, payload: RentalOrderCancelPayload) =>
    request<RentalOrderVO>({
      url: `/portal/orders/${orderId}/cancel`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),
  payOrder: (orderId: number, payload: RentalOrderPayPayload) =>
    request<RentalOrderVO>({
      url: `/portal/orders/${orderId}/pay`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),
}

export const portalNewsApi = {
  pageNews: (params: PortalNewsQuery) =>
    request<PageResult<PortalNewsItem>>({ url: '/portal/news', method: 'GET', params }),
  getNews: (newsId: number) => request<PortalNewsItem>({ url: `/portal/news/${newsId}`, method: 'GET' }),
}

export const portalCommunityApi = {
  pagePosts: (params: PortalForumPostQuery) =>
    request<PageResult<PortalForumPostVO>>({ url: '/portal/community/posts', method: 'GET', params }),
  getPost: (postId: number) =>
    request<PortalForumPostDetailVO>({ url: `/portal/community/posts/${postId}`, method: 'GET' }),
  createPost: (payload: PortalForumPostPayload) =>
    request<PortalForumPostVO>({
      url: '/portal/community/posts',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),
  updatePost: (postId: number, payload: PortalForumPostPayload) =>
    request<PortalForumPostVO>({
      url: `/portal/community/posts/${postId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),
  deletePost: (postId: number) => request<void>({ url: `/portal/community/posts/${postId}`, method: 'DELETE' }),
  replyPost: (postId: number, payload: PortalForumReplyPayload) =>
    request<PortalForumReplyVO>({
      url: `/portal/community/posts/${postId}/replies`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),
  pageQuestions: (params: PortalQaQuestionQuery) =>
    request<PageResult<PortalQaQuestionVO>>({ url: '/portal/community/questions', method: 'GET', params }),
  getQuestion: (questionId: number) =>
    request<PortalQaQuestionDetailVO>({
      url: `/portal/community/questions/${questionId}`,
      method: 'GET',
    }),
  createQuestion: (payload: PortalQaQuestionPayload) =>
    request<PortalQaQuestionVO>({
      url: '/portal/community/questions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),
  answerQuestion: (questionId: number, payload: PortalQaAnswerPayload) =>
    request<PortalQaAnswerVO>({
      url: `/portal/community/questions/${questionId}/answers`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),
  acceptAnswer: (questionId: number, answerId: number) =>
    request<void>({
      url: `/portal/community/questions/${questionId}/answers/${answerId}/accept`,
      method: 'POST',
    }),
  closeQuestion: (questionId: number) =>
    request<void>({ url: `/portal/community/questions/${questionId}`, method: 'DELETE' }),
}
