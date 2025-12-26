/**
 * Header component for admin panel pages.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { User } from '@/types'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { LogOut, User as UserIcon } from 'lucide-react'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await api.getUser()
        setUser(userData)
      } catch {
        // User not authenticated
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await api.logout()
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="User menu"
                className="flex items-center gap-2 rounded-full p-2 hover:bg-slate-100 border transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 text-slate-50">
                  <UserIcon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-900 hidden sm:inline">
                  {user.name}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-50" align="end">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium text-slate-800">{user.name}</p>
                <p className="text-sm text-slate-800">{user.email}</p>
              </div>
              <DropdownMenuSeparator className="my-2 border-slate-900" />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-slate-800 focus:bg-slate-200 focus:text-slate-950 cursor-pointer mb-1"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
