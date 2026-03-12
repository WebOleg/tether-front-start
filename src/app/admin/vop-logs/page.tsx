/**
 * VOP Logs list page.
 * Shows IBAN verification results with scores, BAV status and name matching.
 */

'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
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
import type { PaginationLink, PaginationLinks, PaginationMeta as PaginationMetaType, VopLog, VopResult, NameMatch } from '@/types'
import { Badge, CheckCircle, XCircle } from 'lucide-react'
import { Pagination, PaginationMeta } from '@/components/ui/pagination'
import { formatDate } from '@/lib/utils'
import { VopResultBadge, VopNameMatchBadge, VopScoreBadge } from '@/components/ui/badges'
import { Badge as BadgeComponent } from '@/components/ui/badge'

export default function VopLogsPage() {
  const [vopLogs, setVopLogs] = useState<VopLog[]>([])
  const [loading, setLoading] = useState(true)
  const [resultFilter, setResultFilter] = useState<string>('all')
  const [bavFilter, setBavFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [meta, setMeta] = useState<PaginationMetaType | null>(null)
  const [links, setLinks] = useState<PaginationLinks | null>(null)
  const [paginationLinks, setPaginationLinks] = useState<PaginationLink[]>([])

  useEffect(() => {
    const fetchVopLogs = async () => {
      setLoading(true)
      try {
        const filters: { result?: VopResult; bav_verified?: boolean; page: number; per_page: number } = {         
          page: currentPage,
          per_page: 50 
        }
        if (resultFilter !== 'all') {
          filters.result = resultFilter as VopResult
        }
        if (bavFilter === 'verified') {
          filters.bav_verified = true
        } else if (bavFilter === 'not_verified') {
          filters.bav_verified = false
        }
        const response = await api.getVopLogs(filters)
        setVopLogs(response.data)
        setMeta(response.meta || null)
        setLinks(response.links || null)

        if (response.meta && 'links' in response.meta) {
          setPaginationLinks((response.meta as PaginationMetaType & {links?: PaginationLink[]}).links || [])
        }      
      } catch (error) {
        console.error('Failed to fetch VOP logs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVopLogs()
  }, [resultFilter, bavFilter, currentPage])

  const handlePreviousPage = () => {
    if (links?.prev) {
      setCurrentPage((prev) => Math.max(prev - 1, 1))
    }
  }

  const handleNextPage = () => {
    if (links?.next) {
      setCurrentPage((prev) => prev + 1)
    }
  }

  const handlePageClick = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <>
      <Header
        title="VOP Verifications"
        description="IBAN validation, bank verification and name matching results"
      />
      <div className="p-6">
        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <Select value={resultFilter} onValueChange={(value) => {
            setResultFilter(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="likely_verified">Likely Verified</SelectItem>
              <SelectItem value="inconclusive">Inconclusive</SelectItem>
              <SelectItem value="mismatch">Mismatch</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={bavFilter} onValueChange={(value) => {
            setBavFilter(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by BAV" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All BAV Status</SelectItem>
              <SelectItem value="verified">BAV Verified</SelectItem>
              <SelectItem value="not_verified">Not BAV Verified</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <PaginationMeta
          meta={meta}
          label="vop logs"
          containerClassName='px-2'
        />
        
        {/* Table */}
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IBAN</TableHead>
                <TableHead>BIC</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Valid</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Name Match</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : vopLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No VOP logs found
                  </TableCell>
                </TableRow>
              ) : (
                vopLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-mono text-xs">
                        {log.iban_masked}
                      </div>
                    </TableCell>
                    <TableHead>
                      <div className="font-mono text-xs">
                        {log.bic ?? '—'}
                      </div>
                    </TableHead>
                    <TableCell>
                      {log.bank_identified ? (
                        <div>
                          <div className="">{log.bank_name ?? '—'}</div>
                          <div className="text-xs text-slate-500">{log.bic ?? '—'}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.iban_valid ? (
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <VopScoreBadge score={log.vop_score} />
                    </TableCell>
                    <TableCell>
                      <VopResultBadge result={log.result} />
                    </TableCell>
                    <TableCell>
                      {log.name_match ? (
                        <VopNameMatchBadge 
                          nameMatch={log.name_match} 
                          score={log.name_match_score} 
                        />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(log.created_at)}
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
