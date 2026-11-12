import { Button, Popover } from '@heroui/react'
import { LogOut } from 'lucide-react'

import ThemeSwitcher from '@/components/ThemeSwitcher'

export default function AccountMenu({
  username,
  onSignOut,
  isSigningOut,
  isOpen,
  onOpenChange,
}: {
  username?: string
  onSignOut: () => void
  isSigningOut: boolean
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}) {
  return (
    <Popover isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button
        type="button"
        variant="ghost"
        aria-label="账户菜单"
        className="app-button text-muted hover:bg-soft hover:text-ink flex h-11 w-11 min-w-0 justify-start gap-3 rounded-[12px] px-3 py-0 text-sm group-data-[nav-open=true]:w-full group-data-[account-open=true]:w-full"
      >
        <span className="bg-soft text-ink grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold">
          {username?.slice(0, 1).toUpperCase() ?? '?'}
        </span>
        <span className="hidden truncate group-data-[nav-open=true]:block group-data-[account-open=true]:block">
          {username ?? '账户设置'}
        </span>
      </Button>
      <Popover.Content placement="right bottom" offset={12} className="border-line bg-paper text-ink shadow-panel z-50 w-64 rounded-card border">
        <Popover.Dialog className="p-4">
          <Popover.Heading className="truncate text-sm font-medium">
            {username ?? '账户设置'}
          </Popover.Heading>
          <div className="mt-4 flex items-center justify-between gap-4">
            <span className="text-muted text-xs">主题切换</span>
            <ThemeSwitcher />
          </div>
          <div className="border-line mt-4 border-t pt-2">
            <button
              type="button"
              onClick={onSignOut}
              disabled={isSigningOut}
              className="text-muted hover:bg-soft hover:text-ink flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors disabled:opacity-50"
            >
              <LogOut size={16} strokeWidth={1.8} aria-hidden />
              {isSigningOut ? '正在退出…' : '退出登录'}
            </button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
