import type { Asset, AssetKind } from '@/api/assets'

const KIND_LABELS: Record<AssetKind, string> = {
  original: '原图',
  generated: '生成',
  subject: '主体',
  background: '背景',
  mask: '遮罩',
  marketing: '营销',
  export: '导出',
}

/** 会话内全部图片，含未采用的候选。点击切换画布当前图，不覆盖任何已有结果。 */
export default function ImageWall({
  assets,
  currentId,
  disabled,
  onPick,
}: {
  assets: Asset[]
  currentId: string
  disabled: boolean
  onPick: (assetId: string) => void
}) {
  const visibleAssets = assets.filter(
    (asset) =>
      asset.kind !== 'mask' &&
      (asset.id === currentId || (asset.kind !== 'subject' && asset.kind !== 'background')),
  )

  if (visibleAssets.length === 0) return null

  return (
    <aside
      aria-label="会话图片"
      className="border-line bg-paper flex min-h-0 w-52 shrink-0 flex-col border-r"
    >
      <div className="border-line text-muted flex h-14 shrink-0 items-center justify-between border-b px-3 text-xs">
        <span className="font-medium">图片素材</span>
        <span className="text-faint tabular-nums">{visibleAssets.length}</span>
      </div>
      <div className="scrollbar-slim grid min-h-0 grid-cols-2 content-start gap-2 overflow-y-auto p-3">
        {visibleAssets.map((asset) => {
          const active = asset.id === currentId
          return (
            <button
              key={asset.id}
              type="button"
              disabled={disabled || active}
              onClick={() => onPick(asset.id)}
              title={
                active
                  ? `当前画布 · ${KIND_LABELS[asset.kind]}`
                  : `采用这张 · ${KIND_LABELS[asset.kind]} ${asset.width}×${asset.height}`
              }
              className={`bg-canvas group rounded-chip relative aspect-square w-full overflow-hidden border-2 transition-all duration-150 disabled:cursor-default ${
                active
                  ? 'border-brand shadow-control'
                  : 'border-line hover:border-brand hover:shadow-control active:scale-[0.97]'
              }`}
            >
              <img
                src={asset.url}
                alt=""
                loading="lazy"
                className="size-full object-contain transition-transform duration-150 group-hover:scale-[1.03]"
              />
              <span className="bg-scrim/70 absolute right-0 bottom-0 left-0 py-0.5 text-[10px] text-white">
                {KIND_LABELS[asset.kind]}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
