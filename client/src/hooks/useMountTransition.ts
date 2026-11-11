import { useEffect, useState } from 'react'

/**
 * 关闭后先留在树上把退场动画播完再卸载。返回 null 表示已经可以真正移除，
 * exiting 为真时由调用方挂退场动画。
 *
 * @param value 当前受控值。
 * @param exitMs 退场动画时长，单位为毫秒。
 * @returns
 */
export function useMountTransition<T>(
  value: T | null,
  exitMs: number,
): {
  /** 当前受控值。 */
  value: T;
  /** 是否正在播放退场动画。 */
  exiting: boolean
} | null {
  const [held, setHeld] = useState(value)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (value !== null) {
      setHeld(value)
      setExiting(false)
      return
    }
    if (held === null) return
    setExiting(true)
    const timer = window.setTimeout(() => {
      setHeld(null)
      setExiting(false)
    }, exitMs)
    return () => window.clearTimeout(timer)
  }, [value, held, exitMs])

  if (held === null) return null
  return { value: held, exiting }
}
