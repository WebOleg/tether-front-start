/**
 * Main layout wrapper for admin panel pages.
 */
'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { Menu } from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMenuButton, setShowMenuButton] = useState(false)

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile menu when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsMobileOpen(false)
      setShowMenuButton(false)
    } else {
      // Show menu button after a delay when on mobile
      const timer = setTimeout(() => setShowMenuButton(true), 100)
      return () => clearTimeout(timer)
    }
  }, [isMobile])

  // Load collapse state from localStorage (desktop only)
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  const handleToggleCollapse = () => {
    // On mobile: toggle overlay open/close
    if (isMobile) {
      setIsMobileOpen(prev => !prev)
    } else {
      // On desktop: toggle collapse state
      setIsCollapsed(prev => {
        const newValue = !prev
        localStorage.setItem('sidebar-collapsed', String(newValue))
        return newValue
      })
    }
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sliding Menu Button - Only visible on mobile when menu is closed */}
      {isMobile && !isMobileOpen && (
        <button
          onClick={handleToggleCollapse}
          className={`
            fixed top-1/2 -translate-y-1/2 z-30
            bg-slate-800 hover:bg-slate-700 text-white 
            shadow-lg
            transition-all duration-300 ease-out
            ${showMenuButton ? 'left-0' : '-left-12'}
            rounded-r-full p-2
            group overflow-hidden
          `}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5 transition-transform group-hover:scale-110" />
        </button>
      )}

      {/* Edge swipe area for opening menu */}
      {isMobile && !isMobileOpen && (
        <div
          className="fixed left-0 top-0 bottom-0 w-4 z-20"
          onTouchStart={(e) => {
            const touch = e.touches[0]
            if (touch.clientX <= 20) { // Only if touch starts near edge
              handleToggleCollapse()
            }
          }}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}