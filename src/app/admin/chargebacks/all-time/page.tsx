/**
 * Chargeback Code All-Time page – breakdown of chargeback reason codes across all time.
 * Filters: model (via ModelTabs) and emp_account_id.
 */
'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import type { ChargebackAllTimeCode, ChargebackAllTimeResponse } from '@/types'
import {
  Building2,
  RotateCcw,
  DollarSign,
  FileText,
  Banknote,
} from 'lucide-react'
import type { EmpAccount } from '@/types'
import { toast } from 'sonner'
import { ModelTabs } from '@/components/ui/model-tabs'
import { formatCurrency } from '@/lib/utils'
import { CHARGEBACK_RULES } from '@/lib/chargebacks'

export default function ChargebackCodeAllTimePage() {
  const [data, setData] = useState<ChargebackAllTimeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const [activeModel, setActiveModel] = useState<string>('all')

  const [empAccounts, setEmpAccounts] = useState<EmpAccount[]>([])
  const [selectedEmpAccountId, setSelectedEmpAccountId] = useState<string>('all')

  useEffect(() => {
    api.getEmpAccounts()
      .then(setEmpAccounts)
      .catch((err) => console.error('Failed to fetch EMP accounts:', err))
  }, [])

  // Fetch data when filters change
  useEffect(() => {
    const controller = new AbortController()

    setData(null)

    const fetchData = async () => {
      setLoading(true)
      try {
        const filters: { model?: string; emp_account_id?: number } = {}
        if (activeModel !== 'all') filters.model = activeModel
        if (selectedEmpAccountId !== 'all') filters.emp_account_id = Number(selectedEmpAccountId)

        const result = await api.getChargebackAllTime(filters)
        if (!controller.signal.aborted) {
          setData(result)
        }
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('Failed to fetch chargeback all-time stats:', err)
        toast.error('Failed to load chargeback all-time data')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => controller.abort()
  }, [activeModel, selectedEmpAccountId])

  const totals = data?.totals
  const codes = data?.codes ?? []

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Chargeback Codes (All-Time)" description="Reason code breakdown across all recorded chargebacks" />
      <main className="p-6">

        {/* Model Tabs */}
        <div className="mb-6">
          <ModelTabs value={activeModel} onValueChange={setActiveModel} />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Select value={selectedEmpAccountId} onValueChange={setSelectedEmpAccountId}>
            <SelectTrigger className="w-52 h-8">
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

        {/* Summary stat cards */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-9 rounded-lg" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-9 w-20 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="py-2 gap-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">CB Occurrences</CardTitle>
                <div className="rounded-lg p-2 bg-rose-100">
                  <RotateCcw className="h-5 w-5 text-rose-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-rose-600">
                  {(totals?.occurrences ?? 0).toLocaleString()}
                </div>
                <p className="text-sm text-slate-500 mt-1">Within chargebacks</p>
              </CardContent>
            </Card>

            <Card className="py-2 gap-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">CB Amount</CardTitle>
                <div className="rounded-lg p-2 bg-red-100">
                  <DollarSign className="h-5 w-5 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-red-600">
                  {totals ? formatCurrency(totals.total_amount) : '€0.00'}
                </div>
                <p className="text-sm text-slate-500 mt-1">Total chargeback value</p>
              </CardContent>
            </Card>

            <Card className="py-2 gap-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Records</CardTitle>
                <div className="rounded-lg p-2 bg-blue-100">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-blue-600">
                  {(totals?.total_records ?? 0).toLocaleString()}
                </div>
                <p className="text-sm text-slate-500 mt-1">All-time transactions</p>
              </CardContent>
            </Card>

            <Card className="py-2 gap-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Records Amount</CardTitle>
                <div className="rounded-lg p-2 bg-emerald-100">
                  <Banknote className="h-5 w-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-600">
                  {totals ? formatCurrency(totals.total_records_amount) : '€0.00'}
                </div>
                <p className="text-sm text-slate-500 mt-1">All-time transaction value</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data table */}
        <div className="rounded-lg border bg-white mb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Occurrences</TableHead>
                <TableHead className="text-right">CB Count %</TableHead>
                <TableHead className="text-right">Total Count %</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">CB Amount %</TableHead>
                <TableHead className="text-right">Total Amount %</TableHead>
                <TableHead className="text-right">Last Occurrence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(9)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                    No chargeback code data available
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {codes.map((row: ChargebackAllTimeCode) => (
                    <TableRow key={row.chargeback_code} className="select-text">
                      <TableCell className="font-mono text-sm text-rose-600 font-semibold whitespace-nowrap">
                        {row.chargeback_code}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {row.chargeback_reason || CHARGEBACK_RULES[row.chargeback_code]?.detail || '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-red-600">
                        {row.occurrences.toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right text-sm ${row.cb_count_percentage >= 25 ? 'text-red-600 font-semibold' : ''}`}>
                        {row.cb_count_percentage.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-600">
                        {row.total_count_percentage.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(row.total_amount)}
                      </TableCell>
                      <TableCell className={`text-right text-sm ${row.cb_amount_percentage >= 25 ? 'text-red-600 font-semibold' : ''}`}>
                        {row.cb_amount_percentage.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-600">
                        {row.total_amount_percentage.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-500 whitespace-nowrap">
                        {row.last_occurrence}
                      </TableCell>
                    </TableRow>
                  ))}

                  {totals && (
                    <TableRow className="bg-slate-100 font-semibold border-t-2">
                      <TableCell colSpan={2}>Total ({codes.length} codes)</TableCell>
                      <TableCell className="text-right text-red-600">
                        {totals.occurrences.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">100.00%</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals.total_amount)}</TableCell>
                      <TableCell className="text-right">100.00%</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  )
}
