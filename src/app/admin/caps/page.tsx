'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import type { AccountCap } from '@/types'
import { Loader2, RefreshCw, Pencil, Check, X, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

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
    if (value === null) return '—'
    return '\u20AC' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const getUsageColor = (pct: number | null) => {
    if (pct === null) return 'bg-slate-200'
    if (pct >= 90) return 'bg-red-500'
    if (pct >= 70) return 'bg-yellow-500'
    return 'bg-emerald-500'
  }

  const getUsageTextColor = (pct: number | null) => {
    if (pct === null) return 'text-slate-400'
    if (pct >= 90) return 'text-red-600'
    if (pct >= 70) return 'text-yellow-600'
    return 'text-emerald-600'
  }

  const totalCap = accounts.reduce((sum, a) => sum + (a.monthly_cap || 0), 0)
  const totalUsed = accounts.reduce((sum, a) => sum + a.used, 0)
  const totalRemaining = totalCap - totalUsed
  const totalPct = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100 * 10) / 10 : null

  const periodLabel = MONTHS[month - 1] + ' ' + year

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Account Caps</h1>
          <p className="text-sm text-slate-500 mt-1">Monthly volume limits per EMP account</p>
        </div>
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
          <Button variant="outline" size="icon" onClick={fetchCaps} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Cap</p>
            <p className="text-2xl font-bold text-slate-900">{formatEur(totalCap)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Used</p>
            <p className="text-2xl font-bold text-slate-900">{formatEur(totalUsed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Remaining</p>
            <p className="text-2xl font-bold text-emerald-600">{formatEur(totalRemaining)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Overall Usage</p>
            <p className={`text-2xl font-bold ${getUsageTextColor(totalPct)}`}>
              {totalPct !== null ? `${totalPct}%` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-slate-500" />
            <span>{periodLabel}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Account</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Monthly Cap</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Used</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Remaining</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Transactions</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-500 w-[200px]">Usage</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-500 w-[80px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900">{account.name}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
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
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900">{formatEur(account.used)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={account.remaining !== null && account.remaining < 50000 ? 'text-red-600 font-medium' : 'text-slate-900'}>
                          {formatEur(account.remaining)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">{account.tx_count.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        {account.usage_percentage !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getUsageColor(account.usage_percentage)}`}
                                style={{ width: `${Math.min(account.usage_percentage, 100)}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium w-[45px] text-right ${getUsageTextColor(account.usage_percentage)}`}>
                              {account.usage_percentage}{'%'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">{'—'}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editingId === account.id ? (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSave(account.id)} disabled={saving}>
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-emerald-600" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
                              <X className="h-3.5 w-3.5 text-slate-400" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(account)}>
                            <Pencil className="h-3.5 w-3.5 text-slate-400" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}