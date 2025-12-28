/**
 * Billing Attempts list page.
 * Shows payment attempts with status and retry information.
 */

'use client'

import { useEffect, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import type { BillingAttempt, BillingStatus, PaginationLink, PaginationLinks, PaginationMeta as PaginationMetaType } from '@/types'
import { Pagination, PaginationMeta } from '@/components/ui/pagination'

const statusColors: Record<BillingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  error: 'bg-orange-100 text-orange-800',
  voided: 'bg-slate-100 text-slate-800',
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BillingPage() {
  const [attempts, setAttempts] = useState<BillingAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [meta, setMeta] = useState<PaginationMetaType | null>(null)
  const [links, setLinks] = useState<PaginationLinks | null>(null)
  const [paginationLinks, setPaginationLinks] = useState<PaginationLink[]>([])

  useEffect(() => {
    const fetchAttempts = async () => {
      setLoading(true)
      try {
        const filters: { status?: BillingStatus; page: number; per_page: number } = { 
          page: currentPage,
          per_page: 50 
        }
        if (statusFilter !== 'all') {
          filters.status = statusFilter as BillingStatus
        }
        const response = await api.getBillingAttempts(filters)
        setAttempts(response.data)
        setMeta(response.meta || null)
        setLinks(response.links || null)
        
        // Extract pagination links from meta if available
        if (response.meta && 'links' in response.meta) {
          setPaginationLinks((response.meta as PaginationMetaType & { links?: PaginationLink[] }).links || [])
        }
      } catch (error) {
        console.error('Failed to fetch billing attempts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAttempts()
  }, [statusFilter, currentPage])

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

  return (
    <>
      <Header
        title="Billing Attempts"
        description="Track payment processing and retry status"
      />
      <div className="p-6">
        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <PaginationMeta
          meta={meta}
          label="billing attempts"
          containerClassName='px-2'
        />
        {/* Table */}
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempt</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Processed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : attempts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No billing attempts found
                  </TableCell>
                </TableRow>
              ) : (
                attempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell>
                      <div className="font-mono text-sm">{attempt.transaction_id}</div>
                      {attempt.unique_id && (
                        <div className="text-xs text-slate-500">{attempt.unique_id}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(attempt.amount, attempt.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[attempt.status]}>
                        {attempt.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600">#{attempt.attempt_number}</span>
                      {attempt.can_retry && (
                        <span className="ml-2 text-xs text-blue-600">(can retry)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {attempt.error_code ? (
                        <div>
                          <div className="font-mono text-sm text-red-600">{attempt.error_code}</div>
                          <div className="text-xs text-slate-500">{attempt.error_message}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(attempt.processed_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          meta={meta}
          links={links}
          paginationLinks={paginationLinks}
          onPageChange={handlePageClick}
          onPreviousClick={handlePreviousPage}
          onNextClick={handleNextPage}
        />

      </div>
    </>
  )
}
