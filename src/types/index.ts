/**
 * TypeScript types for Tether Admin Panel.
 */

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

export interface PaginationLink {
  url: string | null
  label: string
  page: number | null
  active: boolean
}

export interface PaginationProps {
  meta: PaginationMeta | null
  links: PaginationLinks | null
  paginationLinks: PaginationLink[]
  onPageChange: (page: number) => void
  onPreviousClick?: () => void
  onNextClick?: () => void
}

export interface PaginationMetaProps {
  meta: PaginationMeta | null
  label?: string
  containerClassName?: string
  leftSectionClassName?: string
  rightSectionClassName?: string
  textClassName?: string
}

export interface SkippedCounts {
  total: number
  blacklisted: number
  chargebacked: number
  already_recovered: number
  recently_attempted: number
}

export interface SkippedRow {
  row: number
  iban_masked: string
  reason: SkipReason
  days_ago?: number
  last_status?: string
}

export type SkipReason = 'blacklisted' | 'chargebacked' | 'already_recovered' | 'recently_attempted'

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
  headers: string[] | null
  processing_started_at: string | null
  processing_completed_at: string | null
  created_at: string
  updated_at: string
  debtors_count?: number
  valid_count?: number
  invalid_count?: number
  is_deletable?: boolean
  skipped?: SkippedCounts | null
  skipped_rows?: SkippedRow[] | null
}

export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface UploadDelete {
  success: boolean
  message: string
}

export interface Debtor {
  id: number
  upload_id: number
  iban_masked: string
  iban_valid: boolean
  first_name: string
  last_name: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  street: string | null
  street_number: string | null
  postcode: string | null
  city: string | null
  province: string | null
  country: string
  amount: number
  currency: string
  status: DebtorStatus
  validation_status: ValidationStatus
  validation_errors: string[] | null
  validated_at: string | null
  risk_class: RiskClass | null
  external_reference: string | null
  bank_name: string | null
  bic: string | null
  bank_name_reference: string | null
  bank_country_iso_reference: string | null
  raw_data: Record<string, string> | null
  created_at: string
  updated_at: string
  upload?: Upload
  latest_vop?: VopLog
  latest_billing?: BillingAttempt
}

export type DebtorStatus = 'pending' | 'processing' | 'recovered' | 'failed'
export type ValidationStatus = 'pending' | 'valid' | 'invalid'
export type RiskClass = 'low' | 'medium' | 'high'

export interface ValidationStats {
  total: number
  valid: number
  invalid: number
  pending: number
  blacklisted: number
  chargebacked: number
  ready_for_sync: number
  skipped?: SkippedCounts | null
}

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
}

export type VopResult = 'verified' | 'likely_verified' | 'inconclusive' | 'mismatch' | 'rejected'
export type ScoreLabel = 'high' | 'medium' | 'low'

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
}

export type BillingStatus = 'pending' | 'approved' | 'declined' | 'error' | 'voided' | 'chargebacked'

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

export interface UploadFilters {
  status?: UploadStatus
  page?: number
  per_page?: number
}

export interface DebtorFilters {
  upload_id?: number
  status?: DebtorStatus
  validation_status?: ValidationStatus
  country?: string
  risk_class?: RiskClass
  search?: string
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
  by_status: Record<string, number>
  total_amount: number
  recovered_amount: number
  recovery_rate: number
  by_country: Record<string, number>
  valid_iban_rate: number
}

export interface DashboardVopStats {
  total: number
  by_result: Record<string, number>
  verification_rate: number
  average_score: number
  today: number
}

export interface DashboardBillingStats {
  total_attempts: number
  by_status: Record<string, number>
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

export interface UploadError {
  row: number
  message: string
  data?: Record<string, any>
}

export interface UploadResult {
  upload: Upload
  created: number
  failed: number
  skipped?: SkippedCounts
  errors: UploadError[]
  queued: boolean
}

export interface DebtorUpdateData {
  raw_data?: Record<string, string>
  [key: string]: any
}

export interface CountryChargebackStats {
  country: string
  total: number
  approved: number
  declined: number
  errors: number
  chargebacks: number
  cb_rate_total: number
  cb_rate_approved: number
  alert: boolean
}

export interface ChargebackStats {
  period: string
  start_date: string
  threshold: number
  countries: CountryChargebackStats[]
  totals: Omit<CountryChargebackStats, 'country'>
}

export interface ChargebackCodeDetail {
  chargeback_code: string
  chargeback_reason: string
  total_amount: number
  occurrences: number
}

export interface ChargebackCodeTotal {
  total_amount: number
  occurrences: number
}

export interface ChargebackCodeStats {
  period: string
  start_date: string
  codes: ChargebackCodeDetail[]
  totals: ChargebackCodeTotal
}

export interface ChargebackBankDetail {
  bank_name: string;
  total_amount: number;
  chargebacks: number;
  cb_rate: number;
} 

export interface ChargebackBankTotal {
  total: number;
  total_amount: number;
  chargebacks: number;
  total_cb_rate: number;
}

export interface ChargebackBankStats {
  period: string;
  start_date: string;
  banks: ChargebackBankDetail[];
  totals: ChargebackBankTotal;
}

// ==========================================================================
// VOP Verification Types
// ==========================================================================

export interface VopStats {
  total_eligible: number
  verified: number
  pending: number
  by_result: Record<string, number>
}

export interface VopVerifyResponse {
  message: string
  data: {
    upload_id: number
    force_refresh: boolean
  }
}

export interface VopSingleVerifyRequest {
  iban: string
  name: string
  use_mock?: boolean
}

export interface VopSingleVerifyResponse {
  data: {
    success: boolean
    valid: boolean
    name_match: string
    bic: string | null
    vop_score: number
    vop_result: VopResult
    error: string | null
  }
  meta: {
    mock_mode: boolean
    credits_used: number
  }
}