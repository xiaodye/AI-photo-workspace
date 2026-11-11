import { create } from 'zustand'

import type { Ratio } from '@/api/runs'
import type { LayerDocument } from '@/api/sessions'

export type CropRatio = Ratio | 'free'
export type CropRect = {
  /** 横向坐标；单位与所属画布或视图一致。 */
  x: number;
  /** 纵向坐标；单位与所属画布或视图一致。 */
  y: number;
  /** 宽度；画布及素材尺寸以像素计。 */
  width: number;
  /** 高度；画布及素材尺寸以像素计。 */
  height: number
}
export type SelectMode = 'point' | 'brush'
export type Marker = {
  /** 界面序号或点选标记编号。 */
  index: number;
  /** 横向坐标；单位与所属画布或视图一致。 */
  x: number;
  /** 纵向坐标；单位与所属画布或视图一致。 */
  y: number
}
export type CanvasSelection = {
  /** 关联的会话文档版本，用于避免对过期文档操作。 */
  revision: number
  /** 选区遮罩素材标识。 */
  maskId: string
  /** 选区遮罩的可访问地址。 */
  maskUrl: string
  /** 当前选区的点选标记。 */
  markers: Marker[]
}

/** 滑杆拖动期间的即时效果，只作用于画布渲染，松手后由工具写入文档。 */
export type LayerPreview = {
  /** 当前记录的唯一标识。 */
  id: string
  /** 透明度，取值 0～1。 */
  opacity?: number
  /** 相对原始尺寸的缩放倍率。 */
  scale?: number
  /** 旋转角度，单位为度。 */
  rotation?: number
  /** 横向坐标；单位与所属画布或视图一致。 */
  x?: number
  /** 纵向坐标；单位与所属画布或视图一致。 */
  y?: number
  /** 文字字号，以文档像素计。 */
  font_size?: number
  /** 文字或形状的填充颜色。 */
  fill?: string
  /** 文字内容或待展示的消息。 */
  text?: string
}

export type Panel = 'layers' | 'adjust' | 'background' | 'expand' | 'replace' | null

type EditorUi = {
  /** 当前选中的图层标识。 */
  selectedLayerId: string | null
  /** 是否处于裁剪模式。 */
  cropOpen: boolean
  /** 裁剪框约束比例，free 表示自由裁剪。 */
  cropRatio: CropRatio
  /** 原图像素坐标系内的裁剪框。 */
  cropRect: CropRect | null
  /** 是否展示前后对比。 */
  compareOpen: boolean
  /** 前后对比分隔位置，取值 0～1。 */
  compareAt: number
  /** 当前侧面板类型，空值表示关闭。 */
  panel: Panel
  /** 当前选区交互模式，空值表示退出。 */
  selectMode: SelectMode | null
  /** 与文档版本绑定的当前选区。 */
  selection: CanvasSelection | null
  /** 拆层时是否同时识别文字。 */
  splitIncludeText: boolean
  /** 尚未写入文档的调色预览参数。 */
  adjustPreview: Record<string, number> | null
  /** 尚未写入文档的图层属性预览。 */
  layerPreview: LayerPreview | null
  /** 选中图层并清理其他图层的临时预览。 */
  selectLayer: (id: string | null) => void
  /** 打开裁剪模式并关闭冲突的交互模式。 */
  openCrop: (document: LayerDocument, ratio?: CropRatio) => void
  /** 按目标比例重新生成居中的裁剪框。 */
  setCropRatio: (ratio: CropRatio, document: LayerDocument) => void
  /** 更新像素坐标下的裁剪预览框。 */
  setCropRect: (rect: CropRect) => void
  /** 退出裁剪模式并清理裁剪框。 */
  closeCrop: () => void
  /** 切换前后对比，并关闭冲突的裁剪或选区模式。 */
  setCompareOpen: (open: boolean) => void
  /** 更新前后对比的分隔比例。 */
  setCompareAt: (value: number) => void
  /** 切换工具面板并清理临时属性预览。 */
  setPanel: (panel: Panel) => void
  /** 切换点选或笔刷模式并清理冲突的编辑模式。 */
  setSelectMode: (mode: SelectMode | null) => void
  /** 写入或清除当前文档的选区引用。 */
  setSelection: (selection: CanvasSelection | null) => void
  /** 清除与当前文档版本不一致的选区。 */
  dropStaleSelection: (revision: number) => void
  /** 设置拆层时是否同时识别文字。 */
  setSplitIncludeText: (splitIncludeText: boolean) => void
  /** 更新画布实时调色预览，不提交服务端。 */
  setAdjustPreview: (values: Record<string, number> | null) => void
  /** 合并同图层的属性预览，或替换为新图层预览。 */
  setLayerPreview: (preview: LayerPreview | null) => void
}

/**
 * 根据指定比例在原图内生成居中的裁剪框，自由模式保留边距。
 *
 * @param document 当前会话的画布文档。
 * @param ratio 目标画幅比例。
 * @returns
 */
