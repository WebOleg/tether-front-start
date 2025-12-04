/**
 * Header component for admin panel pages.
 */

'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { User } from '@/types'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const [user, setUser] = useState<User | null>(null)

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
          <div className="text-sm text-slate-600">
            <span className="font-medium">{user.name}</span>
          </div>
        )}
      </div>
    </header>
  )
}
