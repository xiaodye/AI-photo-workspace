import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { sessionsApi, type SelectInput, type Selection } from '@/api/sessions'
import { errorMessage } from '@/hooks/useAuth'
import { BRUSH_RADIUS } from '@/lib/brush'
import { createSelectionHistory, inputsOf, type SelectionEntry } from '@/lib/selectionHistory'
import { toast } from '@/stores/toasts'
import { useEditorUi, type CanvasSelection } from '@/stores/editorUi'

/**
 * 将服务端选区素材转换为画布所需的遮罩引用。
 *
 * @param selection 与文档版本绑定的当前选区。
 * @returns
 */
function toCanvas(selection: Selection): CanvasSelection {
  return {
    revision: selection.revision,
    maskId: selection.mask.id,
    maskUrl: selection.mask.url,
    markers: selection.markers,
  }
}

/**
 * 提取一次点选或笔刷输入，用于本地历史记录。
 *
 * @param input 提交给服务端的业务输入。
 * @returns
 */
function entryOf(input: SelectInput): SelectionEntry | null {
  if (input.strokes?.[0]) return { kind: 'stroke', points: input.strokes[0] }
  if (input.points?.[0]) return { kind: 'point', point: input.points[0] }
  return null
}

/**
 * 协调选区提交、预热、版本失效及独立的撤销重放。
 *
 * @param sessionId 当前操作所属的会话标识。
 * @param revision 关联的会话文档版本，用于避免对过期文档操作。
 * @returns
 */
export function useSelection(sessionId: string, revision: number) {
  const setSelection = useEditorUi((state) => state.setSelection)
  const dropStaleSelection = useEditorUi((state) => state.dropStaleSelection)
  const selection = useEditorUi((state) => state.selection)
  const history = useRef(createSelectionHistory())
  const [, bump] = useState(0)
  /**
   * 刷新依赖可变历史引用的选区按钮状态。
   *
   * @returns
   */
  const touch = () => bump((value) => value + 1)

  useEffect(() => {
    dropStaleSelection(revision)
    history.current.reset()
    touch()
  }, [revision, dropStaleSelection])

  const selectMode = useEditorUi((state) => state.selectMode)

  useEffect(() => {
    if (selectMode !== 'point') return
    void sessionsApi.prepareSelection(sessionId).catch(() => undefined)
  }, [selectMode, sessionId, revision])

  const select = useMutation({
    mutationFn: (input: SelectInput) => sessionsApi.select(sessionId, input),
    /**
     * 将成功提交的输入记入选区历史，并展示服务端遮罩。
     *
     * @param body 服务端返回的选区遮罩与点选标记。
     * @param input 提交给服务端的业务输入。
     */
    onSuccess: (body, input) => {
      const entry = entryOf(input)
      if (entry) history.current.commit(entry)
      setSelection(toCanvas(body))
      touch()
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  })

  const clear = useMutation({
    mutationFn: () => sessionsApi.clearSelection(sessionId),
    /**
     * 记录可撤销的清除操作，并移除画布选区。
     */
    onSuccess: () => {
      history.current.clear()
      setSelection(null)
      touch()
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  })

  const replay = useMutation({
    /**
     * 清空服务端选区后依次重放点选与笔刷，返回合并后的遮罩。
     *
     * @param entries 按提交顺序记录的选区操作。
     * @returns
     */
    mutationFn: async (entries: SelectionEntry[]) => {
      await sessionsApi.clearSelection(sessionId)
      if (!entries.length) return null
      const { strokes, points } = inputsOf(entries)
      let body: Selection | null = null
      if (points.length) {
        body = await sessionsApi.select(sessionId, { revision, points, append: false })
      }
      if (strokes.length) {
        body = await sessionsApi.select(sessionId, { revision, strokes, radius: BRUSH_RADIUS })
      }
      return body
    },
    onSuccess: (body) => setSelection(body ? toCanvas(body) : null),
    onError: (error) => toast(errorMessage(error), 'danger'),
    onSettled: touch,
  })

  const busy = select.isPending || clear.isPending || replay.isPending

  return {
    selection,
    busy,
    canUndo: history.current.canUndo(),
    canRedo: history.current.canRedo(),
    /**
     * 提交归一化点坐标，按当前版本决定是否追加选区。
     *
     * @param x 横向坐标；单位与所属画布或视图一致。
     * @param y 纵向坐标；单位与所属画布或视图一致。
     */
    addPoint: (x: number, y: number) =>
      select.mutate({
        revision,
        points: [{ x, y }],
        append: Boolean(selection && selection.revision === revision),
      }),
    /**
     * 按统一笔刷比例提交归一化笔画轨迹。
     *
     * @param points 选区点坐标，使用画布内 0～1 的归一化值。
     */
    addStroke: (points: {
      /** 横向坐标；单位与所属画布或视图一致。 */
      x: number;
      /** 纵向坐标；单位与所属画布或视图一致。 */
      y: number
    }[]) =>
      select.mutate({ revision, strokes: [points], radius: BRUSH_RADIUS }),
    /**
     * 提交清除选区请求。
     */
    clear: () => clear.mutate(),
    /**
     * 取出上一个选区快照并向服务端重放。
     */
    undo: () => {
      const next = history.current.undo()
      if (next !== null) replay.mutate(next)
    },
    /**
     * 取出重做快照并向服务端重放。
     */
    redo: () => {
      const next = history.current.redo()
      if (next !== null) replay.mutate(next)
    },
  }
}

export type SessionSelection = ReturnType<typeof useSelection>
