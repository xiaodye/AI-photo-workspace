/**
 * 按文件体积选择 B、KB 或 MB 展示精度。
 *
 * @param bytes 原始文件体积，单位为字节。
 * @returns
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * 折叠标题空白并按字符数截断，超长时附加省略号。
 *
 * @param title 供用户识别的显示标题。
 * @param max 允许保留的字符数上限。
 * @returns
 */
export function shortTitle(title: string, max = 18): string {
  const cleaned = title.replace(/\s+/g, ' ').trim()
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned
}

/**
 * 将时间转换为中文地区的月日与时分展示。
 *
 * @param iso 服务端返回的时间字符串。
 * @returns
 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
