/**
 * Analytics page - Chargeback ratios, Gateway Sync, EMP Refresh
 */
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { 
  RefreshCw,
  AlertTriangle,
  Download,
  BarChart3,
  PieChart,
  Building2,
  CheckCircle,
  Search,
  Loader2,
} from 'lucide-react'
import type { ChargebackStats, ChargebackCodeStats, ChargebackBankStats } from '@/types'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { getChargebackRule } from '@/lib/chargebacks'

interface EmpRefreshStats {
  inserted: number
  updated: number
  unchanged?: number
  errors: number
  processed_pages?: number
  total_pages?: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0.00%'
  return `${value.toFixed(2)}%`
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
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

export default function AnalyticsPage() {
  const [cbStats, setCbStats] = useState<ChargebackStats | null>(null)
  const [cbCodeStats, setCbCodeStats] = useState<ChargebackCodeStats | null>(null)
  const [cbBankStats, setCbBankStats] = useState<ChargebackBankStats | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('7d')
  const [loading, setLoading] = useState(true)
  
  const monthOptions = useMemo(() => generateMonthOptions(), [])
  
  // Bank search state
  const [bankSearchQuery, setBankSearchQuery] = useState('')
  
  const filteredBankStats = bankSearchQuery.trim()
    ? {
        ...cbBankStats,
        banks: cbBankStats?.banks.filter(bank => 
          bank.bank_name.toLowerCase().includes(bankSearchQuery.toLowerCase())
        ) || []
      }
    : cbBankStats
  
  // Reconciliation state
  const [reconciling, setReconciling] = useState(false)
  const [reconcileResult, setReconcileResult] = useState<{ message: string; success: boolean } | null>(null)

  // EMP Refresh state
  const [empRefreshing, setEmpRefreshing] = useState(false)
  const [empJobId, setEmpJobId] = useState<string | null>(null)
  const [empProgress, setEmpProgress] = useState(0)
  const [empStats, setEmpStats] = useState<EmpRefreshStats | null>(null)
  const [empResult, setEmpResult] = useState<{ message: string; success: boolean } | null>(null)
  const [empFromDate, setEmpFromDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return formatDate(date)
  })
  const [empToDate, setEmpToDate] = useState(() => formatDate(new Date()))

  // Parse selected period into API params
  const getFilterParams = useCallback(() => {
    if (selectedPeriod === 'all') {
      return {}
    }
    if (['24h', '7d', '30d', '90d'].includes(selectedPeriod)) {
      return { period: selectedPeriod }
    }
    // Monthly format: "2025-12"
    const [year, month] = selectedPeriod.split('-').map(Number)
    return { month, year }
  }, [selectedPeriod])

