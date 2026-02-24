'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { api, type StatsFilterParams } from '@/lib/api'
import type { PricePointStats, PricePointDetail, EmpAccount } from '@/types'
import { RefreshCw, AlertTriangle, ArrowUpDown, Hash, CheckCircle, Percent, BarChart2, RotateCcw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

const PERIODS = [
  { value: 'all', label: 'All time' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

type SortKey = 'price_point' | 'total' | 'approved' | 'chargebacks' | 'cb_rate' | 'approved_volume' | 'chargeback_volume'

// Skeleton Card Component
function SkeletonCard() {
  return (
    <Card className="py-2 gap-1">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-24 mb-2" />
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  )
}

// Skeleton Table Row Component
function SkeletonTableRow() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell className="text-right"><div className="flex justify-end"><Skeleton className="h-4 w-12" /></div></TableCell>
      <TableCell className="text-right"><div className="flex justify-end"><Skeleton className="h-4 w-12" /></div></TableCell>
      <TableCell className="text-right"><div className="flex justify-end"><Skeleton className="h-4 w-12" /></div></TableCell>
      <TableCell className="text-right"><div className="flex justify-end"><Skeleton className="h-4 w-14" /></div></TableCell>
      <TableCell className="text-right"><div className="flex justify-end"><Skeleton className="h-4 w-20" /></div></TableCell>
      <TableCell className="text-right"><div className="flex justify-end"><Skeleton className="h-4 w-20" /></div></TableCell>
    </TableRow>
  )
}

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
    <TableHead
      className={`cursor-pointer select-none hover:text-slate-700 ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center gap-1 ${className.includes('text-right') ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? 'text-slate-900' : 'text-slate-300'}`} />
      </div>
    </TableHead>
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
            <Button variant="default" size="icon" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Summary Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : data && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Transactions</CardTitle>
                  <div className="rounded-lg p-2 bg-slate-100">
                    <Hash className="h-5 w-5 text-slate-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-slate-700">{formatNum(data.totals.total)}</div>
                  <p className="text-sm text-slate-500 mt-1">All transactions</p>
                </CardContent>
              </Card>
              <Card className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
                  <div className="rounded-lg p-2 bg-emerald-100">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-emerald-600">{formatNum(data.totals.approved)}</div>
                  <p className="text-sm text-slate-500 mt-1">Successful payments</p>
                </CardContent>
              </Card>
              <Card className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Chargebacks</CardTitle>
                  <div className="rounded-lg p-2 bg-red-100">
                    <RotateCcw className="h-5 w-5 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-red-600">{formatNum(data.totals.chargebacks)}</div>
                  <p className="text-sm text-slate-500 mt-1">Disputed transactions</p>
                </CardContent>
              </Card>
              <Card className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">CB Rate</CardTitle>
                  <div className={`rounded-lg p-2 ${data.totals.cb_rate !== null && data.totals.cb_rate >= threshold ? 'bg-red-100' : data.totals.cb_rate !== null && data.totals.cb_rate >= threshold * 0.7 ? 'bg-yellow-100' : 'bg-emerald-100'}`}>
                    <Percent className={`h-5 w-5 ${getCbColor(data.totals.cb_rate, threshold)}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${getCbColor(data.totals.cb_rate, threshold)}`}>
                    {data.totals.cb_rate !== null ? `${data.totals.cb_rate}%` : '\u2014'}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Chargeback ratio</p>
                </CardContent>
              </Card>
              <Card className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Price Points</CardTitle>
                  <div className="rounded-lg p-2 bg-blue-100">
                    <BarChart2 className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-blue-600">{data.price_points.length}</div>
                  <p className="text-sm text-slate-500 mt-1">Distinct amounts</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Price Points Table */}
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader label="Amount" field="price_point" />
                  <SortHeader label="Total" field="total" className="text-right" />
                  <SortHeader label="Approved" field="approved" className="text-right" />
                  <SortHeader label="Chargebacks" field="chargebacks" className="text-right" />
                  <SortHeader label="CB Rate" field="cb_rate" className="text-right" />
                  <SortHeader label="Approved Vol." field="approved_volume" className="text-right" />
                  <SortHeader label="CB Vol." field="chargeback_volume" className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => <SkeletonTableRow key={i} />)
                ) : sortedPoints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No data for selected period.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedPoints.map((pp) => (
                    <TableRow key={pp.price_point}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {pp.alert && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          <span className="font-medium text-slate-900">{formatEur(pp.price_point)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-slate-700">{formatNum(pp.total)}</TableCell>
                      <TableCell className="text-right text-slate-700">{formatNum(pp.approved)}</TableCell>
                      <TableCell className="text-right text-slate-700">{formatNum(pp.chargebacks)}</TableCell>
                      <TableCell className={`text-right ${getCbColor(pp.cb_rate, threshold)}`}>
                        {pp.cb_rate !== null ? `${pp.cb_rate}%` : '\u2014'}
                      </TableCell>
                      <TableCell className="text-right text-slate-500">{formatEur(pp.approved_volume)}</TableCell>
                      <TableCell className="text-right text-slate-500">{formatEur(pp.chargeback_volume)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {!loading && data && (
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold text-slate-900">Total</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">{formatNum(data.totals.total)}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">{formatNum(data.totals.approved)}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">{formatNum(data.totals.chargebacks)}</TableCell>
                    <TableCell className={`text-right font-semibold ${getCbColor(data.totals.cb_rate, threshold)}`}>
                      {data.totals.cb_rate !== null ? `${data.totals.cb_rate}%` : '\u2014'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-700">{formatEur(data.totals.approved_volume)}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-700">{formatEur(data.totals.chargeback_volume)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </div>
      </main>
    </>
  )
}
