'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UploadProgress } from '@/components/upload-progress'
import { api, ApiError } from '@/lib/api'
import {
  Upload as LucideUpload,
  FileUp, CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  X,
  FileSpreadsheet,
  Ban,
  Eye,
  Settings2,
  Zap,
  RotateCcw,
  Archive,
  Trash2,
  Building2,
  Filter,
  CreditCard,
  Euro,
  Lock,
  Timer
} from 'lucide-react'
import type { Upload, SkippedCounts, PaginationLinks, PaginationLink, PaginationMeta as PaginationMetaType, EmpAccount } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Pagination, PaginationMeta } from '@/components/ui/pagination'
import { formatCurrency, formatFileSize, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/badges'
import { SkeletonTableRows, type SkeletonColumnDef } from '@/components/ui/skeleton-table'

function formatSkippedMessage(skipped: SkippedCounts): string {
  const parts: string[] = []
  if (skipped.blacklisted > 0) parts.push(`${skipped.blacklisted} blacklisted`)
  if (skipped.chargebacked > 0) parts.push(`${skipped.chargebacked} chargebacked`)
  if (skipped.already_recovered > 0) parts.push(`${skipped.already_recovered} recovered`)
  if (skipped.recently_attempted > 0) parts.push(`${skipped.recently_attempted} recent`)
  if (skipped.skipped_locked > 0) parts.push(`${skipped.skipped_locked} locked`)
  return parts.join(', ')
}

// ... [Interfaces and helper functions remain unchanged] ...
interface UploadWithStats extends Upload {
  approved_count?: number
  approved_percentage?: number | null
  valid_count?: number
  invalid_count?: number
}

interface UploadStatusState {
  type: 'success' | 'error' | 'warning'
  message: string
  errors?: string[]
}

const isValidFileType = (file: File): boolean => {
  const validExtensions = ['.csv', '.txt', '.xlsx', '.xls']
  const validMimeTypes = [
    'text/csv',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]

  const hasValidExtension = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
  )
  const hasValidMimeType = validMimeTypes.includes(file.type)

  return hasValidExtension || hasValidMimeType
}

const uploadTableSkeletonColumns: SkeletonColumnDef[] = [
  { lines: ['h-4 w-40', 'h-3 w-20'], cellClassName: 'px-0' },
  'h-4 w-28',
  'h-5 w-20',
  { lines: ['h-4 w-8'], align: 'center' },
  { lines: ['h-4 w-8'], align: 'center' },
  { lines: ['h-4 w-8'], align: 'center' },
  { lines: ['h-4 w-12'], align: 'center' },
  { lines: ['h-4 w-16'], align: 'center' },
  { lines: ['h-4 w-20'], align: 'center' },
  'h-5 w-24',
  { lines: ['h-4 w-10'], align: 'center' },
  'h-4 w-24',
  { lines: ['h-8 w-8', 'h-8 w-8'], row: true },
]

