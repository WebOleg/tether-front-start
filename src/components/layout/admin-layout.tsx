/**
 * Main layout wrapper for admin panel pages.
 */
'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { ChevronRight } from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
      {/* Backdrop Overlay for Mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Toggle Button - Always visible on mobile when closed */}
      {isMobile && !isMobileOpen && (
        <button
          onClick={handleToggleCollapse}
          className="fixed top-1/2 left-0 -translate-y-1/2 bg-slate-800 hover:bg-slate-700 text-white rounded-r-full p-2 shadow-lg border border-slate-700 transition-all z-30"
          aria-label="Open sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobileOpen ? 'fixed' : 'hidden'} 
        lg:block lg:relative
        inset-y-0 left-0 z-50
        transition-transform duration-300
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar 
          isCollapsed={isCollapsed} 
          onToggleCollapse={handleToggleCollapse}
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
          isMobile={isMobile}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}