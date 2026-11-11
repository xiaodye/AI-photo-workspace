import { api } from '@/api/client'
import type { RunStatus } from '@/api/runs'

export type StepStatus =
  | 'pending'
  | 'waiting'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'canceled'

export type PlanStep = {
  /** 当前记录的唯一标识。 */
  id: string
  /** 服务端注册的工具名称。 */
  tool: string
  /** 界面展示文案。 */
  label: string
  /** 执行前必须完成的计划步骤标识。 */
  depends_on: string[]
  /** 关联的后台任务标识，尚未创建时为空。 */
  run_id: string | null
  /** 服务端返回的执行状态。 */
  status: StepStatus
}

export type Turn = {
  /** 当前记录的唯一标识。 */
  id: string
  /** 关联的会话文档版本，用于避免对过期文档操作。 */
  revision: number
  /** 本轮用户提出的编辑目标。 */
  goal: string
  /** Agent 返回的说明或执行回复。 */
  reply: string
  /** 服务端返回的执行状态。 */
  status: RunStatus
  /** 失败原因，无错误时为空。 */
  error: string | null
  /** 服务端记录的创建时间。 */
  created_at: string
  /** 按计划展示的处理步骤。 */
  steps: PlanStep[]
}

export const agentApi = {
  /**
   * 读取当前会话的 Agent 对话轮次。
   *
   * @param sessionId 当前操作所属的会话标识。
   * @returns
   */
  turns: (sessionId: string) => api.get<Turn[]>(`/sessions/${sessionId}/messages`),
  /**
   * 向会话提交新需求并取得生成的对话轮次。
   *
   * @param sessionId 当前操作所属的会话标识。
   * @param text 文字内容或待展示的消息。
   * @returns
   */
  send: (sessionId: string, text: string) =>
    api.post<Turn>(`/sessions/${sessionId}/messages`, { text }),
  /**
   * 确认执行当前对话轮次的计划。
   *
   * @param sessionId 当前操作所属的会话标识。
   * @param turnId 需要确认、取消或重试的对话轮次标识。
   * @returns
   */
  confirm: (sessionId: string, turnId: string) =>
    api.post<Turn>(`/sessions/${sessionId}/messages/${turnId}/confirm`),
  /**
   * 取消当前对话轮次的计划。
   *
   * @param sessionId 当前操作所属的会话标识。
   * @param turnId 需要确认、取消或重试的对话轮次标识。
   * @returns
   */
  cancel: (sessionId: string, turnId: string) =>
    api.post<Turn>(`/sessions/${sessionId}/messages/${turnId}/cancel`),
  /**
   * 重试当前对话轮次的失败计划。
   *
   * @param sessionId 当前操作所属的会话标识。
   * @param turnId 需要确认、取消或重试的对话轮次标识。
   * @returns
   */
  retry: (sessionId: string, turnId: string) =>
    api.post<Turn>(`/sessions/${sessionId}/messages/${turnId}/retry`),
}
