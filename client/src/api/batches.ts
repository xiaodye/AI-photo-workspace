import type { Asset } from '@/api/assets'
import { api, apiError } from '@/api/client'
import type { Run } from '@/api/runs'
import type { BatchOp } from '@/lib/batch'

export type BatchItem = {
  /** 素材来自上传、生成或工具处理。 */
  source: Asset
  /** 服务端返回的执行状态。 */
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  /** 失败原因，无错误时为空。 */
  error: string | null
  /** 当前批处理项生成的素材。 */
  outputs: Asset[]
}

export type Batch = {
  /** 关联的后台任务或提示动作。 */
  run: Run
  /** 当前列表中的记录。 */
  items: BatchItem[]
  /** 服务端记录的创建时间。 */
  created_at: string
}

export type BatchInput = {
  /** 参与当前操作的素材标识列表。 */
  asset_ids: string[]
  /** 按顺序执行的批处理操作。 */
  operations: BatchOp[]
  /** 需要导出的图片编码格式。 */
  formats: Array<'png' | 'jpg'>
}

export type ExportPack = {
  /** 下载响应的二进制内容。 */
  blob: Blob
  /** 浏览器保存时使用的文件名。 */
  filename: string
}

export const batchesApi = {
  /**
   * 创建按配置顺序执行的批处理任务。
   *
   * @param input 提交给服务端的业务输入。
   * @returns
   */
  create: (input: BatchInput) => api.post<Run>('/batches', input),
  /**
   * 读取当前用户的批处理历史。
   *
   * @returns
   */
  list: () => api.get<Batch[]>('/batches'),
  /**
   * 读取指定批处理的逐项执行结果。
   *
   * @param id 当前记录的唯一标识。
   * @returns
   */
  get: (id: string) => api.get<Batch>(`/batches/${id}`),
  /**
   * 下载指定批处理的成品压缩包。
   *
   * @param id 当前记录的唯一标识。
   * @returns
   */
  export: (id: string) => downloadZip(id),
}

/**
 * 下载批处理压缩包，响应失败时抛出归一化异常。
 *
 * @param id 当前记录的唯一标识。
 * @returns
 */
async function downloadZip(id: string): Promise<ExportPack> {
  const response = await fetch(`/api/batches/${id}/export`)
  if (!response.ok) throw await apiError(response, '打包失败')
  const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(
    response.headers.get('Content-Disposition') ?? '',
  )
  const filename = encoded ? decodeURIComponent(encoded[1]) : '批量导出.zip'
  return { blob: await response.blob(), filename }
}
