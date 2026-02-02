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
  X,
  Settings
} from 'lucide-react'
import { api } from '@/lib/api'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useState, useRef, useCallback } from 'react'

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
  { name: 'Descriptors', href: '/admin/billing/descriptors', icon: Settings },
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
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef<number>(0)
  const currentXRef = useRef<number>(0)

  const handleLogout = async () => {
    await api.logout()
    window.location.href = '/login'
  }

  const handleNavClick = () => {
    if (onMobileClose) {
      onMobileClose()
    }
  }

  // Helper to check if a specific nav item is active
  // It returns false if a more specific child item is currently active
  const checkIsActive = (itemHref: string) => {
    // Basic match: exact match OR (prefix match AND not root admin path)
    const isMatch = pathname === itemHref || (itemHref !== '/admin' && pathname.startsWith(itemHref));

    // Child check: Is there another nav item that is a "child" of this one (sub-path)
    // AND is currently matching the path?
    const isChildActive = navigation.some(nav =>
        nav.href !== itemHref &&           // Don't compare against self
        nav.href.startsWith(itemHref) &&   // Is this a sub-path?
        pathname.startsWith(nav.href)      // Is the user currently on this sub-path?
    );

    return isMatch && !isChildActive;
  };

  // Touch/Mouse handlers for swipe gesture
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    startXRef.current = clientX
    currentXRef.current = clientX
    setIsDragging(true)
    setDragOffset(0)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    currentXRef.current = clientX
    const offset = clientX - startXRef.current

    // Only allow dragging to the left (negative offset)
    if (offset <= 0) {
      setDragOffset(offset)
    }
  }, [isDragging])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return

    const offset = currentXRef.current - startXRef.current
    const threshold = -100 // Swipe left threshold

    setIsDragging(false)
    setDragOffset(0)

    // Close sidebar if swiped left beyond threshold
    if (offset < threshold && onMobileClose) {
      onMobileClose()
    }
  }, [isDragging, onMobileClose])

  // On mobile, always show full menu. On desktop, respect collapse state
  const shouldShowCollapsed = !isMobile && isCollapsed

  // Mobile sidebar with overlay
  if (isMobile) {
    return (
        <>
          {/* Overlay backdrop with fade animation */}
          <div
              className={cn(
                  "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
                  isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              onClick={onMobileClose}
          />

          {/* Sliding sidebar with swipe gesture */}
          <aside
              className={cn(
                  "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-white",
                  "transform ease-in-out",
                  // Use different transitions based on dragging state
                  isDragging ? "transition-none" : "transition-transform duration-300",
                  isMobileOpen ? "translate-x-0" : "-translate-x-full"
              )}
              style={{
                // Apply drag offset when dragging
                transform: isMobileOpen
                    ? `translateX(${Math.min(0, dragOffset)}px)`
                    : 'translateX(-100%)'
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseMove={handleTouchMove}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
          >
            {/* Logo with close button */}
            <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
              <h1 className="text-xl font-bold">Tether Admin</h1>
              <button
                  onClick={onMobileClose}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                  aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>          </div>

            {/* Swipe indicator */}
            <div className="px-4 py-2 text-center">
              <div className="w-8 h-1 bg-slate-600 rounded-full mx-auto opacity-50"></div>
              <p className="text-xs text-slate-500 mt-1">Swipe left to close</p>
            </div>

            {/* Navigation with staggered animation */}
            <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
              {navigation.map((item, index) => {
                const isActive = checkIsActive(item.href);

                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={handleNavClick}
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                            'transform',
                            isActive
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1',
                            // Staggered animation on mobile open
                            isMobileOpen
                                ? 'translate-x-0 opacity-100'
                                : '-translate-x-4 opacity-0'
                        )}
                        style={{
                          transitionDelay: isMobileOpen ? `${index * 50}ms` : '0ms'
                        }}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                )
              })}
            </nav>

            {/* Logout */}
            <div className="border-t border-slate-700 p-4">
              <button
                  onClick={handleLogout}
                  className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                      "text-slate-400 transition-all duration-200 hover:bg-slate-800 hover:text-white hover:translate-x-1",
                      isMobileOpen
                          ? 'translate-x-0 opacity-100'
                          : '-translate-x-4 opacity-0'
                  )}
                  style={{
                    transitionDelay: isMobileOpen ? `${navigation.length * 50}ms` : '0ms'
                  }}
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </>
    )
  }

  // Desktop sidebar
  return (
      <aside className={cn(
          "relative flex h-screen flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out",
          shouldShowCollapsed ? "w-20" : "w-64"
      )}>
        {/* Logo with fade transition */}
        <div className="flex h-16 items-center justify-center border-b border-slate-700 px-4 overflow-hidden">
          <h1 className="text-xl font-bold whitespace-nowrap transition-all duration-300">
          <span className={cn(
              "transition-all duration-300",
              shouldShowCollapsed ? "opacity-0" : "opacity-100"
          )}>
            Tether Admin
          </span>
            <span className={cn(
                "transition-all duration-300",
                shouldShowCollapsed ? "opacity-100" : "opacity-0"
            )}>
            T
          </span>
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4 overflow-hidden">
          {navigation.map((item) => {
            const isActive = checkIsActive(item.href);

            const NavItem = (
                <Link
                    key={item.name}
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                        isActive
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                        shouldShowCollapsed && 'justify-center'
                    )}
                >
                  <item.icon className={cn(
                      "group flex items-center h-5 w-5 shrink-0 transition-transform duration-200",
                      !shouldShowCollapsed && !isActive && "group-hover:scale-110"
                  )} />
                  <span className={cn(
                      "whitespace-nowrap transition-all duration-300",
                      shouldShowCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
                  )}>
                {item.name}
              </span>
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
        <div className="border-t border-slate-700 p-4 overflow-hidden">
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
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-slate-800 hover:text-white"
              >
                <LogOut className="h-5 w-5" />
                <span className={cn(
                    "whitespace-nowrap transition-all duration-300",
                    shouldShowCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                )}>
              Logout
            </span>
              </button>
          )}
        </div>

        {/* Toggle Button with rotation animation */}
        {onToggleCollapse && (
            <button
                onClick={onToggleCollapse}
                className="absolute top-1/2 -right-3 -translate-y-1/2 bg-slate-800 hover:bg-slate-700 text-white rounded-full p-1.5 shadow-lg border border-slate-700 transition-all duration-200 hover:scale-110 z-10"
                aria-label={shouldShowCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  shouldShowCollapsed && "rotate-180"
              )} />
            </button>
        )}
      </aside>
  )
}