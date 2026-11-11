import { create } from 'zustand'

export type ToastTone = 'ok' | 'danger'

export type ToastAction = {
  /** 界面展示文案。 */
  label: string;
  /** 关联的后台任务或提示动作。 */
  run: () => void
}

export type Toast = {
  /** 当前记录的唯一标识。 */
  id: number
  /** 文字内容或待展示的消息。 */
  text: string
  /** 视觉色调或提示严重程度。 */
  tone: ToastTone
  /** 关联操作或提示中的可执行入口。 */
  action: ToastAction | null
  /** 是否先播放退场动画再移除提示。 */
  leaving: boolean
}

type ToastOptions = {
  /** 关联操作或提示中的可执行入口。 */
  action?: ToastAction;
  /** 提示停留时长，单位为毫秒。 */
  duration?: number
}

type ToastsState = {
  /** 当前列表中的记录。 */
  items: Toast[]
  /** 加入轻提示并安排自动退场，最多保留最近三条。 */
  push: (text: string, tone?: ToastTone, options?: ToastOptions) => void
  /** 先标记提示退场，动画结束后移除。 */
  dismiss: (id: number) => void
}

const LEAVE_MS = 180
const STAY_MS = 3200
// 带撤销入口的提示要留够反应时间
const STAY_WITH_ACTION_MS = 5200

let nextId = 1

export const useToasts = create<ToastsState>((set, get) => ({
  items: [],

  /**
   * 加入轻提示并安排自动退场，最多保留最近三条。
   *
   * @param text 文字内容或待展示的消息。
   * @param tone 视觉色调或提示严重程度。
   * @param options 操作选项，可配置动画或提示行为。
   */
  push: (text, tone = 'ok', options) => {
    const id = nextId++
    const action = options?.action ?? null
    set({
      items: [...get().items.slice(-2), { id, text, tone, action, leaving: false }],
    })
    const stay = options?.duration ?? (action ? STAY_WITH_ACTION_MS : STAY_MS)
    window.setTimeout(() => get().dismiss(id), stay)
  },

  // 先标记退场让动画播完，再从列表移除
  /**
   * 先标记提示退场，动画结束后移除。
   *
   * @param id 当前记录的唯一标识。
   */
  dismiss: (id) => {
    const item = get().items.find((toast) => toast.id === id)
    if (!item || item.leaving) return
    set({
      items: get().items.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
    })
    window.setTimeout(
      () => set({ items: get().items.filter((toast) => toast.id !== id) }),
      LEAVE_MS,
    )
  },
}))

/**
 * 向全局提示队列添加消息，可附带操作与自定义停留时长。
 *
 * @param text 文字内容或待展示的消息。
 * @param tone 视觉色调或提示严重程度。
 * @param options 操作选项，可配置动画或提示行为。
 */
export function toast(text: string, tone: ToastTone = 'ok', options?: ToastOptions) {
  useToasts.getState().push(text, tone, options)
}
