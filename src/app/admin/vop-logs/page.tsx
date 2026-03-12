/**
 * VOP Logs list page.
 * Shows IBAN verification results with scores, BAV status and name matching.
 */

'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
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
import type { PaginationLink, PaginationLinks, PaginationMeta as PaginationMetaType, VopLog, VopResult } from '@/types'
import { CheckCircle, Search, X, XCircle } from 'lucide-react'
import { Pagination, PaginationMeta } from '@/components/ui/pagination'
import { formatDate } from '@/lib/utils'
import { VopResultBadge, VopNameMatchBadge, VopScoreBadge } from '@/components/ui/badges'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function VopLogsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentResult = searchParams.get('result') || 'all'
  const currentBav = searchParams.get('bav') || 'all'
  const currentSearch = searchParams.get('search') || ''
  const currentPage = Number(searchParams.get('page')) || 1

  const [vopLogs, setVopLogs] = useState<VopLog[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<PaginationMetaType | null>(null)
  const [links, setLinks] = useState<PaginationLinks | null>(null)
  const [paginationLinks, setPaginationLinks] = useState<PaginationLink[]>([])
  const [searchInput, setSearchInput] = useState(currentSearch)

  const activeFilterCount =
    (currentResult !== 'all' ? 1 : 0) +
    (currentBav !== 'all' ? 1 : 0) +
    (currentSearch ? 1 : 0)

  const handleResetFilters = () => {
    setSearchInput('')
    router.replace(pathname)
  }

  const updateUrl = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === 'all' || value === '') {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    })

    if (!Object.prototype.hasOwnProperty.call(updates, 'page')) {
      params.set('page', '1')
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, pathname, router])

  // Sync searchInput when URL changes externally
  useEffect(() => {
    setSearchInput(currentSearch)
  }, [currentSearch])

  // Debounce search input → URL update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateUrl({ search: searchInput })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, currentSearch, updateUrl])

  useEffect(() => {
    const abortController = new AbortController()

    const fetchVopLogs = async () => {
      setLoading(true)
      try {
        const filters: Parameters<typeof api.getVopLogs>[0] = {
          page: currentPage,
          per_page: 50,
        }
        if (currentSearch) filters.search = currentSearch
        if (currentResult !== 'all') filters.result = currentResult as VopResult
        if (currentBav === 'verified') filters.bav_verified = true
        else if (currentBav === 'not_verified') filters.bav_verified = false

        const response = await api.getVopLogs(filters, abortController.signal)
        if (abortController.signal.aborted) return
        setVopLogs(response.data)
        setMeta(response.meta || null)
        setLinks(response.links || null)

        if (response.meta && 'links' in response.meta) {
          setPaginationLinks((response.meta as PaginationMetaType & { links?: PaginationLink[] }).links || [])
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        console.error('Failed to fetch VOP logs:', error)
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchVopLogs()
    return () => abortController.abort()
  }, [currentResult, currentBav, currentSearch, currentPage])

  const handlePageClick = (page: number) => updateUrl({ page })
  const handlePreviousPage = () => links?.prev && updateUrl({ page: currentPage - 1 })
  const handleNextPage = () => links?.next && updateUrl({ page: currentPage + 1 })

  return (
    <>
      <Header
        title="VOP Verifications"
        description="IBAN validation, bank verification and name matching results"
      />
      <div className="p-6">
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search IBAN or BIC..."
              className="pl-9 bg-white"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <Select value={currentResult} onValueChange={(value) => updateUrl({ result: value })}>
            <SelectTrigger className="w-48 bg-white">
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

          <Select value={currentBav} onValueChange={(value) => updateUrl({ bav: value })}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="Filter by BAV" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All BAV Status</SelectItem>
              <SelectItem value="verified">BAV Verified</SelectItem>
              <SelectItem value="not_verified">Not BAV Verified</SelectItem>
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="h-10 px-3 lg:px-4 border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 animate-in fade-in zoom-in-95 duration-200 group"
              title="Clear all filters"
            >
              <X className="mr-2 h-3.5 w-3.5" />
              Reset Filters
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900">
                {activeFilterCount}
              </span>
            </Button>
          )}
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
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : vopLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No VOP logs found
                  </TableCell>
                </TableRow>
              ) : (
                vopLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-mono text-xs">
                        {log.iban}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">
                        {log.bic ?? '—'}
                      </div>
                    </TableCell>
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

export default function VopLogsPage() {
  return (
    <Suspense>
      <VopLogsContent />
    </Suspense>
  )
}
