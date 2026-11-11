import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { authApi, type Credentials, type User } from '@/api/auth'
import { ApiError } from '@/api/client'

const ME_KEY = ['auth', 'me']

/**
 * 会话状态以服务端 Cookie 为准，前端不持有令牌，只缓存当前用户。
 *
 * @returns
 */
export function useCurrentUser() {
  const { data, isPending } = useQuery({
    queryKey: ME_KEY,
    queryFn: () => authApi.me(),
    retry: false,
    staleTime: Infinity,
    // 未登录是正常状态，不作为错误向上抛
    throwOnError: false,
  })
  return { user: data ?? null, isLoading: isPending }
}

/**
 * 提供登录、注册及退出操作，并同步用户与业务缓存。
 *
 * @returns
 */
export function useAuthActions() {
  const queryClient = useQueryClient()
  /**
   * 将认证成功返回的用户写入当前身份缓存。
   *
   * @param user 认证成功后服务端返回的用户资料。
   * @returns
   */
  const cacheUser = (user: User) => queryClient.setQueryData(ME_KEY, user)

  const login = useMutation({
    mutationFn: (body: Credentials) => authApi.login(body),
    onSuccess: cacheUser,
  })
  const register = useMutation({
    mutationFn: (body: Credentials) => authApi.register(body),
    onSuccess: cacheUser,
  })
  const logout = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => queryClient.clear(),
  })

  return { login, register, logout }
}

/**
 * 提取可展示的异常消息，未知异常使用通用失败文案。
 *
 * @param error 失败原因，无错误时为空。
 * @returns
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return error instanceof Error ? error.message : '请求失败，请稍后重试'
}
