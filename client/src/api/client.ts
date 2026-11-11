export class ApiError extends Error {
  /** 服务端返回的执行状态。 */
  status: number

  /**
   * function Object() { [native code] }
   *
   * @param status 待判断的任务状态。
   * @param message 通用异常消息字段。
   */
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// pydantic 会给自定义校验加这个前缀，对用户没有意义
const VALUE_ERROR = /^Value error,\s*/

/**
 * 递归提取服务端错误消息，移除对用户无意义的校验前缀。
 *
 * @param item 待解析的错误消息项。
 * @returns
 */
function messageOf(item: unknown): string {
  if (typeof item === 'string') return item.trim()
  if (!item || typeof item !== 'object') return ''
  const { msg, message } = item as {
    /** 服务端校验返回的消息字段。 */
    msg?: unknown;
    /** 通用异常消息字段。 */
    message?: unknown
  }
  return messageOf(msg ?? message).replace(VALUE_ERROR, '')
}

/**
 * FastAPI 校验失败时 detail 是 `{loc, msg, type}` 数组，原样当字符串会渲染成 [object Object]。
 *
 * @param detail 服务端返回的错误详情。
 * @param fallback 无法提取错误详情时的兜底文案。
 * @returns
 */
function formatDetail(detail: unknown, fallback: string): string {
  if (Array.isArray(detail)) {
    return detail.map(messageOf).filter(Boolean).join('；') || fallback
  }
  return messageOf(detail) || fallback
}

/**
 * 上传与下载走原生 fetch，错误一律经这里构造，文案格式与 JSON 请求保持一致。
 *
 * @param response 尚待读取的 HTTP 响应。
 * @param fallback 无法提取错误详情时的兜底文案。
 * @returns
 */
export async function apiError(response: Response, fallback: string): Promise<ApiError> {
  const body = await response.json().catch(() => null)
  return new ApiError(response.status, formatDetail(body?.detail, fallback))
}

/**
 * 发送同源 JSON 请求，将非成功响应归一化为 ApiError。
 *
 * @param path 相对 /api 的请求路径。
 * @param init 请求方法、请求头及请求体。
 * @returns
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!response.ok) throw await apiError(response, response.statusText)
  return response.status === 204 ? (undefined as T) : response.json()
}

export const api = {
  /**
   * 发送 GET 请求并解析业务响应。
   *
   * @param path 相对 /api 的请求路径。
   * @returns
   */
  get: <T>(path: string) => request<T>(path),
  /**
   * 发送 POST 请求，可附带 JSON 请求体。
   *
   * @param path 相对 /api 的请求路径。
   * @param body 提交给接口的 JSON 数据。
   * @returns
   */
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  /**
   * 发送 PATCH 请求更新资源。
   *
   * @param path 相对 /api 的请求路径。
   * @param body 提交给接口的 JSON 数据。
   * @returns
   */
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  /**
   * 发送 DELETE 请求删除指定资源。
   *
   * @param path 相对 /api 的请求路径。
   * @returns
   */
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
