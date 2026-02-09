/**
 * BAV Verification Modal for manual BAV triggering.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, ShieldCheck, AlertTriangle, CreditCard } from 'lucide-react'
import type { BavStats } from '@/types'

interface BavVerificationModalProps {
  uploadId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

export function BavVerificationModal({
  uploadId,
  open,
  onOpenChange,
  onComplete,
}: BavVerificationModalProps) {
  const [stats, setStats] = useState<BavStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [limit, setLimit] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState({ processed: 0, total: 0, percentage: 0 })

  const fetchStats = useCallback(async () => {
    if (!open) return
    setLoading(true)
    try {
      const data = await api.getBavStats(uploadId)
      setStats(data)
      setLimit(Math.min(data.eligible_count, data.credits_remaining))
      setIsProcessing(data.bav_status === 'processing')
    } catch (error) {
      console.error('Failed to fetch BAV stats:', error)
      toast.error('Failed to load BAV stats')
    } finally {
      setLoading(false)
    }
  }, [uploadId, open])

  const fetchProgress = useCallback(async () => {
    try {
      const response = await api.getBavStatus(uploadId)
      setProgress({
        processed: response.data.processed,
        total: response.data.total,
        percentage: response.data.percentage,
      })
      if (response.data.status === 'completed') {
        setIsProcessing(false)
        toast.success('BAV verification completed!')
        onComplete?.()
        fetchStats()
      } else if (response.data.status === 'failed') {
        setIsProcessing(false)
        toast.error('BAV verification failed')
        fetchStats()
      }
    } catch (error) {
      console.error('Failed to fetch BAV progress:', error)
    }
  }, [uploadId, onComplete, fetchStats])

  useEffect(() => {
    if (open) {
      fetchStats()
    }
  }, [open, fetchStats])

  useEffect(() => {
    if (!isProcessing) return
    const interval = setInterval(fetchProgress, 3000)
    return () => clearInterval(interval)
  }, [isProcessing, fetchProgress])

  const handleStart = async () => {
    if (!stats || limit <= 0) return

    setStarting(true)
    try {
      const response = await api.startBavVerification(uploadId, limit)
      if (response.success) {
        toast.success(response.data?.message || 'BAV verification started')
        setIsProcessing(true)
        setProgress({ processed: 0, total: response.data?.total_count || limit, percentage: 0 })
      } else {
        toast.error(response.error || 'Failed to start BAV verification')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to start BAV verification')
    } finally {
      setStarting(false)
    }
  }

  const handleCancel = async () => {
    try {
      const response = await api.cancelBavVerification(uploadId)
      if (response.success) {
        toast.success('BAV verification cancelled')
        setIsProcessing(false)
        fetchStats()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel')
    }
  }

  const maxLimit = stats ? Math.min(stats.eligible_count, stats.credits_remaining) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            BAV Verification
          </DialogTitle>
          <DialogDescription>
            Verify bank account ownership with issuing banks
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : stats ? (
          <div className="space-y-4">
            {/* Credits Info */}
            <div className="bg-slate-50 rounded-lg p-4 border">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-slate-600" />
                <span className="font-medium text-slate-700">BAV Credits</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-slate-900">
                  {stats.credits_remaining}
                </span>
                <span className="text-slate-500">
                  / {stats.credits_total} total
                </span>
              </div>
              {stats.is_expired && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Credits expired! Please renew subscription.
                </div>
              )}
            </div>

            {/* Eligible Count */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Eligible debtors</span>
                <span className="font-bold text-blue-900">{stats.eligible_count}</span>
              </div>
            </div>

            {isProcessing ? (
              /* Processing State */
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Progress</span>
                  <span className="font-medium">
                    {progress.processed} / {progress.total}
                  </span>
                </div>
                <Progress 
                  value={progress.processed} 
                  max={progress.total || 100} 
                  className="h-3"
                />
                <p className="text-center text-sm text-slate-500">
                  {progress.percentage}% complete
                </p>
              </div>
            ) : stats.can_start ? (
              /* Input State */
              <div className="space-y-3">
                <Label htmlFor="bav-limit">Records to verify</Label>
                <Input
                  id="bav-limit"
                  type="number"
                  min={1}
                  max={maxLimit}
                  value={limit}
                  onChange={(e) => setLimit(Math.min(Number(e.target.value), maxLimit))}
                />
                <p className="text-xs text-slate-500">
                  Max: {maxLimit} (limited by {stats.eligible_count > stats.credits_remaining ? 'credits' : 'eligible debtors'})
                </p>
              </div>
            ) : (
              /* Cannot Start */
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    {stats.eligible_count === 0 
                      ? 'No eligible debtors for BAV verification'
                      : stats.credits_remaining === 0
                      ? 'No credits remaining'
                      : 'Cannot start verification'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          {isProcessing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel Verification
              </Button>
              <Button disabled>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={handleStart}
                disabled={!stats?.can_start || starting || limit <= 0}
              >
                {starting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Start BAV ({limit})
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