  useEffect(() => {
    const fetchChargebackStats = async () => {
      setLoading(true)
      try {
        const params = getFilterParams()
        const [stats, codeStats, bankStats] = await Promise.all([
          api.getChargebackStats(params),
          api.getChargebackCodeStats(params),
          api.getChargebackBankStats(params),
        ])
        setCbStats(stats)
        setCbCodeStats(codeStats)
        setCbBankStats(bankStats)
      } catch (err) {
        toast.error('Failed to load chargeback statistics')
        console.error('Failed to fetch chargeback stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchChargebackStats()
  }, [selectedPeriod, getFilterParams])

  // Check for existing EMP refresh job on mount
  useEffect(() => {
    const checkExistingJob = async () => {
      try {
        const status = await api.getEmpRefreshStatus()
        if (status.data.is_processing && status.data.job_id) {
          setEmpRefreshing(true)
          setEmpJobId(status.data.job_id)
          setEmpProgress(status.data.progress)
          setEmpStats(status.data.stats as EmpRefreshStats)
        }
      } catch (err) {
        console.error('Failed to check EMP refresh status:', err)
      }
    }
    checkExistingJob()
  }, [])

  // Poll for EMP refresh progress
  const pollEmpProgress = useCallback(async (jobId: string) => {
    try {
      const status = await api.getEmpRefreshJobStatus(jobId)
      setEmpProgress(status.data.progress)
      const stats = status.data.stats as EmpRefreshStats
      setEmpStats(stats)

      if (status.data.status === 'completed') {
        setEmpRefreshing(false)
        setEmpJobId(null)
        const parts = []
        if (stats.inserted > 0) parts.push(`${stats.inserted} new`)
        if (stats.updated > 0) parts.push(`${stats.updated} updated`)
        if (stats.unchanged && stats.unchanged > 0) parts.push(`${stats.unchanged} unchanged`)
        setEmpResult({
          message: `Completed! ${parts.join(', ') || 'No changes'}`,
          success: true
        })
      } else if (status.data.status === 'failed') {
        setEmpRefreshing(false)
        setEmpJobId(null)
        setEmpResult({
          message: `Failed with ${stats.errors} errors`,
          success: false
        })
      }

      return status.data.status
    } catch (err) {
      console.error('Failed to poll EMP refresh status:', err)
      return 'error'
    }
  }, [])

  useEffect(() => {
    if (!empRefreshing || !empJobId) return

    const interval = setInterval(async () => {
      const status = await pollEmpProgress(empJobId)
      if (status === 'completed' || status === 'failed' || status === 'error') {
        clearInterval(interval)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [empRefreshing, empJobId, pollEmpProgress])

  const handleReconcile = async () => {
    setReconciling(true)
    setReconcileResult(null)
    try {
      const result = await api.triggerBulkReconciliation({
        max_age_hours: 720,
        limit: 5000,
      })
      
      if (result.data.queued) {
        setReconcileResult({
          message: `Queued ${result.data.to_process} transactions for reconciliation`,
          success: true
        })
      } else if (result.data.duplicate) {
        setReconcileResult({
          message: 'Bulk reconciliation already in progress',
          success: false
        })
      } else {
        setReconcileResult({
          message: 'No eligible billing attempts to reconcile',
          success: false
        })
      }
    } catch (err) {
      console.error('Reconciliation failed:', err)
      setReconcileResult({
        message: 'Reconciliation failed',
        success: false
      })
    } finally {
      setReconciling(false)
    }
  }

  const handleEmpRefresh = async () => {
    setEmpRefreshing(true)
    setEmpResult(null)
    setEmpProgress(0)
    setEmpStats(null)

    try {
      const result = await api.triggerEmpRefresh(empFromDate, empToDate)
      
      if (result.data.queued) {
        setEmpJobId(result.data.job_id)
        setEmpResult({
          message: `Started refresh for ${result.data.estimated_pages} pages`,
          success: true
        })
      } else {
        setEmpRefreshing(false)
        setEmpResult({
          message: 'Failed to start refresh',
          success: false
        })
      }
    } catch (err: any) {
      console.error('EMP refresh failed:', err)
      setEmpRefreshing(false)
      setEmpResult({
        message: err.message || 'EMP refresh failed',
        success: false
      })
    }
  }

  const hasAlert = cbStats?.countries?.some(c => c.alert) || false
  const totalCbRateApproved = cbStats?.totals?.cb_rate_approved || 0
  const totalCbRateAll = cbStats?.totals?.cb_rate_total || 0
  const totalCbRateAmountApproved = cbStats?.totals?.cb_rate_amount_approved || 0
  const hasBankAlert = cbBankStats?.totals?.alert || false

  const loadingSpinner = (
    <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Analytics" description="Chargeback rates and transaction analysis" />
      <main className="container mx-auto px-6 py-8">

        {/* Top Row - Gatewaysync and EMP refresh */}
        <div className="grid gap-6 md:grid-cols-3 mb-8 items-start">
          {/* Gateway Sync */}
          <Card className={`${reconciling ? "border-indigo-200 bg-indigo-50/50" : ""} md:col-span-1 gap-1 pb-9`}>
            <CardHeader className="pb-1">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-sm font-medium text-slate-700">
                  Gateway Sync
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="py-0">
              <p className="text-xs text-slate-500 mb-1">Sync transaction statuses from EMP (last 30 days)</p>
              <Button 
                onClick={handleReconcile} 
                disabled={reconciling}
                variant="outline"
                size="sm"
                className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
              >
                {reconciling ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" /> Reconcile
                  </>
                )}
              </Button>
              {reconcileResult && (
                <p className={`text-sm mt-2 ${reconcileResult.success ? 'text-green-600' : 'text-amber-600'}`}>
                  {reconcileResult.success ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      {reconcileResult.message}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      {reconcileResult.message}
                    </span>
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          {/* EMP Refresh */}
          <Card className={`${empRefreshing ? "border-indigo-200 bg-indigo-50/50" : ""} md:col-span-2 gap-1`}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-sm font-medium text-slate-700">
                  EMP Refresh <span className="text-xs">(Fetch transactions from gateway)</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-2 mb-3 sm:grid-cols-1">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={empFromDate}
                    onChange={(e) => setEmpFromDate(e.target.value)}
                    className="h-8 text-xs"
                    disabled={empRefreshing}
                  />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={empToDate}
                    onChange={(e) => setEmpToDate(e.target.value)}
                    className="h-8 text-xs"
                    disabled={empRefreshing}
                  />
                </div>
                <div className="md:mt-4">
                  <Button 
                    onClick={handleEmpRefresh} 
                    disabled={empRefreshing}
                    variant="outline"
                    size="sm"
                    className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
                  >
                    {empRefreshing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        {empProgress}%
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Refresh from EMP
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {empRefreshing && empStats && (
                <div className="mt-2">
                  <Progress value={empProgress} className="h-2 [&>div]:bg-blue-500" />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span className="text-green-600">+{empStats.inserted} new</span>
                    <span className="text-blue-600">↻{empStats.updated} upd</span>
                    <span className="text-slate-400">={empStats.unchanged || 0}</span>
                    {empStats.errors > 0 && <span className="text-red-500">✗{empStats.errors}</span>}
                  </div>
                </div>
              )}
              {empResult && !empRefreshing && (
                <div className={`flex items-center gap-1 text-sm mt-1 ${empResult.success ? 'text-green-600' : 'text-amber-600'}`}>
                  {empResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {empResult.message}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Second Row Time Period Selection */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-700">Chargeback Analytics</h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="cb-period" className="text-sm">Filter by Month:</Label>
            <Select
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
            >
              <SelectTrigger className="w-44 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Third Row Chargeback Ratios */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Chargeback / Approved Ratio */}
          <Card className={totalCbRateApproved < 20 ? 'border-green-300' : totalCbRateApproved < 25 ? 'border-amber-300' : 'border-red-300'}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-500">
                  CB Rate (vs Approved)
                </CardTitle>
                {totalCbRateApproved >= 25 && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? loadingSpinner : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${totalCbRateApproved < 20 ? 'text-green-600' : totalCbRateApproved < 25 ? 'text-amber-600' : 'text-red-600'}`}>
                      {formatPercent(totalCbRateApproved)}
                    </span>
                    <span className="text-sm text-slate-500">chargebacks / approved</span>
                  </div>
                  <Progress 
                    value={totalCbRateApproved} 
                    className={`mt-2 h-2 ${totalCbRateApproved < 20 ? '[&>div]:bg-green-500' : totalCbRateApproved < 25 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`}
                  />
                  <p className="text-xs text-slate-400 mt-1">Includes approved transactions</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Chargeback / All transactions Amount Ratio */}
          <Card className={totalCbRateAmountApproved < 20 ? 'border-green-300' : totalCbRateAmountApproved < 25 ? 'border-amber-300' : 'border-red-300'}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-500">
                  CB Rate (vs Approved Amount)
                </CardTitle>
                {totalCbRateAmountApproved >= 25 && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? loadingSpinner : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${totalCbRateAmountApproved < 20 ? 'text-green-600' : totalCbRateAmountApproved < 25 ? 'text-amber-600' : 'text-red-600'}`}>
                      {formatPercent(totalCbRateAmountApproved)}
                    </span>
                    <span className="text-sm text-slate-500">chargeback amount / approved amount</span>
                  </div>
                  <Progress 
                    value={cbStats ? totalCbRateAmountApproved : 0}
                    max={cbStats ? cbStats.threshold : 100}
                    className={`mt-2 h-2 ${totalCbRateAmountApproved < 20 ? '[&>div]:bg-green-500' : totalCbRateAmountApproved < 25 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`}
                  />
                  <p className="text-xs text-slate-400 mt-1">Includes approved transactions amount</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Chargeback / All Transactions Ratio */}
          <Card className={totalCbRateAll < 20 ? 'border-green-300' : totalCbRateAll < 25 ? 'border-amber-300' : 'border-red-300'}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-500">
                  CB Rate (vs All)
                </CardTitle>
                {totalCbRateAll >= 25 && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? loadingSpinner : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${totalCbRateAll < 20 ? 'text-green-600' : totalCbRateAll < 25 ? 'text-amber-600' : 'text-red-600'}`}>
                      {formatPercent(totalCbRateAll)}
                    </span>
                    <span className="text-sm text-slate-500">chargebacks / total</span>
                  </div>
                  <Progress 
                    value={Math.min(totalCbRateAll, 5) * 20} 
                    className={`mt-2 h-2 ${totalCbRateAll < 20 ? '[&>div]:bg-green-500' : totalCbRateAll < 25 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`}
                  />
                  <p className="text-xs text-slate-400 mt-1">Includes all transactions</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chargeback Rates by Country */}
        <Card className={`mb-8 ${hasAlert ? 'border-red-300' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-slate-500" />
                <CardTitle className="text-lg">Chargeback Rates by Country</CardTitle>
                {hasAlert && (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? loadingSpinner : (
              <>
                {cbStats && cbStats.countries && cbStats.countries.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Country</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Approved</TableHead>
                        <TableHead className="text-right">Chargebacks</TableHead>
                        <TableHead className="text-right">CB Amount</TableHead>
                        <TableHead className="text-right">CB Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cbStats.countries.map((country) => (
                        <TableRow key={country.country} className={country.alert ? 'bg-red-50' : ''}>
                          <TableCell className="font-medium">
                            {country.country}
                            {country.alert && <AlertTriangle className="h-4 w-4 text-red-500 inline ml-2 -translate-y-0.5" />}
                          </TableCell>
                          <TableCell className="text-right">{country.total}</TableCell>
                          <TableCell className="text-right">{country.approved}</TableCell>
                          <TableCell className="text-right">{country.chargebacks}</TableCell>
                          <TableCell className="text-right">{formatCurrency((country as any).chargeback_amount || 0)}</TableCell>
                          <TableCell className={`text-right font-medium ${country.alert ? 'text-red-600' : ''}`}>
                            {formatPercent(country.cb_rate_approved)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total Row */}
                      <TableRow className="bg-slate-100 font-semibold border-t-2">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{cbStats.totals.total}</TableCell>
                        <TableCell className="text-right">{cbStats.totals.approved}</TableCell>
                        <TableCell className="text-right">{cbStats.totals.chargebacks}</TableCell>
                        <TableCell className="text-right">{formatCurrency((cbStats.totals as any).chargeback_amount || 0)}</TableCell>
                        <TableCell className={`text-right ${cbStats.totals.alert ? 'text-red-600' : ''}`}>
                          {formatPercent(cbStats.totals.cb_rate_approved)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-slate-500 text-center py-4">No chargeback data available</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Two Column Layout for Codes and Banks */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Chargeback Codes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-slate-500" />
                  <CardTitle className="text-lg">By Reason Code</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? loadingSpinner : (
                <>
                  {cbCodeStats && cbCodeStats.codes && cbCodeStats.codes.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cbCodeStats.codes.map((code) => {
                          const rule = getChargebackRule(code.chargeback_code)
                          return (
                            <TableRow key={code.chargeback_code}>
                              <TableCell className="font-mono text-sm">{code.chargeback_code}</TableCell>
                              <TableCell className="text-sm">{rule?.description || code.chargeback_reason}</TableCell>
                              <TableCell className="text-right">{code.occurrences}</TableCell>
                              <TableCell className="text-right">{formatCurrency(code.total_amount)}</TableCell>
                            </TableRow>
                          )
                        })}
                        {/* Total Row */}
                        <TableRow className="bg-slate-100 font-semibold border-t-2">
                          <TableCell colSpan={2}>Total</TableCell>
                          <TableCell className="text-right">{cbCodeStats.totals.occurrences}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cbCodeStats.totals.total_amount)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-slate-500 text-center py-4">No chargeback codes recorded</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Chargeback by Bank */}
          <Card className={`${hasBankAlert ? "border-red-300" : ""}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-500" />
                  <CardTitle className="text-lg">By Bank</CardTitle>
                  {hasBankAlert && (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search banks..."
                    value={bankSearchQuery}
                    onChange={(e) => setBankSearchQuery(e.target.value)}
                    className="h-8 text-xs pl-8 w-40"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? loadingSpinner : (
                <>
                  {filteredBankStats && filteredBankStats.banks && filteredBankStats.banks.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bank</TableHead>
                          <TableHead className="text-right">Chargebacks</TableHead>
                          <TableHead className="text-right">CB Amount</TableHead>
                          <TableHead className="text-right">CB Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBankStats.banks.map((bank) => (
                          <TableRow key={bank.bank_name} className={`${bank.alert ? "bg-red-50" : ""}`}>
                            <TableCell className="font-medium">{bank.bank_name}</TableCell>
                            <TableCell className="text-right">{bank.chargebacks}</TableCell>
                            <TableCell className="text-right">{formatCurrency((bank as any).chargeback_amount)}</TableCell>
                            <TableCell className={`text-right font-medium ${bank.alert ? 'text-red-600' : ''}`}>
                              {formatPercent(bank.cb_rate)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Total Row - only show when not searching */}
                        {!bankSearchQuery.trim() && (
                          <TableRow className={`${hasBankAlert ? "bg-red-100" : "bg-slate-100"} font-semibold border-t-2`}>
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right">{cbBankStats?.totals.chargebacks}</TableCell>
                            <TableCell className="text-right">{formatCurrency((cbBankStats?.totals as any).chargeback_amount || cbBankStats?.totals.total_amount)}</TableCell>
                            <TableCell className={`text-right ${hasBankAlert ? 'text-red-600' : ''}`}>
                              {formatPercent((cbBankStats?.totals as any).cb_rate || (cbBankStats?.totals as any).total_cb_rate || 0)}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-slate-500 text-center py-4">
                      {bankSearchQuery ? 'No banks found matching your search' : 'No bank data available'}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
