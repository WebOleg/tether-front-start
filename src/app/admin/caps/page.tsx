'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import type { AccountCap } from '@/types'
import { Loader2, RefreshCw, Pencil, Check, X, Banknote, CreditCard, Wallet, Percent } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function CapsPage() {
  const [accounts, setAccounts] = useState<AccountCap[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchCaps = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getCaps(month, year)
      setAccounts(data.accounts)
    } catch (error) {
      console.error('Failed to fetch caps:', error)
      toast.error('Failed to load caps data')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    fetchCaps()
  }, [fetchCaps])

  const handleEdit = (account: AccountCap) => {
    setEditingId(account.id)
    setEditValue(account.monthly_cap?.toString() || '')
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleSave = async (accountId: number) => {
    const value = parseFloat(editValue)
    if (isNaN(value) || value < 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setSaving(true)
    try {
      await api.updateAccountCap(accountId, value)
      toast.success('Cap updated successfully')
      setEditingId(null)
      setEditValue('')
      fetchCaps()
    } catch (error) {
      console.error('Failed to update cap:', error)
      toast.error('Failed to update cap')
    } finally {
      setSaving(false)
    }
  }

  const formatEur = (value: number | null) => {
    if (value === null) return '\u2014'
    return '\u20AC' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const getUsageTextColor = (pct: number | null) => {
    if (pct === null) return 'text-slate-400'
    if (pct >= 90) return 'text-red-600'
    if (pct >= 80) return 'text-orange-500'
    if (pct >= 70) return 'text-yellow-600'
    return 'text-emerald-600'
  }

  const totalCap = accounts.reduce((sum, a) => sum + (a.monthly_cap || 0), 0)
  const totalUsed = accounts.reduce((sum, a) => sum + a.used, 0)
  const totalRemaining = totalCap - totalUsed
  const totalPct = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100 * 10) / 10 : null

  const periodLabel = MONTHS[month - 1] + ' ' + year

  return (
    <>
      <Header title="Account Caps" description={`Monthly volume limits per EMP account — ${periodLabel}`} />
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-3">
              <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((name, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="default" size="icon" onClick={fetchCaps} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="py-2 gap-1">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-9 w-9 rounded-lg" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-7 w-24 mb-2" />
                    <Skeleton className="h-4 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Cap</CardTitle>
                  <div className="rounded-lg p-2 bg-slate-100">
                    <Banknote className="h-5 w-5 text-slate-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-slate-700">{formatEur(totalCap)}</div>
                  <p className="text-sm text-slate-500 mt-1">{periodLabel}</p>
                </CardContent>
              </Card>
              <Card className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Used</CardTitle>
                  <div className="rounded-lg p-2 bg-blue-100">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-blue-600">{formatEur(totalUsed)}</div>
                  <p className="text-sm text-slate-500 mt-1">Billed this month</p>
                </CardContent>
              </Card>
              <Card className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Remaining</CardTitle>
                  <div className="rounded-lg p-2 bg-emerald-100">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-emerald-600">{formatEur(totalRemaining)}</div>
                  <p className="text-sm text-slate-500 mt-1">Available capacity</p>
                </CardContent>
              </Card>
              <Card className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Overall Usage</CardTitle>
                  <div className={`rounded-lg p-2 ${totalPct !== null && totalPct >= 90 ? 'bg-red-100' : totalPct !== null && totalPct >= 70 ? 'bg-yellow-100' : 'bg-emerald-100'}`}>
                    <Percent className={`h-5 w-5 ${getUsageTextColor(totalPct)}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${getUsageTextColor(totalPct)}`}>
                    {totalPct !== null ? `${totalPct}%` : '0.00%'}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Of total cap used</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Accounts Table */}
          <div className="rounded-lg border bg-white">
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Monthly Cap</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-center">Gross CB % (90d)</TableHead>
                    <TableHead className="w-[200px]">Usage</TableHead>
                    <TableHead className="w-24 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="text-right"><div className="flex justify-end"><Skeleton className="h-4 w-20" /></div></TableCell>
                        <TableCell className="text-right"><div className="flex justify-end"><Skeleton className="h-4 w-16" /></div></TableCell>
                        <TableCell className="text-right"><div className="flex justify-end"><Skeleton className="h-4 w-16" /></div></TableCell>
                        <TableCell className="text-right"><div className="flex justify-end"><Skeleton className="h-4 w-12" /></div></TableCell>
                        <TableCell className="text-center"><div className="flex justify-center"><Skeleton className="h-4 w-12" /></div></TableCell>
                        <TableCell><Skeleton className="h-2 w-full rounded-full" /></TableCell>
                        <TableCell className="text-center"><div className="flex justify-center"><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                      </TableRow>
                    ))
                  ) : accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No caps data found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <span className="font-medium text-slate-900">{account.name}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === account.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-slate-400">{'\u20AC'}</span>
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-[130px] h-8 text-right"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSave(account.id)
                                  if (e.key === 'Escape') handleCancel()
                                }}
                              />
                            </div>
                          ) : (
                            <span className="text-slate-900">
                              {account.monthly_cap !== null ? formatEur(account.monthly_cap) : <span className="text-slate-400">Not set</span>}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-slate-900">{formatEur(account.used)}</TableCell>
                        <TableCell className="text-right">
                          <span className={
                            account.usage_percentage !== null && account.usage_percentage >= 90 ? 'text-red-600 font-medium' :
                            account.usage_percentage !== null && account.usage_percentage >= 80 ? 'text-orange-500 font-medium' :
                            account.usage_percentage !== null && account.usage_percentage >= 70 ? 'text-yellow-600 font-medium' :
                            'text-slate-900'
                          }>
                            {formatEur(account.remaining)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-slate-500">{account.tx_count.toLocaleString()}</TableCell>
                        <TableCell className="text-center text-slate-500">
                          {account.cbk_gross_percentage_90d != null ? `${account.cbk_gross_percentage_90d.toFixed(2)}%` : '-'}
                        </TableCell>
                        <TableCell>
                          {account.usage_percentage !== null ? (
                            <div className="flex items-center gap-2">
                              <Progress
                                value={account.usage_percentage}
                                height="sm"
                                variant={
                                  account.usage_percentage >= 90 ? 'red' :
                                  account.usage_percentage >= 80 ? 'orange' :
                                  account.usage_percentage >= 70 ? 'yellow' :
                                  'green'
                                }
                              />
                              <span className={`text-sm font-medium w-[45px] text-right ${getUsageTextColor(account.usage_percentage)}`}>
                                {account.usage_percentage}{'%'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">{'\u2014'}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {editingId === account.id ? (
                              <>
                                <Button variant="success" size="icon-sm" onClick={() => handleSave(account.id)} disabled={saving}>
                                  {saving ? <Loader2 className="animate-spin" /> : <Check />}
                                </Button>
                                <Button variant="default" size="icon-sm" onClick={handleCancel}>
                                  <X className="text-white" />
                                </Button>
                              </>
                            ) : (
                              <Button variant="default" size="icon-sm" onClick={() => handleEdit(account)}>
                                <Pencil className="text-white" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
        </div>
      </main>
    </>
  )
}
