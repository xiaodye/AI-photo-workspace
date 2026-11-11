/** 笔刷粗细按画布短边取比例。前端显式带上同一个值，预览与服务端遮罩才同宽。 */
export const BRUSH_RADIUS = 0.03

/**
 * 按画布短边计算笔刷宽度，并保留最小可见像素。
 *
 * @param canvas 原始画布文档或像素尺寸。
 * @returns
 */
export function brushWidth(canvas: {
  /** 宽度；画布及素材尺寸以像素计。 */
  width: number;
  /** 高度；画布及素材尺寸以像素计。 */
  height: number
}) {
  return Math.max(2, Math.min(canvas.width, canvas.height) * BRUSH_RADIUS)
}
