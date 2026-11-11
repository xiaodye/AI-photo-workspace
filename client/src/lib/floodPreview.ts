import type { Layer, LayerDocument } from '@/api/sessions'

const COLOR = [95, 152, 173, 255] as const
const TOLERANCE = 36
const MAX_SIDE = 480
const MAX_FILL = 0.55

/**
 * 计算像素与种子色的距离，降低透明度差异的权重。
 *
 * @param a 待比较的 RGBA 像素数组。
 * @param i 目标像素的起始通道偏移。
 * @param sample 点击种子像素的 RGBA 值。
 * @returns
 */
function distance(a: Uint8ClampedArray, i: number, sample: number[]) {
  const dr = a[i] - sample[0]
  const dg = a[i + 1] - sample[1]
  const db = a[i + 2] - sample[2]
  const da = a[i + 3] - sample[3]
  return Math.sqrt(dr * dr + dg * dg + db * db + da * da * 0.25)
}

/**
 * 以匿名跨源模式加载图片，供选区预览读取像素。
 *
 * @param url 资源访问地址，可能为有时效的签名 URL。
 * @returns
 */
function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image'))
    image.src = url
  })
}

/**
 * 按文档的位移、旋转、缩放和透明度将图片绘入画布。
 *
 * @param ctx 目标画布的二维绘制上下文。
 * @param layer 当前操作的文档图层。
 * @param image 已经解码的图片数据。
 */
function drawLayer(ctx: CanvasRenderingContext2D, layer: Layer, image: HTMLImageElement) {
  const { x, y, scale_x, scale_y, rotation } = layer.transform
  ctx.save()
  ctx.globalAlpha = layer.opacity
  ctx.translate(x + layer.width / 2, y + layer.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.scale(scale_x || 1, scale_y || 1)
  ctx.drawImage(image, -layer.width / 2, -layer.height / 2, layer.width, layer.height)
  ctx.restore()
}

/**
 * 合成可见图片层供近似选区计算，加载失败时返回空值。
 *
 * @param canvasDoc 需要合成预览的画布文档。
 * @param urls 按素材标识索引的图片地址。
 * @returns
 */
async function flatten(canvasDoc: LayerDocument, urls: Map<string, string>) {
  const canvas = document.createElement('canvas')
  canvas.width = canvasDoc.width
  canvas.height = canvasDoc.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (const layer of canvasDoc.layers) {
    if (!layer.visible || layer.kind !== 'image' || !layer.asset_id) continue
    const url = urls.get(layer.asset_id)
    if (!url) continue
    try {
      drawLayer(ctx, layer, await loadImage(url))
    } catch {
      return null
    }
  }
  return canvas
}

/**
 * 在点击位置生成圆形兜底遮罩，保持即时反馈。
 *
 * @param width 宽度；画布及素材尺寸以像素计。
 * @param height 高度；画布及素材尺寸以像素计。
 * @param nx 点击位置的归一化横坐标。
 * @param ny 点击位置的归一化纵坐标。
 * @returns
 */
function circleOverlay(width: number, height: number, nx: number, ny: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const radius = Math.max(16, Math.min(width, height) * 0.16)
  ctx.fillStyle = `rgba(${COLOR[0]}, ${COLOR[1]}, ${COLOR[2]}, 1)`
  ctx.beginPath()
  ctx.arc(nx * width, ny * height, radius, 0, Math.PI * 2)
  ctx.fill()
  return canvas
}

/**
 * 在缩小位图上按颜色漫水填充，覆盖过大时改用圆形提示。
 *
 * @param source 待计算选区的合成画布。
 * @param nx 点击位置的归一化横坐标。
 * @param ny 点击位置的归一化纵坐标。
 * @returns
 */
function floodOverlay(source: HTMLCanvasElement, nx: number, ny: number) {
  const scale = Math.min(1, MAX_SIDE / Math.max(source.width, source.height))
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))
  const work = document.createElement('canvas')
  work.width = width
  work.height = height
  const ctx = work.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(source, 0, 0, width, height)

  let pixels: ImageData
  try {
    pixels = ctx.getImageData(0, 0, width, height)
  } catch {
    return null
  }

  const data = pixels.data
  const x0 = Math.min(width - 1, Math.max(0, Math.round(nx * (width - 1))))
  const y0 = Math.min(height - 1, Math.max(0, Math.round(ny * (height - 1))))
  const origin = (y0 * width + x0) * 4
  const sample = [data[origin], data[origin + 1], data[origin + 2], data[origin + 3]]
  if (sample[3] < 8) return circleOverlay(source.width, source.height, nx, ny)

  const seen = new Uint8Array(width * height)
  const filled = new Uint8Array(width * height)
  const stack = [x0 + y0 * width]
  let count = 0

  while (stack.length) {
    const index = stack.pop()
    if (index === undefined || seen[index]) continue
    seen[index] = 1
    if (distance(data, index * 4, sample) > TOLERANCE) continue
    filled[index] = 1
    count += 1
    const x = index % width
    const y = (index / width) | 0
    if (x > 0) stack.push(index - 1)
    if (x + 1 < width) stack.push(index + 1)
    if (y > 0) stack.push(index - width)
    if (y + 1 < height) stack.push(index + width)
  }

  if (count / (width * height) > MAX_FILL) {
    return circleOverlay(source.width, source.height, nx, ny)
  }

  const overlay = ctx.createImageData(width, height)
  for (let i = 0; i < filled.length; i += 1) {
    if (!filled[i]) continue
    const pixel = i * 4
    overlay.data[pixel] = COLOR[0]
    overlay.data[pixel + 1] = COLOR[1]
    overlay.data[pixel + 2] = COLOR[2]
    overlay.data[pixel + 3] = COLOR[3]
  }
  ctx.putImageData(overlay, 0, 0)

  if (width === source.width && height === source.height) return work
  const full = document.createElement('canvas')
  full.width = source.width
  full.height = source.height
  const next = full.getContext('2d')
  if (!next) return work
  next.imageSmoothingEnabled = false
  next.drawImage(work, 0, 0, full.width, full.height)
  return full
}

/**
 * 点击后立刻出一块近似选区，SAM 回来再换成准的。
 *
 * @param canvasDoc 需要合成预览的画布文档。
 * @param urls 按素材标识索引的图片地址。
 * @param point 画布内 0～1 的归一化点坐标。
 * @returns
 */
export async function floodPreview(
  canvasDoc: LayerDocument,
  urls: Map<string, string>,
  point: {
    /** 横向坐标；单位与所属画布或视图一致。 */
    x: number;
    /** 纵向坐标；单位与所属画布或视图一致。 */
    y: number
  },
) {
  const flat = await flatten(canvasDoc, urls)
  if (!flat) return circleOverlay(canvasDoc.width, canvasDoc.height, point.x, point.y)
  return (
    floodOverlay(flat, point.x, point.y) ??
    circleOverlay(canvasDoc.width, canvasDoc.height, point.x, point.y)
  )
}
