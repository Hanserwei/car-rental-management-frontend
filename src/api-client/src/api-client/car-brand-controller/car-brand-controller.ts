/**
 * 手动维护的品牌管理接口封装
 * 在无法使用 orval 自动生成时提供基础的类型安全封装
 */
import type {
  ApiResponseCarBrandVO,
  ApiResponsePageResultCarBrandVO,
  ApiResponseStorageFileVO,
  ApiResponseVoid,
  CarBrandCreateRequest,
  CarBrandUpdateRequest,
  PageBrandsParams,
} from '.././models'

import { axiosInstance } from '../../../../axios-instance'

export const getCarBrandController = () => {
  const pageBrands = (params?: PageBrandsParams) => {
    return axiosInstance<ApiResponsePageResultCarBrandVO>({
      url: `/resource/brands`,
      method: 'GET',
      params,
    })
  }

  const getBrand = (brandId: number) => {
    return axiosInstance<ApiResponseCarBrandVO>({
      url: `/resource/brands/${brandId}`,
      method: 'GET',
    })
  }

  const createBrand = (payload: CarBrandCreateRequest) => {
    return axiosInstance<ApiResponseCarBrandVO>({
      url: `/resource/brands`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    })
  }

  const updateBrand = (brandId: number, payload: CarBrandUpdateRequest) => {
    return axiosInstance<ApiResponseCarBrandVO>({
      url: `/resource/brands/${brandId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    })
  }

  const deleteBrand = (brandId: number) => {
    return axiosInstance<ApiResponseVoid>({
      url: `/resource/brands/${brandId}`,
      method: 'DELETE',
    })
  }

  const uploadBrandLogo = (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return axiosInstance<ApiResponseStorageFileVO>({
      url: `/resource/brands/logo/upload`,
      method: 'POST',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  return { pageBrands, getBrand, createBrand, updateBrand, deleteBrand, uploadBrandLogo }
}

export type PageBrandsResult = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getCarBrandController>['pageBrands']>>
>
export type GetBrandResult = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getCarBrandController>['getBrand']>>
>
export type CreateBrandResult = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getCarBrandController>['createBrand']>>
>
export type UpdateBrandResult = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getCarBrandController>['updateBrand']>>
>
export type DeleteBrandResult = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getCarBrandController>['deleteBrand']>>
>
export type UploadBrandLogoResult = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getCarBrandController>['uploadBrandLogo']>>
>
