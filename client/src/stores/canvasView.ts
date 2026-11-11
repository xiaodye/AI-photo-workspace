import { create } from 'zustand'

const MIN_SCALE = 0.05
const MAX_SCALE = 8
// 适应画布时留出四周余量，避免图片贴边
const FIT_RATIO = 0.92
const GLIDE_MS = 260
// 触控板捏合每帧只有几个像素，鼠标滚轮一格上百；先夹住再取指数，两种设备都跟手
const WHEEL_CAP = 50
const WHEEL_GAIN = 0.0035

export const ZOOM_STEP = 1.25

type Size = {
  /** 宽度；画布及素材尺寸以像素计。 */
  width: number;
  /** 高度；画布及素材尺寸以像素计。 */
  height: number
}
type Point = {
  /** 横向坐标；单位与所属画布或视图一致。 */
  x: number;
  /** 纵向坐标；单位与所属画布或视图一致。 */
  y: number
}
type Viewport = {
  /** 相对原始尺寸的缩放倍率。 */
  scale: number;
  /** 横向坐标；单位与所属画布或视图一致。 */
  x: number;
  /** 纵向坐标；单位与所属画布或视图一致。 */
  y: number
}

type CanvasViewState = Viewport & {
  /** 编辑器可用视口的像素尺寸。 */
  viewport: Size
  // 视口还没量出来时排队的适应请求，量到之后立刻补上
  /** 视口尚未测量时暂存的适应画布请求。 */
  awaitingFit: Size | null
  /** 是否仍跟随容器尺寸自动适应画布。 */
  autoFit: boolean
  /** 最近一次适应画布时使用的文档尺寸。 */
  lastFit: Size | null
  /** 更新可用视口尺寸，并适应画布或保持中心位置。 */
  setViewport: (viewport: Size) => void
  /** 将文档居中适应视口，视口未就绪时暂存请求。 */
  fit: (document: Size, options?: {
    /** 是否使用视图过渡动画。 */
    animate?: boolean
  }) => void
  /** 以锚点为不动点按倍率缩放画布视图。 */
  zoomBy: (factor: number, anchor?: Point) => void
  /** 限制滚轮增量后转换为指数缩放。 */
  zoomByWheel: (delta: number, anchor?: Point) => void
  /** 以视口中心为锚点平滑缩放。 */
  stepZoom: (factor: number) => void
  /** 平滑切换到指定视图倍率。 */
  zoomTo: (scale: number) => void
  /** 按屏幕像素增量平移视图并退出自动适应。 */
  panBy: (dx: number, dy: number) => void
  /** 设置视图绝对偏移并退出自动适应。 */
  pan: (point: Point) => void
}

/**
 * 将视图倍率限制在允许范围，避免缩放过小或过大。
 *
 * @param scale 相对原始尺寸的缩放倍率。
 * @returns
 */
const clamp = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))

/**
 * 计算视图过渡的三次缓出系数。
 *
 * @param progress 任务或控件进度，取值 0～100。
 * @returns
 */
const easeOut = (progress: number) => 1 - (1 - progress) ** 3

let frame = 0

/**
 * 取消尚未结束的视图动画，避免多个动画争用状态。
 */
function stopGlide() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

/**
 * 按钮触发的缩放与适应走缓动，手势与拖拽直接跟手。
 *
 * @param apply 每一帧写入新视图的回调。
 * @param from 过渡开始时的视图。
 * @param to 目标视图。
 */
function glide(apply: (view: Viewport) => void, from: Viewport, to: Viewport) {
  stopGlide()
  const start = performance.now()
  /**
   * 按动画时间插值倍率与位置，结束后停止排帧。
   *
   * @param now 动画帧时间戳，单位为毫秒。
   */
  const tick = (now: number) => {
    const ratio = easeOut(Math.min(1, (now - start) / GLIDE_MS))
    apply({
      scale: from.scale + (to.scale - from.scale) * ratio,
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio,
    })
    frame = ratio < 1 ? requestAnimationFrame(tick) : 0
  }
  frame = requestAnimationFrame(tick)
}

/**
 * 观察倍率与位移，只影响编辑器视图，不参与导出。图层缩放另存于 LayerDocument。
 */
