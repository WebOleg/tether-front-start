/**
 * API client for Tether Laravel backend.
 * Handles authentication, requests, and error handling.
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
} from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    }

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      this.clearToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `API Error: ${response.status}`)
    }

    return response.json()
  }

  // ==========================================================================
  // Auth Endpoints
  // ==========================================================================

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

  // ==========================================================================
  // Dashboard Endpoints
  // ==========================================================================

  async getDashboard(): Promise<DashboardData> {
    const response = await this.request<{ data: DashboardData }>('/admin/dashboard')
    return response.data
  }

  // ==========================================================================
  // Upload Endpoints
  // ==========================================================================

  async uploadFile(file: File): Promise<UploadResult> {
    const token = this.getToken()
    
    const formData = new FormData()
    formData.append('file', file)

    const headers: HeadersInit = {
      'Accept': 'application/json',
    }

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
      return {
        upload: result.data,
        created: 0,
        failed: 0,
        errors: [],
        queued: true,
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Upload failed: ${response.status}`)
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

  async validateUpload(uploadId: number): Promise<{ total: number; valid: number; invalid: number }> {
    const response = await this.request<{ data: { total: number; valid: number; invalid: number } }>(
      `/admin/uploads/${uploadId}/validate`,
      { method: 'POST' }
    )
    return response.data
  }

  async getUploadValidationStats(uploadId: number): Promise<ValidationStats> {
    const response = await this.request<{ data: ValidationStats }>(
      `/admin/uploads/${uploadId}/validation-stats`
    )
    return response.data
  }

  // ==========================================================================
  // Debtor Endpoints
  // ==========================================================================

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

  // ==========================================================================
  // VOP Log Endpoints
  // ==========================================================================

  async getVopLogs(filters?: VopLogFilters): Promise<ApiResponse<VopLog[]>> {
    const query = this.buildQuery(filters)
    return this.request<ApiResponse<VopLog[]>>(`/admin/vop-logs${query}`)
  }

  async getVopLog(id: number): Promise<VopLog> {
    const response = await this.request<{ data: VopLog }>(`/admin/vop-logs/${id}`)
    return response.data
  }

  // ==========================================================================
  // Billing Attempt Endpoints
  // ==========================================================================

  async getBillingAttempts(filters?: BillingAttemptFilters): Promise<ApiResponse<BillingAttempt[]>> {
    const query = this.buildQuery(filters)
    return this.request<ApiResponse<BillingAttempt[]>>(`/admin/billing-attempts${query}`)
  }

  async getBillingAttempt(id: number): Promise<BillingAttempt> {
    const response = await this.request<{ data: BillingAttempt }>(`/admin/billing-attempts/${id}`)
    return response.data
  }
}

export const api = new ApiClient()
export default api
