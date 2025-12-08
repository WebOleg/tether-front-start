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
import { Upload as UploadIcon, FileUp, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'
import type { Upload } from '@/types'

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

export default function UploadsPage() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [activeUploadId, setActiveUploadId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!file) {
      setUploadStatus({ type: 'error', message: 'Please select a file first' })
      return
    }

    // Validate file type
    const validTypes = ['.csv', '.xlsx', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    const isValidType = validTypes.some(type => 
      file.name.toLowerCase().endsWith(type) || file.type === type
    )
    
    if (!isValidType) {
      setUploadStatus({ type: 'error', message: 'Invalid file type. Please upload a CSV or XLSX file.' })
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus({ type: 'error', message: 'File too large. Maximum size is 50MB.' })
      return
    }

    setIsUploading(true)
    setUploadStatus(null)
    setActiveUploadId(null)

    try {
      const upload = await api.uploadFile(file)
      
      // Show progress tracker
      setActiveUploadId(upload.id)
      
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
    // Refresh the list
    fetchUploads()
    
    // Show success message
    setUploadStatus({ 
      type: 'success', 
      message: `Completed: ${upload.processed_records - upload.failed_records} successful, ${upload.failed_records} failed` 
    })

    // Keep progress visible for a moment, then hide
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
    fetchUploads()
  }

  return (
    <>
      <Header
        title="Uploads"
        description="Upload and manage CSV/XLSX files for debt processing"
      />
      <div className="p-6 space-y-6">
        {/* Upload Form */}
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
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  className="flex-1"
                  disabled={isUploading}
                />
                <Button 
                  type="submit" 
                  disabled={!file || isUploading}
                  className="gap-2 sm:min-w-[140px]"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="h-4 w-4" />
                      Upload File
                    </>
                  )}
                </Button>
              </div>

              {/* File Info */}
              {file && !uploadStatus && !activeUploadId && (
                <div className="text-sm text-slate-500">
                  Selected: {file.name} ({formatFileSize(file.size)})
                </div>
              )}
            </form>

            {/* Progress Tracker */}
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

            {/* Status Message */}
            {uploadStatus && !activeUploadId && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                uploadStatus.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {uploadStatus.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="text-sm">{uploadStatus.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Uploads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Upload History</CardTitle>
            <CardDescription>
              View all uploaded files and their processing status
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Success Rate</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : uploads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No uploads yet. Upload your first file above.
                    </TableCell>
                  </TableRow>
                ) : (
                  uploads.map((upload) => (
                    <TableRow key={upload.id}>
                      <TableCell>
                        <Link
                          href={`/admin/uploads/${upload.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {upload.original_filename}
                        </Link>
                        <div className="text-sm text-slate-500">
                          {formatFileSize(upload.file_size)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[upload.status]}>
                          {upload.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{upload.total_records} total</div>
                        <div className="text-sm text-slate-500">
                          {upload.processed_records} processed
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={
                          upload.success_rate >= 90 ? 'text-green-600' : 
                          upload.success_rate >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }>
                          {upload.success_rate}%
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatDate(upload.created_at)}
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
