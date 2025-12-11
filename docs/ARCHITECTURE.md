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
                              │  - Two-Stage Validation        │
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
    │   ├── page.tsx      → /admin/uploads
    │   └── [id]/
    │       └── page.tsx  → /admin/uploads/:id (dynamic route)
    ├── debtors/
    │   └── page.tsx      → /admin/debtors
    ├── vop-logs/
    │   └── page.tsx      → /admin/vop-logs
    └── billing/
        └── page.tsx      → /admin/billing
```

### Dynamic Routes

The `[id]` folder creates a dynamic route segment:
```typescript
// src/app/admin/uploads/[id]/page.tsx
export default function UploadDetailPage({ params }: { params: { id: string } }) {
  const uploadId = params.id  // e.g., "123"
  // ...
}
```

### Layouts

`layout.tsx` files wrap all pages in their directory:
```
src/app/
├── layout.tsx            → Root layout (applies to ALL pages)
└── admin/
    └── layout.tsx        → Admin layout (applies to /admin/*)
```

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

## Two-Stage Validation Flow

### Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                    TWO-STAGE VALIDATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STAGE A (Upload)           STAGE B (Validation)                │
│  ─────────────────          ──────────────────────              │
│  1. User uploads CSV        1. Upload completes                 │
│  2. All rows accepted       2. Frontend auto-triggers           │
│  3. validation_status =        POST /uploads/{id}/validate      │
│     'pending'               3. Backend validates each row       │
│  4. raw_data saved          4. Updates validation_status        │
│  5. headers saved              to 'valid' or 'invalid'          │
│                             5. Frontend polls stats             │
│                             6. Table updates with results       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend Validation Flow
```
1. User uploads CSV file
           │
           ▼
2. POST /api/admin/uploads (file)
           │
           ▼
3. Poll GET /uploads/{id}/status until completed
           │
           ▼
4. Auto-trigger POST /uploads/{id}/validate
           │
           ▼
5. Poll GET /uploads/{id}/validation-stats
           │
           ▼
6. Fetch GET /uploads/{id}/debtors
           │
           ▼
7. Render table with validation results
```

## Upload Detail Page

### Page Structure
```
┌─────────────────────────────────────────────────────────────────┐
│  Upload: client1_test1_ES.xlsx                    [Back button] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│  │  Total  │ │  Valid  │ │ Invalid │ │Blacklist│ │Ready Sync │ │
│  │   150   │ │   120   │ │    25   │ │    5    │ │    115    │ │
│  │  gray   │ │  green  │ │   red   │ │ purple  │ │   blue    │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Row# │ Status  │ IBAN          │ Name    │ Amount │ City  │  │
│  ├──────┼─────────┼───────────────┼─────────┼────────┼───────┤  │
│  │  1   │ ✓ Valid │ ES12****5678  │ Juan    │ 150.00 │ Madrid│  │
│  │  2   │ ✗ Error │ INVALID       │ Pedro   │ -50.00 │       │  │
│  │  3   │ ⚫ Black│ ES99****1234  │ Maria   │ 200.00 │ Bilbao│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Validation Stats Cards

| Card | Color | Data Source |
|------|-------|-------------|
| Total | Gray | `stats.total` |
| Valid | Green | `stats.valid` |
| Invalid | Red | `stats.invalid` |
| Blacklisted | Purple | `stats.blacklisted` |
| Pending | Yellow | `stats.pending` |
| Ready for Sync | Blue | `stats.ready_for_sync` |

### Dynamic Columns

Columns are generated from `upload.headers` array:
```typescript
// upload.headers = ['iban', 'nombre', 'importe', 'ciudad']

const columns = [
  { key: 'row_number', label: 'Row #', sticky: true },
  { key: 'status', label: 'Status', sticky: true },
  ...headers.map(h => ({ key: h, label: h }))
]

// Values from debtor.raw_data
const cellValue = debtor.raw_data[column.key]
```

### Error Row Highlighting
```typescript
// Row styling based on validation_status
const getRowClass = (debtor: Debtor) => {
  if (debtor.validation_status === 'invalid') {
    return 'bg-red-50 hover:bg-red-100'
  }
  if (debtor.validation_errors?.includes('blacklisted')) {
    return 'bg-purple-50 hover:bg-purple-100'
  }
  return 'hover:bg-gray-50'
}
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
// Upload Detail Page state
const [upload, setUpload] = useState<Upload | null>(null)
const [debtors, setDebtors] = useState<Debtor[]>([])
const [stats, setStats] = useState<ValidationStats | null>(null)
const [loading, setLoading] = useState(true)
const [validating, setValidating] = useState(false)
```

### Token Storage

Authentication token stored in:
- Memory (ApiClient.token)
- localStorage (persistence across refreshes)

## TypeScript Types

### Type Definitions

All types in `src/types/index.ts`:
```typescript
interface Upload {
  id: number
  filename: string
  status: UploadStatus
  headers: string[]           // NEW: CSV column names
  total_records: number
}

interface Debtor {
  id: number
  iban_masked: string
  full_name: string
  validation_status: 'pending' | 'valid' | 'invalid'  // NEW
  validation_errors: string[] | null                   // NEW
  raw_data: Record<string, string>                     // NEW
}

interface ValidationStats {    // NEW
  total: number
  valid: number
  invalid: number
  pending: number
  blacklisted: number
  ready_for_sync: number
}
```

## API Client Methods

### Authentication
```typescript
await api.login(email, password)   // POST /login
await api.logout()                 // POST /logout
await api.getUser()                // GET /user
```

### Resources
```typescript
await api.getDashboard()           // GET /admin/dashboard
await api.getUploads(filters)      // GET /admin/uploads
await api.getUpload(id)            // GET /admin/uploads/{id}/status
await api.createUpload(file)       // POST /admin/uploads
await api.getDebtors(filters)      // GET /admin/debtors
await api.getVopLogs(filters)      // GET /admin/vop-logs
await api.getBillingAttempts(f)    // GET /admin/billing-attempts
```

### Validation Endpoints (NEW)
```typescript
await api.validateUpload(id)       // POST /admin/uploads/{id}/validate
await api.getValidationStats(id)   // GET /admin/uploads/{id}/validation-stats
await api.getUploadDebtors(id, {   // GET /admin/uploads/{id}/debtors
  validation_status: 'invalid'
})
```

## UI Components

### shadcn/ui Components

| Component | File | Usage |
|-----------|------|-------|
| Button | `ui/button.tsx` | Actions, forms |
| Card | `ui/card.tsx` | Dashboard stats, validation stats |
| Table | `ui/table.tsx` | Data tables |
| Badge | `ui/badge.tsx` | Status indicators |
| Input | `ui/input.tsx` | Form inputs |
| Select | `ui/select.tsx` | Filters |
| Tooltip | `ui/tooltip.tsx` | Error messages on hover |
| Dialog | `ui/dialog.tsx` | Edit modals |

### Status Badges
```typescript
const getStatusBadge = (status: string) => {
  const variants = {
    pending: 'bg-yellow-100 text-yellow-800',
    valid: 'bg-green-100 text-green-800',
    invalid: 'bg-red-100 text-red-800',
    blacklisted: 'bg-purple-100 text-purple-800',
  }
  return <Badge className={variants[status]}>{status}</Badge>
}
```

## Styling

### Color Palette

| Color | Usage |
|-------|-------|
| `slate-900` | Sidebar background |
| `slate-100` | Page background |
| `white` | Cards, tables |
| `blue-600` | Links, primary actions, Ready for Sync |
| `green-600` | Success status, Valid |
| `yellow-600` | Warning/pending status |
| `red-600` | Error/failed status, Invalid |
| `purple-600` | Blacklisted indicator |

## Error Handling

### API Errors
```typescript
if (response.status === 401) {
  this.clearToken()
  window.location.href = '/login'
  throw new Error('Unauthorized')
}
```

### Component Error Handling
```typescript
try {
  const response = await api.getDebtors()
  setDebtors(response.data)
} catch (error) {
  console.error('Failed to fetch:', error)
  toast.error('Failed to load debtors')
} finally {
  setLoading(false)
}
```
