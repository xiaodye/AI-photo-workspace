import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { isTerminal } from '@/api/runs'
import {
  sessionsApi,
  type SessionCreateInput,
  type SessionDetail,
  type SessionPatchInput,
} from '@/api/sessions'
import { errorMessage } from '@/hooks/useAuth'
import { useRun } from '@/hooks/useRun'
import { offersUndo, toolLabel } from '@/lib/tools'
import { toast } from '@/stores/toasts'

const LIST_KEY = ['sessions']
/**
 * 构造会话详情缓存键。
 *
 * @param id 当前记录的唯一标识。
 * @returns
 */
const detailKey = (id: string) => ['session', id]
/**
 * 构造会话历史缓存键，与详情查询区分。
 *
 * @param id 当前记录的唯一标识。
 * @returns
 */
const historyKey = (id: string) => ['session', id, 'history']

/**
 * 读取当前用户的会话列表。
 *
 * @returns
 */
export function useSessions() {
  return useQuery({ queryKey: LIST_KEY, queryFn: sessionsApi.list })
}

/**
 * 按标识查询会话详情，未选择会话时不发送请求。
 *
 * @param id 当前记录的唯一标识。
 * @returns
 */
export function useSession(id: string | null) {
  return useQuery({
    queryKey: detailKey(id ?? ''),
    queryFn: () => sessionsApi.get(id as string),
    enabled: Boolean(id),
  })
}

/**
 * 按会话查询操作历史，未选择会话时不发送请求。
 *
 * @param id 当前记录的唯一标识。
 * @returns
 */
export function useSessionHistory(id: string | null) {
  return useQuery({
    queryKey: historyKey(id ?? ''),
    queryFn: () => sessionsApi.history(id as string),
    enabled: Boolean(id),
  })
}

/**
 * 返回会话回写回调，同步详情并刷新列表与历史。
 *
 * @param id 当前记录的唯一标识。
 * @returns
 */
function useCacheSession(id: string) {
  const queryClient = useQueryClient()
  return (detail: SessionDetail) => {
    queryClient.setQueryData(detailKey(id), detail)
    void queryClient.invalidateQueries({ queryKey: LIST_KEY })
    void queryClient.invalidateQueries({ queryKey: historyKey(id) })
  }
}

/**
 * 创建会话并将返回详情写入缓存。
 *
 * @returns
 */
export function useCreateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SessionCreateInput) => sessionsApi.create(input),
    /**
     * 将新会话详情写入缓存，并刷新会话列表。
     *
     * @param detail 服务端返回的新会话详情。
     */
    onSuccess: (detail) => {
      queryClient.setQueryData(detailKey(detail.id), detail)
      void queryClient.invalidateQueries({ queryKey: LIST_KEY })
    },
  })
}

/**
 * 更新会话元数据或当前素材，并同步相关缓存。
 *
 * @param id 当前记录的唯一标识。
 * @returns
 */
export function usePatchSession(id: string) {
  const cache = useCacheSession(id)
  return useMutation({
    mutationFn: (input: SessionPatchInput) => sessionsApi.patch(id, input),
    onSuccess: cache,
  })
}

/**
 * 按选中素材打包会话资源，失败时展示统一提示。
 *
 * @param id 当前记录的唯一标识。
 * @returns
 */
export function useExportPack(id: string) {
  return useMutation({
    mutationFn: (assetIds: string[]) => sessionsApi.export(id, assetIds),
    onError: (error) => toast(errorMessage(error), 'danger'),
  })
}

/**
 * 协调工具调用、后台任务进度及带互斥锁的画布撤销重做。
 *
 * @param id 当前记录的唯一标识。
 * @returns
 */
