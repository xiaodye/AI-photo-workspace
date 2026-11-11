import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { agentApi } from '@/api/agent'
import { isTerminal } from '@/api/runs'

/**
 * 构造会话对话轮次缓存键。
 *
 * @param sessionId 当前操作所属的会话标识。
 * @returns
 */
const turnsKey = (sessionId: string) => ['session', sessionId, 'messages']

/**
 * 返回同时刷新对话、会话文档及历史的回调。
 *
 * @param sessionId 当前操作所属的会话标识。
 * @returns
 */
function useRefreshTurn(sessionId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: turnsKey(sessionId) })
    void queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    void queryClient.invalidateQueries({ queryKey: ['session', sessionId, 'history'] })
  }
}

/**
 * 读取对话轮次，执行中持续补拉，结束时刷新文档与历史。
 *
 * @param sessionId 当前操作所属的会话标识。
 * @returns
 */
export function useTurns(sessionId: string) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: turnsKey(sessionId),
    queryFn: () => agentApi.turns(sessionId),
    // 第一步 SSE 结束时下一步可能还没写进计划，整轮 running 时接着拉，避免卡片停在「等待中」
    refetchInterval: (current) =>
      current.state.data?.at(-1)?.status === 'running' ? 800 : false,
  })

  const latest = query.data?.at(-1)?.status
  const previous = useRef(latest)
  useEffect(() => {
    const wasRunning = previous.current === 'running'
    previous.current = latest
    if (!wasRunning || !latest || !isTerminal(latest)) return
    void queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    void queryClient.invalidateQueries({ queryKey: ['session', sessionId, 'history'] })
  }, [latest, sessionId, queryClient])

  useEffect(() => {
    previous.current = undefined
  }, [sessionId])

  return query
}

/**
 * 提交当前会话的用户需求并刷新对话关联数据。
 *
 * @param sessionId 当前操作所属的会话标识。
 * @returns
 */
export function useSendMessage(sessionId: string) {
  const refresh = useRefreshTurn(sessionId)
  return useMutation({
    mutationFn: (text: string) => agentApi.send(sessionId, text),
    onSuccess: refresh,
  })
}

/**
 * 提供计划确认、取消、重试及统一的请求忙碌状态。
 *
 * @param sessionId 当前操作所属的会话标识。
 * @returns
 */
export function usePlanActions(sessionId: string) {
  const refresh = useRefreshTurn(sessionId)
  const confirm = useMutation({
    mutationFn: (turnId: string) => agentApi.confirm(sessionId, turnId),
    onSuccess: refresh,
  })
  const cancel = useMutation({
    mutationFn: (turnId: string) => agentApi.cancel(sessionId, turnId),
    onSuccess: refresh,
  })
  const retry = useMutation({
    mutationFn: (turnId: string) => agentApi.retry(sessionId, turnId),
    onSuccess: refresh,
  })
  return {
    /**
     * 确认执行指定轮次的 Agent 计划。
     *
     * @param turnId 需要确认、取消或重试的对话轮次标识。
     */
    confirm: (turnId: string) => confirm.mutate(turnId),
    /**
     * 取消指定轮次的 Agent 计划。
     *
     * @param turnId 需要确认、取消或重试的对话轮次标识。
     */
    cancel: (turnId: string) => cancel.mutate(turnId),
    /**
     * 重新执行指定轮次的失败计划。
     *
     * @param turnId 需要确认、取消或重试的对话轮次标识。
     */
    retry: (turnId: string) => retry.mutate(turnId),
    busy: confirm.isPending || cancel.isPending || retry.isPending,
  }
}
