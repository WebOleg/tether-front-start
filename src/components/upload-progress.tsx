/**
 * Upload progress component with polling.
 * Shows real-time processing status for uploaded files.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import type { Upload } from '@/types'

interface UploadProgressProps {
  uploadId: number
  onComplete?: (upload: Upload) => void
  onError?: (error: string) => void
}

const statusConfig = {
  pending: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: Loader2,
    animate: true 
  },
  processing: { 
    label: 'Processing', 
    color: 'bg-blue-100 text-blue-800',
    icon: Loader2,
    animate: true 
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    animate: false 
  },
  failed: { 
    label: 'Failed', 
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    animate: false 
  },
}

export function UploadProgress({ uploadId, onComplete, onError }: UploadProgressProps) {
  const [upload, setUpload] = useState<Upload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getUpload(uploadId)
      setUpload(data)

      if (data.status === 'completed') {
        onComplete?.(data)
      } else if (data.status === 'failed') {
        onError?.('Processing failed')
      }

      return data.status
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch status'
      setError(message)
      onError?.(message)
      return 'failed'
    }
  }, [uploadId, onComplete, onError])

  useEffect(() => {
    fetchStatus()

    const interval = setInterval(async () => {
      const status = await fetchStatus()
      if (status === 'completed' || status === 'failed') {
        clearInterval(interval)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [fetchStatus])

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!upload) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const config = statusConfig[upload.status as keyof typeof statusConfig]
  const Icon = config.icon
  const progress = upload.total_records > 0 
    ? Math.round((upload.processed_records / upload.total_records) * 100)
    : 0

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              <span className="font-medium text-sm">{upload.original_filename}</span>
            </div>
            <Badge className={config.color}>
              <Icon className={`h-3 w-3 mr-1 ${config.animate ? 'animate-spin' : ''}`} />
              {config.label}
            </Badge>
          </div>

          <Progress value={progress} className="h-2" />

          <div className="flex justify-between text-xs text-slate-500">
            <span>
              {upload.processed_records} / {upload.total_records} records
            </span>
            <span>{progress}%</span>
          </div>

          {upload.status === 'completed' && (
            <div className="flex gap-4 text-xs">
              <span className="text-green-600">
                ✓ {upload.processed_records - upload.failed_records} successful
              </span>
              {upload.failed_records > 0 && (
                <span className="text-red-600">
                  ✗ {upload.failed_records} failed
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
