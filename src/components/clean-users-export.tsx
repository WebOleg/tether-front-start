'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, CleanUsersStats, CleanUsersExportStatus, CleanUsersMode } from '@/lib/api'
import type { EmpAccount } from '@/types'
import { Download, Loader2, Users, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function CleanUsersExport() {
  const [stats, setStats] = useState<CleanUsersStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [limitInput, setLimitInput] = useState('1000')
  const [minDaysInput, setMinDaysInput] = useState('30')
  const [mode, setMode] = useState<CleanUsersMode>('broad')
  const [accounts, setAccounts] = useState<EmpAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined)
  
  // Job tracking
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<CleanUsersExportStatus | null>(null)

  const limit = parseInt(limitInput) || 0
  const minDays = parseInt(minDaysInput) || 30

  // Load accounts on mount
  useEffect(() => {
    api.getEmpAccounts().then(setAccounts).catch(console.error)
  }, [])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const days = parseInt(minDaysInput) || 30
      const data = await api.getCleanUsersStats(days, mode, selectedAccountId)
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch clean users stats:', error)
    } finally {
      setLoading(false)
    }
  }, [minDaysInput, mode, selectedAccountId])

  useEffect(() => {
    fetchStats()
  }, [mode, selectedAccountId])

  // Poll job status
  useEffect(() => {
    if (!jobId) return

    const interval = setInterval(async () => {
      try {
        const status = await api.getCleanUsersExportStatus(jobId)
        setJobStatus(status)

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval)
          setExporting(false)
          
          if (status.status === 'completed') {
            toast.success(`Export completed: ${status.processed?.toLocaleString()} records`)
          } else {
            toast.error(`Export failed: ${status.error}`)
          }
        }
      } catch (error) {
        console.error('Failed to get export status:', error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId])

  const handleExport = async () => {
    const exportLimit = parseInt(limitInput) || 0
    const exportMinDays = parseInt(minDaysInput) || 30

    if (exportLimit <= 0) {
      toast.error('Please enter a valid number of records')
      return
    }

    if (!stats || exportLimit > stats.count) {
      toast.error(`Cannot export more than ${stats?.count.toLocaleString() || 0} available records`)
      return
    }

    setExporting(true)
    setJobId(null)
    setJobStatus(null)

    try {
      const result = await api.exportCleanUsers(exportLimit, exportMinDays, mode, selectedAccountId)

      if (result instanceof Blob) {
        const url = URL.createObjectURL(result)
        const a = document.createElement('a')
        a.href = url
        const accountName = accounts.find(a => a.id === selectedAccountId)?.name || 'all'
        a.download = `clean_users_${mode}_${accountName}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        toast.success('Export downloaded successfully')
        setExporting(false)
      } else {
        setJobId(result.job_id)
        toast.info('Large export queued. Please wait...')
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Export failed')
      setExporting(false)
    }
  }

  const handleDownload = async () => {
    if (!jobId || !jobStatus?.filename) return
    
    setDownloading(true)
    try {
      const blob = await api.downloadCleanUsersExport(jobId)
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = jobStatus.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Download started')
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const handleReset = () => {
    setJobId(null)
    setJobStatus(null)
  }

  const isLargeExport = stats && limit > stats.streaming_threshold
  const selectedAccountName = accounts.find(a => a.id === selectedAccountId)?.name

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-600" />
          <CardTitle>Clean Users Export</CardTitle>
        </div>
        <CardDescription>
          Export users with approved transactions, no chargebacks (lifetime), not charged in last {minDays} days
          {selectedAccountName && ` — ${selectedAccountName}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !stats ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Account Filter */}
            <div className="space-y-2">
              <Label>EMP Account</Label>
            <Select
                value={selectedAccountId?.toString() || 'all'}
                onValueChange={(val) => setSelectedAccountId(val === 'all' ? undefined : parseInt(val))}
                disabled={exporting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mode Toggle */}
            <div className="space-y-2">
              <Label>Export Mode</Label>
              <div className="flex gap-2">
                <Button
                  variant={mode === 'broad' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('broad')}
                  disabled={exporting}
                  className="flex-1"
                >
                  Broad (1+ charges)
                </Button>
                <Button
                  variant={mode === 'strict' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('strict')}
                  disabled={exporting}
                  className="flex-1"
                >
                  Strict (2+ charges)
                </Button>
                <Button
                  variant={mode === 'strict3' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('strict3')}
                  disabled={exporting}
                  className="flex-1"
                >
                  Strict (3+ charges)
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                {mode === 'broad'
                  ? 'All users with at least 1 approved charge, 0 lifetime chargebacks, not charged recently'
                  : mode === 'strict'
                  ? 'Users with 2+ approved charges, 0 lifetime chargebacks, not charged recently'
                  : 'Users with 3+ approved charges, 0 lifetime chargebacks, not charged recently'}
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-slate-500">Available Clean Users</p>
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? '...' : stats?.count.toLocaleString() || 0}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={fetchStats} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-days">Not Charged In (Days)</Label>
                <Input
                  id="min-days"
                  type="number"
                  min={1}
                  max={365}
                  value={minDaysInput}
                  onChange={(e) => setMinDaysInput(e.target.value)}
                  onBlur={fetchStats}
                  disabled={exporting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit">Records to Export</Label>
                <Input
                  id="limit"
                  type="number"
                  min={1}
                  max={100000}
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  disabled={exporting}
                />
              </div>
            </div>

            {/* Export info */}
            {isLargeExport && !jobStatus && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Large export ({limit.toLocaleString()} records) will be processed in background. 
                  You can track progress below.
                </span>
              </div>
            )}

            {/* Job Progress */}
            {jobStatus && (
              <div className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {jobStatus.status === 'pending' && 'Waiting to start...'}
                    {jobStatus.status === 'processing' && `Processing... ${jobStatus.processed?.toLocaleString()} / ${limit.toLocaleString()}`}
                    {jobStatus.status === 'completed' && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Completed ({jobStatus.processed?.toLocaleString()} records)
                      </span>
                    )}
                    {jobStatus.status === 'failed' && (
                      <span className="text-red-600">Failed: {jobStatus.error}</span>
                    )}
                  </span>
                  <span className="text-sm text-slate-500">{jobStatus.progress}%</span>
                </div>
                <Progress value={jobStatus.progress} />
                
                {jobStatus.status === 'completed' && (
                  <div className="flex gap-2 mt-2">
                    <Button onClick={handleDownload} disabled={downloading} className="flex-1">
                      {downloading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download CSV ({jobStatus.size ? (jobStatus.size / 1024 / 1024).toFixed(2) + ' MB' : ''})
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      New Export
                    </Button>
                  </div>
                )}

                {jobStatus.status === 'failed' && (
                  <Button variant="outline" onClick={handleReset} className="w-full mt-2">
                    Try Again
                  </Button>
                )}
              </div>
            )}

            {/* Export Button */}
            {!jobStatus && (
              <Button 
                onClick={handleExport} 
                disabled={exporting || !stats || stats.count === 0 || limit <= 0 || limit > stats.count}
                className="w-full"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export {limit > 0 ? limit.toLocaleString() : '0'} Records
                  </>
                )}
              </Button>
            )}

            {/* CSV Format Info */}
            <p className="text-xs text-slate-400 text-center">
              CSV format: first_name, last_name, iban, bic, amount, currency
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
