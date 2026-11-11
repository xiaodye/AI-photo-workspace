import { ApiError, apiError } from '@/api/client'

export type AssetKind =
  | 'original'
  | 'generated'
  | 'subject'
  | 'background'
  | 'mask'
  | 'marketing'
  | 'export'

export type Asset = {
  /** 当前记录的唯一标识。 */
  id: string
  /** 素材、图层或操作的业务分类。 */
  kind: AssetKind
  /** 素材来自上传、生成或工具处理。 */
  source: 'upload' | 'generate' | 'tool'
  /** 素材编码格式。 */
  image_format: string
  /** 宽度；画布及素材尺寸以像素计。 */
  width: number
  /** 高度；画布及素材尺寸以像素计。 */
  height: number
  /** 文件体积，单位为字节。 */
  size_bytes: number
  /** 图片是否包含透明通道。 */
  has_alpha: boolean
  /** 服务端记录的创建时间。 */
  created_at: string
  /** 资源访问地址，可能为有时效的签名 URL。 */
  url: string
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export type LibraryGroup = {
  /** 所属会话标识，未归入会话时为空。 */
  session_id: string | null
  /** 供用户识别的显示标题。 */
  title: string
  /** 服务端记录的最近更新时间。 */
  updated_at: string
  /** 分组封面素材。 */
  cover: Asset
  /** 当前范围内可用的素材集合。 */
  assets: Asset[]
}

export const assetsApi = {
  /**
   * 以表单上传图片，失败时抛出统一 API 异常。
   *
   * @param file 用户选择的本地图片。
   * @returns
   */
  async upload(file: File): Promise<Asset> {
    const body = new FormData()
    body.append('file', file)

    const response = await fetch('/api/assets', { method: 'POST', body })
    if (!response.ok) throw await apiError(response, '上传失败')
    return response.json()
  },

  /**
   * 读取当前用户的素材列表。
   *
   * @param limit 本次查询的记录数量上限。
   * @returns
   */
  async list(limit = 50): Promise<Asset[]> {
    const response = await fetch(`/api/assets?limit=${limit}`)
    if (!response.ok) throw new ApiError(response.status, '读取素材失败')
    return response.json()
  },

  /**
   * 读取按会话分组的素材库。
   *
   * @param limit 本次查询的记录数量上限。
   * @returns
   */
  async library(limit = 50): Promise<LibraryGroup[]> {
    const response = await fetch(`/api/assets/library?limit=${limit}`)
    if (!response.ok) throw new ApiError(response.status, '读取素材失败')
    return response.json()
  },
}
