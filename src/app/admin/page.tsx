/**
 * Admin dashboard page.
 * Shows overview statistics for uploads, debtors, VOP and billing.
 */

'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { Upload, Users, ShieldCheck, CreditCard } from 'lucide-react'

interface DashboardStats {
  uploads: number
  debtors: number
  vopLogs: number
  billingAttempts: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    uploads: 0,
    debtors: 0,
    vopLogs: 0,
    billingAttempts: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [uploads, debtors, vopLogs, billing] = await Promise.all([
          api.getUploads({ per_page: 1 }),
          api.getDebtors({ per_page: 1 }),
          api.getVopLogs({ per_page: 1 }),
          api.getBillingAttempts({ per_page: 1 }),
        ])

        setStats({
          uploads: uploads.meta?.total || 0,
          debtors: debtors.meta?.total || 0,
          vopLogs: vopLogs.meta?.total || 0,
          billingAttempts: billing.meta?.total || 0,
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const cards = [
    {
      title: 'Total Uploads',
      value: stats.uploads,
      icon: Upload,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Total Debtors',
      value: stats.debtors,
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'VOP Verifications',
      value: stats.vopLogs,
      icon: ShieldCheck,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      title: 'Billing Attempts',
      value: stats.billingAttempts,
      icon: CreditCard,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
  ]

  return (
    <>
      <Header
        title="Dashboard"
        description="Overview of your debt recovery operations"
      />
      <div className="p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
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
                <div className="text-3xl font-bold">
                  {loading ? '...' : stats[card.title.toLowerCase().replace(' ', '') as keyof DashboardStats] || card.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
