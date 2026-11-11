import { api } from '@/api/client'

export type User = {
  /** 当前记录的唯一标识。 */
  id: string;
  /** 用于登录的用户名。 */
  username: string
}
export type Credentials = {
  /** 用于登录的用户名。 */
  username: string;
  /** 仅用于本次认证提交的密码。 */
  password: string
}

export const authApi = {
  /**
   * 注册账号并取得当前用户信息。
   *
   * @param body 提交给接口的 JSON 数据。
   * @returns
   */
  register: (body: Credentials) => api.post<User>('/auth/register', body),
  /**
   * 提交凭据登录，由服务端建立 Cookie 会话。
   *
   * @param body 提交给接口的 JSON 数据。
   * @returns
   */
  login: (body: Credentials) => api.post<User>('/auth/login', body),
  /**
   * 请求服务端结束当前登录会话。
   *
   * @returns
   */
  logout: () => api.post<void>('/auth/logout'),
  /**
   * 读取 Cookie 对应的当前用户。
   *
   * @returns
   */
  me: () => api.get<User>('/auth/me'),
}
