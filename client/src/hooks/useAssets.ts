import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, assetsApi } from '@/api/assets'

const ASSETS_KEY = ['assets']

/**
 * 前置校验类型与体积，避免明显不合规的文件白跑一次网络请求。
 *
 * @param file 用户选择的本地图片。
 * @returns
 */
export function checkFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return '仅支持 JPG、PNG 与 WebP'
  if (file.size > MAX_UPLOAD_BYTES) return '文件超过 20 MB 上限'
  return null
}

/**
 * 读取素材列表并复用素材缓存。
 *
 * @param limit 本次查询的记录数量上限。
 * @returns
 */
export function useAssets(limit?: number) {
  return useQuery({ queryKey: ASSETS_KEY, queryFn: () => assetsApi.list(limit) })
}

/**
 * 读取按会话分组的素材库。
 *
 * @param limit 本次查询的记录数量上限。
 * @returns
 */
export function useAssetLibrary(limit?: number) {
  return useQuery({ queryKey: [...ASSETS_KEY, 'library'], queryFn: () => assetsApi.library(limit) })
}

/**
 * 上传素材并在成功后使素材列表缓存失效。
 *
 * @returns
 */
export function useUploadAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => assetsApi.upload(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ASSETS_KEY }),
  })
}
