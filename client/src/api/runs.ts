import { api } from '@/api/client'
import type { Asset } from '@/api/assets'

export type Ratio = '1:1' | '4:5' | '3:4' | '9:16' | '16:9'

export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'

export type Run = {
  /** 当前记录的唯一标识。 */
  id: string
  /** 服务端注册的工具名称。 */
  tool: string
  /** 服务端返回的执行状态。 */
  status: RunStatus
  /** 任务或控件进度，取值 0～100。 */
  progress: number
  /** 服务端当前处理阶段的文案。 */
  stage: string
  /** 失败原因，无错误时为空。 */
  error: string | null
  /** 生成或处理图片的正向描述。 */
  prompt: string | null
  /** 任务产生的候选素材。 */
  candidates: Asset[]
  /** 服务端返回的工具结果数据。 */
  result: Record<string, unknown>
}

export type GenerateInput = {
  /** 生成或处理图片的正向描述。 */
  prompt: string
  /** 目标画幅比例。 */
  ratio: Ratio
  /** 期望生成的候选数量。 */
  count: number
  /** 希望生成结果避免出现的内容。 */
  negative_prompt?: string
  /** 生成任务使用的参考素材标识。 */
  reference_asset_ids?: string[]
}

export const RATIO_LABELS: Record<Ratio, string> = {
  '1:1': '方形 1:1',
  '4:5': '竖版 4:5',
  '3:4': '竖版 3:4',
  '9:16': '长图 9:16',
  '16:9': '横版 16:9',
}

/**
 * 判断任务是否成功、失败或取消，不再等待后续执行。
 *
 * @param status 待判断的任务状态。
 * @returns
 */
export function isTerminal(status: RunStatus) {
  return status === 'succeeded' || status === 'failed' || status === 'canceled'
}

export const runsApi = {
  /**
   * 提交生成请求并返回后台任务。
   *
   * @param input 提交给服务端的业务输入。
   * @returns
   */
  generate: (input: GenerateInput) => api.post<Run>('/generations', input),
  /**
   * 获取任务快照及已生成的候选图。
   *
   * @param id 当前记录的唯一标识。
   * @returns
   */
  get: (id: string) => api.get<Run>(`/runs/${id}`),
}
