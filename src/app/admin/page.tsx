/**
 * Admin dashboard page.
 * Shows overview statistics for uploads, debtors, VOP and billing.
 */
'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import {
  Upload,
  Users,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Building2,
} from 'lucide-react'
import type { DashboardData, EmpAccount } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/badges'

const statusIcons: Record<string, React.ReactNode> = {
  approved: <CheckCircle className="h-4 w-4 text-green-600" />,
  pending: <Clock className="h-4 w-4 text-yellow-600" />,
  declined: <XCircle className="h-4 w-4 text-red-600" />,
  error: <AlertCircle className="h-4 w-4 text-red-600" />,
  voided: <AlertCircle className="h-4 w-4 text-slate-600" />,
  chargebacked: <AlertTriangle className="h-4 w-4 text-orange-600" />,
  processing: <AlertCircle className="h-4 w-4 text-blue-600" />,
  recovered: <CheckCircle className="h-4 w-4 text-green-600" />,
  failed: <AlertCircle className="h-4 w-4 text-red-600" />,
}

// Generate months from November 2025 to current date
function generateMonthOptions() {
  const options: { value: string; label: string; month: number; year: number }[] = []
  const startDate = new Date(2025, 10, 1) // November 2025 (month is 0-indexed)
  const endDate = new Date()

  let current = new Date(startDate)
  while (current <= endDate) {
    const month = current.getMonth() + 1
    const year = current.getFullYear()
    const label = current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    options.push({ value: `${year}-${month}`, label, month, year })
    current.setMonth(current.getMonth() + 1)
  }

  return options.reverse() // Most recent first
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [empAccounts, setEmpAccounts] = useState<EmpAccount[]>([])
  const [selectedEmpAccountId, setSelectedEmpAccountId] = useState<string>('all')
  const monthOptions = generateMonthOptions()

  useEffect(() => {
    const fetchEmpAccounts = async () => {
      try {
        const accounts = await api.getEmpAccounts()
        setEmpAccounts(accounts)
      } catch (err) {
        console.error('Failed to fetch EMP accounts:', err)
      }
    }
    fetchEmpAccounts()
  }, [])

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true)
      try {
        const params: { month?: number; year?: number; emp_account_id?: number } = {}

        if (selectedPeriod !== 'all') {
          const [year, month] = selectedPeriod.split('-').map(Number)
          params.month = month
          params.year = year
        }

        if (selectedEmpAccountId !== 'all') {
          params.emp_account_id = Number(selectedEmpAccountId)
        }

        const dashboard = await api.getDashboard(params)
        setData(dashboard)
      } catch (err) {
        console.error('Failed to fetch dashboard:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [selectedPeriod, selectedEmpAccountId])

  if (loading) {
    return (
      <>
        <Header title="Dashboard" description="Overview of your debt recovery operations" />
        
        <div className="relative min-h-screen">
          {/* Fixed Overlay Loading Indicator - Always centered in viewport */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-3 border border-slate-200 pointer-events-auto">
              <div className="h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-md text-slate-700">Loading dashboard data...</span>
            </div>
          </div>

          {/* Blurred Background Overlay - Only over content */}
          <div className="absolute inset-0 bg-black/1 backdrop-blur-[2px] pointer-events-none"></div>

          {/* Skeleton Content in Background */}
          <div className="p-6 space-y-6">
            {/* Filters - Skeleton */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
                <div className="h-10 w-[200px] bg-slate-200 rounded-md animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-10 w-[200px] bg-slate-200 rounded-md animate-pulse" />
              </div>
            </div>

            {/* KPI Cards - Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                    <div className="h-9 w-9 bg-slate-200 rounded-lg animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-9 w-20 bg-slate-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Financial Overview - Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: `${i * 0.1}s` }} />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 bg-slate-200 rounded animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                        <div className="h-6 w-28 bg-slate-200 rounded animate-pulse" />
                        <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Status Breakdown - Skeleton */}
            <div className="grid gap-6 md:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: `${i * 0.15}s` }} />
                  <CardHeader>
                    <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[...Array(5)].map((_, j) => (
                        <div key={j} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 bg-slate-200 rounded-full animate-pulse" />
                            <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
                          </div>
                          <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Activity - Skeleton */}
            <div className="grid gap-6 md:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: `${i * 0.2}s` }} />
                  <CardHeader>
                    <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-4 w-full max-w-[200px] bg-slate-200 rounded animate-pulse" />
                            <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                            <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes shimmer {
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header title="Dashboard" description="Overview of your debt recovery operations" />
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center text-red-600">
              {error || 'Failed to load data'}
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const kpiCards = [
    {
      title: 'Total Uploads',
      value: data.uploads.total,
      subtitle: `${data.uploads.today} today`,
      icon: Upload,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Total Debtors',
      value: data.debtors.total,
      subtitle: `${data.debtors.recovery_rate}% recovery rate`,
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'VOP Verifications',
      value: data.vop.total,
      subtitle: `${data.vop.verification_rate}% verified`,
      icon: ShieldCheck,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      title: 'Billing Attempts',
      value: data.billing.total_attempts,
      subtitle: `${data.billing.approval_rate}% approved`,
      icon: CreditCard,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
  ]

  const financialCards = [
    {
      title: 'Total Billed (EMP)',
      value: formatCurrency(data.debtors.total_amount, 'EUR'),
      icon: TrendingUp,
      color: 'text-slate-600',
    },
    {
      title: 'Net Recovered',
      value: formatCurrency(data.debtors.recovered_amount, 'EUR'),
      subtitle: `${data.debtors.recovery_rate}% recovery rate`,
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'Approved Payments',
      value: formatCurrency(data.billing.total_approved_amount, 'EUR'),
      icon: CreditCard,
      color: 'text-blue-600',
    },
    {
      title: 'Chargebacks',
      value: formatCurrency(data.billing.total_chargeback_amount || 0, 'EUR'),
      subtitle: `${data.billing.chargeback_rate || 0}% rate`,
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
  ]

  return (
    <>
      <Header title="Dashboard" description="Overview of your debt recovery operations" />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="month-filter" className="text-sm font-medium text-slate-700">
              Month:
            </label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[200px]" id="month-filter">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="emp-account-filter" className="text-sm font-medium text-slate-700">
              EMP Account:
            </label>
            <Select value={selectedEmpAccountId} onValueChange={setSelectedEmpAccountId}>
              <SelectTrigger className="w-[200px]" id="emp-account-filter">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <span>All Accounts</span>
                  </div>
                </SelectItem>
                {empAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                      <span>{account.name}</span>
                      {account.is_active && (
                        <Badge variant="outline" className="ml-1 text-xs">Active</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value.toLocaleString()}</div>
                <p className="text-sm text-slate-500 mt-1">{card.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Financial Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {financialCards.map((card) => (
            <Card key={card.title}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                  <div>
                    <p className="text-sm text-slate-500">{card.title}</p>
                    <p className="text-xl font-semibold">{card.value}</p>
                    {'subtitle' in card && card.subtitle && (
                      <p className="text-xs text-slate-400">{card.subtitle}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Status Breakdown */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Debtors by Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Debtors by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.debtors.by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusIcons[status] || <AlertCircle className="h-4 w-4 text-slate-600" />}
                      <span className="capitalize">{status}</span>
                    </div>
                    <span className="font-semibold">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Billing by Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Billing by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.billing.by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusIcons[status] || <AlertCircle className="h-4 w-4 text-slate-600" />}
                      <span className="capitalize">{status}</span>
                    </div>
                    <span className="font-semibold">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Uploads */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recent_activity.recent_uploads.length === 0 ? (
                <p className="text-slate-500 text-sm">No recent uploads</p>
              ) : (
                <div className="space-y-3">
                  {data.recent_activity.recent_uploads.map((upload) => (
                    <div key={upload.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{upload.original_filename}</p>
                        <p className="text-xs text-slate-500">{formatDate(upload.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">{upload.total_records} rows</span>
                        <StatusBadge status={upload.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Billing</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recent_activity.recent_billing.length === 0 ? (
                <p className="text-slate-500 text-sm">No recent billing attempts</p>
              ) : (
                <div className="space-y-3">
                  {data.recent_activity.recent_billing.map((billing) => (
                    <div key={billing.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {(billing as any).debtor 
                            ? `${(billing as any).debtor.first_name} ${(billing as any).debtor.last_name}`
                            : `Transaction #${billing.id}`
                          }
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(billing.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatCurrency(billing.amount, 'EUR')}</span>
                        <StatusBadge status={billing.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
