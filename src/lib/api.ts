/**
 * API client for Tether Laravel backend.
 */
import type {
  ApiResponse,
  Upload,
  Debtor,
  VopLog,
  BillingAttempt,
  LoginResponse,
  User,
  UploadFilters,
  DebtorFilters,
  VopLogFilters,
  BillingAttemptFilters,
  DashboardData,
  UploadResult,
  UploadError,
  ValidationStats,
  DebtorUpdateData,
  SkippedCounts,
  ChargebackStats,
  ChargebackCodeStats,
  ChargebackBankStats,
  VopStats,
  VopVerifyResponse,
  VopSingleVerifyRequest,
  VopSingleVerifyResponse,
  UploadDelete,
  BillingSyncResponse,
  BillingStats,
  BillingRetryResponse,
  ChargebackCodes,
  Chargebacks,
  BicAnalyticsStats,
  EmpAccount,
  EmpAccountStats,
  BavCredits,
  BavStats,
  BavStartResponse,
  BavStatusResponse,
} from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export interface DescriptorParams {
  descriptor_name: string
  descriptor_city: string
  descriptor_country: string
  is_default: boolean
  month?: number
  year?: number
}

export interface ReconciliationStats {
  eligible: number
  pending: number
  last_reconciled_at: string | null
}

export interface BulkReconciliationResponse {
  message: string
  data: {
    eligible: number
    to_process: number
    queued: boolean
    duplicate?: boolean
    max_age_hours?: number
  }
}

export interface EmpRefreshResponse {
  message: string
  data: {
    job_id: string
    from: string
    to: string
    estimated_pages: number
    queued: boolean
  }
}

export interface EmpRefreshStatusResponse {
  data: {
    is_processing: boolean
    job_id: string | null
    progress: number
    stats: {
      inserted: number
      updated: number
      errors: number
      processed_pages: number
      total_pages: number
    } | null
  }
}

export interface EmpRefreshJobStatusResponse {
  data: {
    job_id: string
    status: 'processing' | 'completed' | 'failed'
    progress: number
    stats: {
      inserted: number
      updated: number
      errors: number
      processed_pages: number
      total_pages: number
    }
    started_at: string
    completed_at: string | null
  }
}

export type DateMode = 'transaction' | 'chargeback'

export interface StatsFilterParams {
  period?: string
  month?: number
  year?: number
  date_mode?: DateMode
  model?: string
  emp_account_id?: number
}

export interface DashboardFilterParams {
  month?: number
  year?: number
  emp_account_id?: number
}

export class ApiError extends Error {
  errors: string[]
  status: number

  constructor(message: string, errors: string[] = [], status: number = 422) {
    super(message)
    this.errors = errors
    this.status = status
    this.name = 'ApiError'
  }
}

export interface DescriptorSchedule {
  id: number
  descriptor: string
  is_default: boolean
  effective_month?: number
  effective_year?: number
  created_at?: string
  updated_at?: string
}

export type DescriptorPayload = {
  descriptor: string
  is_default: boolean
  effective_month?: number
  effective_year?: number
}

export type DebtorType = 'legacy' | 'flywheel' | 'recovery'

export type UploadScopedFilters = {
  debtor_type?: DebtorType
}

export type AnalyticsFilters = {
  model?: string
  emp_account_id?: number
}

// Clean Users Export
export interface CleanUsersStats {
  count: number
  min_days: number
  cutoff_date: string
  streaming_threshold: number
}

export interface CleanUsersExportJob {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message?: string
}

export interface CleanUsersExportStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  processed: number
  limit: number
  min_days: number
  filename?: string
  path?: string
  size?: number
  error?: string
  download_url?: string
  updated_at?: string
}

export interface OrphanCountResponse {
  orphaned_count: number
}

export interface PruneOrphansResponse {
  message: string
  deleted_count: number
}

class ApiClient {
  private token: string | null = null

  setToken(token: string): void {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  getToken(): string | null {
    if (this.token) return this.token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
    }
    return this.token
  }

