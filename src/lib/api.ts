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
} from '@/types'

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

// ============================================================================
// API Client Class
// ============================================================================

class ApiClient {
  private token: string | null = null

  /**
   * Set authentication token and persist to localStorage.
   */
  setToken(token: string): void {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  /**
   * Get authentication token from memory or localStorage.
   */
  getToken(): string | null {
    if (this.token) return this.token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
    }
    return this.token
  }

  /**
   * Clear authentication token.
   */
  clearToken(): void {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  /**
   * Check if user is authenticated.
   */
  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  /**
   * Build query string from filters object.
   */
  private buildQuery(params?: Record<string, unknown>): string {
    if (!params) return ''
    const filtered = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    return filtered.length ? `?${filtered.join('&')}` : ''
  }

  /**
   * Make HTTP request to API.
   */
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

    // Handle unauthorized - redirect to login
    if (response.status === 401) {
      this.clearToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }

    // Handle other errors
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `API Error: ${response.status}`)
    }

    return response.json()
  }

  // ==========================================================================
  // Auth Endpoints
  // ==========================================================================

  /**
   * Login user and store token.
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    this.setToken(response.token)
    return response
  }

  /**
   * Logout user and clear token.
   */
  async logout(): Promise<void> {
    try {
      await this.request('/logout', { method: 'POST' })
    } finally {
      this.clearToken()
    }
  }

  /**
   * Get current authenticated user.
   */
  async getUser(): Promise<User> {
    const response = await this.request<{ data: User }>('/user')
    return response.data
  }

  // ==========================================================================
  // Upload Endpoints
  // ==========================================================================

  /**
   * Get paginated list of uploads.
   */
  async getUploads(filters?: UploadFilters): Promise<ApiResponse<Upload[]>> {
    const query = this.buildQuery(filters)
    return this.request<ApiResponse<Upload[]>>(`/admin/uploads${query}`)
  }

  /**
   * Get single upload by ID.
   */
  async getUpload(id: number): Promise<Upload> {
    const response = await this.request<{ data: Upload }>(`/admin/uploads/${id}`)
    return response.data
  }

  // ==========================================================================
  // Debtor Endpoints
  // ==========================================================================

  /**
   * Get paginated list of debtors.
   */
  async getDebtors(filters?: DebtorFilters): Promise<ApiResponse<Debtor[]>> {
    const query = this.buildQuery(filters)
    return this.request<ApiResponse<Debtor[]>>(`/admin/debtors${query}`)
  }

  /**
   * Get single debtor by ID with relations.
   */
  async getDebtor(id: number): Promise<Debtor> {
    const response = await this.request<{ data: Debtor }>(`/admin/debtors/${id}`)
    return response.data
  }

  // ==========================================================================
  // VOP Log Endpoints
  // ==========================================================================

  /**
   * Get paginated list of VOP verification logs.
   */
  async getVopLogs(filters?: VopLogFilters): Promise<ApiResponse<VopLog[]>> {
    const query = this.buildQuery(filters)
    return this.request<ApiResponse<VopLog[]>>(`/admin/vop-logs${query}`)
  }

  /**
   * Get single VOP log by ID.
   */
  async getVopLog(id: number): Promise<VopLog> {
    const response = await this.request<{ data: VopLog }>(`/admin/vop-logs/${id}`)
    return response.data
  }

  // ==========================================================================
  // Billing Attempt Endpoints
  // ==========================================================================

  /**
   * Get paginated list of billing attempts.
   */
  async getBillingAttempts(filters?: BillingAttemptFilters): Promise<ApiResponse<BillingAttempt[]>> {
    const query = this.buildQuery(filters)
    return this.request<ApiResponse<BillingAttempt[]>>(`/admin/billing-attempts${query}`)
  }

  /**
   * Get single billing attempt by ID.
   */
  async getBillingAttempt(id: number): Promise<BillingAttempt> {
    const response = await this.request<{ data: BillingAttempt }>(`/admin/billing-attempts/${id}`)
    return response.data
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const api = new ApiClient()
export default api
