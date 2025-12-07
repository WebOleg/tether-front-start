/**
 * Admin dashboard page.
 * Shows overview statistics for uploads, debtors, VOP and billing.
 */

'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { 
  Upload, 
  Users, 
  ShieldCheck, 
  CreditCard,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import type { DashboardData } from '@/types'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  recovered: 'bg-green-100 text-green-800',
  approved: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  declined: 'bg-red-100 text-red-800',
  error: 'bg-red-100 text-red-800',
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const dashboard = await api.getDashboard()
        setData(dashboard)
      } catch (err) {
        console.error('Failed to fetch dashboard:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <>
        <Header title="Dashboard" description="Overview of your debt recovery operations" />
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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
      title: 'Total Debt',
      value: formatCurrency(data.debtors.total_amount),
      icon: TrendingUp,
      color: 'text-slate-600',
    },
    {
      title: 'Recovered',
      value: formatCurrency(data.debtors.recovered_amount),
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'Approved Payments',
      value: formatCurrency(data.billing.total_approved_amount),
      icon: CreditCard,
      color: 'text-blue-600',
    },
    {
      title: 'Valid IBAN Rate',
      value: `${data.debtors.valid_iban_rate}%`,
      icon: ShieldCheck,
      color: 'text-purple-600',
    },
  ]

  return (
    <>
      <Header title="Dashboard" description="Overview of your debt recovery operations" />
      <div className="p-6 space-y-6">
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
                      {status === 'pending' && <Clock className="h-4 w-4 text-yellow-600" />}
                      {status === 'processing' && <AlertCircle className="h-4 w-4 text-blue-600" />}
                      {status === 'recovered' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {status === 'failed' && <AlertCircle className="h-4 w-4 text-red-600" />}
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
                      {status === 'approved' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {status === 'pending' && <Clock className="h-4 w-4 text-yellow-600" />}
                      {status === 'declined' && <AlertCircle className="h-4 w-4 text-red-600" />}
                      {status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                      {status === 'voided' && <AlertCircle className="h-4 w-4 text-slate-600" />}
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
                        <Badge className={statusColors[upload.status] || 'bg-slate-100'}>
                          {upload.status}
                        </Badge>
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
                          {billing.debtor 
                            ? `${billing.debtor.first_name} ${billing.debtor.last_name}`
                            : `Debtor #${billing.debtor_id}`
                          }
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(billing.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatCurrency(billing.amount)}</span>
                        <Badge className={statusColors[billing.status] || 'bg-slate-100'}>
                          {billing.status}
                        </Badge>
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
