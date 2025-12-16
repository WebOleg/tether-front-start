/**
 * Uploads list page.
 * Shows upload form and list of CSV uploads with status.
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { api } from '@/lib/api'
import { Upload as LucideUpload, FileUp, CheckCircle, AlertCircle, XCircle, Loader2, X, FileSpreadsheet, Ban } from 'lucide-react'
import type { Upload, SkippedCounts } from '@/types'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatSkippedMessage(skipped: SkippedCounts): string {
  const parts: string[] = []
  if (skipped.blacklisted > 0) parts.push(`${skipped.blacklisted} blacklisted`)
  if (skipped.chargebacked > 0) parts.push(`${skipped.chargebacked} chargebacked`)
  if (skipped.already_recovered > 0) parts.push(`${skipped.already_recovered} recovered`)
  if (skipped.recently_attempted > 0) parts.push(`${skipped.recently_attempted} recent`)
  return parts.join(', ')
}

interface UploadWithStats extends Upload {
  valid_count?: number
  invalid_count?: number
}

const isValidFileType = (file: File): boolean => {
  const validExtensions = ['.csv', '.xlsx']
  const validMimeTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  
  const hasValidExtension = validExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  )
  const hasValidMimeType = validMimeTypes.includes(file.type)
  
  return hasValidExtension || hasValidMimeType
}

export default function UploadsPage() {
  const [uploads, setUploads] = useState<UploadWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null)
  const [activeUploadId, setActiveUploadId] = useState<number | null>(null)
  const [lastSkipped, setLastSkipped] = useState<SkippedCounts | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const fetchUploads = async () => {
    try {
      const response = await api.getUploads({ per_page: 50 })
      setUploads(response.data)
    } catch (error) {
      console.error('Failed to fetch uploads:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUploads()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null
    setFile(selectedFile)
    setUploadStatus(null)
    setLastSkipped(null)
    if (selectedFile && isValidFileType(selectedFile) && selectedFile.size <= 50 * 1024 * 1024) {
      setFile(selectedFile)
      setUploadStatus(null)
    } else if (selectedFile) {
      if (!isValidFileType(selectedFile)) {
        setUploadStatus({ type: 'error', message: 'Invalid file type. Please upload a CSV or XLSX file.' })
      } else if (selectedFile.size > 50 * 1024 * 1024) {
        setUploadStatus({ type: 'error', message: 'File too large. Maximum size is 50MB.' })
      }
    }
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
        setUploadStatus({ type: 'error', message: 'Invalid file type. Please upload a CSV or XLSX file.' })
        return
      }

      if (droppedFile.size > 50 * 1024 * 1024) {
        setUploadStatus({ type: 'error', message: 'File too large. Maximum size is 50MB.' })
        return
      }

      setFile(droppedFile)
      setUploadStatus(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!file) {
      setUploadStatus({ type: 'error', message: 'Please select a file first' })
      return
    }

    if (!isValidFileType(file)) {
      setUploadStatus({ type: 'error', message: 'Invalid file type. Please upload a CSV or XLSX file.' })
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus({ type: 'error', message: 'File too large. Maximum size is 50MB.' })
      return
    }

    setIsUploading(true)
    setUploadStatus(null)
    setActiveUploadId(null)
    setLastSkipped(null)

    try {
      const result = await api.uploadFile(file)
      setActiveUploadId(result.upload.id)
      
      if (result.skipped && result.skipped.total > 0) {
        setLastSkipped(result.skipped)
      }
      
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      setUploadStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Upload failed' 
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleProgressComplete = (upload: Upload) => {
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

  return (
    <>
      <Header
        title="Uploads"
        description="Upload and manage CSV/XLSX files for debt processing"
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-slate-500" />
              <CardTitle>Upload File</CardTitle>
            </div>
            <CardDescription>
              Select a CSV or XLSX file to upload debtor records (max 50MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div
                ref={dropZoneRef}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
                }`}
              >
                <FileUp className={`h-8 w-8 ${isDragActive ? 'text-blue-500' : 'text-slate-400'}`} />
                <div className="text-center">
                  <p className={`font-medium ${isDragActive ? 'text-blue-700' : 'text-slate-700'}`}>
                    {isDragActive ? 'Drop your file here' : 'Drag and drop your CSV or XLSX file here'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">or click to select</p>
                </div>

                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
                </div>
                {file && !uploadStatus && !activeUploadId && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-green-700">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs">{formatFileSize(file.size)}</p>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isUploading}
                    className="gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <LucideUpload className="h-4 w-4" />
                        Upload
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
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                uploadStatus.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : uploadStatus.type === 'warning'
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {uploadStatus.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : uploadStatus.type === 'warning' ? (
                  <Ban className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="text-sm">{uploadStatus.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload History</CardTitle>
            <CardDescription>
              View all uploaded files and their validation status
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Records</TableHead>
                  <TableHead className="text-center">Validation</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : uploads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No uploads yet
                    </TableCell>
                  </TableRow>
                ) : (
                  uploads.map((upload) => {
                    const total = upload.total_records || 0
                    const valid = upload.valid_count || 0
                    const invalid = upload.invalid_count || 0
                    const skippedTotal = upload.skipped?.total || 0
                    const validPercent = total > 0 ? Math.round((valid / total) * 100) : 0
                    
                    return (
                      <TableRow key={upload.id} className="hover:bg-slate-50">
                        <TableCell>
                          <Link href={`/admin/uploads/${upload.id}`} className="hover:underline">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                              <div>
                                <p className="font-medium text-blue-600">{upload.original_filename}</p>
                                <p className="text-xs text-slate-500">{formatFileSize(upload.file_size)}</p>
                              </div>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[upload.status]}>
                            {upload.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">{total}</span>
                          {skippedTotal > 0 && (
                            <span className="text-xs text-slate-400 ml-1">(-{skippedTotal})</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-3">
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">{valid}</span>
                            </div>
                            <div className="flex items-center gap-1 text-orange-500">
                              <XCircle className="h-4 w-4" />
                              <span className="text-sm">{invalid}</span>
                            </div>
                            {skippedTotal > 0 && (
                              <div className="flex items-center gap-1 text-slate-400">
                                <Ban className="h-4 w-4" />
                                <span className="text-sm">{skippedTotal}</span>
                              </div>
                            )}
                            <span className={`text-sm font-medium ${validPercent === 100 ? 'text-green-600' : validPercent >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {validPercent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {formatDate(upload.created_at)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