function fitCrop(document: LayerDocument, ratio: CropRatio): CropRect {
  if (ratio === 'free') {
    const inset = 0.08
    return {
      x: document.width * inset,
      y: document.height * inset,
      width: document.width * (1 - inset * 2),
      height: document.height * (1 - inset * 2),
    }
  }
  const [rw, rh] = ratio.split(':').map(Number)
  let width = document.width
  let height = (document.width * rh) / rw
  if (height > document.height) {
    height = document.height
    width = (document.height * rw) / rh
  }
  return {
    x: (document.width - width) / 2,
    y: (document.height - height) / 2,
    width,
    height,
  }
}

// 局部替换依赖当轮选区，一旦离开选择模式表单就没用了，留着只会挡住画布
/**
 * 退出选择模式时关闭依赖选区的局部替换面板。
 *
 * @param panel 当前侧面板类型，空值表示关闭。
 * @returns
 */
const withoutReplace = (panel: Panel): Panel => (panel === 'replace' ? null : panel)

export const useEditorUi = create<EditorUi>((set) => ({
  selectedLayerId: null,
  cropOpen: false,
  cropRatio: 'free',
  cropRect: null,
  compareOpen: false,
  compareAt: 0.5,
  panel: null,
  selectMode: null,
  selection: null,
  splitIncludeText: false,
  adjustPreview: null,
  layerPreview: null,

  /**
   * 选中图层并清理其他图层的临时预览。
   *
   * @param selectedLayerId 当前选中的图层标识。
   */
  selectLayer: (selectedLayerId) =>
    set((state) => ({
      selectedLayerId,
      layerPreview: state.layerPreview?.id === selectedLayerId ? state.layerPreview : null,
    })),

  /**
   * 打开裁剪模式并关闭冲突的交互模式。
   *
   * @param document 当前会话的画布文档。
   * @param ratio 目标画幅比例。
   */
  openCrop: (document, ratio = 'free') =>
    set((state) => ({
      cropOpen: true,
      compareOpen: false,
      selectMode: null,
      panel: withoutReplace(state.panel),
      cropRatio: ratio,
      cropRect: fitCrop(document, ratio),
    })),

  /**
   * 按目标比例重新生成居中的裁剪框。
   *
   * @param cropRatio 裁剪框约束比例，free 表示自由裁剪。
   * @param document 当前会话的画布文档。
   */
  setCropRatio: (cropRatio, document) => set({ cropRatio, cropRect: fitCrop(document, cropRatio) }),

  /**
   * 更新像素坐标下的裁剪预览框。
   *
   * @param cropRect 原图像素坐标系内的裁剪框。
   */
  setCropRect: (cropRect) => set({ cropRect }),

  /**
   * 退出裁剪模式并清理裁剪框。
   */
  closeCrop: () => set({ cropOpen: false, cropRect: null }),

  /**
   * 切换前后对比，并关闭冲突的裁剪或选区模式。
   *
   * @param compareOpen 是否展示前后对比。
   */
  setCompareOpen: (compareOpen) =>
    set((state) => ({
      compareOpen,
      cropOpen: compareOpen ? false : state.cropOpen,
      selectMode: compareOpen ? null : state.selectMode,
      panel: compareOpen ? withoutReplace(state.panel) : state.panel,
    })),

  /**
   * 更新前后对比的分隔比例。
   *
   * @param compareAt 前后对比分隔位置，取值 0～1。
   */
  setCompareAt: (compareAt) => set({ compareAt }),

  /**
   * 切换工具面板并清理临时属性预览。
   *
   * @param panel 当前侧面板类型，空值表示关闭。
   */
  setPanel: (panel) => set({ panel, adjustPreview: null, layerPreview: null }),

  /**
   * 切换点选或笔刷模式并清理冲突的编辑模式。
   *
   * @param selectMode 当前选区交互模式，空值表示退出。
   */
  setSelectMode: (selectMode) =>
    set((state) => ({
      selectMode,
      cropOpen: false,
      compareOpen: false,
      cropRect: selectMode ? null : state.cropRect,
      panel: selectMode ? null : withoutReplace(state.panel),
    })),

  /**
   * 写入或清除当前文档的选区引用。
   *
   * @param selection 与文档版本绑定的当前选区。
   */
  setSelection: (selection) => set({ selection }),

  /**
   * 清除与当前文档版本不一致的选区。
   *
   * @param revision 关联的会话文档版本，用于避免对过期文档操作。
   */
  dropStaleSelection: (revision) =>
    set((state) =>
      state.selection && state.selection.revision !== revision ? { selection: null } : state,
    ),

  /**
   * 设置拆层时是否同时识别文字。
   *
   * @param splitIncludeText 拆层时是否同时识别文字。
   */
  setSplitIncludeText: (splitIncludeText) => set({ splitIncludeText }),

  /**
   * 更新画布实时调色预览，不提交服务端。
   *
   * @param adjustPreview 尚未写入文档的调色预览参数。
   */
  setAdjustPreview: (adjustPreview) => set({ adjustPreview }),

  /**
   * 合并同图层的属性预览，或替换为新图层预览。
   *
   * @param layerPreview 尚未写入文档的图层属性预览。
   */
  setLayerPreview: (layerPreview) =>
    set((state) => {
      if (layerPreview == null) return { layerPreview: null }
      const prev = state.layerPreview
      if (prev && prev.id === layerPreview.id) {
        return { layerPreview: { ...prev, ...layerPreview } }
      }
      return { layerPreview }
    }),
}))
