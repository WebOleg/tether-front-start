# Tether Admin Panel

Next.js admin dashboard for the Tether debt recovery platform.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Installation](#installation)
- [Development](#development)
- [Project Structure](#project-structure)
- [Pages](#pages)
- [API Integration](#api-integration)
- [Two-Stage Processing](#two-stage-processing)
- [Contributing](#contributing)

## Overview

Admin panel for managing debt recovery operations:

- **Dashboard**: Overview statistics (uploads, debtors, VOP, billing)
- **Uploads**: CSV file management and processing status
- **Upload Detail**: Dynamic columns, validation stats, error highlighting
- **Debtors**: Debtor records with filtering and search
- **VOP Logs**: IBAN verification results and scores
- **Billing**: Payment attempts and retry status

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14 | React framework (App Router) |
| React | 19 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling |
| shadcn/ui | latest | UI components |
| lucide-react | latest | Icons |
| sonner | latest | Toast notifications |

## Requirements

- Node.js 18+
- npm or pnpm
- Running Laravel backend (port 8000)

## Installation

1. **Clone the repository**
```bash
git clone git@github.com:your-org/tether-front.git
cd tether-front
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env.local
```

4. **Start development server**
```bash
npm run dev
```

5. **Open browser**
```
http://localhost:3000
```

## Development

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

### Environment Variables

Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Running with Backend

Ensure Laravel backend is running:
```bash
cd ../Tether-Laravel
make up
```

Then start frontend:
```bash
npm run dev
```

## Project Structure
```
src/
├── app/                      # Pages (file-based routing)
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page (/)
│   ├── login/
│   │   └── page.tsx          # Login page
│   └── admin/
│       ├── layout.tsx        # Admin layout with sidebar
│       ├── page.tsx          # Dashboard
│       ├── uploads/
│       │   ├── page.tsx      # Uploads list
│       │   └── [id]/
│       │       └── page.tsx  # Upload detail (dynamic columns)
│       ├── debtors/
│       │   └── page.tsx      # Debtors list
│       ├── vop-logs/
│       │   └── page.tsx      # VOP logs list
│       └── billing/
│           └── page.tsx      # Billing attempts
│
├── components/               # Reusable components
│   ├── layout/               # Layout components
│   │   ├── sidebar.tsx       # Navigation sidebar
│   │   ├── header.tsx        # Page header
│   │   ├── admin-layout.tsx  # Admin wrapper
│   │   └── index.ts          # Exports
│   └── ui/                   # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── table.tsx
│       ├── badge.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── tabs.tsx
│       ├── tooltip.tsx
│       └── dialog.tsx
│
├── lib/                      # Utilities
│   ├── api.ts                # API client
│   └── utils.ts              # Helper functions (cn)
│
└── types/                    # TypeScript types
    └── index.ts              # All type definitions
```

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Email/password authentication |
| `/admin` | Dashboard | KPIs: uploads, debtors, VOP, billing |
| `/admin/uploads` | Uploads List | File name, status, records, dates |
| `/admin/uploads/[id]` | Upload Detail | Dynamic columns, validation stats, error rows |
| `/admin/debtors` | Debtors List | With status, country, search filters |
| `/admin/vop-logs` | VOP Logs | IBAN verification results, scores |
| `/admin/billing` | Billing | Payment status, retry info |

## API Integration

### API Client

The `src/lib/api.ts` provides a typed client for Laravel backend:
```typescript
import { api } from '@/lib/api'

// Authentication
await api.login(email, password)
await api.logout()
const user = await api.getUser()

// Upload with skipped info
const result = await api.uploadFile(file)
// result.created, result.failed, result.skipped

// Resources
const uploads = await api.getUploads({ status: 'completed' })
const debtors = await api.getDebtors({ country: 'DE' })
const vopLogs = await api.getVopLogs({ result: 'verified' })
const billing = await api.getBillingAttempts({ status: 'approved' })

// Validation endpoints
await api.validateUpload(id)
const stats = await api.getUploadValidationStats(id)
const debtors = await api.getUploadDebtors(id, { validation_status: 'invalid' })
```

### Authentication

Token-based authentication using Laravel Sanctum:

1. Login stores token in localStorage
2. All API requests include `Authorization: Bearer {token}`
3. 401 responses redirect to `/login`

## Two-Stage Processing

### Stage 1: Upload (Deduplication)

When CSV is uploaded, each IBAN is checked against deduplication rules. Records that match are **skipped** and not created in database.

**Skip Rules:**

| Reason | Block Type | Description |
|--------|------------|-------------|
| `blacklisted` | Permanent | IBAN exists in blacklist table |
| `chargebacked` | Permanent | IBAN has previous chargeback |
| `already_recovered` | Permanent | Debt already recovered for this IBAN |
| `recently_attempted` | 7-day cooldown | Billing attempt within last 7 days |

**UI Feedback:**
- Yellow banner: "30 created, 1 skipped (1 blacklisted)"
- Records column shows: `50 (-3)` indicating 3 skipped

### Stage 2: Validation

After upload, records are validated for data quality. This happens automatically when viewing upload details.

**Validation Rules:**
- IBAN checksum valid
- Amount > 0
- Name present
- Address, City, Postcode present
- No encoding issues (UTF-8)

### Flow Diagram
```
CSV File (100 rows)
       ↓
   [Stage 1: Upload]
       ↓
   Deduplication check
       ↓
   5 skipped (blacklisted, recovered, etc.)
       ↓
   95 records created in DB
       ↓
   [Stage 2: Validation]
       ↓
   85 Valid, 10 Invalid
       ↓
   85 Ready for Sync
```

### Upload Detail Page Features

**Validation Stats Cards:**

| Card | Color | Description |
|------|-------|-------------|
| Valid | Green | validation_status = valid |
| Invalid | Orange | validation_status = invalid |
| Pending | Gray | validation_status = pending |
| Ready for Sync | Blue | valid + debtor status = pending |

**Dynamic Columns:**
- Columns generated from `upload.headers` array
- Values from `debtor.raw_data[column]`
- Actions column with status icon, edit, delete

**Error Row Highlighting:**
- Invalid rows: orange background
- Encoding errors: red background
- Hover shows validation_errors below row

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for development guidelines.

### Commit Convention
```
feat(uploads): add skipped records display
fix(api): handle skipped counts in response
docs: update README with deduplication flow
```