  clearToken(): void {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  private buildQuery(params?: object): string {
    if (!params) return ''
    const filtered = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    return filtered.length ? `?${filtered.join('&')}` : ''
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    }

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers })

    if (response.status === 401) {
      this.clearToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new ApiError(
          error.message || `API Error: ${response.status}`,
          error.errors || [],
          response.status
      )
    }

    return response.json()
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<any>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (response.token && !response.status) {
      response.status = 'authenticated'
    }

    if (response.status === 'authenticated' && response.token) {
      this.setToken(response.token)
    }

    return response
  }

  async logout(): Promise<void> {
    try {
      await this.request('/logout', { method: 'POST' })
    } finally {
      this.clearToken()
    }
  }

  async getDescriptors(): Promise<any> {
    return this.request('/admin/billing/descriptors')
  }

  async createDescriptor(data: DescriptorParams): Promise<any> {
    return this.request('/admin/billing/descriptors', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateDescriptor(id: number, data: DescriptorParams): Promise<any> {
    return this.request(`/admin/billing/descriptors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteDescriptor(id: number): Promise<void> {
    await this.request(`/admin/billing/descriptors/${id}`, {
      method: 'DELETE',
    })
  }

  async setup2fa(email: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/setup-2fa', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })

    if (response.status === 'authenticated' && response.token) {
      this.setToken(response.token)
    }

    return response
  }

  async verifyOtp(email: string, code: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    })

    if (response.status === 'authenticated' && response.token) {
      this.setToken(response.token)
    }

    return response
  }

  async resendOtp(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async verifyBackupCode(email: string, code: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/verify-backup-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    })

    if (response.status === 'authenticated' && response.token) {
      this.setToken(response.token)
    }

    return response
  }

  async getUser(): Promise<User> {
    const response = await this.request<{ data: User }>('/user')
    return response.data
  }

  async getDashboard(params?: DashboardFilterParams): Promise<DashboardData> {
    const query = this.buildQuery(params)
    const response = await this.request<{ data: DashboardData }>(`/admin/dashboard${query}`)
    return response.data
  }

  async uploadFile(file: File, billingModel: string = 'legacy', empAccountId?: number): Promise<UploadResult> {
    const token = this.getToken()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('billing_model', billingModel)
    if (empAccountId) {
      formData.append('emp_account_id', empAccountId.toString())
    }

    const headers: HeadersInit = { 'Accept': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/admin/uploads`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (response.status === 401) {
      this.clearToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }

    if (response.status === 202) {
      const result = await response.json()
      return { upload: result.data, created: 0, failed: 0, errors: [], queued: true }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new ApiError(
          error.message || `Upload failed: ${response.status}`,
          error.errors || [],
          response.status
      )
    }

    const result = await response.json()
    return {
      upload: result.data,
      created: result.meta?.created ?? result.data.processed_records ?? 0,
      failed: result.meta?.failed ?? result.data.failed_records ?? 0,
      skipped: result.meta?.skipped as SkippedCounts | undefined,
      errors: (result.meta?.errors ?? []) as UploadError[],
      queued: result.meta?.queued ?? false,
    }
  }

  async getUploads(filters?: UploadFilters): Promise<ApiResponse<Upload[]>> {
    const query = this.buildQuery(filters)
    return this.request<ApiResponse<Upload[]>>(`/admin/uploads${query}`)
  }

  async getUpload(id: number): Promise<Upload> {
    const response = await this.request<{ data: Upload }>(`/admin/uploads/${id}`)
    return response.data
  }

  async getUploadDebtors(uploadId: number, filters?: DebtorFilters): Promise<ApiResponse<Debtor[]>> {
    const query = this.buildQuery(filters)
    return this.request<ApiResponse<Debtor[]>>(`/admin/uploads/${uploadId}/debtors${query}`)
  }

  async validateUpload(uploadId: number): Promise<{ message: string; status: string }> {
    const token = this.getToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/admin/uploads/${uploadId}/validate`, {
      method: 'POST',
      headers,
    })

    if (response.status === 401) {
      this.clearToken()
      throw new Error('Unauthorized')
    }

    if (response.status === 202) {
      return response.json()
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new ApiError(
          error.message || `Validation failed: ${response.status}`,
          error.errors || [],
          response.status
      )
    }

    return response.json()
  }

  async getUploadValidationStats(uploadId: number, filters?: UploadScopedFilters): Promise<ValidationStats> {
    const query = this.buildQuery(filters)
    const response = await this.request<{ data: ValidationStats }>(
        `/admin/uploads/${uploadId}/validation-stats${query}`
    )
    return response.data
  }

  async deleteUpload(id: number): Promise<UploadDelete> {
    const response = await this.request<UploadDelete>(
        `/admin/uploads/${id}`,
        { method: 'DELETE' }
    )
    return response
  }

  async getDebtors(filters?: DebtorFilters): Promise<ApiResponse<Debtor[]>> {
    const query = this.buildQuery(filters)
    return this.request<ApiResponse<Debtor[]>>(`/admin/debtors${query}`)
  }

  async getDebtor(id: number): Promise<Debtor> {
    const response = await this.request<{ data: Debtor }>(`/admin/debtors/${id}`)
    return response.data
  }

  async updateDebtor(id: number, data: DebtorUpdateData): Promise<Debtor> {
    const response = await this.request<{ data: Debtor }>(`/admin/debtors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async validateDebtor(id: number): Promise<{ validation_status: string; validation_errors: string[] | null }> {
    const response = await this.request<{ data: { validation_status: string; validation_errors: string[] | null } }>(
        `/admin/debtors/${id}/validate`,
        { method: 'POST' }
    )
    return response.data
  }

  async deleteDebtor(id: number): Promise<void> {
    await this.request(`/admin/debtors/${id}`, { method: 'DELETE' })
  }

  async getOrphanCount(): Promise<OrphanCountResponse> {
    return this.request<OrphanCountResponse>('/admin/debtors/orphans/count')
  }

  async pruneOrphans(): Promise<PruneOrphansResponse> {
    return this.request<PruneOrphansResponse>('/admin/debtors/orphans', {
      method: 'DELETE',
    })
  }

  async getVopLogs(filters?: VopLogFilters): Promise<ApiResponse<VopLog[]>> {
    const query = this.buildQuery(filters)
    return this.request<ApiResponse<VopLog[]>>(`/admin/vop-logs${query}`)
  }

  async getVopLog(id: number): Promise<VopLog> {
    const response = await this.request<{ data: VopLog }>(`/admin/vop-logs/${id}`)
    return response.data
  }

  async getBillingAttempts(filters?: BillingAttemptFilters): Promise<ApiResponse<BillingAttempt[]>> {
    const query = this.buildQuery(filters)
    return this.request<ApiResponse<BillingAttempt[]>>(`/admin/billing-attempts${query}`)
  }

  async getBillingAttempt(id: number): Promise<BillingAttempt> {
    const response = await this.request<{ data: BillingAttempt }>(`/admin/billing-attempts/${id}`)
    return response.data
  }

  async getChargebackStats(params: StatsFilterParams = {}): Promise<ChargebackStats> {
    const query = this.buildQuery({
      period: params.period,
      month: params.month,
      year: params.year,
      date_mode: params.date_mode || 'transaction',
      model: params.model,
      emp_account_id: params.emp_account_id,
    })
    const response = await this.request<{ data: ChargebackStats }>(
        `/admin/stats/chargeback-rates${query}`
    )
    return response.data
  }

  async filterChargebacks(uploadId: number, filters?: UploadScopedFilters): Promise<{ removed: number }> {
    const response = await this.request<{ data: { removed: number } }>(
        `/admin/uploads/${uploadId}/filter-chargebacks`,
        { method: 'POST', body: JSON.stringify(filters || {}) }
    )
    return response.data
  }

  async getChargebackCodeStats(params: StatsFilterParams = {}): Promise<ChargebackCodeStats> {
    const query = this.buildQuery({
      period: params.period,
      month: params.month,
      year: params.year,
      date_mode: params.date_mode || 'transaction',
      model: params.model,
      emp_account_id: params.emp_account_id,
    })
    const response = await this.request<{ data: ChargebackCodeStats }>(
        `/admin/stats/chargeback-codes${query}`
    )
    return response.data
  }

  async getChargebackBankStats(params: StatsFilterParams = {}): Promise<ChargebackBankStats> {
    const query = this.buildQuery({
      period: params.period,
      month: params.month,
      year: params.year,
      date_mode: params.date_mode || 'transaction',
      model: params.model,
      emp_account_id: params.emp_account_id,
    })
    const response = await this.request<{ data: ChargebackBankStats }>(
        `/admin/stats/chargeback-banks${query}`
    )
    return response.data
  }

  async getVopStats(uploadId: number, filters?: UploadScopedFilters): Promise<VopStats> {
    const query = this.buildQuery(filters)
    const response = await this.request<{ data: VopStats }>(
        `/admin/uploads/${uploadId}/vop-stats${query}`
    )
    return response.data
  }

  async verifyVop(
      uploadId: number,
      options?: { force?: boolean; debtor_type?: DebtorType }
  ): Promise<VopVerifyResponse> {
    return this.request<VopVerifyResponse>(
        `/admin/uploads/${uploadId}/verify-vop`,
        {
          method: 'POST',
          body: JSON.stringify({
            force: options?.force ?? false,
            debtor_type: options?.debtor_type,
          }),
        }
    )
  }

  async getUploadVopLogs(uploadId: number): Promise<ApiResponse<VopLog[]>> {
    return this.request<ApiResponse<VopLog[]>>(`/admin/uploads/${uploadId}/vop-logs`)
  }

  async getChargebackCodes(): Promise<ChargebackCodes[]> {
    const response = await this.request<{ data: ChargebackCodes[] }>('/admin/chargebacks/codes')
    return response.data
  }

  async getChargebacks(params?: object): Promise<ApiResponse<Chargebacks[]>> {
    const query = this.buildQuery(params)
    return this.request<ApiResponse<Chargebacks[]>>(`/admin/chargebacks${query}`)
  }

  async verifySingleIban(data: VopSingleVerifyRequest): Promise<VopSingleVerifyResponse> {
    return this.request<VopSingleVerifyResponse>('/admin/vop/verify-single', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async syncToGateway(
      uploadId: number,
      options?: { debtor_type?: DebtorType }
  ): Promise<BillingSyncResponse> {
    return this.request<BillingSyncResponse>(
        `/admin/uploads/${uploadId}/sync`,
        {
          method: 'POST',
          body: JSON.stringify({
            debtor_type: options?.debtor_type,
          }),
        }
    )
  }

  async getBillingStats(uploadId: number, filters?: UploadScopedFilters): Promise<BillingStats> {
    const query = this.buildQuery(filters)
    const response = await this.request<{ data: BillingStats }>(
        `/admin/uploads/${uploadId}/billing-stats${query}`
    )
    return response.data
  }

  async retryBillingAttempt(attemptId: number): Promise<BillingRetryResponse> {
    return this.request<BillingRetryResponse>(
        `/admin/billing-attempts/${attemptId}/retry`,
        { method: 'POST' }
    )
  }

  async getReconciliationStats(): Promise<ReconciliationStats> {
    const response = await this.request<{ data: ReconciliationStats }>(
        '/admin/reconciliation/stats'
    )
    return response.data
  }

  async triggerBulkReconciliation(params?: {
    max_age_hours?: number
    limit?: number
    model?: string
  }): Promise<BulkReconciliationResponse> {
    return this.request<BulkReconciliationResponse>(
        '/admin/reconciliation/bulk',
        {
          method: 'POST',
          body: JSON.stringify(params || {})
        }
    )
  }

  async reconcileBillingAttempt(attemptId: number): Promise<{
    message: string
    data: {
      id: number
      success: boolean
      changed: boolean
      previous_status?: string
      new_status: string
    }
  }> {
    return this.request(
        `/admin/billing-attempts/${attemptId}/reconcile`,
        { method: 'POST' }
    )
  }

  async reconcileUpload(uploadId: number): Promise<{
    message: string
    data: {
      upload_id: number
      eligible: number
      queued: boolean
      duplicate?: boolean
    }
  }> {
    return this.request(
        `/admin/uploads/${uploadId}/reconcile`,
        { method: 'POST' }
    )
  }

  async triggerEmpRefresh(from: string, to: string): Promise<EmpRefreshResponse> {
    return this.request<EmpRefreshResponse>('/admin/emp/refresh', {
      method: 'POST',
      body: JSON.stringify({ from, to }),
    })
  }

  async getEmpRefreshStatus(): Promise<EmpRefreshStatusResponse> {
    return this.request<EmpRefreshStatusResponse>('/admin/emp/refresh/status')
  }

  async getEmpRefreshJobStatus(jobId: string): Promise<EmpRefreshJobStatusResponse> {
    return this.request<EmpRefreshJobStatusResponse>('/admin/emp/refresh/' + jobId)
  }

  async getBicAnalytics(period: string = '30d', filters?: AnalyticsFilters): Promise<BicAnalyticsStats> {
    const query = this.buildQuery({ period, ...filters })
    const response = await this.request<{ data: BicAnalyticsStats }>(
        `/admin/analytics/bic${query}`
    )
    return response.data
  }

  async getBicAnalyticsExport(period: string = '30d', filters?: AnalyticsFilters): Promise<Blob> {
    const token = this.getToken()
    const headers: HeadersInit = { 'Accept': 'text/csv' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const query = this.buildQuery({ period, ...filters })
    const response = await fetch(`${API_BASE_URL}/admin/analytics/bic/export${query}`, { headers })
    return response.blob()
  }

  async getEmpAccounts(): Promise<EmpAccount[]> {
    const response = await this.request<{ success: boolean; data: EmpAccount[] }>('/admin/emp/accounts')
    return response.data
  }

  async getActiveEmpAccount(): Promise<EmpAccount | null> {
    try {
      const response = await this.request<{ success: boolean; data: EmpAccount }>('/admin/emp/accounts/active')
      return response.data
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  async setActiveEmpAccount(accountId: number): Promise<EmpAccount> {
    const response = await this.request<{ success: boolean; data: EmpAccount }>(
        `/admin/emp/accounts/${accountId}/activate`,
        { method: 'POST' }
    )
    return response.data
  }

  async getEmpAccountStats(accountId: number): Promise<EmpAccountStats> {
    const response = await this.request<{ success: boolean; data: EmpAccountStats }>(
        `/admin/emp/accounts/${accountId}/stats`
    )
    return response.data
  }

  async getDescriptorSchedules(): Promise<ApiResponse<DescriptorSchedule[]>> {
    return this.request<ApiResponse<DescriptorSchedule[]>>('/admin/billing/descriptors')
  }

  async createDescriptorSchedule(data: DescriptorPayload): Promise<{ data: DescriptorSchedule }> {
    return this.request<{ data: DescriptorSchedule }>('/admin/billing/descriptors', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateDescriptorSchedule(id: number, data: DescriptorPayload): Promise<{ data: DescriptorSchedule }> {
    return this.request<{ data: DescriptorSchedule }>(`/admin/billing/descriptors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteDescriptorSchedule(id: number): Promise<void> {
    await this.request(`/admin/billing/descriptors/${id}`, { method: 'DELETE' })
  }

  // Clean Users Export
  async getCleanUsersStats(minDays: number = 30): Promise<CleanUsersStats> {
    const response = await this.request<{ data: CleanUsersStats }>(
      `/admin/billing-attempts/clean-users/stats?min_days=${minDays}`
    )
    return response.data
  }

  async exportCleanUsers(limit: number, minDays: number = 30): Promise<Blob | CleanUsersExportJob> {
    const token = this.getToken()
    const headers: HeadersInit = {
      'Accept': 'application/json, text/csv',
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/billing-attempts/clean-users/export?limit=${limit}&min_days=${minDays}`,
      { headers }
    )

    if (response.headers.get('content-type')?.includes('text/csv')) {
      return response.blob()
    }

    const data = await response.json()
    return data.data as CleanUsersExportJob
  }

  async getCleanUsersExportStatus(jobId: string): Promise<CleanUsersExportStatus> {
    const response = await this.request<{ data: CleanUsersExportStatus }>(
      `/admin/billing-attempts/clean-users/export/${jobId}/status`
    )
    return response.data
  }

  async downloadCleanUsersExport(jobId: string): Promise<Blob> {
    const token = this.getToken()
    const headers: HeadersInit = {
      'Accept': 'text/csv, application/octet-stream',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/billing-attempts/clean-users/export/${jobId}/download`,
      { headers }
    )

    if (!response.ok) {
      throw new ApiError('Download failed', [], response.status)
    }

    return response.blob()
  }

  // BAV (Bank Account Verification) Methods
  async getBavBalance(): Promise<BavCredits> {
    const response = await this.request<{ success: boolean; data: BavCredits }>(
      '/admin/bav/balance'
    )
    return response.data
  }

  async getBavStats(uploadId: number): Promise<BavStats> {
    const response = await this.request<{ success: boolean; data: BavStats }>(
      `/admin/uploads/${uploadId}/bav/stats`
    )
    return response.data
  }

  async startBavVerification(uploadId: number, limit: number): Promise<BavStartResponse> {
    return this.request<BavStartResponse>(
      `/admin/uploads/${uploadId}/bav/start`,
      {
        method: 'POST',
        body: JSON.stringify({ limit }),
      }
    )
  }

  async getBavStatus(uploadId: number): Promise<BavStatusResponse> {
    return this.request<BavStatusResponse>(
      `/admin/uploads/${uploadId}/bav/status`
    )
  }

  async cancelBavVerification(uploadId: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/admin/uploads/${uploadId}/bav/cancel`,
      { method: 'POST' }
    )
  }
}

export const api = new ApiClient()
export default api
