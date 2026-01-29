'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import type { BillingAttempt, PaginationLink, PaginationLinks, PaginationMeta as PaginationMetaType } from '@/types'
import { Pagination, PaginationMeta } from '@/components/ui/pagination'
import {
  Search,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  X
} from 'lucide-react'
import { formatCurrency, formatDate, formatSimpleDate  } from '@/lib/utils'

function calculateCycle(dateString: string, model: string = 'legacy') {
  const start = new Date(dateString)
  const end = new Date(start)

  if (model === 'flywheel') {
    end.setDate(end.getDate() + 90)
  } else if (model === 'recovery') {
    end.setMonth(end.getMonth() + 6)
  } else {
    return null
  }

  return { start, end }
}

function ModelBadge({ model }: { model?: string }) {
  const mode = (model || 'legacy').toLowerCase()
  const isFlywheel = mode === 'flywheel'
  const isRecovery = mode === 'recovery'

  let styles = 'bg-slate-100 text-slate-800 border-slate-200'
  if (isFlywheel) styles = 'bg-sky-50 text-sky-700 border-sky-200'
  if (isRecovery) styles = 'bg-violet-50 text-violet-700 border-violet-200'

  return (
      <Badge variant="outline" className={`capitalize rounded-full px-2.5 font-normal ${styles}`}>
        {mode}
      </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    declined: 'bg-rose-50 text-rose-700 border-rose-200',
    error: 'bg-orange-50 text-orange-700 border-orange-200',
    voided: 'bg-slate-100 text-slate-700 border-slate-200',
    chargebacked: 'bg-purple-50 text-purple-700 border-purple-200',
  }

  const isApproved = status === 'approved'
  const isDeclined = status === 'declined' || status === 'error'

  return (
      <Badge variant="outline" className={`capitalize rounded-full px-2.5 font-normal gap-1 ${styles[status] || styles.pending}`}>
        {isApproved && <CheckCircle2 className="h-3 w-3" />}
        {isDeclined && <XCircle className="h-3 w-3" />}
        {status}
      </Badge>
  )
}

function BillingContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 1. Get initial state from URL
  const currentStatus = searchParams.get('status') || 'all'
  const currentModel = searchParams.get('model') || 'all'
  const currentSearch = searchParams.get('search') || ''
  const currentDebtorId = searchParams.get('debtor_id') || ''
  const currentPage = Number(searchParams.get('page')) || 1

  // Local API state
  const [attempts, setAttempts] = useState<BillingAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<PaginationMetaType | null>(null)
  const [links, setLinks] = useState<PaginationLinks | null>(null)
  const [paginationLinks, setPaginationLinks] = useState<PaginationLink[]>([])

  // Local Input State (for debounce)
  const [searchInput, setSearchInput] = useState(currentSearch)
  const [debtorIdInput, setDebtorIdInput] = useState(currentDebtorId)

  // Computed: Count active filters
  const activeFilterCount =
      (currentStatus !== 'all' ? 1 : 0) +
      (currentModel !== 'all' ? 1 : 0) +
      (currentSearch ? 1 : 0) +
      (currentDebtorId ? 1 : 0);

  // 2. Helper to update URL
  const updateUrl = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === 'all' || value === '') {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    })

    if (!updates.hasOwnProperty('page')) {
      params.set('page', '1')
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, pathname, router])

  // 3. Sync local input if URL changes externally
  useEffect(() => {
    setSearchInput(currentSearch)
  }, [currentSearch])

  useEffect(() => {
    setDebtorIdInput(currentDebtorId)
  }, [currentDebtorId])

  // 4a. Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateUrl({ search: searchInput })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, currentSearch, updateUrl])

  // 4b. Debounce Debtor ID
  useEffect(() => {
    const timer = setTimeout(() => {
      if (debtorIdInput !== currentDebtorId) {
        updateUrl({ debtor_id: debtorIdInput })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [debtorIdInput, currentDebtorId, updateUrl])


  // 5. Main Data Fetch
  useEffect(() => {
    const fetchAttempts = async () => {
      setLoading(true)
      try {
        const filters: any = {
          page: currentPage,
          per_page: 50,
          search: currentSearch || undefined,
          debtor_id: currentDebtorId || undefined
        }

        if (currentStatus !== 'all') filters.status = currentStatus
        if (currentModel !== 'all') filters.model = currentModel

        const response = await api.getBillingAttempts(filters)
        setAttempts(response.data)
        setMeta(response.meta || null)
        setLinks(response.links || null)

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
  }, [currentStatus, currentModel, currentSearch, currentDebtorId, currentPage])

  // Handlers
  const handlePageClick = (page: number) => updateUrl({ page })
  const handlePreviousPage = () => links?.prev && updateUrl({ page: currentPage - 1 })
  const handleNextPage = () => links?.next && updateUrl({ page: currentPage + 1 })
  const handleStatusFilterChange = (status: string) => updateUrl({ status })
  const handleModelFilterChange = (model: string) => updateUrl({ model })

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSearchInput('')
    setDebtorIdInput('')
    router.replace(pathname)
  }

  return (
      <>
        <Header
            title="Billing History"
            description="Track payment processing, cycles, and retry status"
        />
        <div className="p-6">

          {/* --- FILTERS TOOLBAR --- */}
          <div className="mb-6 flex flex-col xl:flex-row gap-4 xl:items-center">
            <div className="flex flex-wrap gap-3 flex-1 w-full items-center">

              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search Transaction ID..."
                    className="pl-9 bg-white"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

              {/* Debtor ID Filter - Contextual Drilldown */}
              {currentDebtorId && (
                  <div className="relative w-36 animate-in fade-in slide-in-from-left-2 duration-300">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                    <Input
                        placeholder="Debtor ID"
                        className="pl-9 bg-blue-50/50 border-blue-200 text-blue-700 placeholder:text-blue-300 focus-visible:ring-blue-200"
                        value={debtorIdInput}
                        onChange={(e) => setDebtorIdInput(e.target.value)}
                        type="number"
                    />
                  </div>
              )}

              {/* Model Filter */}
              <Select value={currentModel} onValueChange={handleModelFilterChange}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  <SelectItem value="flywheel">Flywheel</SelectItem>
                  <SelectItem value="recovery">Recovery</SelectItem>
                  <SelectItem value="legacy">Legacy</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={currentStatus} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset Button with Counter */}
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
          </div>

          <PaginationMeta
              meta={meta}
              label="billing attempts"
              containerClassName='px-2'
          />

          {/* --- TABLE --- */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead>Transaction / Debtor</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Paid Cycle</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                ) : attempts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No billing attempts found
                      </TableCell>
                    </TableRow>
                ) : (
                    attempts.map((attempt) => {
                      const profile = (attempt as any).debtor?.debtor_profile || (attempt as any).debtor_profile;
                      const debtor = (attempt as any).debtor;
                      const model = profile?.billing_model || 'legacy';
                      const cycle = calculateCycle(attempt.created_at, model);
                      const isFlywheel = model === 'flywheel';

                      return (
                          <TableRow key={attempt.id} className="hover:bg-slate-50/50">
                            {/* Transaction & Debtor */}
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-700">
                                  {debtor?.iban_masked || 'Unknown Debtor'}
                                </span>
                                {/* Full Transaction ID Visible */}
                                <span className="font-mono text-xs text-slate-400 mt-0.5 select-all">
                                  {attempt.transaction_id || attempt.id}
                                </span>
                                {(attempt as any).attempt_number > 1 && (
                                    <span className="text-[10px] text-blue-600 font-medium mt-1">
                                      Retry #{ (attempt as any).attempt_number }
                                    </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Model */}
                            <TableCell>
                              <ModelBadge model={model} />
                            </TableCell>

                            {/* Paid Cycle */}
                            <TableCell>
                              {cycle ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                      <RefreshCcw className="h-3 w-3 text-slate-400" />
                                      {formatSimpleDate(cycle.start)} - {formatSimpleDate(cycle.end)}
                                    </div>
                                    <span className="text-xs text-slate-400 pl-4">
                                      {isFlywheel ? '90 Days Access' : '6 Months Access'}
                                    </span>
                                  </div>
                              ) : (
                                  <span className="text-slate-300">-</span>
                              )}
                            </TableCell>

                            <TableCell className="font-mono font-medium">
                              {formatCurrency(attempt.amount, attempt.currency)}
                            </TableCell>

                            <TableCell>
                              <StatusBadge status={attempt.status} />
                            </TableCell>

                            <TableCell className="text-sm text-slate-500">
                              {formatDate((attempt as any).processed_at || attempt.created_at)}
                            </TableCell>

                            <TableCell>
                              {(attempt as any).error_code ? (
                                  <div className="flex items-start gap-1.5 max-w-[200px]">
                                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 mt-0.5 shrink-0" />
                                    <div className="flex flex-col">
                                      <span className="text-xs font-mono text-rose-600">{(attempt as any).error_code}</span>
                                      <span className="text-[10px] text-slate-500 line-clamp-2" title={(attempt as any).error_message}>
                                        {(attempt as any).error_message}
                                      </span>
                                    </div>
                                  </div>
                              ) : (
                                  <span className="text-slate-300">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                      )
                    })
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

export default function BillingPage() {
  return (
      <Suspense fallback={
        <div className="p-6">
          <Header title="Billing History" description="Loading..." />
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        </div>
      }>
        <BillingContent />
      </Suspense>
  )
}