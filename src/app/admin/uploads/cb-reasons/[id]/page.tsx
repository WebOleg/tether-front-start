/**
 * Upload CBK Reasons page.
 * Shows chargeback reason breakdown per upload file.
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Upload } from '@/types'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface CbReasonRecord {
  id: number
  error_code: string
  error_message: string | null
  amount: number
  currency: string
  bank_name: string | null
  bank_country: string | null
  processed_at: string
  emp_created_at: string
  chargebacked_at: string
  debtor: {
    id: number
    first_name: string
    last_name: string
    email: string
    iban: string
  }
  emp_account: {
    id: number
    name: string
    slug: string
  }
}

interface CbReasonResponse {
  data: CbReasonRecord[]
  links: any
  meta: any
}

export default function UploadCbReasonsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  
  const code = decodeURIComponent(params.id as string)
  const uploadId = Number(searchParams.get('upload_id'))

  const [uploadFilename, setUploadFilename] = useState<string>('')
  const [uploadOriginalFilename, setUploadOriginalFilename] = useState<string>('')
  const [records, setRecords] = useState<CbReasonRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUpload = async () => {
      try{
        const uploadResp = await api.getUpload(uploadId)
        setUploadFilename(uploadResp.filename)
        setUploadOriginalFilename(uploadResp.original_filename)
      } catch (error) {
        console.log('Error fetching upload details')
      }
    }

    fetchUpload()
  }, [uploadId])

  useEffect(() => {
    const fetchRecords = async () => {
      if (!uploadId || !code) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await api.getUploadCbReasonRecords(uploadId, code) as any as CbReasonResponse
        setRecords(response.data || [])
      } catch (error) {
        console.error('Error fetching CB reason records:', error)
        setRecords([])
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [uploadId, code])

  return (
    <>
      <Header
        title={loading ? 'Upload CB Reasons' : `Upload CB Reasons - ${code}`}
        description={uploadFilename ? ` ${uploadFilename} (${uploadOriginalFilename})` : `Showing CB reasons of ${code}`}
      />
      <div className="p-6">

        <Link href={`/admin/uploads/cb-reasons?upload_id=${uploadId}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Debtor</TableHead>
                <TableHead>IBAN</TableHead>
                <TableHead>TXN ID</TableHead>
                <TableHead>Chargebacked Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Error Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No chargeback records found for this code
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="font-medium text-blue-600">
                        {record.debtor.first_name} {record.debtor.last_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {record.debtor.email}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {record.debtor.iban || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {record.id}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {formatDate(record.chargebacked_at)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(record.amount, record.currency)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                      {record.error_message || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {records.length > 0 && (
          <div className="mt-4 text-sm text-slate-600">
            Showing {records.length} record{records.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </>
  )
}