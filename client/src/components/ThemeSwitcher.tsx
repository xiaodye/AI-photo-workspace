import { Monitor, Moon, Sun } from 'lucide-react'

import { setThemePreference, useThemePreference } from '@/lib/theme'

const MODES = [
  { value: 'light', label: '亮色', icon: Sun },
  { value: 'dark', label: '暗色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
] as const

export default function ThemeSwitcher() {
  const preference = useThemePreference()

  return (
    <div role="group" aria-label="主题切换" className="border-line bg-soft rounded-control inline-flex shrink-0 gap-1 border p-1">
      {MODES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={preference === value}
          onClick={() => setThemePreference(value)}
          className={`grid size-8 place-items-center rounded-lg transition-colors ${
            preference === value
              ? 'bg-paper text-ink shadow-sm'
              : 'text-muted hover:bg-paper/60 hover:text-ink'
          }`}
        >
          <Icon size={16} strokeWidth={1.8} aria-hidden />
        </button>
      ))}
    </div>
  )
}
