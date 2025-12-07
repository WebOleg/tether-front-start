/**
 * TypeScript types for Tether Admin Panel.
 * Matches Laravel API responses.
 */

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data: T
  meta?: PaginationMeta
  links?: PaginationLinks
}

export interface PaginationMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
  from: number
  to: number
}

export interface PaginationLinks {
  first: string | null
  last: string | null
  prev: string | null
  next: string | null
}

// ============================================================================
// Upload Types
// ============================================================================

export interface Upload {
  id: number
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  status: UploadStatus
  total_records: number
  processed_records: number
  failed_records: number
  success_rate: number
  processing_started_at: string | null
  processing_completed_at: string | null
  created_at: string
  updated_at: string
  debtors_count?: number
}

export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed'

// ============================================================================
// Debtor Types
// ============================================================================

export interface Debtor {
  id: number
  upload_id: number
  iban_masked: string
  first_name: string
  last_name: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  zip_code: string | null
  city: string | null
  country: string
  amount: number
  currency: string
  status: DebtorStatus
  risk_class: RiskClass | null
  external_reference: string | null
  created_at: string
  updated_at: string
  upload?: Upload
  latest_vop?: VopLog
  latest_billing?: BillingAttempt
  vop_logs?: VopLog[]
  billing_attempts?: BillingAttempt[]
}

export type DebtorStatus = 'pending' | 'processing' | 'recovered' | 'failed'
export type RiskClass = 'low' | 'medium' | 'high'

// ============================================================================
// VOP Log Types
// ============================================================================

export interface VopLog {
  id: number
  debtor_id: number
  upload_id: number
  iban_masked: string
  iban_valid: boolean
  bank_identified: boolean
  bank_name: string | null
  bic: string | null
  country: string
  vop_score: number
  score_label: ScoreLabel
  result: VopResult
  is_positive: boolean
  is_negative: boolean
  created_at: string
  debtor?: Debtor
  upload?: Upload
}

export type VopResult = 'verified' | 'likely_verified' | 'inconclusive' | 'mismatch' | 'rejected'
export type ScoreLabel = 'high' | 'medium' | 'low'

// ============================================================================
// Billing Attempt Types
// ============================================================================

export interface BillingAttempt {
  id: number
  debtor_id: number
  upload_id: number
  transaction_id: string
  unique_id: string | null
  amount: number
  currency: string
  status: BillingStatus
  attempt_number: number
  mid_reference: string | null
  error_code: string | null
  error_message: string | null
  is_approved: boolean
  is_final: boolean
  can_retry: boolean
  processed_at: string | null
  created_at: string
  debtor?: Debtor
  upload?: Upload
}

export type BillingStatus = 'pending' | 'approved' | 'declined' | 'error' | 'voided'

// ============================================================================
// Auth Types
// ============================================================================

export interface User {
  id: number
  name: string
  email: string
  created_at: string
}

export interface LoginResponse {
  token: string
  user: User
}

// ============================================================================
// Filter Types
// ============================================================================

export interface UploadFilters {
  status?: UploadStatus
  page?: number
  per_page?: number
}

export interface DebtorFilters {
  upload_id?: number
  status?: DebtorStatus
  country?: string
  risk_class?: RiskClass
  page?: number
  per_page?: number
}

export interface VopLogFilters {
  upload_id?: number
  debtor_id?: number
  result?: VopResult
  page?: number
  per_page?: number
}

export interface BillingAttemptFilters {
  upload_id?: number
  debtor_id?: number
  status?: BillingStatus
  page?: number
  per_page?: number
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardUploadStats {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  today: number
  this_week: number
}

export interface DashboardDebtorStats {
  total: number
  by_status: {
    pending: number
    processing: number
    recovered: number
    failed: number
  }
  total_amount: number
  recovered_amount: number
  recovery_rate: number
  by_country: Record<string, number>
  valid_iban_rate: number
}

export interface DashboardVopStats {
  total: number
  by_result: {
    verified: number
    likely_verified: number
    inconclusive: number
    mismatch: number
    rejected: number
  }
  verification_rate: number
  average_score: number
  today: number
}

export interface DashboardBillingStats {
  total_attempts: number
  by_status: {
    pending: number
    approved: number
    declined: number
    error: number
    voided: number
  }
  approval_rate: number
  total_approved_amount: number
  today: number
}

export interface DashboardTrend {
  date: string
  uploads: number
  debtors: number
  billing_attempts: number
  successful_payments: number
}

export interface DashboardRecentActivity {
  recent_uploads: Array<{
    id: number
    original_filename: string
    status: string
    total_records: number
    created_at: string
  }>
  recent_billing: Array<{
    id: number
    debtor_id: number
    status: string
    amount: number
    created_at: string
    debtor?: {
      id: number
      first_name: string
      last_name: string
    }
  }>
}

export interface DashboardData {
  uploads: DashboardUploadStats
  debtors: DashboardDebtorStats
  vop: DashboardVopStats
  billing: DashboardBillingStats
  recent_activity: DashboardRecentActivity
  trends: DashboardTrend[]
}
