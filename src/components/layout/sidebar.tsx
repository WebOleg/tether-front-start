/**
 * Sidebar navigation component for admin panel.
 */
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Upload,
  Users,
  ShieldCheck,
  CreditCard,
  BarChart3,
  LogOut,
  RotateCcw,
  Euro,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export const ChargebackIcon = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative", className)}>
      <RotateCcw className="w-full h-full" />
      <Euro className="absolute top-1/2 right-0 w-3 h-3 -translate-x-1/3 -translate-y-1/2" />
    </div>
  );
};

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'BIC Analytics', href: '/admin/bic-analytics', icon: Building2 },
  { name: 'Uploads', href: '/admin/uploads', icon: Upload },
  { name: 'Debtors', href: '/admin/debtors', icon: Users },
  { name: 'Chargebacks', href: '/admin/chargebacks', icon: ChargebackIcon },
  { name: 'VOP Logs', href: '/admin/vop-logs', icon: ShieldCheck },
  { name: 'Billing', href: '/admin/billing', icon: CreditCard },
]

interface SidebarProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  isMobileOpen?: boolean
  onMobileClose?: () => void
  isMobile?: boolean
}

export function Sidebar({ isCollapsed = false, onToggleCollapse, isMobileOpen = false, onMobileClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname()

  const handleLogout = async () => {
    await api.logout()
    window.location.href = '/login'
  }

  const handleNavClick = () => {
    if (onMobileClose) {
      onMobileClose()
    }
  }

  // On mobile, always show full menu. On desktop, respect collapse state
  const shouldShowCollapsed = !isMobile && isCollapsed

  return (
    <aside className={cn(
      "relative flex h-screen flex-col bg-slate-900 text-white transition-all duration-300",
      shouldShowCollapsed ? "w-20" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-slate-700 px-4">
        {shouldShowCollapsed ? (
          <h1 className="text-xl font-bold">T</h1>
        ) : (
          <h1 className="text-xl font-bold">Tether Admin</h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/admin' && pathname.startsWith(item.href))
          
          const NavItem = (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                shouldShowCollapsed && 'justify-center'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!shouldShowCollapsed && <span>{item.name}</span>}
            </Link>
          )

          // Wrap with tooltip only when collapsed on desktop
          if (shouldShowCollapsed) {
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  {NavItem}
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            )
          }

          return NavItem
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-700 p-4">
        {shouldShowCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
              Logout
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        )}
      </div>

      {/* Toggle Button - Positioned in middle of sidebar edge */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute top-1/2 -right-3 -translate-y-1/2 bg-slate-800 hover:bg-slate-700 text-white rounded-full p-1.5 shadow-lg border border-slate-700 transition-all z-10"
          aria-label={shouldShowCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {shouldShowCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      )}
    </aside>
  )
}