/**
 * Debtors list page.
 * Shows all debtors with filtering and status indicators.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import type { Debtor, DebtorStatus, PaginationMeta as PaginationMetaType, PaginationLinks, PaginationLink } from '@/types'
import { Pagination, PaginationMeta } from '@/components/ui/pagination'

const statusColors: Record<DebtorStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  recovered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [meta, setMeta] = useState<PaginationMetaType | null>(null)
  const [links, setLinks] = useState<PaginationLinks | null>(null)
  const [paginationLinks, setPaginationLinks] = useState<PaginationLink[]>([])

  useEffect(() => {
    const fetchDebtors = async () => {
      setLoading(true)
      try {
        const filters: { status?: DebtorStatus; page: number; per_page: number } = { 
          page: currentPage,
          per_page: 50 
        }
        if (statusFilter !== 'all') {
          filters.status = statusFilter as DebtorStatus
        }
        const response = await api.getDebtors(filters)
        setDebtors(response.data)
        setMeta(response.meta || null)
        setLinks(response.links || null)
        
        if ('links' in response.meta!) {
          setPaginationLinks((response.meta as PaginationMetaType & {links? : PaginationLink[]}).links || [])
        }
      } catch (error) {
        console.error('Failed to fetch debtors:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDebtors()
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

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus)
    setCurrentPage(1)
  }

  return (
    <>
      <Header
        title="Debtors"
        description="View and manage debtor records"
      />
      <div className="p-6">
        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="recovered">Recovered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <PaginationMeta
          meta={meta}
          label="debtors"
          containerClassName='px-2'
        />
        
        <div className="rounded-lg border bg-white">
          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>IBAN</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Bank Name</TableHead>
                <TableHead>Bank Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : debtors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No debtors found
                  </TableCell>
                </TableRow>
              ) : (
                debtors.map((debtor) => (
                  <TableRow key={debtor.id}>
                    <TableCell>
                      <Link
                        href={`/admin/debtors/${debtor.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {debtor.full_name}
                      </Link>
                      <div className="text-sm text-slate-500">
                        {debtor.email}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {debtor.iban_masked}
                    </TableCell>
                    <TableCell>{debtor.country}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(debtor.amount, debtor.currency)}
                    </TableCell>
                    <TableCell>{debtor.bank_name_reference}</TableCell>
                    <TableCell>{debtor.bank_country_iso_reference}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[debtor.status]}>
                        {debtor.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {debtor.risk_class && (
                        <Badge className={riskColors[debtor.risk_class]}>
                          {debtor.risk_class}
                        </Badge>
                      )}
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
