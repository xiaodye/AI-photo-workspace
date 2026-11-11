import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { batchesApi, type BatchInput } from '@/api/batches'
import { isTerminal } from '@/api/runs'
import { errorMessage } from '@/hooks/useAuth'
import { useRun } from '@/hooks/useRun'
import { toast } from '@/stores/toasts'

const LIST_KEY = ['batches']
/**
 * 构造批处理详情的缓存键，隔离不同任务。
 *
 * @param id 当前记录的唯一标识。
 * @returns
 */
const batchKey = (id: string) => ['batch', id]

/**
 * 读取当前用户的批处理历史列表。
 *
 * @returns
 */
export function useBatches() {
  return useQuery({ queryKey: LIST_KEY, queryFn: batchesApi.list })
}

/**
 * 结合实时任务状态轮询批处理详情，结束后刷新列表与结果。
 *
 * @param id 当前记录的唯一标识。
 * @returns
 */
export function useBatch(id: string | null) {
  const live = useRun(id)
  const queryClient = useQueryClient()
  const detail = useQuery({
    queryKey: batchKey(id ?? ''),
    queryFn: () => batchesApi.get(id as string),
    enabled: Boolean(id),
    refetchInterval: id && live.status && !isTerminal(live.status) ? 1200 : false,
  })

  useEffect(() => {
    if (!id || !live.status || !isTerminal(live.status)) return
    void queryClient.invalidateQueries({ queryKey: batchKey(id) })
    void queryClient.invalidateQueries({ queryKey: LIST_KEY })
  }, [id, live.status, queryClient])

  return { ...detail, live }
}

/**
 * 创建批处理任务，成功后刷新列表，失败时展示提示。
 *
 * @returns
 */
export function useCreateBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BatchInput) => batchesApi.create(input),
    /**
     * 请求成功后同步关联状态并执行后续界面操作。
     *
     * @param run 关联的后台任务或提示动作。
     */
    onSuccess: (run) => {
      void queryClient.invalidateQueries({ queryKey: LIST_KEY })
      queryClient.setQueryData(batchKey(run.id), undefined)
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  })
}

/**
 * 提供批处理压缩包下载 mutation，并统一展示错误。
 *
 * @param id 当前记录的唯一标识。
 * @returns
 */
export function useExportBatch(id: string) {
  return useMutation({
    mutationFn: () => batchesApi.export(id),
    onError: (error) => toast(errorMessage(error), 'danger'),
  })
}
