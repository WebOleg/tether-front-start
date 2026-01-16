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
} from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

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

export interface StatsFilterParams {
  period?: string
  month?: number
  year?: number
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
    const response = await this.request<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    this.setToken(response.token)
    return response
  }

  async logout(): Promise<void> {
    try {
      await this.request('/logout', { method: 'POST' })
    } finally {
      this.clearToken()
    }
  }

  async getUser(): Promise<User> {
    const response = await this.request<{ data: User }>('/user')
    return response.data
  }

  async getDashboard(params?: { month?: number; year?: number }): Promise<DashboardData> {
    const query = this.buildQuery(params)
    const response = await this.request<{ data: DashboardData }>(`/admin/dashboard${query}`)
    return response.data
  }

  async uploadFile(file: File): Promise<UploadResult> {
    const token = this.getToken()
    const formData = new FormData()
    formData.append('file', file)

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

  async getUploadValidationStats(uploadId: number): Promise<ValidationStats> {
    const response = await this.request<{ data: ValidationStats }>(
      `/admin/uploads/${uploadId}/validation-stats`
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
    const query = this.buildQuery({ period: params.period, month: params.month, year: params.year })
    const response = await this.request<{ data: ChargebackStats }>(
      `/admin/stats/chargeback-rates${query}`
    )
    return response.data
  }

  async filterChargebacks(uploadId: number): Promise<{ removed: number }> {
    const response = await this.request<{ data: { removed: number } }>(
      `/admin/uploads/${uploadId}/filter-chargebacks`,
      { method: 'POST' }
    )
    return response.data
  }

  async getChargebackCodeStats(params: StatsFilterParams = {}): Promise<ChargebackCodeStats> {
    const query = this.buildQuery({ period: params.period, month: params.month, year: params.year })
    const response = await this.request<{ data: ChargebackCodeStats }>(
      `/admin/stats/chargeback-codes${query}`
    )
    return response.data
  }

  async getChargebackBankStats(params: StatsFilterParams = {}): Promise<ChargebackBankStats> {
    const query = this.buildQuery({ period: params.period, month: params.month, year: params.year })
    const response = await this.request<{ data: ChargebackBankStats }>(
      `/admin/stats/chargeback-banks${query}`
    )
    return response.data
  }

  async getVopStats(uploadId: number): Promise<VopStats> {
    const response = await this.request<{ data: VopStats }>(
      `/admin/uploads/${uploadId}/vop-stats`
    )
    return response.data
  }

  async verifyVop(uploadId: number, force: boolean = false): Promise<VopVerifyResponse> {
    return this.request<VopVerifyResponse>(
      `/admin/uploads/${uploadId}/verify-vop`,
      { method: 'POST', body: JSON.stringify({ force }) }
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

  async syncToGateway(uploadId: number): Promise<BillingSyncResponse> {
    return this.request<BillingSyncResponse>(
      `/admin/uploads/${uploadId}/sync`,
      { method: 'POST' }
    )
  }

  async getBillingStats(uploadId: number): Promise<BillingStats> {
    const response = await this.request<{ data: BillingStats }>(
      `/admin/uploads/${uploadId}/billing-stats`
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

  // BIC Analytics
  async getBicAnalytics(period: string = '30d'): Promise<BicAnalyticsStats> {
    const response = await this.request<{ data: BicAnalyticsStats }>(
      `/admin/analytics/bic?period=${period}`
    )
    return response.data
  }

  async getBicAnalyticsExport(period: string = '30d'): Promise<Blob> {
    const token = this.getToken()
    const headers: HeadersInit = { 'Accept': 'text/csv' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/admin/analytics/bic/export?period=${period}`, { headers })
    return response.blob()
  }
}

export const api = new ApiClient()
export default api
