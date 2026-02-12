/**
 * BIC Analytics page - Bank-level transaction metrics for risk monitoring
 */
'use client'

import { useEffect, useState, useMemo } from 'react'
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
  Building2,
  Search,
  X,
  Filter,
  Ban,
} from 'lucide-react'
import type { BicAnalyticsStats, EmpAccount } from '@/types'
import { toast } from 'sonner'
import { ModelTabs } from '@/components/ui/model-tabs'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercent } from '@/lib/utils'

type SortField = 'cb_rate_count' | 'cb_rate_volume' | 'chargeback_count' | 'total_transactions' | 'total_volume'

export default function BicAnalyticsPage() {
  const [bicStats, setBicStats] = useState<BicAnalyticsStats | null>(null)
  const [bicPeriod, setBicPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [activeModel, setActiveModel] = useState<string>('all')

  // EMP Account filter
  const [empAccounts, setEmpAccounts] = useState<EmpAccount[]>([])
  const [selectedEmpAccountId, setSelectedEmpAccountId] = useState<string>('all')

  // Filters
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [bicSearch, setBicSearch] = useState('')
  const [highRiskOnly, setHighRiskOnly] = useState(false)
  const [hideSmallBics, setHideSmallBics] = useState(false)
  const [sortField, setSortField] = useState<SortField>('cb_rate_count')

  // Fetch EMP accounts on mount
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
    const fetchBicStats = async () => {
      setLoading(true)
      try {
        const filters: { model?: string; emp_account_id?: number } = {}
        if (activeModel !== 'all') filters.model = activeModel
        if (selectedEmpAccountId !== 'all') filters.emp_account_id = Number(selectedEmpAccountId)
        
        const stats = await api.getBicAnalytics(bicPeriod, filters)
        setBicStats(stats)
      } catch (err) {
        console.error('Failed to fetch BIC analytics:', err)
        toast.error('Failed to load BIC analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchBicStats()
  }, [bicPeriod, activeModel, selectedEmpAccountId])

  // Extract unique countries from data
  const countries = useMemo(() => {
    if (!bicStats?.bics) return []
    const uniqueCountries = [...new Set(bicStats.bics.map(b => b.bank_country))]
    return uniqueCountries.sort()
  }, [bicStats])

  // Filter and sort BICs
  const filteredBics = useMemo(() => {
    if (!bicStats?.bics) return []

    let result = [...bicStats.bics]

    // Country filter
    if (countryFilter !== 'all') {
      result = result.filter(b => b.bank_country === countryFilter)
    }

    // BIC search
    if (bicSearch.trim()) {
      const search = bicSearch.toLowerCase().trim()
      result = result.filter(b => b.bic.toLowerCase().includes(search))
    }

    // High risk only
    if (highRiskOnly) {
      result = result.filter(b => b.is_high_risk)
    }

    // Hide small BICs (< 100 transactions)
    if (hideSmallBics) {
      result = result.filter(b => b.total_transactions >= 100)
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField] ?? 0
      const bVal = b[sortField] ?? 0
      return bVal - aVal // desc
    })

    return result
  }, [bicStats, countryFilter, bicSearch, highRiskOnly, hideSmallBics, sortField])

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    if (!filteredBics.length) {
      return {
        total_bics: 0,
        high_risk_bics: 0,
        total_transactions: 0,
        total_chargebacks: 0,
        total_volume: 0,
        approved_volume: 0,
        chargeback_volume: 0,
        cb_rate_count: 0,
        cb_rate_volume: 0,
      }
    }

    const totals = filteredBics.reduce((acc, bic) => ({
      total_transactions: acc.total_transactions + bic.total_transactions,
      approved_count: acc.approved_count + bic.approved_count,
      chargeback_count: acc.chargeback_count + bic.chargeback_count,
      total_volume: acc.total_volume + bic.total_volume,
      approved_volume: acc.approved_volume + (bic.approved_volume ?? 0),
      chargeback_volume: acc.chargeback_volume + (bic.chargeback_volume ?? 0),
    }), {
      total_transactions: 0,
      approved_count: 0,
      chargeback_count: 0,
      total_volume: 0,
      approved_volume: 0,
      chargeback_volume: 0,
    })

    // Bank KPI formula: chargebacks / approved
    const cbRateCount = totals.total_transactions > 0
        ? (totals.chargeback_count / totals.total_transactions) * 100
        : 0
    const cbRateVolume = totals.total_volume > 0
        ? (totals.chargeback_volume / totals.total_volume) * 100
        : 0

    return {
      total_bics: filteredBics.length,
      high_risk_bics: filteredBics.filter(b => b.is_high_risk).length,
      total_transactions: totals.total_transactions,
      total_chargebacks: totals.chargeback_count,
      total_volume: totals.total_volume,
      approved_volume: totals.approved_volume,
      chargeback_volume: totals.chargeback_volume,
      cb_rate_count: cbRateCount,
      cb_rate_volume: cbRateVolume,
    }
  }, [filteredBics])

  const handleExport = async () => {
    try {
      const filters: { model?: string; emp_account_id?: number } = {}
      if (activeModel !== 'all') filters.model = activeModel
      if (selectedEmpAccountId !== 'all') filters.emp_account_id = Number(selectedEmpAccountId)
      
      const blob = await api.getBicAnalyticsExport(bicPeriod, filters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bic-analytics-${bicPeriod}-${activeModel}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('BIC Analytics exported')
    } catch (err) {
      toast.error('Failed to export BIC analytics')
      console.error('Export failed:', err)
    }
  }

  // Calculate active filters count
  const activeFilterCount =
      (countryFilter !== 'all' ? 1 : 0) +
      (bicSearch !== '' ? 1 : 0) +
      (highRiskOnly ? 1 : 0) +
      (hideSmallBics ? 1 : 0)

  const clearFilters = () => {
    setCountryFilter('all')
    setBicSearch('')
    setHighRiskOnly(false)
    setHideSmallBics(false)
    setSortField('cb_rate_count')
  }

  const hasHighRisk = filteredTotals.high_risk_bics > 0

  return (
      <div className="min-h-screen bg-slate-50">
        <Header title="BIC Analytics" description="Bank-level transaction metrics and risk monitoring" />
        <main className="container mx-auto px-6 py-8">

          {/* Model Tabs */}
          <div className="mb-8">
            <ModelTabs value={activeModel} onValueChange={setActiveModel} />
          </div>

          {/* Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* Period */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Period:</Label>
                <Select value={bicPeriod} onValueChange={setBicPeriod}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="60d">Last 60 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* EMP Account Filter */}
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Account:</Label>
                <Select value={selectedEmpAccountId} onValueChange={setSelectedEmpAccountId}>
                  <SelectTrigger className="w-44 h-8">
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
                          </div>
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Country Filter */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Country:</Label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {countries.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* BIC Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search BIC..."
                    value={bicSearch}
                    onChange={(e) => setBicSearch(e.target.value)}
                    className="pl-8 h-8 w-40"
                />
              </div>

              {/* High Risk Toggle */}
              <Button
                  variant={highRiskOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHighRiskOnly(!highRiskOnly)}
                  className={highRiskOnly ? "bg-red-600 hover:bg-red-700" : ""}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                High Risk
              </Button>

              {/* Hide Small BICs Toggle */}
              <Button
                  variant={hideSmallBics ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHideSmallBics(!hideSmallBics)}
              >
                <Filter className="h-4 w-4 mr-1" />
                {'>'} 100 Txn
              </Button>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Sort:</Label>
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger className="w-36 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cb_rate_count">CB % Count</SelectItem>
                    <SelectItem value="cb_rate_volume">CB % Volume</SelectItem>
                    <SelectItem value="chargeback_count">Chargebacks</SelectItem>
                    <SelectItem value="total_transactions">Total TX</SelectItem>
                    <SelectItem value="total_volume">Volume</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filters */}
              {activeFilterCount > 0 && (
                  <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="h-8 px-2 lg:px-3 border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 animate-in fade-in zoom-in-95 duration-200 group"
                      title="Clear all filters"
                  >
                    <X className="mr-2 h-3.5 w-3.5" />
                    Reset
                    <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900">
                  {activeFilterCount}
                </span>
                  </Button>
              )}
            </div>

            {/* Export */}
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>

          {/* Active Model Badge */}
          {activeModel !== 'all' && (
              <div className="mb-4">
                <Badge variant="outline" className="capitalize">
                  {activeModel} Model
                </Badge>
              </div>
          )}

          {/* Summary Cards */}
          {loading ? (
              <div className="grid gap-4 md:grid-cols-5 mb-6">
                {[...Array(5)].map((_, i) => (
                    <Card key={i} className="relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: `${i * 0.1}s` }} />
                      <CardContent className="pt-4">
                        <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-2" />
                        <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mb-2" />
                        <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
                      </CardContent>
                    </Card>
                ))}
              </div>
          ) : (
              <div className="grid gap-4 md:grid-cols-5 mb-6">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-slate-500">Total BICs</div>
                    <div className="text-2xl font-bold">{filteredTotals.total_bics}</div>
                    {activeFilterCount > 0 && bicStats && (
                        <div className="text-xs text-slate-400">of {bicStats.totals.total_bics}</div>
                    )}
                  </CardContent>
                </Card>
                <Card className={hasHighRisk ? 'border-red-300' : ''}>
                  <CardContent className="pt-4">
                    <div className="text-sm text-slate-500 flex items-center gap-1">
                      High Risk BICs
                      {hasHighRisk && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className={`text-2xl font-bold ${hasHighRisk ? 'text-red-600' : ''}`}>
                      {filteredTotals.high_risk_bics}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-slate-500">Total Transactions</div>
                    <div className="text-2xl font-bold">{filteredTotals.total_transactions.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card className={filteredTotals.cb_rate_count >= 25 ? 'border-red-300' : ''}>
                  <CardContent className="pt-4">
                    <div className="text-sm text-slate-500">CB % Count</div>
                    <div className={`text-2xl font-bold ${filteredTotals.cb_rate_count >= 25 ? 'text-red-600' : ''}`}>
                      {formatPercent(filteredTotals.cb_rate_count)}
                    </div>
                    <div className="text-xs text-slate-400">chargebacks / approved</div>
                  </CardContent>
                </Card>
                <Card className={filteredTotals.cb_rate_volume >= 25 ? 'border-red-300' : ''}>
                  <CardContent className="pt-4">
                    <div className="text-sm text-slate-500">CB % Volume</div>
                    <div className={`text-2xl font-bold ${filteredTotals.cb_rate_volume >= 25 ? 'text-red-600' : ''}`}>
                      {formatPercent(filteredTotals.cb_rate_volume)}
                    </div>
                    <div className="text-xs text-slate-400">CB amount / approved amount</div>
                  </CardContent>
                </Card>
              </div>
          )}

          {/* BIC Table */}
          <Card className={hasHighRisk ? "border-red-300" : ""}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-500" />
                <CardTitle className="text-lg">Transactions by BIC</CardTitle>
                {hasHighRisk && <AlertTriangle className="h-5 w-5 text-red-500" />}
                {activeModel !== 'all' && (
                    <Badge variant="outline" className="ml-2 capitalize">
                      {activeModel}
                    </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
              ) : filteredBics.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>BIC</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead className="text-right">Total TX</TableHead>
                        <TableHead className="text-right">Approved</TableHead>
                        <TableHead className="text-right">Declined</TableHead>
                        <TableHead className="text-right">Chargebacks</TableHead>
                        <TableHead className="text-right">Volume €</TableHead>
                        <TableHead className="text-right">CB % Count</TableHead>
                        <TableHead className="text-right">CB % Volume</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBics.map((bic) => (
                          <TableRow key={bic.bic} className={bic.is_high_risk ? 'bg-red-50' : ''}>
                            <TableCell className="font-mono text-sm">
                              {bic.bic}
                              {bic.is_high_risk && <AlertTriangle className="h-4 w-4 text-red-500 inline ml-2" />}
                              {bic.is_blacklisted && <Ban className="h-4 w-4 text-black inline ml-2" />}
                            </TableCell>
                            <TableCell>{bic.bank_country}</TableCell>
                            <TableCell className="text-right">{bic.total_transactions}</TableCell>
                            <TableCell className="text-right text-green-600">{bic.approved_count}</TableCell>
                            <TableCell className="text-right text-amber-600">{bic.declined_count}</TableCell>
                            <TableCell className="text-right text-red-600">{bic.chargeback_count}</TableCell>
                            <TableCell className="text-right">{formatCurrency(bic.total_volume)}</TableCell>
                            <TableCell className={`text-right font-medium ${(bic.cb_rate_count ?? 0) >= 25 ? 'text-red-600' : ''}`}>
                              {formatPercent(bic.cb_rate_count)}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${(bic.cb_rate_volume ?? 0) >= 25 ? 'text-red-600' : ''}`}>
                              {formatPercent(bic.cb_rate_volume)}
                            </TableCell>
                          </TableRow>
                      ))}
                      {/* Total Row */}
                      <TableRow className={`${hasHighRisk ? "bg-red-100" : "bg-slate-100"} font-semibold border-t-2`}>
                        <TableCell colSpan={2}>Total ({filteredTotals.total_bics} BICs)</TableCell>
                        <TableCell className="text-right">{filteredTotals.total_transactions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">{filteredTotals.total_chargebacks}</TableCell>
                        <TableCell className="text-right">{formatCurrency(filteredTotals.total_volume)}</TableCell>
                        <TableCell className={`text-right ${filteredTotals.cb_rate_count >= 25 ? 'text-red-600' : ''}`}>
                          {formatPercent(filteredTotals.cb_rate_count)}
                        </TableCell>
                        <TableCell className={`text-right ${filteredTotals.cb_rate_volume >= 25 ? 'text-red-600' : ''}`}>
                          {formatPercent(filteredTotals.cb_rate_volume)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
              ) : (
                  <p className="text-slate-500 text-center py-4">
                    {activeFilterCount > 0 ? 'No BICs match the filters' : 'No BIC data available'}
                  </p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
  )
}