export default function UploadsPage() {
  const [uploads, setUploads] = useState<UploadWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [billingModel, setBillingModel] = useState<string>('legacy')
  const [is30dCool, setIs30dCool] = useState<boolean | null>(true)
  const [skipChargebackCheck, setSkipChargebackCheck] = useState<boolean>(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<UploadStatusState | null>(null)
  const [activeUploadId, setActiveUploadId] = useState<number | null>(null)
  const [lastSkipped, setLastSkipped] = useState<SkippedCounts | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [uploadToDelete, setUploadToDelete] = useState<number | null>(null)
  // [NEW] State for Lock Confirmation
  const [showLockConfirmation, setShowLockConfirmation] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [meta, setMeta] = useState<PaginationMetaType | null>(null)
  const [links, setLinks] = useState<PaginationLinks | null>(null)
  const [paginationLinks, setPaginationLinks] = useState<PaginationLink[]>([])
  const completedUploadsRef = useRef<Set<number>>(new Set());
  const [empAccounts, setEmpAccounts] = useState<EmpAccount[]>([])
  const [selectedEmpAccountId, setSelectedEmpAccountId] = useState<number | undefined>(undefined)
  const [filterEmpAccountId, setFilterEmpAccountId] = useState<string>('all')
  const [activeEmpAccount, setActiveEmpAccount] = useState<EmpAccount | null>(null)

  const fetchEmpAccounts = async () => {
    try {
      const accounts = await api.getEmpAccounts()
      setEmpAccounts(accounts)
      const active = accounts.find(a => a.is_active)
      if (active) {
        setSelectedEmpAccountId(active.id)
        setActiveEmpAccount(active)
      }
    } catch (error) {
      console.error('Failed to fetch EMP accounts:', error)
    }
  }

  const fetchUploads = async () => {
    setLoading(true)
    try {
      const filters: { page?: number; per_page: number; emp_account_id?: number } = {
        page: currentPage,
        per_page: 50
      }

      if (filterEmpAccountId !== 'all') {
        filters.emp_account_id = Number(filterEmpAccountId)
      }

      const response = await api.getUploads(filters)

      setUploads(response.data)
      setMeta(response.meta || null)
      setLinks(response.links || null)

      if (response.meta && 'links' in response.meta) {
        setPaginationLinks((response.meta as PaginationMetaType & {links? : PaginationLink[]}).links || [])
      }
    } catch (error) {
      console.error('Failed to fetch uploads:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmpAccounts()
  }, [])

  useEffect(() => {
    fetchUploads()
  }, [currentPage, filterEmpAccountId])

  const handleFilterChange = (value: string) => {
    setFilterEmpAccountId(value)
    setCurrentPage(1)
  }

  const handlePreviousPage = () => {
    if (links?.prev) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (links?.next) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePageClick = (page: number) => {
    setCurrentPage(page)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null
    setUploadStatus(null)
    setLastSkipped(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (!selectedFile) {
      setFile(null)
      return
    }

    if (!isValidFileType(selectedFile)) {
      setFile(null)
      setUploadStatus({ type: 'error', message: 'Invalid file type. Please upload a CSV, TXT or XLSX file.' })
      return
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setFile(null)
      setUploadStatus({ type: 'error', message: 'File too large. Maximum size is 50MB.' })
      return
    }

    setFile(selectedFile)
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const relatedTarget = e.relatedTarget as Node | null
    if (relatedTarget && dropZoneRef.current?.contains(relatedTarget)) {
      return
    }

    setIsDragActive(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0]

      if (!isValidFileType(droppedFile)) {
        setUploadStatus({ type: 'error', message: 'Invalid file type. Please upload a CSV, TXT or XLSX file.' })
        return
      }

      if (droppedFile.size > 50 * 1024 * 1024) {
        setUploadStatus({ type: 'error', message: 'File too large. Maximum size is 50MB.' })
        return
      }

      setFile(droppedFile)
      setUploadStatus(null)
      setLastSkipped(null)
    }
  }

  // [NEW] Interceptor: Validates file and triggers modal instead of uploading immediately
  const handleStartUploadClick = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!file) {
      setUploadStatus({ type: 'error', message: 'Please select a file first' })
      return
    }

    if (!isValidFileType(file)) {
      setUploadStatus({ type: 'error', message: 'Invalid file type. Please upload a CSV, TXT or XLSX file.' })
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus({ type: 'error', message: 'File too large. Maximum size is 50MB.' })
      return
    }

    // Trigger confirmation modal
    setShowLockConfirmation(true)
  }

  // [NEW] Executor: Performs the actual upload with the lock flag
  const executeUpload = async (applyGlobalLock: boolean) => {
    setShowLockConfirmation(false)

    if (!file) return

    setIsUploading(true)
    setUploadStatus(null)
    setActiveUploadId(null)
    setLastSkipped(null)
    completedUploadsRef.current.clear()

    try {
      // Pass the lock flag to the API
      const result = await api.uploadFile(file, billingModel, selectedEmpAccountId, applyGlobalLock, undefined, billingModel === 'legacy' ? is30dCool : null, skipChargebackCheck)
      setActiveUploadId(result.upload.id)

      if (result.skipped && result.skipped.total > 0) {
        setLastSkipped(result.skipped)
      }

      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setIs30dCool(billingModel === 'legacy' ? true : null)
      setSkipChargebackCheck(false)
    } catch (error) {
      if (error instanceof ApiError) {
        setUploadStatus({
          type: 'error',
          message: error.message,
          errors: error.errors.length > 0 ? error.errors : undefined
        })
      } else {
        setUploadStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Upload failed'
        })
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleProgressComplete = (upload: Upload) => {
    if (completedUploadsRef.current.has(upload.id)) {
      return;
    }
    completedUploadsRef.current.add(upload.id);

    fetchUploads()

    const successful = upload.processed_records - upload.failed_records
    let message = `Completed: ${successful} created, ${upload.failed_records} failed`

    if (lastSkipped && lastSkipped.total > 0) {
      message += `, ${lastSkipped.total} skipped (${formatSkippedMessage(lastSkipped)})`
      setUploadStatus({ type: 'warning', message })
    } else {
      setUploadStatus({ type: 'success', message })
    }

    setTimeout(() => {
      setActiveUploadId(null)
    }, 3000)
  }

  const handleProgressError = (error: string) => {
    setUploadStatus({ type: 'error', message: error })
    fetchUploads()
  }

  const dismissProgress = () => {
    setActiveUploadId(null)
    setLastSkipped(null)
    fetchUploads()
  }

  const handleDeleteClick = (uploadId: number) => {
    setUploadToDelete(uploadId)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!uploadToDelete) return

    try {
      const result = await api.deleteUpload(uploadToDelete)
      if(result.success === true){
        toast.success(result.message || 'Upload deleted successfully')
        setUploads(uploads.filter(upload => upload.id !== uploadToDelete))
        setUploadToDelete(null)
        setDeleteModalOpen(false)
      }else{
        toast.error(result.message || 'Upload is not deleted.')
        setUploadToDelete(null)
      }
    } catch (error) {
      toast.error("Upload is not deleted.")
    }
  }

  return (
      <>
        <Header
            title="Uploads"
            description="Upload and manage CSV/TXT/XLSX files for debt processing"
        />
        <div className="p-6">
          <Card className="mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileUp className="h-5 w-5 text-slate-500" />
                  <CardTitle>Upload File</CardTitle>
                </div>
              </div>
              <CardDescription>
                Select a CSV, TXT or XLSX file to upload debtor records (max 50MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleStartUploadClick} className="space-y-4">

                <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between p-4 rounded-lg border bg-slate-50/50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-slate-500" />
                      <Label htmlFor="billing-model" className="text-base font-medium text-slate-900">
                        Configuration
                      </Label>
                    </div>
                    <p className="text-sm text-slate-500">
                      Select billing model and EMP account
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="w-full sm:w-[200px]">
                      <Select
                          value={billingModel}
                          onValueChange={(value) => {
                            setBillingModel(value)
                            if (value !== 'legacy') {
                              setIs30dCool(null)
                            } else {
                              setIs30dCool(true)
                            }
                          }}
                          disabled={isUploading}
                      >
                        <SelectTrigger id="billing-model" className="bg-white">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="legacy">
                            <div className="flex items-center gap-2">
                              <Archive className="h-4 w-4 text-slate-500" />
                              <span>Legacy</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="flywheel">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-blue-600" />
                              <span>Flywheel</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="recovery">
                            <div className="flex items-center gap-2">
                              <RotateCcw className="h-4 w-4 text-purple-600" />
                              <span>Recovery</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full sm:w-[200px]">
                      <Select
                          key={selectedEmpAccountId}
                          value={selectedEmpAccountId?.toString() || undefined}
                          onValueChange={(value) => setSelectedEmpAccountId(Number(value))}
                          disabled={isUploading || empAccounts.length === 0}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select EMP Account" />
                        </SelectTrigger>
                        <SelectContent>
                          {empAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-emerald-600" />
                                  <span>{account.name}</span>
                                  {account.is_active && (
                                      <Badge variant="outline" className="ml-1 text-xs">Active</Badge>
                                  )}
                                </div>
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full sm:w-40">
                      <Select
                          value={is30dCool === null ? '' : is30dCool ? 'true' : 'false'}
                          onValueChange={(value) => setIs30dCool(value === 'true')}
                          disabled={isUploading || billingModel !== 'legacy'}
                      >
                        <SelectTrigger className="bg-white">
                          {is30dCool === null ? (
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-blue-600" />
                              <span className="text-slate-900">30 Day Cool</span>
                            </div>
                          ) : is30dCool ? (
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-blue-600" />
                              <span>30 Day Cool</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-slate-400" />
                              <span>No Cooldown</span>
                            </div>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-blue-600" />
                              <span>30 Day Cool</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="false">
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-slate-400" />
                              <span>No Cooldown</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipChargebackCheck}
                        onChange={(e) => setSkipChargebackCheck(e.target.checked)}
                        disabled={isUploading}
                        className="rounded border-slate-300"
                      />
                      <span className={isUploading ? 'text-slate-400' : 'text-slate-600'}>Skip CB Check</span>
                    </label>
                  </div>
                </div>

                <div
                    ref={dropZoneRef}
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
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
                      {isDragActive ? 'Drop your file here' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-sm text-slate-500">
                      CSV, TXT or XLSX (max 50MB)
                    </p>
                  </div>

                  <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isUploading}
                  />
                </div>

                {file && !uploadStatus && !activeUploadId && (
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-md">
                          <FileSpreadsheet className="h-5 w-5 text-green-700" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{file.name}</p>
                          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                          type="submit"
                          disabled={isUploading}
                          className="gap-2 min-w-[120px]"
                      >
                        {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                        ) : (
                            <>
                              <LucideUpload className="h-4 w-4" />
                              Start Upload
                            </>
                        )}
                      </Button>
                    </div>
                )}
              </form>

              {activeUploadId && (
                  <div className="relative">
                    <button
                        onClick={dismissProgress}
                        className="absolute -top-2 -right-2 z-10 p-1 bg-white rounded-full shadow-md hover:bg-slate-100"
                    >
                      <X className="h-4 w-4 text-slate-500" />
                    </button>
                    <UploadProgress
                        uploadId={activeUploadId}
                        onComplete={handleProgressComplete}
                        onError={handleProgressError}
                    />
                  </div>
              )}

              {uploadStatus && !activeUploadId && (
                  <div className={`p-3 rounded-lg border ${
                      uploadStatus.type === 'success'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : uploadStatus.type === 'warning'
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {uploadStatus.type === 'success' ? (
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      ) : uploadStatus.type === 'warning' ? (
                          <Ban className="h-4 w-4 flex-shrink-0" />
                      ) : (
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium">{uploadStatus.message}</span>
                    </div>
                    {uploadStatus.errors && uploadStatus.errors.length > 0 && (
                        <ul className="mt-2 ml-6 text-sm list-disc space-y-1">
                          {uploadStatus.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                          ))}
                        </ul>
                    )}
                  </div>
              )}
            </CardContent>
          </Card>

          <div className="mb-0 px-2">
            <h2 className="text-lg font-semibold text-slate-900">Upload History</h2>
            <p className="text-sm text-slate-500">View all uploaded files and their validation status</p>
          </div>

          <div className="flex items-center justify-between mb-2 px-2">
            <PaginationMeta
                meta={meta}
                label="uploads"
                containerClassName="px-0 py-0"
            />
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <Select value={filterEmpAccountId} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by account" />
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
          </div>

          <div className="bg-white rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">File</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Records</TableHead>
                    <TableHead className="text-center">Valid</TableHead>
                    <TableHead className="text-center">Invalid</TableHead>
                    <TableHead className="text-center">Approved</TableHead>
                    <TableHead className="text-center">CB %</TableHead>
                    <TableHead className="text-center">CB Amt %</TableHead>
                    <TableHead>Cool 30d</TableHead>
                    <TableHead className="text-center">Resync</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                      <SkeletonTableRows rows={8} columns={uploadTableSkeletonColumns} />
                  ) : uploads.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={13} className="text-center py-8 text-slate-500">
                          No uploads yet
                        </TableCell>
                      </TableRow>
                  ) : (
                      uploads.map((upload) => {
                        const total = upload.total_records || 0
                        const valid = upload.valid_count || 0
                        const invalid = upload.invalid_count || 0
                        const approved = upload.approved_count || 0
                        const approvedPercent = upload.approved_percentage
                        const skippedTotal = upload.skipped?.total || 0
                        const cbPercent = upload.cb_percentage
                        const cbAmtPercent = upload.cb_amount_percentage
                        const cbCount = upload.chargeback_count || 0
                        const cbAmount = upload.chargeback_amount || 0

                        return (
                            <TableRow key={upload.id} className="hover:bg-slate-50">
                              <TableCell className="px-2">
                                <Link href={`/admin/uploads/${upload.id}`} className="hover:underline">
                                  <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-slate-400" />
                                    <div>
                                      <p className="font-medium text-blue-600">{upload.original_filename}</p>
                                      <p className="text-xs text-slate-500">{formatFileSize(upload.file_size)}</p>
                                    </div>
                                  </div>
                                </Link>
                              </TableCell>
                              <TableCell>
                                {upload.emp_account ? (
                                    <div className="flex items-center gap-1.5">
                                      <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                                      <span className="text-sm font-medium text-slate-700">
                                  {upload.emp_account.name}
                                </span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={upload.status} />
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-medium">{total}</span>
                                {skippedTotal > 0 && (
                                    <span className="text-xs text-slate-400 ml-1">(-{skippedTotal})</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-sm font-medium">{valid}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1 text-orange-500">
                                  <XCircle className="h-4 w-4" />
                                  <span className="text-sm font-medium">{invalid}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {approved > 0 || approvedPercent !== null ? (
                                    <div className="flex items-center justify-center gap-1 text-blue-600">
                                      <CreditCard className="h-4 w-4" />
                                      <span className="text-sm font-medium">
                                  {approved}
                                        {approvedPercent !== null && approvedPercent !== undefined && (
                                            <span className="text-xs ml-1">({Math.round(approvedPercent)}%)</span>
                                        )}
                                </span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {cbPercent !== null && cbPercent !== undefined ? (
                                    <span className={`text-sm font-medium ${cbPercent === 0 ? 'text-green-600' : cbPercent < 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {cbCount} ({Math.round(cbPercent)}%)
                              </span>
                                ) : (
                                    <span className="text-sm text-slate-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {cbAmtPercent !== null && cbAmtPercent !== undefined ? (
                                    <span className={`text-sm font-medium ${cbAmtPercent === 0 ? 'text-green-600' : cbAmtPercent < 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                { formatCurrency(cbAmount) } ({Math.round(cbAmtPercent)}%)
                              </span>
                                ) : (
                                    <span className="text-sm text-slate-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {upload.is_30d_cool === true ? (
                                    <Badge className="flex items-center gap-1 w-fit bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                                      <Timer className="h-3 w-3" />
                                      30 Day Cool
                                    </Badge>
                                ) : upload.is_30d_cool === false ? (
                                    <Badge variant="outline" className="flex items-center gap-1 w-fit text-slate-400">
                                      <Timer className="h-3 w-3" />
                                      No Cooldown
                                    </Badge>
                                ) : (
                                    <span className="text-sm text-slate-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {upload.resync_count !== undefined ? (
                                  <span className={`text-sm font-medium ${
                                    upload.resync_count >= (upload.max_resync ?? 3)
                                      ? 'text-red-500'
                                      : upload.resync_count > 0
                                      ? 'text-amber-600'
                                      : 'text-slate-400'
                                  }`}>
                                    {upload.resync_count} / {upload.max_resync ?? 3}
                                  </span>
                                ) : (
                                  <span className="text-sm text-slate-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-slate-500">
                                {formatDate(upload.created_at)}
                              </TableCell>
                              <TableCell>
                                <Link href={`/admin/uploads/${upload.id}`} >
                                  <Button
                                      variant="default"
                                      size="icon"
                                      className="h-8 w-8 mr-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Link href={`/admin/uploads/cb-reasons?upload_id=${upload.id}`}>
                                  <Button
                                      variant="default"
                                      size="sm"
                                      className="h-8 w-8 mr-2"
                                      title="View CB Reasons"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </Link>
                                {upload.is_deletable && (
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleDeleteClick(upload.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                              </TableCell>
                            </TableRow>
                        )
                      })
                  )}
                </TableBody>
              </Table>
          </div>

          <div className="border-t">
            <Pagination
                meta={meta}
                links={links}
                paginationLinks={paginationLinks}
                onPageChange={handlePageClick}
                onPreviousClick={handlePreviousPage}
                onNextClick={handleNextPage}
            />
          </div>

          {/* Delete Modal */}
          <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Upload</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this upload? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                    variant="outline"
                    onClick={() => setDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                    variant="destructive"
                    onClick={handleConfirmDelete}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showLockConfirmation} onOpenChange={setShowLockConfirmation}>
            <DialogContent>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-blue-100">
                    <Lock className="h-5 w-5 text-blue-600" />
                  </div>
                  <DialogTitle>Apply Global IBAN Lock?</DialogTitle>
                </div>
                <DialogDescription className="pt-2">
                  Do you want to apply the Global IBAN Lock rule? (Exclude IBANs paid on other accounts)
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                    variant="outline"
                    onClick={() => executeUpload(false)}
                >
                  No, proceed normally
                </Button>
                <Button
                    onClick={() => executeUpload(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                  Yes, apply lock
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </>
  )
}