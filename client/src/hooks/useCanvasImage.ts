import { useEffect, useState } from 'react'

/** safe 表示位图可被读取像素，只有它为真时才能在画布上跑实时滤镜。 */
export type CanvasImage = {
  /** 已经解码的图片元素。 */
  element: HTMLImageElement;
  /** 是否可安全读取位图像素并应用实时滤镜。 */
  safe: boolean;
  /** 资源访问地址，可能为有时效的签名 URL。 */
  url: string
}

const LIMIT = 16
const cache = new Map<string, CanvasImage>()

/**
 * 将位图提升为最近使用项，并淘汰超出容量的旧缓存。
 *
 * @param image 已经解码的图片数据。
 */
function remember(image: CanvasImage) {
  cache.delete(image.url)
  cache.set(image.url, image)
  while (cache.size > LIMIT) {
    const oldest = cache.keys().next().value
    if (!oldest || oldest === image.url) break
    cache.delete(oldest)
  }
}

/**
 * 从画布位图缓存读取图片，未命中时返回空值。
 *
 * @param url 资源访问地址，可能为有时效的签名 URL。
 * @returns
 */
function read(url: string) {
  return cache.get(url) ?? null
}

/**
 * 解码图片，并按请求决定是否启用可读像素的跨源模式。
 *
 * @param url 资源访问地址，可能为有时效的签名 URL。
 * @param safe 是否请求可读取像素的跨源位图。
 * @returns
 */
function decode(url: string, safe: boolean) {
  return new Promise<CanvasImage>((resolve, reject) => {
    const element = new Image()
    if (safe) element.crossOrigin = 'anonymous'
    element.onload = () => resolve({ element, safe, url })
    element.onerror = () => reject(new Error('image'))
    element.src = url
  })
}

/**
 * 预加载位图并缓存，跨源失败时降级为仅可绘制的图片。
 *
 * @param url 资源访问地址，可能为有时效的签名 URL。
 * @returns
 */
export function preloadCanvasImage(url: string) {
  const hit = read(url)
  if (hit) return Promise.resolve(hit)
  return decode(url, true)
    .catch(() => decode(url, false))
    .then((image) => {
      remember(image)
      return image
    })
    .catch(() => null)
}

/**
 * 把 URL 解码为 Konva 可直接绘制的位图。换源时先留着上一张，避免画布闪白。
 *
 * @param url 资源访问地址，可能为有时效的签名 URL。
 * @returns
 */
export function useCanvasImage(url: string | undefined) {
  const [image, setImage] = useState<CanvasImage | null>(() => (url ? read(url) : null))

  useEffect(() => {
    if (!url) return

    const hit = read(url)
    if (hit) {
      setImage(hit)
      return
    }

    let cancelled = false
    void preloadCanvasImage(url).then((next) => {
      if (!cancelled && next) setImage(next)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  return (url && read(url)) || image
}
