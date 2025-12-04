# Tether Admin Panel

Next.js admin dashboard for the Tether debt recovery platform.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Installation](#installation)
- [Development](#development)
- [Project Structure](#project-structure)
- [API Integration](#api-integration)
- [Contributing](#contributing)

## Overview

Admin panel for managing debt recovery operations:

- **Dashboard**: Overview statistics (uploads, debtors, VOP, billing)
- **Uploads**: CSV file management and processing status
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
│       │   └── page.tsx      # Uploads list
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
│       └── tabs.tsx
│
├── lib/                      # Utilities
│   ├── api.ts                # API client
│   └── utils.ts              # Helper functions
│
└── types/                    # TypeScript types
    └── index.ts              # All type definitions
```

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
```

### Authentication

Token-based authentication using Laravel Sanctum:

1. Login stores token in localStorage
2. All API requests include `Authorization: Bearer {token}`
3. 401 response redirects to login page

### Backend Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Authenticate user |
| POST | `/logout` | Revoke token |
| GET | `/user` | Current user |
| GET | `/admin/uploads` | List uploads |
| GET | `/admin/uploads/{id}` | Upload details |
| GET | `/admin/debtors` | List debtors |
| GET | `/admin/debtors/{id}` | Debtor details |
| GET | `/admin/vop-logs` | List VOP logs |
| GET | `/admin/vop-logs/{id}` | VOP log details |
| GET | `/admin/billing-attempts` | List billing attempts |
| GET | `/admin/billing-attempts/{id}` | Billing attempt details |

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Login | `/login` | Authentication form |
| Dashboard | `/admin` | Statistics overview |
| Uploads | `/admin/uploads` | File list with status |
| Debtors | `/admin/debtors` | Debtor table with filters |
| VOP Logs | `/admin/vop-logs` | Verification results |
| Billing | `/admin/billing` | Payment attempts |

## Contributing

Please read [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for:

- Code style guidelines
- Git workflow
- Pull request process

## License

Proprietary - All rights reserved.
