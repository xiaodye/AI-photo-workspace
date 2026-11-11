import { useSyncExternalStore } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'ai-photo-theme'
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()
let preference: ThemePreference = 'system'

function parsePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system'
}

function applyTheme() {
  const resolved = preference === 'system' ? (systemTheme.matches ? 'dark' : 'light') : preference
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
  listeners.forEach((listener) => listener())
}

try {
  preference = parsePreference(localStorage.getItem(STORAGE_KEY))
} catch {
  // 隐私模式下仍可在当前页面切换主题。
}
applyTheme()

systemTheme.addEventListener('change', applyTheme)
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY || event.key === null) {
    preference = parsePreference(event.newValue)
    applyTheme()
  }
})

export function setThemePreference(value: ThemePreference) {
  preference = value
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // 存储不可用时保留当前页面的选择。
  }
  applyTheme()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useThemePreference() {
  return useSyncExternalStore(subscribe, () => preference)
}
