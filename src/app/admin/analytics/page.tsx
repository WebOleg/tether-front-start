/**
 * Analytics page - Chargeback ratios, Gateway Sync, and EMP Refresh
 */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  XCircle,
} from 'lucide-react'
import type { ChargebackStats, ChargebackCodeStats, ChargebackBankStats } from '@/types'
import { Progress } from '@/components/ui/progress'

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

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export default function AnalyticsPage() {
  const [cbStats, setCbStats] = useState<ChargebackStats | null>(null)
  const [cbCodeStats, setCbCodeStats] = useState<ChargebackCodeStats | null>(null)
  const [cbBankStats, setCbBankStats] = useState<ChargebackBankStats | null>(null)
  const [cbPeriod, setCbPeriod] = useState('7d')
  const [cbCodePeriod, setCbCodePeriod] = useState('7d')
  const [cbBankPeriod, setCbBankPeriod] = useState('7d')
  const [loading, setLoading] = useState(true)
  
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

  useEffect(() => {
    const fetchChargebackStats = async () => {
      try {
        const stats = await api.getChargebackStats(cbPeriod)
        setCbStats(stats)
      } catch (err) {
        console.error('Failed to fetch chargeback stats:', err)
      }
    }
    fetchChargebackStats()
  }, [cbPeriod])

  useEffect(() => {
    const fetchChargebackCodeStats = async () => {
      try {
        const stats = await api.getChargebackCodeStats(cbCodePeriod)
        setCbCodeStats(stats)
      } catch (err) {
        console.error('Failed to fetch chargeback code stats:', err)
      }
    }
    fetchChargebackCodeStats()
  }, [cbCodePeriod])

  useEffect(() => {
    const fetchChargebackBankStats = async () => {
      try {
        const stats = await api.getChargebackBankStats(cbBankPeriod)
        setCbBankStats(stats)
      } catch (err) {
        console.error('Failed to fetch chargeback bank stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchChargebackBankStats()
  }, [cbBankPeriod])

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

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Analytics" description="Chargeback rates and transaction analysis" />
      <main className="container mx-auto px-4 py-8">

        {/* Top Row - Key Metrics */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          {/* Chargeback / Approved Ratio */}
          <Card className={totalCbRateApproved > 1 ? 'border-red-300' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-500">
                  CB Rate (vs Approved)
                </CardTitle>
                {totalCbRateApproved > 1 && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${totalCbRateApproved > 1 ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatPercent(totalCbRateApproved)}
                </span>
                <span className="text-sm text-slate-500">chargebacks / approved</span>
              </div>
              <Progress 
                value={Math.min(totalCbRateApproved, 5) * 20} 
                className={`mt-2 h-2 ${totalCbRateApproved > 1 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
              />
              <p className="text-xs text-slate-400 mt-1">Target: &lt;1%</p>
            </CardContent>
          </Card>

          {/* Chargeback / All Transactions Ratio */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                CB Rate (vs All)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {formatPercent(totalCbRateAll)}
                </span>
                <span className="text-sm text-slate-500">chargebacks / total</span>
              </div>
              <Progress 
                value={Math.min(totalCbRateAll, 5) * 20} 
                className="mt-2 h-2 [&>div]:bg-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">Includes pending transactions</p>
            </CardContent>
          </Card>

          {/* Gateway Sync */}
          <Card className="border-indigo-200 bg-indigo-50/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-sm font-medium text-slate-700">
                  Gateway Sync
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 mb-3">Sync transaction statuses from EMP (last 30 days)</p>
              <Button 
                onClick={handleReconcile} 
                disabled={reconciling}
                variant="outline"
                size="sm"
                className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-100"
              >
                {reconciling ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  'Reconcile'
                )}
              </Button>
              {reconcileResult && (
                <p className={`text-xs mt-2 ${reconcileResult.success ? 'text-green-600' : 'text-amber-600'}`}>
                  {reconcileResult.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* EMP Refresh */}
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-sm font-medium text-slate-700">
                  EMP Refresh
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 mb-3">Fetch transactions from gateway</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
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
              </div>
              <Button 
                onClick={handleEmpRefresh} 
                disabled={empRefreshing}
                variant="outline"
                size="sm"
                className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              >
                {empRefreshing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {empProgress}%
                  </>
                ) : (
                  'Refresh from EMP'
                )}
              </Button>
              {empRefreshing && empStats && (
                <div className="mt-2">
                  <Progress value={empProgress} className="h-2 [&>div]:bg-emerald-500" />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span className="text-green-600">+{empStats.inserted} new</span>
                    <span className="text-blue-600">↻{empStats.updated} upd</span>
                    <span className="text-slate-400">={empStats.unchanged || 0}</span>
                    {empStats.errors > 0 && <span className="text-red-500">✗{empStats.errors}</span>}
                  </div>
                </div>
              )}
              {empResult && !empRefreshing && (
                <div className={`flex items-center gap-1 text-xs mt-2 ${empResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {empResult.success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {empResult.message}
                </div>
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
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Alert
                  </Badge>
                )}
              </div>
              <Select value={cbPeriod} onValueChange={setCbPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
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
                        {country.alert && <AlertTriangle className="h-4 w-4 text-red-500 inline ml-2" />}
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
                <Select value={cbCodePeriod} onValueChange={setCbCodePeriod}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24h</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="90d">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
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
                    {cbCodeStats.codes.map((code) => (
                      <TableRow key={code.chargeback_code}>
                        <TableCell className="font-mono text-sm">{code.chargeback_code}</TableCell>
                        <TableCell className="text-sm">{code.chargeback_reason}</TableCell>
                        <TableCell className="text-right">{code.occurrences}</TableCell>
                        <TableCell className="text-right">{formatCurrency(code.total_amount)}</TableCell>
                      </TableRow>
                    ))}
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
            </CardContent>
          </Card>

          {/* Chargeback by Bank */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-500" />
                  <CardTitle className="text-lg">By Bank</CardTitle>
                </div>
                <Select value={cbBankPeriod} onValueChange={setCbBankPeriod}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24h</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="90d">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {cbBankStats && cbBankStats.banks && cbBankStats.banks.length > 0 ? (
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
                    {cbBankStats.banks.map((bank) => (
                      <TableRow key={bank.bank_name}>
                        <TableCell className="font-medium">{bank.bank_name}</TableCell>
                        <TableCell className="text-right">{bank.chargebacks}</TableCell>
                        <TableCell className="text-right">{formatCurrency((bank as any).chargeback_amount || bank.total_amount)}</TableCell>
                        <TableCell className={`text-right font-medium ${bank.cb_rate > 1 ? 'text-red-600' : ''}`}>
                          {formatPercent(bank.cb_rate)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-slate-100 font-semibold border-t-2">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{cbBankStats.totals.chargebacks}</TableCell>
                      <TableCell className="text-right">{formatCurrency((cbBankStats.totals as any).chargeback_amount || cbBankStats.totals.total_amount)}</TableCell>
                      <TableCell className={`text-right ${(cbBankStats.totals as any).cb_rate > 1 ? 'text-red-600' : ''}`}>
                        {formatPercent((cbBankStats.totals as any).cb_rate || (cbBankStats.totals as any).total_cb_rate || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <p className="text-slate-500 text-center py-4">No bank data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
