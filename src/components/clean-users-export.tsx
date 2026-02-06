'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { api, CleanUsersStats, CleanUsersExportJob, CleanUsersExportStatus } from '@/lib/api'
import { Download, Loader2, Users, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function CleanUsersExport() {
  const [stats, setStats] = useState<CleanUsersStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [limit, setLimit] = useState<number>(1000)
  const [minDays, setMinDays] = useState<number>(30)
  
  // Job tracking
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<CleanUsersExportStatus | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getCleanUsersStats(minDays)
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch clean users stats:', error)
    } finally {
      setLoading(false)
    }
  }, [minDays])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

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
            toast.success(`Export completed: ${status.processed} records`)
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
    if (!stats || limit > stats.count) {
      toast.error(`Cannot export more than ${stats?.count || 0} available records`)
      return
    }

    setExporting(true)
    setJobId(null)
    setJobStatus(null)

    try {
      const result = await api.exportCleanUsers(limit, minDays)

      if (result instanceof Blob) {
        // Streaming download (small export)
        const url = URL.createObjectURL(result)
        const a = document.createElement('a')
        a.href = url
        a.download = `clean_users_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        toast.success('Export downloaded successfully')
        setExporting(false)
      } else {
        // Job queued (large export)
        setJobId(result.job_id)
        toast.info('Large export queued. Please wait...')
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Export failed')
      setExporting(false)
    }
  }

  const handleDownload = () => {
    if (!jobId) return
    
    const token = localStorage.getItem('auth_token')
    const url = api.getCleanUsersDownloadUrl(jobId)
    
    // Open in new tab with auth
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const isLargeExport = stats && limit > stats.streaming_threshold

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-600" />
          <CardTitle>Clean Users Export</CardTitle>
        </div>
        <CardDescription>
          Export users with approved transactions, no chargebacks, {minDays}+ days old
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-slate-500">Available Clean Users</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.count.toLocaleString() || 0}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={fetchStats}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-days">Minimum Days</Label>
                <Input
                  id="min-days"
                  type="number"
                  min={1}
                  max={365}
                  value={minDays}
                  onChange={(e) => setMinDays(Number(e.target.value))}
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
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  disabled={exporting}
                />
              </div>
            </div>

            {/* Export info */}
            {isLargeExport && (
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
                    {jobStatus.status === 'processing' && `Processing... ${jobStatus.processed.toLocaleString()} / ${jobStatus.limit.toLocaleString()}`}
                    {jobStatus.status === 'completed' && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Completed
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
                  <Button onClick={handleDownload} className="w-full mt-2">
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                )}
              </div>
            )}

            {/* Export Button */}
            {!jobStatus && (
              <Button 
                onClick={handleExport} 
                disabled={exporting || !stats || stats.count === 0 || limit > stats.count}
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
                    Export {limit.toLocaleString()} Records
                  </>
                )}
              </Button>
            )}

            {/* CSV Format Info */}
            <p className="text-xs text-slate-400 text-center">
              CSV format: name, iban, amount, currency
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
