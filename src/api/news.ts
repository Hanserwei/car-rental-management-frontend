import type { AxiosRequestConfig } from 'axios'
import { axiosInstance } from '@/axios-instance'

export interface ApiResponse<T> {
  code?: number
  message?: string
  data?: T
}

export interface PageResult<T> {
  total?: number | string
  current?: number | string
  pageSize?: number | string
  size?: number | string
  records?: T[]
}

export interface NewsVO {
  id?: number | string
  title?: string
  summary?: string
  coverImage?: string
  content?: string
  status?: number | string
  isTop?: number | string
  viewCount?: number | string
  publishedAt?: string
  createdAt?: string
  updatedAt?: string
  createdBy?: number | string
  updatedBy?: number | string
}

export interface NewsQueryParams {
  keyword?: string
  status?: number
  isTop?: number
  publishedStart?: string
  publishedEnd?: string
  current?: number
  pageSize?: number
  sortField?: string
  sortOrder?: string
}

export interface NewsCreatePayload {
  title: string
  summary?: string
  coverImage?: string
  content: string
  status?: number
  isTop?: number
  publishedAt?: string
}

export interface NewsUpdatePayload extends Partial<NewsCreatePayload> {}

export interface NewsBatchDeletePayload {
  newsIds: number[]
}

const request = <T>(config: AxiosRequestConfig) => axiosInstance<ApiResponse<T>>(config)

export const newsApi = {
  pageNews: (params: NewsQueryParams) =>
    request<PageResult<NewsVO>>({
      url: '/content/news',
      method: 'GET',
      params,
    }),

  getNews: (newsId: number) =>
    request<NewsVO>({
      url: `/content/news/${newsId}`,
      method: 'GET',
    }),

  createNews: (payload: NewsCreatePayload) =>
    request<NewsVO>({
      url: '/content/news',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),

  updateNews: (newsId: number, payload: NewsUpdatePayload) =>
    request<NewsVO>({
      url: `/content/news/${newsId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),

  deleteNews: (newsId: number) =>
    request<void>({
      url: `/content/news/${newsId}`,
      method: 'DELETE',
    }),

  batchDeleteNews: (payload: NewsBatchDeletePayload) =>
    request<void>({
      url: '/content/news/batch-delete',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }),
}

