import { useCallback, useRef, useState } from 'react'

/**
 * 维护笔刷轨迹及待确认预览，遮罩上屏后再清理。
 *
 * @returns
 */
export function useSelectStroke() {
  const drawing = useRef(false)
  const points = useRef<{
    /** 横向坐标；单位与所属画布或视图一致。 */
    x: number;
    /** 纵向坐标；单位与所属画布或视图一致。 */
    y: number
  }[]>([])
  const [draft, setDraft] = useState<{
    /** 横向坐标；单位与所属画布或视图一致。 */
    x: number;
    /** 纵向坐标；单位与所属画布或视图一致。 */
    y: number
  }[]>([])
  const [pending, setPending] = useState(false)

  /**
   * 清理笔刷临时轨迹及等待状态。
   */
  const settle = useCallback(() => {
    drawing.current = false
    points.current = []
    setPending(false)
    setDraft((current) => (current.length ? [] : current))
  }, [])

  return {
    draft,
    pending,
    /**
     * 开始记录本次笔刷轨迹并立即显示预览。
     *
     * @param point 画布内 0～1 的归一化点坐标。
     */
    start: (point: {
      /** 横向坐标；单位与所属画布或视图一致。 */
      x: number;
      /** 纵向坐标；单位与所属画布或视图一致。 */
      y: number
    }) => {
      drawing.current = true
      points.current = [point]
      setPending(true)
      setDraft([point])
    },
    /**
     * 仅在绘制期间追加笔刷轨迹并更新预览。
     *
     * @param point 画布内 0～1 的归一化点坐标。
     */
    move: (point: {
      /** 横向坐标；单位与所属画布或视图一致。 */
      x: number;
      /** 纵向坐标；单位与所属画布或视图一致。 */
      y: number
    }) => {
      if (!drawing.current) return
      points.current = [...points.current, point]
      setDraft(points.current)
    },
    /**
     * 结束笔画并保留待确认预览，过短轨迹直接丢弃。
     *
     * @returns
     */
    end: () => {
      const stroke = drawing.current ? points.current : []
      drawing.current = false
      // 松手后先留着预览，等服务端遮罩上屏再收，避免中间空一帧
      if (stroke.length < 2) {
        settle()
        return []
      }
      return stroke
    },
    settle,
  }
}
