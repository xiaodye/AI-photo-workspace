import {
  Brush,
  Check,
  Crop,
  Eraser,
  Expand,
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  Layers,
  Layers2,
  Maximize,
  MousePointer2,
  Redo2,
  ScanLine,
  Scissors,
  SlidersHorizontal,
  SplitSquareHorizontal,
  Undo2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { SessionDetail } from '@/api/sessions'
import Button from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import type { SessionSelection } from '@/hooks/useSelection'
import type { SessionTools } from '@/hooks/useSessions'
import { wallOnly } from '@/lib/layers'
import { ZOOM_STEP, useCanvasView } from '@/stores/canvasView'
import { useEditorUi, type CropRatio } from '@/stores/editorUi'

const CROP_RATIOS: { value: CropRatio; label: string }[] = [
  { value: 'free', label: '自由' },
  { value: '1:1', label: '1:1' },
  { value: '4:5', label: '4:5' },
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
]

function ToolLabel({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <Icon size={14} strokeWidth={1.7} className="shrink-0" aria-hidden />
      {children}
    </span>
  )
}

export default function EditorToolbar({
  session,
  tools,
  picking,
  onRename,
}: {
  session: SessionDetail
  tools: SessionTools
  picking: SessionSelection
  onRename: (title: string) => void
}) {
  const scale = useCanvasView((state) => state.scale)
  const fit = useCanvasView((state) => state.fit)
  const stepZoom = useCanvasView((state) => state.stepZoom)
  const zoomTo = useCanvasView((state) => state.zoomTo)
  const ui = useEditorUi()

  // 只有发起的那个按钮显示百分比，其余按钮照常禁用
  /**
   * 仅为当前匹配工具返回进度，其他按钮不展示忙碌百分比。
   *
   * @param tool 服务端注册的工具名称。
   * @param match 进一步匹配工具参数的可选条件。
   * @returns
   */
  const running = (tool: string, match?: (params: Record<string, unknown>) => boolean) =>
    tools.isRunning(tool, match) ? tools.pendingProgress : null

  /**
   * 将像素裁剪框归一化后提交工具，并关闭裁剪模式。
   */
  const confirmCrop = () => {
    if (!ui.cropRect) return
    tools.invoke('crop_canvas', {
      rect: {
        x: ui.cropRect.x / session.document.width,
        y: ui.cropRect.y / session.document.height,
        width: ui.cropRect.width / session.document.width,
        height: ui.cropRect.height / session.document.height,
      },
    })
    ui.closeCrop()
  }

  return (
    <header className="border-line bg-paper min-w-0 shrink-0 border-b">
      <div className="border-line flex h-14 items-center border-b px-3">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-center">
          <TitleField value={session.title} onCommit={onRename} />
        </div>
      </div>

      <div className="scrollbar-slim overflow-x-auto">
      <div className="editor-tool-row grid grid-cols-[minmax(8rem,1fr)_max-content] items-start">
      <div className="flex min-w-0 flex-wrap items-center gap-x-0.5 gap-y-1 px-2 py-1.5">
        {ui.selectMode ? (
          <>
            <Button
              active={ui.selectMode === 'point'}
              title="点击物体生成选区"
              onClick={() => ui.setSelectMode(ui.selectMode === 'point' ? null : 'point')}
            >
              <ToolLabel icon={MousePointer2}>点选</ToolLabel>
            </Button>
            <Button
              active={ui.selectMode === 'brush'}
              title="涂抹出选区"
              onClick={() => ui.setSelectMode(ui.selectMode === 'brush' ? null : 'brush')}
            >
              <ToolLabel icon={Brush}>笔刷</ToolLabel>
            </Button>
            <Button
              disabled={tools.busy || picking.busy || !picking.selection}
              progress={running('erase_region')}
              title={picking.selection ? '消除选中区域' : '先点选或涂抹'}
              onClick={() =>
                tools.invoke('erase_region', {
                  mask_asset_id: picking.selection?.maskId,
                  revision: session.revision,
                  layer_id: ui.selectedLayerId,
                })
              }
            >
              <ToolLabel icon={Eraser}>消除</ToolLabel>
            </Button>
            <Button
              disabled={!picking.selection}
              active={ui.panel === 'replace'}
              title={picking.selection ? '按描述替换选区' : '先点选或涂抹'}
              onClick={() => ui.setPanel(ui.panel === 'replace' ? null : 'replace')}
            >
              <ToolLabel icon={ImagePlus}>替换</ToolLabel>
            </Button>
            <Button
              disabled={tools.busy || picking.busy || !picking.selection}
              progress={running('promote_object_to_layer')}
              title={picking.selection ? '把选区提升为独立图层，可撤销' : '先点选或涂抹'}
              onClick={() =>
                tools.invoke('promote_object_to_layer', {
                  mask_asset_id: picking.selection?.maskId,
                  revision: session.revision,
                })
              }
            >
              <ToolLabel icon={Layers2}>成层</ToolLabel>
            </Button>
            <Button
              disabled={!picking.selection || picking.busy}
              title="清除当前选区"
              onClick={picking.clear}
            >
              <ToolLabel icon={X}>清除</ToolLabel>
            </Button>
            <Button title="退出选择 Esc" onClick={() => ui.setSelectMode(null)}>
              <ToolLabel icon={Check}>完成</ToolLabel>
            </Button>
          </>
        ) : ui.cropOpen ? (
          <>
            {CROP_RATIOS.map((item) => (
              <Button
                key={item.value}
                active={ui.cropRatio === item.value}
                title={item.value === 'free' ? '自由裁剪' : `按 ${item.label} 裁剪`}
                onClick={() => ui.setCropRatio(item.value, session.document)}
              >
                {item.label}
              </Button>
            ))}
            <Button title="按当前框裁剪画布，可撤销" onClick={confirmCrop}>
              <ToolLabel icon={Check}>确定</ToolLabel>
            </Button>
            <Button title="退出裁剪 Esc" onClick={ui.closeCrop}>
              <ToolLabel icon={X}>取消</ToolLabel>
            </Button>
          </>
        ) : (
          <>
            <Button
              disabled={tools.busy}
              active={ui.cropOpen}
              title="按比例裁剪画布"
              onClick={() => ui.openCrop(session.document)}
            >
              <ToolLabel icon={Crop}>裁剪</ToolLabel>
            </Button>
            <Button
              disabled={tools.busy}
              progress={running('flip_layer', (params) => params.direction === 'horizontal')}
              title="左右翻转当前图层"
              onClick={() =>
                tools.invoke('flip_layer', {
                  direction: 'horizontal',
                  layer_id: ui.selectedLayerId,
                })
              }
            >
              <ToolLabel icon={FlipHorizontal2}>水平翻转</ToolLabel>
            </Button>
            <Button
              disabled={tools.busy}
              progress={running('flip_layer', (params) => params.direction === 'vertical')}
              title="上下翻转当前图层"
              onClick={() =>
                tools.invoke('flip_layer', {
                  direction: 'vertical',
                  layer_id: ui.selectedLayerId,
                })
              }
            >
              <ToolLabel icon={FlipVertical2}>垂直翻转</ToolLabel>
            </Button>
            <Button
              disabled={tools.busy}
              progress={running('remove_background')}
              title="抠出主体，背景变透明"
              onClick={() => tools.invoke('remove_background', { layer_id: ui.selectedLayerId })}
            >
              <ToolLabel icon={Scissors}>去背景</ToolLabel>
            </Button>
            <Button
              disabled={tools.busy}
              active={ui.panel === 'background'}
              title="按描述替换背景"
              onClick={() => ui.setPanel(ui.panel === 'background' ? null : 'background')}
            >
              <ToolLabel icon={ImagePlus}>换背景</ToolLabel>
            </Button>
            <Button
              disabled={tools.busy}
              active={ui.panel === 'expand'}
              title="扩展画布到新比例"
              onClick={() => ui.setPanel(ui.panel === 'expand' ? null : 'expand')}
            >
              <ToolLabel icon={Expand}>扩图</ToolLabel>
            </Button>
            <Button
              disabled={tools.busy}
              progress={running('upscale_image')}
              title={
                wallOnly(session.document)
                  ? '放大到两倍，已拆层所以结果只进图片墙'
                  : '把当前画布放大到两倍'
              }
              onClick={() => tools.invoke('upscale_image', { scale: 2 })}
            >
              <ToolLabel icon={ScanLine}>超分</ToolLabel>
            </Button>
            <Button
              active={ui.panel === 'adjust'}
              title="调整亮度、对比度和色彩"
              onClick={() => ui.setPanel(ui.panel === 'adjust' ? null : 'adjust')}
            >
              <ToolLabel icon={SlidersHorizontal}>调色</ToolLabel>
            </Button>
            <Button
              disabled={tools.busy}
              progress={running('split_layers')}
              title="拆成背景和主体，文字需在图层面板勾选，可撤销"
              onClick={() => tools.invoke('split_layers', { include_text: ui.splitIncludeText })}
            >
              <ToolLabel icon={Layers2}>拆层</ToolLabel>
            </Button>
            <Button
              disabled={tools.busy}
              title="点选物体建立选区"
              onClick={() => ui.setSelectMode('point')}
            >
              <ToolLabel icon={MousePointer2}>点选</ToolLabel>
            </Button>
            <Button
              disabled={tools.busy}
              title="涂抹建立选区"
              onClick={() => ui.setSelectMode('brush')}
            >
              <ToolLabel icon={Brush}>笔刷</ToolLabel>
            </Button>
          </>
        )}
      </div>

      <div className="border-line flex flex-nowrap items-start justify-end gap-0.5 self-stretch border-l px-2 py-1.5 whitespace-nowrap [&>*]:shrink-0">
        <Button
          disabled={tools.busy || picking.busy || !(picking.canUndo || session.can_undo)}
          title={
            picking.canUndo
              ? '撤销选区 ⌘Z'
              : session.can_undo
                ? '撤销上一步 ⌘Z'
                : '没有可撤销的操作'
          }
          onClick={() => (picking.canUndo ? picking.undo() : tools.undo())}
        >
          <ToolLabel icon={Undo2}>撤销</ToolLabel>
        </Button>
        <Button
          disabled={tools.busy || picking.busy || !(picking.canRedo || session.can_redo)}
          title={
            picking.canRedo
              ? '重做选区 ⌘⇧Z'
              : session.can_redo
                ? '重做 ⌘⇧Z'
                : '没有可重做的操作'
          }
          onClick={() => (picking.canRedo ? picking.redo() : tools.redo())}
        >
          <ToolLabel icon={Redo2}>重做</ToolLabel>
        </Button>
        <Button
          active={ui.compareOpen}
          disabled={!session.previous_document}
          title={session.previous_document ? '与上一版对比' : '还没有上一版'}
          onClick={() => ui.setCompareOpen(!ui.compareOpen)}
        >
          <ToolLabel icon={SplitSquareHorizontal}>对比</ToolLabel>
        </Button>

        <div className="editor-zoom-controls border-line rounded-control mx-1 flex h-8 shrink-0 flex-nowrap items-center gap-0.5 border px-0.5">
          <Button
            variant="icon"
            size="sm"
            title="缩小 -"
            onClick={() => stepZoom(1 / ZOOM_STEP)}
          >
            <ZoomOut size={14} strokeWidth={1.7} aria-hidden />
            <span className="sr-only">缩小</span>
          </Button>
          <Button
            size="sm"
            title="实际像素 · 按 1"
            className="w-12 tabular-nums"
            onClick={() => zoomTo(1)}
          >
            {Math.round(scale * 100)}%
          </Button>
          <Button variant="icon" size="sm" title="放大 +" onClick={() => stepZoom(ZOOM_STEP)}>
            <ZoomIn size={14} strokeWidth={1.7} aria-hidden />
            <span className="sr-only">放大</span>
          </Button>
          <Button
            size="sm"
            title="适应窗口 · 按 0，画布内双击同样生效"
            onClick={() => fit(session.document)}
          >
            <ToolLabel icon={Maximize}>适应</ToolLabel>
          </Button>
        </div>

        <Link to={`/marketing/${session.id}`} title="导出营销图和投放尺寸" className={buttonClass()}>
          <ToolLabel icon={Upload}>导出</ToolLabel>
        </Link>
        <Button
          active={ui.panel === 'layers'}
          title="图层、变换和编辑记录"
          onClick={() => ui.setPanel(ui.panel === 'layers' ? null : 'layers')}
        >
          <ToolLabel icon={Layers}>图层</ToolLabel>
        </Button>
      </div>
      </div>
      </div>
    </header>
  )
}

function TitleField({ value, onCommit }: { value: string; onCommit: (title: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)

  /**
   * 提交清理后的非空标题，避免重复写入相同值。
   */
  const commit = () => {
    const next = draft?.trim()
    setDraft(null)
    if (next && next !== value) onCommit(next)
  }

  return (
    <input
      value={draft ?? value}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') setDraft(null)
      }}
      aria-label="会话标题"
      className="text-ink hover:bg-soft focus:bg-soft rounded-chip min-w-0 flex-1 px-3 py-1.5 text-center text-sm font-medium transition-colors duration-150 outline-none"
    />
  )
}
