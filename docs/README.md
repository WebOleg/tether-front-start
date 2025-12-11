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
- [Two-Stage Validation](#two-stage-validation)
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

// Resources
const uploads = await api.getUploads({ status: 'completed' })
const debtors = await api.getDebtors({ country: 'DE' })
const vopLogs = await api.getVopLogs({ result: 'verified' })
const billing = await api.getBillingAttempts({ status: 'approved' })

// Validation endpoints (NEW)
await api.validateUpload(id)
const stats = await api.getValidationStats(id)
const debtors = await api.getUploadDebtors(id, { validation_status: 'invalid' })
```

### Authentication

Token-based authentication using Laravel Sanctum:

1. Login stores token in localStorage
2. All API requests include `Authorization: Bearer {token}`
3. 401 responses redirect to `/login`

## Two-Stage Validation

### Flow Overview
```
Stage A (Upload)          Stage B (Validation)
─────────────────         ──────────────────────
1. User uploads CSV       1. Upload completes
2. All rows accepted      2. Auto-trigger validate
3. status = 'pending'     3. Run validation rules
4. raw_data saved         4. Update statuses
5. headers saved          5. Show results in UI
```

### Upload Detail Page Features

**Validation Stats Cards:**
| Card | Color | Description |
|------|-------|-------------|
| Total | Gray | Total debtors in upload |
| Valid | Green | validation_status = valid |
| Invalid | Red | validation_status = invalid |
| Blacklisted | Purple | IBAN found in blacklist |
| Pending | Yellow | validation_status = pending |
| Ready for Sync | Blue | valid + status=pending |

**Dynamic Columns:**
- Columns generated from `upload.headers` array
- Values from `debtor.raw_data[column]`
- Row # and Status are sticky columns

**Error Row Highlighting:**
- Invalid rows: red background
- Blacklisted rows: purple background
- Hover shows validation_errors tooltip

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for development guidelines.

### Commit Convention
```
feat(uploads): add validation stats cards
fix(api): handle 401 redirect properly
docs: update README with validation flow
```
