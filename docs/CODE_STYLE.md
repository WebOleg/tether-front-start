# Code Style Guide

## Overview

This project follows Next.js and React best practices with TypeScript for type safety.

## File Structure

### Page Component
```tsx
/**
 * Brief description of the page.
 */

'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { api } from '@/lib/api'
import type { ModelType } from '@/types'

export default function PageName() {
  // State
  const [data, setData] = useState<ModelType[]>([])
  const [loading, setLoading] = useState(true)

  // Effects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.getData()
        setData(response.data)
      } catch (error) {
        console.error('Failed to fetch:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Render
  return (
    <>
      <Header title="Page Title" />
      <div className="p-6">
        {/* Content */}
      </div>
    </>
  )
}
```

### Component File
```tsx
/**
 * Brief description of the component.
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ComponentProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function ComponentName({ title, description, children }: ComponentProps) {
  return (
    <div className="...">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {children}
    </div>
  )
}
```

## JSDoc Comments

### File Header

Every file must have a brief description:
```tsx
/**
 * Sidebar navigation component for admin panel.
 */

'use client'

import { ... }
```

### Component Documentation

Document complex components:
```tsx
/**
 * Displays debtor information in a table row.
 * Shows masked IBAN, status badge, and amount.
 */
export function DebtorRow({ debtor }: { debtor: Debtor }) {
  // ...
}
```

### Function Documentation

Document non-obvious functions:
```tsx
/**
 * Format bytes to human-readable size.
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
function formatFileSize(bytes: number): string {
  // ...
}
```

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Pages | `page.tsx` | `src/app/admin/page.tsx` |
| Layouts | `layout.tsx` | `src/app/admin/layout.tsx` |
| Components | `kebab-case.tsx` | `admin-layout.tsx` |
| Utilities | `kebab-case.ts` | `api.ts` |
| Types | `index.ts` | `src/types/index.ts` |

### Components

| Type | Convention | Example |
|------|------------|---------|
| Page components | `PascalCase + Page` | `DebtorsPage` |
| Layout components | `PascalCase` | `AdminLayout`, `Sidebar` |
| UI components | `PascalCase` | `Button`, `Card`, `Table` |

### Functions

| Type | Convention | Example |
|------|------------|---------|
| Event handlers | `handle + Event` | `handleClick`, `handleSubmit` |
| Fetch functions | `fetch + Resource` | `fetchDebtors`, `fetchUploads` |
| Format functions | `format + Type` | `formatDate`, `formatCurrency` |
| Boolean getters | `is/has/can` | `isLoading`, `hasError`, `canRetry` |

### Variables
```tsx
// Good
const debtors = await api.getDebtors()
const isLoading = true
const statusFilter = 'pending'

// Bad
const d = await api.getDebtors()
const flag = true
const x = 'pending'
```

### Types
```tsx
// Interfaces for objects
interface Debtor {
  id: number
  name: string
}

// Type aliases for unions/primitives
type DebtorStatus = 'pending' | 'processing' | 'recovered' | 'failed'
type ID = number | string
```

## TypeScript

### Always Define Types
```tsx
// Good
const [debtors, setDebtors] = useState<Debtor[]>([])
const [loading, setLoading] = useState<boolean>(true)

// Bad
const [debtors, setDebtors] = useState([])
const [loading, setLoading] = useState(true)
```

### Use Type Imports
```tsx
// Good
import type { Debtor, Upload } from '@/types'

// Bad
import { Debtor, Upload } from '@/types'
```

### Props Interface
```tsx
// Good - explicit interface
interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  // ...
}

// Bad - inline type
export function Header({ title, description }: { title: string; description?: string }) {
  // ...
}
```

## React Patterns

### Client Components

Mark interactive components with `'use client'`:
```tsx
'use client'

import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### useEffect Best Practices
```tsx
// Good - cleanup and dependencies
useEffect(() => {
  const controller = new AbortController()
  
  const fetchData = async () => {
    try {
      const response = await fetch(url, { signal: controller.signal })
      setData(await response.json())
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error(error)
      }
    }
  }
  
  fetchData()
  
  return () => controller.abort()
}, [url]) // Include all dependencies
```

### Conditional Rendering
```tsx
// Good - early return for loading
if (loading) {
  return <div>Loading...</div>
}

// Good - && for simple conditions
{error && <ErrorMessage message={error} />}

// Good - ternary for if/else
{isLoggedIn ? <Dashboard /> : <Login />}
```

## Styling

### Tailwind CSS Classes
```tsx
// Good - logical grouping
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">

// Bad - random order
<div className="shadow p-4 flex bg-white rounded-lg justify-between items-center">
```

### Class Order Convention

1. Layout (`flex`, `grid`, `block`)
2. Positioning (`absolute`, `relative`)
3. Sizing (`w-`, `h-`, `max-w-`)
4. Spacing (`p-`, `m-`, `gap-`)
5. Typography (`text-`, `font-`)
6. Colors (`bg-`, `text-`, `border-`)
7. Effects (`shadow`, `rounded`, `opacity`)
8. States (`hover:`, `focus:`, `active:`)

### Using cn() for Conditional Classes
```tsx
import { cn } from '@/lib/utils'

<button
  className={cn(
    'px-4 py-2 rounded-lg font-medium',
    isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700',
    disabled && 'opacity-50 cursor-not-allowed'
  )}
>
```

## Imports

### Import Order
```tsx
// 1. React
import { useEffect, useState } from 'react'

// 2. Next.js
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// 3. External libraries
import { format } from 'date-fns'

// 4. Internal - components
import { Header } from '@/components/layout'
import { Button } from '@/components/ui/button'

// 5. Internal - utilities
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

// 6. Types
import type { Debtor } from '@/types'
```

### Path Aliases

Always use `@/` alias:
```tsx
// Good
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

// Bad
import { api } from '../../../lib/api'
import { Button } from '../../components/ui/button'
```

## API Client

### Using the API Client
```tsx
import { api } from '@/lib/api'

// With filters
const response = await api.getDebtors({
  status: 'pending',
  country: 'DE',
  page: 1,
  per_page: 20,
})

// Access data
const debtors = response.data
const total = response.meta?.total
```

### Error Handling
```tsx
try {
  const response = await api.getDebtors()
  setDebtors(response.data)
} catch (error) {
  console.error('Failed to fetch debtors:', error)
  // Show user-friendly error
  setError('Failed to load debtors. Please try again.')
}
```

## Git Commits

### Conventional Commits
```
type(scope): description

feat(debtors): add status filter to debtors page
fix(api): handle 401 redirect properly
docs: update README with new commands
refactor(sidebar): extract navigation items to constant
```

### Commit Types

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting (no code change) |
| `refactor` | Code refactoring |
| `test` | Adding tests |
| `chore` | Maintenance |