export const useCanvasView = create<CanvasViewState>((set, get) => ({
  scale: 1,
  x: 0,
  y: 0,
  viewport: { width: 0, height: 0 },
  awaitingFit: null,
  autoFit: true,
  lastFit: null,

  // 还在适应模式时，侧栏开合按新视口重新居中；手动缩放/平移则只锚住画面中心
  /**
   * 更新可用视口尺寸，并适应画布或保持中心位置。
   *
   * @param next 本次准备应用的新值。
   */
  setViewport: (next) => {
    const { viewport, x, y, awaitingFit, autoFit, lastFit } = get()
    const ready = Boolean(next.width && next.height)
    const grown = {
      width: next.width - viewport.width,
      height: next.height - viewport.height,
    }
    if (!viewport.width || !viewport.height || (!grown.width && !grown.height)) {
      set({ viewport: next })
    } else if (autoFit && lastFit) {
      set({ viewport: next })
      get().fit(lastFit, { animate: true })
      return
    } else {
      set({ viewport: next, x: x + grown.width / 2, y: y + grown.height / 2 })
    }
    if (ready && awaitingFit) get().fit(awaitingFit, { animate: false })
  },

  /**
   * 将文档居中适应视口，视口未就绪时暂存请求。
   *
   * @param document 当前会话的画布文档。
   * @param options 操作选项，可配置动画或提示行为。
   */
  fit: (document, options) => {
    const { viewport, scale, x, y } = get()
    // 视口还没量出来就先记下来，等 setViewport 拿到真实尺寸再适应
    if (!viewport.width || !viewport.height) {
      set({ awaitingFit: document, autoFit: true, lastFit: document })
      return
    }

    const next = clamp(
      Math.min(viewport.width / document.width, viewport.height / document.height) * FIT_RATIO,
    )
    const target = {
      scale: next,
      x: (viewport.width - document.width * next) / 2,
      y: (viewport.height - document.height * next) / 2,
    }

    stopGlide()
    if (options?.animate === false) {
      set({ ...target, awaitingFit: null, autoFit: true, lastFit: document })
      return
    }
    set({ awaitingFit: null, autoFit: true, lastFit: document })
    glide(set, { scale, x, y }, target)
  },

  /**
   * 以锚点为不动点按倍率缩放画布视图。
   *
   * @param factor 相对当前倍率的缩放因子。
   * @param anchor 屏幕坐标下保持不动的缩放锚点。
   */
  zoomBy: (factor, anchor) => {
    stopGlide()
    const { scale, x, y, viewport } = get()
    const next = clamp(scale * factor)
    const pivot = anchor ?? { x: viewport.width / 2, y: viewport.height / 2 }
    // 以锚点为不动点，指针位置下的画面内容不漂移
    const ratio = next / scale
    set({
      autoFit: false,
      scale: next,
      x: pivot.x - (pivot.x - x) * ratio,
      y: pivot.y - (pivot.y - y) * ratio,
    })
  },

  /**
   * 限制滚轮增量后转换为指数缩放。
   *
   * @param delta 滚轮垂直增量。
   * @param anchor 屏幕坐标下保持不动的缩放锚点。
   */
  zoomByWheel: (delta, anchor) => {
    const capped = Math.max(-WHEEL_CAP, Math.min(WHEEL_CAP, delta))
    get().zoomBy(Math.exp(-capped * WHEEL_GAIN), anchor)
  },

  /**
   * 以视口中心为锚点平滑缩放。
   *
   * @param factor 相对当前倍率的缩放因子。
   */
  stepZoom: (factor) => {
    const { scale, x, y, viewport } = get()
    const next = clamp(scale * factor)
    const pivot = { x: viewport.width / 2, y: viewport.height / 2 }
    const ratio = next / scale
    set({ autoFit: false })
    glide(
      set,
      { scale, x, y },
      {
        scale: next,
        x: pivot.x - (pivot.x - x) * ratio,
        y: pivot.y - (pivot.y - y) * ratio,
      },
    )
  },

  /**
   * 平滑切换到指定视图倍率。
   *
   * @param scale 相对原始尺寸的缩放倍率。
   */
  zoomTo: (scale) => get().stepZoom(scale / get().scale),

  /**
   * 按屏幕像素增量平移视图并退出自动适应。
   *
   * @param dx 横向平移的屏幕像素增量。
   * @param dy 纵向平移的屏幕像素增量。
   */
  panBy: (dx, dy) => {
    stopGlide()
    const { x, y } = get()
    set({ autoFit: false, x: x + dx, y: y + dy })
  },

  /**
   * 设置视图绝对偏移并退出自动适应。
   *
   * @param point 画布内 0～1 的归一化点坐标。
   */
  pan: (point) => {
    stopGlide()
    set({ autoFit: false, ...point })
  },
}))
