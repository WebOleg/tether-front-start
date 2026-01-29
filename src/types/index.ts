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
  bav_excluded_count?: number
  bav_passed_count?: number
  bav_verified_count?: number
  billed_with_emp_count?: number
  chargeback_count?: number
  cb_percentage?: number | null
  cb_amount_percentage?: number | null
  approved_amount?: number
  chargeback_amount?: number
}

export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface UploadDelete {
  success: boolean
  message: string
}

export type VopStatus = 'pending' | 'verified' | 'error'
export type BillingModel = 'legacy' | 'flywheel' | 'recovery'


export interface DebtorProfile {
  id: number
  billing_model: BillingModel
  is_active: boolean
  iban_masked: string
  billing_amount: string
  currency: string
  last_billed_at: string | null
  last_success_at: string | null
  next_bill_at: string | null
  created_at: string
  updated_at: string
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
  vop_status: VopStatus
  vop_match: boolean | null
  vop_verified_at: string | null
  bav_selected: boolean
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
  debtor_profile?: DebtorProfile
}

export type DebtorStatus = 'uploaded' | 'pending' | 'processing' | 'recovered' | 'failed' | 'approved' | 'chargebacked'
export type ValidationStatus = 'pending' | 'valid' | 'invalid'
export type RiskClass = 'low' | 'medium' | 'high'


export interface ModelCounts {
  all: number
  legacy: number
  flywheel: number
  recovery: number
}

export interface ValidationStats {
  total: number
  valid: number
  invalid: number
  pending: number
  blacklisted: number
  chargebacked: number
  ready_for_sync: number
  skipped?: SkippedCounts | null
  model_counts?: ModelCounts
  is_processing: boolean
}
export type NameMatch = 'yes' | 'partial' | 'no' | 'unavailable' | 'error'

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
  name_match: NameMatch | null
  name_match_score: number | null
  bav_verified: boolean
  is_positive: boolean
  is_negative: boolean
  has_name_match: boolean
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

export type LoginStatus = 'authenticated' | 'setup_required' | 'otp_required' | 'rate_limited'

export interface LoginResponse {
  status: LoginStatus
  token?: string
  user?: User
  message?: string
  user_id?: number
  email?: string
  email_masked?: string
  backup_codes?: string[]
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
  debtor_type?: 'legacy' | 'flywheel' | 'recovery'
}

export interface VopLogFilters {
  upload_id?: number
  debtor_id?: number
  result?: VopResult
  bav_verified?: boolean
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
  chargeback_rate: number
  total_approved_amount: number
  total_chargeback_amount: number
  today: number
  average_attempts_per_debtor: number
}

export interface DashboardTrend {
  date: string
  uploads: number
  debtors: number
  billing_attempts: number
  successful_payments: number
  chargebacks: number
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
  cb_rate_total: number | null
  cb_rate_approved: number | null
  alert: boolean
}

export interface CountryChargebackTotals extends Omit<CountryChargebackStats, 'country'> {
  cb_rate_amount_approved: number | null
  cb_alert_amount_approved: boolean
}

export interface ChargebackStats {
  period: string
  start_date: string
  threshold: number
  countries: CountryChargebackStats[]
  totals: CountryChargebackTotals
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
  cb_rate: number | null;
  alert: boolean;
}

export interface ChargebackBankTotal {
  total: number;
  total_amount: number;
  chargebacks: number;
  total_cb_rate: number | null;
  alert: boolean;
}

export interface ChargebackBankStats {
  period: string;
  start_date: string;
  banks: ChargebackBankDetail[];
  totals: ChargebackBankTotal;
}

export type DateMode = 'transaction' | 'chargeback'

// ==========================================================================
// VOP Verification Types
// ==========================================================================

export interface VopStats {
  total_eligible: number
  verified: number
  pending: number
  bav_verified: number
  bav_selected: number
  by_result: Record<string, number>
  by_name_match: Record<string, number>
  avg_score: number
  is_processing: boolean
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

// ==========================================================================
// Billing Sync Types
// ==========================================================================

export interface BillingSyncResponse {
  message: string
  data: {
    upload_id: number
    eligible: number
    queued: boolean
    duplicate?: boolean
  }
}

export interface BillingStats {
  upload_id: number
  is_processing: boolean
  total_attempts: number
  approved: number
  approved_amount: number
  pending: number
  pending_amount: number
  declined: number
  declined_amount: number
  error: number
  error_amount: number
}

export interface BillingRetryResponse {
  message: string
  data: BillingAttempt | {
    id: number
    status: string
    can_retry: boolean
  }
}

export type ChargebackCodes = string

export interface Chargebacks {
  id: number
  error_code: string | null
  error_message: string | null
  amount: number
  currency: string
  bank_name: string | null
  bank_country: string | null
  processed_at: string
  emp_created_at: string
  chargebacked_at: string
  debtor: {
    id: number
    first_name: string
    last_name: string | null
    email: string
    iban_masked: string
  }
}

// ==========================================================================
// BIC Analytics Types
// ==========================================================================

export interface BicAnalyticsDetail {
  bic: string
  bank_country: string
  total_transactions: number
  approved_count: number
  declined_count: number
  chargeback_count: number
  error_count: number
  pending_count: number
  total_volume: number
  approved_volume: number
  chargeback_volume: number
  cb_rate_count: number
  cb_rate_volume: number
  is_high_risk: boolean
}

export interface BicAnalyticsTotals {
  total_bics: number
  high_risk_bics: number
  total_transactions: number
  total_chargebacks: number
  overall_cb_rate: number
  total_volume: number
  chargeback_volume: number
}

export interface BicAnalyticsStats {
  period: string
  start_date: string
  end_date: string
  threshold: number
  bics: BicAnalyticsDetail[]
  totals: BicAnalyticsTotals
}