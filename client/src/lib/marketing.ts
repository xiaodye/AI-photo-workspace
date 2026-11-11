import type { Asset, AssetKind } from '@/api/assets'
import type { Ratio } from '@/api/runs'

export type MarketingKind = 'product' | 'scene' | 'model' | 'poster'

export const MARKETING_KINDS: {
  /** 当前记录的唯一标识。 */
  id: MarketingKind
  /** 界面展示文案。 */
  label: string
  /** 辅助说明或操作提示。 */
  hint: string
}[] = [
  { id: 'product', label: '商品主图', hint: '白底居中，适合详情页主图' },
  { id: 'scene', label: '场景氛围图', hint: '真实场景，侧逆光浅景深' },
  { id: 'model', label: '模特上身', hint: '模特手持或佩戴展示' },
  { id: 'poster', label: '促销海报', hint: '突出商品，预留文案区' },
]

export const DELIVERY_RATIOS: {
  /** 当前受控值。 */
  value: Ratio;
  /** 界面展示文案。 */
  label: string;
  /** 控件尺寸档位或展示尺寸。 */
  size: string
}[] = [
  { value: '1:1', label: '1:1', size: '1080×1080' },
  { value: '4:5', label: '4:5', size: '1080×1350' },
  { value: '9:16', label: '9:16', size: '1080×1920' },
]

const DELIVERY_SIZES: Record<string, string> = {
  '1080x1080': '1:1',
  '1080x1350': '4:5',
  '1080x1920': '9:16',
}

export const KIND_LABELS: Record<AssetKind, string> = {
  original: '原图',
  generated: '生成',
  subject: '主体',
  background: '背景',
  mask: '遮罩',
  marketing: '营销',
  export: '导出',
}

/**
 * 将标准投放尺寸显示为比例，其他尺寸保留像素值。
 *
 * @param width 宽度；画布及素材尺寸以像素计。
 * @param height 高度；画布及素材尺寸以像素计。
 * @returns
 */
export function ratioLabel(width: number, height: number): string {
  return DELIVERY_SIZES[`${width}x${height}`] ?? `${width}×${height}`
}

/**
 * 排除遮罩及非当前的主体、背景素材，限定打包范围。
 *
 * @param asset 当前展示或操作的素材。
 * @param currentId 当前会话选中的素材标识。
 * @returns
 */
export function packable(asset: Asset, currentId: string): boolean {
  if (asset.kind === 'mask') return false
  if (asset.kind === 'subject' || asset.kind === 'background') return asset.id === currentId
  return true
}

/**
 * 优先选中营销与导出成品，否则回退到当前素材。
 *
 * @param assets 当前范围内可用的素材集合。
 * @param currentId 当前会话选中的素材标识。
 * @returns
 */
export function defaultSelected(assets: Asset[], currentId: string): string[] {
  const ready = assets.filter((asset) => asset.kind === 'marketing' || asset.kind === 'export')
  if (ready.length) return ready.map((asset) => asset.id)
  return assets.some((asset) => asset.id === currentId) ? [currentId] : []
}
