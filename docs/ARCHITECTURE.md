# Architecture Overview

## System Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│                    (localhost:3000)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS APPLICATION                         │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pages     │  │ Components  │  │      API Client         │  │
│  │  (app/)     │  │             │  │      (lib/api.ts)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                              │                   │
└──────────────────────────────────────────────│───────────────────┘
                                               │
                                               ▼
                              ┌────────────────────────────────┐
                              │      LARAVEL API               │
                              │    (localhost:8000)            │
                              │                                │
                              │  - Authentication (Sanctum)    │
                              │  - Admin CRUD endpoints        │
                              │  - JSON responses              │
                              └────────────────────────────────┘
```

## Next.js App Router

### How Routing Works

Next.js 14 uses file-based routing. Each `page.tsx` file becomes a route:
```
src/app/
├── page.tsx              → /
├── login/
│   └── page.tsx          → /login
└── admin/
    ├── page.tsx          → /admin
    ├── uploads/
    │   └── page.tsx      → /admin/uploads
    ├── debtors/
    │   └── page.tsx      → /admin/debtors
    ├── vop-logs/
    │   └── page.tsx      → /admin/vop-logs
    └── billing/
        └── page.tsx      → /admin/billing
```

### Layouts

`layout.tsx` files wrap all pages in their directory:
```
src/app/
├── layout.tsx            → Root layout (applies to ALL pages)
└── admin/
    └── layout.tsx        → Admin layout (applies to /admin/*)
```

**Root Layout** (`src/app/layout.tsx`):
- HTML structure
- Global styles
- Metadata

**Admin Layout** (`src/app/admin/layout.tsx`):
- Sidebar navigation
- Header
- Main content area

## Component Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        AdminLayout                               │
│  ┌──────────────┐  ┌─────────────────────────────────────────┐  │
│  │              │  │                                         │  │
│  │   Sidebar    │  │              Main Content               │  │
│  │              │  │  ┌───────────────────────────────────┐  │  │
│  │  - Dashboard │  │  │            Header                 │  │  │
│  │  - Uploads   │  │  │  (title, description, user)       │  │  │
│  │  - Debtors   │  │  └───────────────────────────────────┘  │  │
│  │  - VOP Logs  │  │  ┌───────────────────────────────────┐  │  │
│  │  - Billing   │  │  │                                   │  │  │
│  │              │  │  │         Page Content              │  │  │
│  │  - Logout    │  │  │    (tables, cards, forms)         │  │  │
│  │              │  │  │                                   │  │  │
│  └──────────────┘  │  └───────────────────────────────────┘  │  │
│                    └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Authentication Flow
```
1. User enters credentials on /login
           │
           ▼
2. api.login(email, password)
           │
           ▼
3. POST /api/login → Laravel validates
           │
           ▼
4. Laravel returns { token, user }
           │
           ▼
5. Token stored in localStorage
           │
           ▼
6. Redirect to /admin
           │
           ▼
7. All subsequent requests include:
   Authorization: Bearer {token}
```

### Page Data Loading
```
1. User navigates to /admin/debtors
           │
           ▼
2. DebtorsPage component mounts
           │
           ▼
3. useEffect triggers fetchDebtors()
           │
           ▼
4. api.getDebtors({ status: filter })
           │
           ▼
5. GET /api/admin/debtors?status=pending
           │
           ▼
6. Laravel returns JSON with pagination
           │
           ▼
7. setDebtors(response.data)
           │
           ▼
8. React re-renders table with data
```

## State Management

### Local State (useState)

Each page manages its own state:
```typescript
const [debtors, setDebtors] = useState<Debtor[]>([])
const [loading, setLoading] = useState(true)
const [statusFilter, setStatusFilter] = useState('all')
```

### Token Storage

Authentication token stored in:
- Memory (ApiClient.token)
- localStorage (persistence across refreshes)
```typescript
class ApiClient {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
    localStorage.setItem('auth_token', token)
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token')
    }
    return this.token
  }
}
```

## TypeScript Types

### Type Definitions

All types in `src/types/index.ts`:
```typescript
// API Response wrapper
interface ApiResponse<T> {
  data: T
  meta?: PaginationMeta
}

// Domain models match Laravel API
interface Upload {
  id: number
  filename: string
  status: UploadStatus
  // ...
}

interface Debtor {
  id: number
  iban_masked: string
  full_name: string
  // ...
}
```

### Type Safety Flow
```
Laravel Model → API Resource → JSON → TypeScript Interface → Component
     │              │           │              │                │
  Debtor.php → DebtorResource → { } →     Debtor         → DebtorsPage
```

## UI Components

### shadcn/ui Components

Pre-built, customizable components:

| Component | File | Usage |
|-----------|------|-------|
| Button | `ui/button.tsx` | Actions, forms |
| Card | `ui/card.tsx` | Dashboard stats |
| Table | `ui/table.tsx` | Data tables |
| Badge | `ui/badge.tsx` | Status indicators |
| Input | `ui/input.tsx` | Form inputs |
| Select | `ui/select.tsx` | Filters |

### Component Composition
```tsx
// Page uses layout components
<>
  <Header title="Debtors" description="..." />
  <div className="p-6">
    {/* Filters */}
    <Select value={filter} onChange={setFilter}>
      <SelectItem value="pending">Pending</SelectItem>
    </Select>
    
    {/* Data table */}
    <Table>
      <TableHeader>...</TableHeader>
      <TableBody>
        {debtors.map(d => <TableRow>...</TableRow>)}
      </TableBody>
    </Table>
  </div>
</>
```

## Styling

### Tailwind CSS

Utility-first CSS framework:
```tsx
<div className="flex h-screen bg-slate-100">
  <aside className="w-64 bg-slate-900 text-white">
    {/* Sidebar */}
  </aside>
  <main className="flex-1 overflow-auto">
    {/* Content */}
  </main>
</div>
```

### Color Palette

| Color | Usage |
|-------|-------|
| `slate-900` | Sidebar background |
| `slate-100` | Page background |
| `white` | Cards, tables |
| `blue-600` | Links, primary actions |
| `green-600` | Success status |
| `yellow-600` | Warning/pending status |
| `red-600` | Error/failed status |

## Error Handling

### API Errors
```typescript
private async request<T>(endpoint: string): Promise<T> {
  const response = await fetch(...)
  
  // 401 → Redirect to login
  if (response.status === 401) {
    this.clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  
  // Other errors
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }
  
  return response.json()
}
```

### Component Error Handling
```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await api.getDebtors()
      setDebtors(response.data)
    } catch (error) {
      console.error('Failed to fetch:', error)
      // Could show toast notification
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [])
```