export function useSessionTools(id: string) {
  const queryClient = useQueryClient()
  const cache = useCacheSession(id)
  const [pendingRunId, setPendingRunId] = useState<string | null>(null)
  const live = useRun(pendingRunId)

  const invoke = useMutation({
    mutationFn: ({ tool, params }: {
      /** 服务端注册的工具名称。 */
      tool: string;
      /** 提交给服务端工具的参数。 */
      params?: Record<string, unknown>
    }) =>
      sessionsApi.invoke(id, tool, params),
    /**
     * 回写工具响应中的会话文档，并订阅尚未结束的后台任务。
     *
     * @param body 工具调用返回的会话详情与任务。
     */
    onSuccess: (body) => {
      cache(body.session)
      if (!isTerminal(body.run.status)) setPendingRunId(body.run.id)
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  })

  const historyLock = useRef(false)
  /**
   * 在历史操作结束后释放锁，允许下一次撤销或重做。
   */
  const unlockHistory = () => {
    historyLock.current = false
  }

  const undo = useMutation({
    mutationFn: () => sessionsApi.undo(id),
    onSuccess: cache,
    onError: (error) => toast(errorMessage(error), 'danger'),
    onSettled: unlockHistory,
  })
  const redo = useMutation({
    mutationFn: () => sessionsApi.redo(id),
    onSuccess: cache,
    onError: (error) => toast(errorMessage(error), 'danger'),
    onSettled: unlockHistory,
  })

  const waiting = Boolean(pendingRunId && (!live.status || !isTerminal(live.status)))
  const busy = invoke.isPending || undo.isPending || redo.isPending || waiting

  // 提示里的撤销要在完成那一刻才可用，用 ref 拿最新的 mutation，避免把它塞进 effect 依赖
  const undoRef = useRef(() => undo.mutate())
  undoRef.current = () => undo.mutate()
  const pendingTool = invoke.variables?.tool
  // 一个任务只播报一次，后续依赖变化不会再弹提示
  const announced = useRef<string | null>(null)

  useEffect(() => {
    if (!pendingRunId || !live.status || !isTerminal(live.status)) return
    if (announced.current === pendingRunId) return
    announced.current = pendingRunId
    void queryClient.invalidateQueries({ queryKey: detailKey(id) })
    void queryClient.invalidateQueries({ queryKey: historyKey(id) })
    if (live.status === 'failed') {
      toast(live.error || '处理失败', 'danger')
      return
    }
    const label = toolLabel(pendingTool)
    toast(
      label ? `${label}完成` : live.stage || '已完成',
      'ok',
      offersUndo(pendingTool)
        ? { action: { label: '撤销', run: () => undoRef.current() } }
        : undefined,
    )
  }, [pendingRunId, live.status, live.error, live.stage, pendingTool, id, queryClient])

  /**
   * 当前在跑的是不是这一次调用。工具层同时只跑一个任务，界面据此只给发起的那个按钮
   * 换进度文案，其余按钮虽然一样禁用，但不会看起来像是也在生成。
   *
   * @param tool 服务端注册的工具名称。
   * @param match 进一步匹配工具参数的可选条件。
   * @returns
   */
  const isRunning = (tool: string, match?: (params: Record<string, unknown>) => boolean) => {
    const pending = invoke.isPending || waiting ? invoke.variables : undefined
    if (pending?.tool !== tool) return false
    return match ? match(pending.params ?? {}) : true
  }

  /**
   * 在未忙碌且未加锁时执行历史操作，阻止连续按键重入。
   *
   * @param action 需要执行的历史操作。
   */
  const runHistory = (action: () => void) => {
    if (historyLock.current || busy) return
    historyLock.current = true
    action()
  }

  return {
    /**
     * 提交当前会话的工具调用。
     *
     * @param tool 服务端注册的工具名称。
     * @param params 提交给服务端工具的参数。
     */
    invoke: (tool: string, params?: Record<string, unknown>) => invoke.mutate({ tool, params }),
    /**
     * 在互斥锁保护下请求服务端撤销画布文档操作。
     */
    undo: () => runHistory(() => undo.mutate()),
    /**
     * 在互斥锁保护下请求服务端重做画布文档操作。
     */
    redo: () => runHistory(() => redo.mutate()),
    busy,
    isRunning,
    pending: waiting,
    pendingStage: waiting ? live.stage : '',
    pendingProgress: waiting ? live.progress : 0,
  }
}

export type SessionTools = ReturnType<typeof useSessionTools>
