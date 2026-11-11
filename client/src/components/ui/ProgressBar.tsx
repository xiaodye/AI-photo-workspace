import { ProgressBar as HeroProgressBar } from '@heroui/react'

/**
 * 进度值本身已经是逐帧动画，所以条体不再加 CSS 过渡，否则两层插值叠起来会拖影。
 */
export default function ProgressBar({
  value,
  tone = 'ink',
  className = 'h-0.5',
}: {
  value: number
  tone?: 'ink' | 'brand'
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <HeroProgressBar
      aria-label="任务进度"
      value={clamped}
      className={`app-progress ${className}`}
    >
      <HeroProgressBar.Track className="h-full rounded-[inherit] bg-line">
        <HeroProgressBar.Fill
          className="min-w-[2%] rounded-[inherit] transition-none"
          style={{
            backgroundColor: tone === 'brand' ? 'var(--color-brand-strong)' : 'var(--color-ink)',
          }}
        />
      </HeroProgressBar.Track>
    </HeroProgressBar>
  )
}
