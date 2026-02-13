'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, type StatsFilterParams } from '@/lib/api'
import type { PricePointStats, PricePointDetail, EmpAccount } from '@/types'
import { Loader2, RefreshCw, DollarSign, AlertTriangle, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'

const PERIODS = [
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

type SortKey = 'price_point' | 'total' | 'approved' | 'chargebacks' | 'cb_rate' | 'approved_volume' | 'chargeback_volume'

export default function PricePointsPage() {
  const [data, setData] = useState<PricePointStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')
  const [accountId, setAccountId] = useState<string>('all')
  const [accounts, setAccounts] = useState<EmpAccount[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('cb_rate')
  const [sortDesc, setSortDesc] = useState(true)

  useEffect(() => {
    api.getEmpAccounts().then(setAccounts).catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: StatsFilterParams = { period }
      if (accountId !== 'all') {
        params.emp_account_id = parseInt(accountId)
      }
      const result = await api.getPricePointStats(params)
      setData(result)
    } catch (error) {
      console.error('Failed to fetch price point stats:', error)
      toast.error('Failed to load price point data')
    } finally {
      setLoading(false)
    }
  }, [period, accountId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc)
    } else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  const sortedPoints = data?.price_points
    ? [...data.price_points].sort((a, b) => {
        const aVal = a[sortKey] ?? -1
        const bVal = b[sortKey] ?? -1
        return sortDesc ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1)
      })
    : []

  const formatEur = (value: number) => {
    return '\u20AC' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatNum = (value: number) => {
    return value.toLocaleString('en-US')
  }

  const getCbColor = (rate: number | null, threshold: number) => {
    if (rate === null) return 'text-slate-400'
    if (rate >= threshold) return 'text-red-600 font-semibold'
    if (rate >= threshold * 0.7) return 'text-yellow-600 font-medium'
    return 'text-emerald-600'
  }

  const SortHeader = ({ label, field, className = '' }: { label: string; field: SortKey; className?: string }) => (
    <th
      className={`py-3 px-4 text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-700 select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center gap-1 ${className.includes('text-right') ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? 'text-slate-900' : 'text-slate-300'}`} />
      </div>
    </th>
  )

  const threshold = data?.threshold ?? 25

  return (
    <>
      <Header title="Price Point Analytics" description="Chargeback performance by transaction amount" />
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-end gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Summary Cards */}
          {data && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Total Transactions</p>
                  <p className="text-2xl font-bold text-slate-900">{formatNum(data.totals.total)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Approved</p>
                  <p className="text-2xl font-bold text-slate-900">{formatNum(data.totals.approved)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Chargebacks</p>
                  <p className="text-2xl font-bold text-slate-900">{formatNum(data.totals.chargebacks)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">CB Rate</p>
                  <p className={`text-2xl font-bold ${getCbColor(data.totals.cb_rate, threshold)}`}>
                    {data.totals.cb_rate !== null ? `${data.totals.cb_rate}%` : '\u2014'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Price Points</p>
                  <p className="text-2xl font-bold text-slate-900">{data.price_points.length}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Price Points Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-slate-500" />
                <span>{'CB Rate by Price Point'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : sortedPoints.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No data for selected period</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <SortHeader label="Amount" field="price_point" />
                        <SortHeader label="Total" field="total" className="text-right" />
                        <SortHeader label="Approved" field="approved" className="text-right" />
                        <SortHeader label="Chargebacks" field="chargebacks" className="text-right" />
                        <SortHeader label="CB Rate" field="cb_rate" className="text-right" />
                        <SortHeader label="Approved Vol." field="approved_volume" className="text-right" />
                        <SortHeader label="CB Vol." field="chargeback_volume" className="text-right" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPoints.map((pp) => (
                        <tr key={pp.price_point} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {pp.alert && <AlertTriangle className="h-4 w-4 text-red-500" />}
                              <span className="font-medium text-slate-900">{formatEur(pp.price_point)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700">{formatNum(pp.total)}</td>
                          <td className="py-3 px-4 text-right text-slate-700">{formatNum(pp.approved)}</td>
                          <td className="py-3 px-4 text-right text-slate-700">{formatNum(pp.chargebacks)}</td>
                          <td className={`py-3 px-4 text-right ${getCbColor(pp.cb_rate, threshold)}`}>
                            {pp.cb_rate !== null ? `${pp.cb_rate}%` : '\u2014'}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">{formatEur(pp.approved_volume)}</td>
                          <td className="py-3 px-4 text-right text-slate-500">{formatEur(pp.chargeback_volume)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                        <td className="py-3 px-4 text-slate-900">Total</td>
                        <td className="py-3 px-4 text-right text-slate-900">{data && formatNum(data.totals.total)}</td>
                        <td className="py-3 px-4 text-right text-slate-900">{data && formatNum(data.totals.approved)}</td>
                        <td className="py-3 px-4 text-right text-slate-900">{data && formatNum(data.totals.chargebacks)}</td>
                        <td className={`py-3 px-4 text-right ${data ? getCbColor(data.totals.cb_rate, threshold) : ''}`}>
                          {data?.totals.cb_rate !== null ? `${data?.totals.cb_rate}%` : '\u2014'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700">{data && formatEur(data.totals.approved_volume)}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{data && formatEur(data.totals.chargeback_volume)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
