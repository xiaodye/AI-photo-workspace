import { useCallback, useRef, useState } from 'react'

import type { LayerDocument } from '@/api/sessions'
import { floodPreview } from '@/lib/floodPreview'
import type { Marker } from '@/stores/editorUi'

/**
 * 管理点选标记与近似遮罩，忽略过期异步预览结果。
 *
 * @param document 当前会话的画布文档。
 * @param urls 按素材标识索引的图片地址。
 * @returns
 */
export function usePointPreview(document: LayerDocument, urls: Map<string, string>) {
  const token = useRef(0)
  const [preview, setPreview] = useState<HTMLCanvasElement | null>(null)
  const [markers, setMarkers] = useState<Marker[]>([])

  /**
   * 使未完成的近似选区请求失效并清理临时反馈。
   */
  const settle = useCallback(() => {
    token.current += 1
    setPreview(null)
    setMarkers((current) => (current.length ? [] : current))
  }, [])

  /**
   * 追加点选标记，仅应用最新一次异步近似遮罩。
   *
   * @param point 画布内 0～1 的归一化点坐标。
   * @param existing 已有的点选序号标记。
   */
  const pick = useCallback(
    (point: {
      /** 横向坐标；单位与所属画布或视图一致。 */
      x: number;
      /** 纵向坐标；单位与所属画布或视图一致。 */
      y: number
    }, existing: Marker[]) => {
      const next = [...existing, { index: existing.length + 1, x: point.x, y: point.y }]
      const stamp = ++token.current
      setMarkers(next)
      void floodPreview(document, urls, point).then((canvas) => {
        if (stamp !== token.current || !canvas) return
        setPreview(canvas)
      })
    },
    [document, urls],
  )

  return {
    preview,
    markers,
    active: markers.length > 0 || Boolean(preview),
    pick,
    settle,
  }
}
