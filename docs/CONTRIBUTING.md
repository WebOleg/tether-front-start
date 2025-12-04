# Contributing Guide

## Development Setup

### Prerequisites

- Node.js 18+
- npm
- Running Laravel backend

### Initial Setup
```bash
# Clone repository
git clone git@github.com:your-org/tether-front.git
cd tether-front

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API URL

# Start development
npm run dev
```

### Running Full Stack

Terminal 1 - Backend:
```bash
cd ../Tether-Laravel
make up
```

Terminal 2 - Frontend:
```bash
npm run dev
```

Open http://localhost:3000

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/add-debtor-search
```

### 2. Make Changes

- Write code following [CODE_STYLE.md](CODE_STYLE.md)
- Test in browser
- Check for TypeScript errors

### 3. Commit Changes

Use conventional commits:
```bash
git add .
git commit -m "feat(debtors): add search functionality"
```

### 4. Push and Create PR
```bash
git push origin feature/add-debtor-search
```

## Adding New Pages

### 1. Create Page File
```bash
mkdir -p src/app/admin/new-page
touch src/app/admin/new-page/page.tsx
```

### 2. Page Template
```tsx
/**
 * New page description.
 */

'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { api } from '@/lib/api'
import type { Resource } from '@/types'

export default function NewPage() {
  const [data, setData] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.getResources()
        setData(response.data)
      } catch (error) {
        console.error('Failed to fetch:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <>
      <Header
        title="New Page"
        description="Description of this page"
      />
      <div className="p-6">
        {loading ? (
          <p>Loading...</p>
        ) : (
          // Content
        )}
      </div>
    </>
  )
}
```

### 3. Add to Sidebar

Edit `src/components/layout/sidebar.tsx`:
```tsx
const navigation = [
  // ... existing items
  { name: 'New Page', href: '/admin/new-page', icon: IconName },
]
```

## Adding New Components

### 1. Create Component File
```bash
touch src/components/new-component.tsx
```

### 2. Component Template
```tsx
/**
 * Component description.
 */

'use client'

import { cn } from '@/lib/utils'

interface NewComponentProps {
  title: string
  className?: string
}

export function NewComponent({ title, className }: NewComponentProps) {
  return (
    <div className={cn('base-classes', className)}>
      {title}
    </div>
  )
}
```

### 3. Export Component

If it's a layout component, add to `src/components/layout/index.ts`:
```tsx
export { NewComponent } from './new-component'
```

## Adding shadcn/ui Components
```bash
npx shadcn@latest add component-name
```

Available components: https://ui.shadcn.com/docs/components

## Adding API Methods

### 1. Add Type Definitions

Edit `src/types/index.ts`:
```tsx
export interface NewResource {
  id: number
  name: string
  // ...
}

export interface NewResourceFilters {
  status?: string
  page?: number
  per_page?: number
}
```

### 2. Add API Method

Edit `src/lib/api.ts`:
```tsx
class ApiClient {
  // ... existing methods

  async getNewResources(filters?: NewResourceFilters): Promise<ApiResponse<NewResource[]>> {
    const query = this.buildQuery(filters)
    return this.request<ApiResponse<NewResource[]>>(`/admin/new-resources${query}`)
  }

  async getNewResource(id: number): Promise<NewResource> {
    const response = await this.request<{ data: NewResource }>(`/admin/new-resources/${id}`)
    return response.data
  }
}
```

## Testing Checklist

Before committing:

- [ ] Page loads without errors
- [ ] No TypeScript errors (`npm run lint`)
- [ ] API calls work correctly
- [ ] Loading states display properly
- [ ] Error states handled
- [ ] Responsive on different screen sizes
- [ ] Navigation works correctly

## Common Issues

### API Connection Failed
```
Error: Failed to fetch
```

**Solution**: Ensure Laravel backend is running on port 8000.

### TypeScript Errors
```
Type 'X' is not assignable to type 'Y'
```

**Solution**: Check type definitions in `src/types/index.ts` match API response.

### 401 Unauthorized

**Solution**: Clear localStorage and login again:
```javascript
localStorage.removeItem('auth_token')
```

### Component Not Found
```
Module not found: Can't resolve '@/components/...'
```

**Solution**: Check import path and ensure component is exported.

## Code Review Guidelines

### What Reviewers Check

1. **Functionality**: Does it work as expected?
2. **Types**: Are TypeScript types correct?
3. **Style**: Does it follow code style guide?
4. **Performance**: Any unnecessary re-renders?
5. **Error Handling**: Are errors handled properly?

### PR Description Template
```markdown
## What

Brief description of changes.

## Why

Reason for the changes.

## How

Technical approach taken.

## Testing

How to test the changes.

## Screenshots

If UI changes, include before/after screenshots.
```
