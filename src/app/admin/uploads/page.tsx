/**
 * Uploads list page.
 * Shows all CSV uploads with status and statistics.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
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

  useEffect(() => {
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

    fetchUploads()
  }, [])

  return (
    <>
      <Header
        title="Uploads"
        description="Manage uploaded CSV files and track processing status"
      />
      <div className="p-6">
        <div className="rounded-lg border bg-white">
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
                    Loading...
                  </TableCell>
                </TableRow>
              ) : uploads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No uploads found
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
                      <span className={upload.success_rate >= 90 ? 'text-green-600' : upload.success_rate >= 70 ? 'text-yellow-600' : 'text-red-600'}>
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
        </div>
      </div>
    </>
  )
}
