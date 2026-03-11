/**
 * BAV Auto - Standalone BAV batch verification page.
 * Upload CSV, auto-detect columns, verify IBANs, download results.
 */

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Header } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api, ApiError } from '@/lib/api'
import {
  ScanSearch,
  FileUp,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Play,
  Coins,
  Clock,
  XCircle,
  Eye,
  Hash,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import type { BavBatchItem, BavBatchUploadResponse, BavBatchProgress } from '@/types'

type Step = 'upload' | 'preview' | 'processing' | 'done'

export default function BavAutoPage() {
  const [step, setStep] = useState<Step>('upload')
  const [batches, setBatches] = useState<BavBatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<BavBatchUploadResponse | null>(null)
  const [progress, setProgress] = useState<BavBatchProgress | null>(null)
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null)
  const [credits, setCredits] = useState<{ remaining: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recordLimit, setRecordLimit] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const fetchBatches = async () => {
    try {
      const data = await api.getBavBatches()
      setBatches(data)
    } catch (e) {
      console.error('Failed to fetch batches:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchBalance = async () => {
    try {
      const data = await api.getBavBatchBalance()
      if (data.success) {
        setCredits({ remaining: data.credits_remaining, total: data.credits_total })
      }
    } catch (e) {
      console.error('Failed to fetch balance:', e)
    }
  }

  useEffect(() => {
    fetchBatches()
    fetchBalance()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const startPolling = useCallback((batchId: number) => {
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const status = await api.getBavBatchStatus(batchId)
        setProgress(status)

        if (status.status === 'completed' || status.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
          setStep(status.status === 'completed' ? 'done' : 'upload')
          fetchBatches()
          fetchBalance()

          if (status.status === 'completed') {
            toast.success(`BAV completed: ${status.success} verified, ${status.failed} failed`)
          } else {
            toast.error('BAV batch failed')
          }
        }
      } catch (e) {
        console.error('Poll error:', e)
      }
    }, 2000)
  }, [])

  const handleFileSelect = (selectedFile: File) => {
    setError(null)
    const validExts = ['.csv', '.txt']
    const hasValidExt = validExts.some(ext => selectedFile.name.toLowerCase().endsWith(ext))

    if (!hasValidExt) {
      setError('Please upload a CSV or TXT file')
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum 5MB.')
      return
    }

    setFile(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setError(null)

    try {
      const result = await api.uploadBavBatch(file)
      setUploadResult(result)
      setRecordLimit(null)
      setStep('preview')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Upload failed')
      }
    } finally {
      setIsUploading(false)
    }
  }

  const effectiveLimit = uploadResult
    ? (recordLimit !== null ? recordLimit : uploadResult.total_records)
    : 0

  const handleStart = async () => {
    if (!uploadResult) return

    try {
      const limit = recordLimit !== null ? recordLimit : undefined
      const result = await api.startBavBatch(uploadResult.batch_id, limit)
      setActiveBatchId(uploadResult.batch_id)
      setStep('processing')
      setProgress({
        status: 'processing',
        total: uploadResult.total_records,
        record_limit: recordLimit,
        effective_limit: effectiveLimit,
        processed: 0,
        success: 0,
        failed: 0,
        credits_used: 0,
        percentage: 0,
        started_at: new Date().toISOString(),
        completed_at: null,
      })
      startPolling(uploadResult.batch_id)
      toast.success(result.message)
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message)
      }
    }
  }

  const handleDownload = async (batchId: number, filename: string) => {
    try {
      const blob = await api.downloadBavBatchResults(batchId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bav_results_${filename}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error('Download failed')
    }
  }

  const handleReset = () => {
    setStep('upload')
    setUploadResult(null)
    setProgress(null)
    setActiveBatchId(null)
    setError(null)
    setFile(null)
    setRecordLimit(null)
    fetchBatches()
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Processing</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <>
      <Header
        title="BAV Auto"
        description="Upload CSV files for automatic Bank Account Verification"
      />
      <div className="p-6 space-y-6">
        {/* Credits Banner */}
        {credits && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Coins className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              BAV Credits: <span className="text-amber-900 font-bold">{credits.remaining.toLocaleString()}</span> / {credits.total.toLocaleString()} remaining
            </span>
          </div>
        )}

        {/* Step: Upload */}
        {step === 'upload' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ScanSearch className="h-5 w-5 text-slate-500" />
                <CardTitle>Upload CSV for BAV</CardTitle>
              </div>
              <CardDescription>
                Upload a CSV with IBAN and name columns. Columns are auto-detected.
                Supported formats: First,Last,IBAN,BIC or Last,First,IBAN,BIC (with or without headers).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                ref={dropZoneRef}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true) }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false) }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/50'
                }`}
              >
                <div className={`p-4 rounded-full ${isDragActive ? 'bg-blue-100' : 'bg-white shadow-sm ring-1 ring-slate-200'}`}>
                  <FileUp className={`h-8 w-8 ${isDragActive ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                <div className="text-center space-y-1">
                  <p className={`font-medium text-lg ${isDragActive ? 'text-blue-700' : 'text-slate-700'}`}>
                    {isDragActive ? 'Drop your CSV here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-sm text-slate-500">CSV or TXT (max 5MB)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>

              {file && (
                <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-md">
                      <FileSpreadsheet className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button onClick={handleUpload} disabled={isUploading} className="gap-2">
                    {isUploading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Eye className="h-4 w-4" /> Analyze & Preview</>
                    )}
                  </Button>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step: Preview */}
        {step === 'preview' && uploadResult && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    {uploadResult.filename}
                  </CardTitle>
                  <CardDescription className="mt-1">
  {uploadResult.total_records} records detected. Review the preview below and confirm to start BAV.
  {(uploadResult as any).already_verified > 0 && (
    <span className="block mt-1 text-green-600">
      {(uploadResult as any).already_verified} already verified (will be skipped), {(uploadResult as any).eligible ?? (uploadResult.total_records - (uploadResult as any).already_verified)} eligible for new verification.
    </span>
  )}
</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    {uploadResult.column_mapping.has_header ? 'Headers detected' : 'No headers (auto-detect)'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Column mapping info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['iban', 'first_name', 'last_name', 'bic'].map((col) => (
                  <div key={col} className="p-3 bg-slate-50 rounded-lg border">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{col.replace('_', ' ')}</p>
                    <p className="text-sm font-medium mt-1">
                      {(uploadResult.column_mapping as any)[col] !== null
                        ? `Column ${(uploadResult.column_mapping as any)[col]}`
                        : <span className="text-slate-400">Not found</span>
                      }
                    </p>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>IBAN</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>BIC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadResult.preview.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">
                          {row.iban.substring(0, 4)}****{row.iban.substring(row.iban.length - 4)}
                        </TableCell>
                        <TableCell>{row.first_name}</TableCell>
                        <TableCell>{row.last_name}</TableCell>
                        <TableCell className="font-mono text-xs">{row.bic || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Record limit selector */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Records to verify</span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={uploadResult.total_records}
                    value={effectiveLimit}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setRecordLimit(val === uploadResult.total_records ? null : val)
                    }}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={uploadResult.total_records}
                      value={effectiveLimit}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        if (!isNaN(val) && val >= 1 && val <= uploadResult.total_records) {
                          setRecordLimit(val === uploadResult.total_records ? null : val)
                        }
                      }}
                      className="w-20 px-2 py-1 text-sm text-center border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-500">/ {uploadResult.total_records}</span>
                  </div>
                </div>
                {recordLimit !== null && (
                  <button
                    onClick={() => setRecordLimit(null)}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    Reset to all records
                  </button>
                )}
              </div>

              {/* Credit cost warning */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Coins className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    This will use approximately <span className="font-bold">{effectiveLimit}</span> BAV credits
                    {recordLimit !== null && (
                      <span className="text-blue-600"> (out of {uploadResult.total_records} total records)</span>
                    )}
                    .
                  </p>
                  {credits && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      You have {credits.remaining.toLocaleString()} credits remaining.
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleStart} className="gap-2 bg-green-600 hover:bg-green-700">
                  <Play className="h-4 w-4" /> Start BAV Verification ({effectiveLimit} records)
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Processing */}
        {step === 'processing' && progress && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                Processing BAV Verification
              </CardTitle>
              <CardDescription>
                Verifying {progress.effective_limit} records{progress.effective_limit < progress.total ? ` (of ${progress.total} total)` : ''}. This may take a few minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Progress</span>
                  <span className="font-medium">{progress.processed} / {progress.effective_limit} ({progress.percentage}%)</span>
                </div>
                <Progress value={progress.percentage} className="h-3" />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{progress.success}</p>
                  <p className="text-xs text-green-600">Verified</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-700">{progress.failed}</p>
                  <p className="text-xs text-red-600">Failed</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-700">{progress.credits_used}</p>
                  <p className="text-xs text-amber-600">Credits Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Done */}
        {step === 'done' && progress && activeBatchId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                BAV Verification Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-3xl font-bold text-green-700">{progress.success}</p>
                  <p className="text-sm text-green-600 mt-1">Verified</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-3xl font-bold text-red-700">{progress.failed}</p>
                  <p className="text-sm text-red-600 mt-1">Failed</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-3xl font-bold text-amber-700">{progress.credits_used}</p>
                  <p className="text-sm text-amber-600 mt-1">Credits Used</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => handleDownload(activeBatchId, uploadResult?.filename || 'batch.csv')}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" /> Download Results CSV
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  New Batch
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Batch History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-500" />
              Batch History
            </CardTitle>
            <CardDescription>Previous BAV verification batches</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Records</TableHead>
                  <TableHead className="text-center">Verified</TableHead>
                  <TableHead className="text-center">Failed</TableHead>
                  <TableHead className="text-center">Credits</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      No BAV batches yet
                    </TableCell>
                  </TableRow>
                ) : (
                  batches.map((batch) => (
                    <TableRow key={batch.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-sm">{batch.filename}</span>
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(batch.status)}</TableCell>
                      <TableCell className="text-center font-medium">
                        {batch.record_limit && batch.record_limit < batch.total_records
                          ? <span>{batch.record_limit} <span className="text-slate-400 text-xs">/ {batch.total_records}</span></span>
                          : batch.total_records
                        }
                      </TableCell>
                      <TableCell className="text-center text-green-600 font-medium">{batch.success_count}</TableCell>
                      <TableCell className="text-center text-red-600 font-medium">{batch.failed_count}</TableCell>
                      <TableCell className="text-center text-amber-600 font-medium">{batch.credits_used}</TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDate(batch.created_at)}</TableCell>
                      <TableCell>
                        {batch.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-blue-600 hover:text-blue-700"
                            onClick={() => handleDownload(batch.id, batch.filename)}
                          >
                            <Download className="h-3.5 w-3.5" /> CSV
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
