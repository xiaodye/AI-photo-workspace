import { ChevronLeft, ChevronRight, Download, Images, Pencil, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import BrandMark from '@/components/BrandMark'
import ToastHost from '@/components/ToastHost'
import AccountMenu from '@/components/AccountMenu'
import { useAuthActions, useCurrentUser } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { to: '/create', label: '创作', icon: Sparkles },
  { to: '/editor', label: '编辑', icon: Pencil },
  { to: '/marketing', label: '导出', icon: Download },
  { to: '/batch', label: '批量', icon: Images },
]

/** 工作台外壳：左侧导航通过按钮展开或收起。 */
export default function WorkbenchLayout() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const { logout } = useAuthActions()
  const [navOpen, setNavOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  /**
   * 退出当前登录状态并交由认证路由处理后续访问。
   */
  const signOut = () =>
    logout.mutate(undefined, { onSuccess: () => navigate('/', { replace: true }) })

  return (
    <div className="flex h-screen overflow-hidden">
      <nav className="relative z-30 w-16 shrink-0" aria-label="工作台">
        <div
          data-account-open={accountMenuOpen}
          data-nav-open={navOpen}
          className="group border-line bg-paper absolute inset-y-0 left-0 flex w-16 flex-col overflow-hidden border-r py-4 transition-[width,box-shadow] duration-200 data-[nav-open=true]:w-52 data-[nav-open=true]:shadow-panel data-[account-open=true]:w-52 data-[account-open=true]:shadow-panel data-[account-open=true]:transition-none"
        >
          <Link to="/" aria-label="返回落地页" title="返回落地页" className="mb-6 block px-5">
            <BrandMark size="sm">
              <span className="text-ink truncate text-sm font-semibold opacity-0 transition-opacity group-data-[nav-open=true]:opacity-100 group-data-[account-open=true]:opacity-100">
                AI 修图智能体
              </span>
            </BrandMark>
          </Link>

          <ul className="flex flex-1 flex-col gap-1 px-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  title={item.label}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    `flex h-11 w-11 items-center gap-3 rounded-[12px] px-3 text-sm transition-colors group-data-[nav-open=true]:w-full group-data-[account-open=true]:w-full ${
                      isActive
                        ? 'bg-brand-soft text-brand-strong font-medium'
                        : 'text-muted hover:bg-soft hover:text-ink'
                    }`
                  }
                >
                  <item.icon size={20} strokeWidth={1.7} className="shrink-0" aria-hidden />
                  <span className="hidden truncate group-data-[nav-open=true]:block group-data-[account-open=true]:block">
                    {item.label}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="border-line mt-2 space-y-1 border-t px-2 pt-3">
            <button
              type="button"
              aria-label={navOpen || accountMenuOpen ? '收起侧栏' : '展开侧栏'}
              aria-expanded={navOpen || accountMenuOpen}
              title={navOpen || accountMenuOpen ? '收起侧栏' : '展开侧栏'}
              onClick={() => {
                setNavOpen(!(navOpen || accountMenuOpen))
                setAccountMenuOpen(false)
              }}
              className="text-muted hover:bg-soft hover:text-ink flex h-11 w-11 shrink-0 items-center gap-3 rounded-[12px] px-3 text-sm transition-colors group-data-[nav-open=true]:w-full group-data-[account-open=true]:w-full"
            >
              {navOpen || accountMenuOpen ? (
                <ChevronLeft size={20} strokeWidth={1.7} className="shrink-0" aria-hidden />
              ) : (
                <ChevronRight size={20} strokeWidth={1.7} className="shrink-0" aria-hidden />
              )}
              <span className="hidden truncate group-data-[nav-open=true]:block group-data-[account-open=true]:block">
                收起侧栏
              </span>
            </button>
            <AccountMenu
              username={user?.username}
              onSignOut={signOut}
              isSigningOut={logout.isPending}
              isOpen={accountMenuOpen}
              onOpenChange={setAccountMenuOpen}
            />
          </div>
        </div>
      </nav>

      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
      <ToastHost />
    </div>
  )
}
