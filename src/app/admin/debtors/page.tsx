'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { api } from '@/lib/api'
import type { Debtor, DebtorStatus, PaginationMeta as PaginationMetaType, PaginationLinks, PaginationLink } from '@/types'
// 1. UPDATED IMPORT: Added Pagination component
import { Pagination, PaginationMeta } from '@/components/ui/pagination'
import { modelRowStyles, statusRowStyles } from '@/lib/styles'
import { ModelBadge, StatusBadge, RiskBadge } from '@/components/ui/badges'
import {
  CheckCircle2,
  XCircle,
  Search,
  Pencil,
  Loader2,
  TriangleAlert,
  FileText,
  X
} from 'lucide-react'
import { formatCurrency, formatDateTime, getDaysRemaining } from '@/lib/utils'

interface EditDebtorForm {
  model: string;
}

function DebtorsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get initial state from URL
  const currentStatus = searchParams.get('status') || 'all'
  const currentModel = searchParams.get('model') || 'all'
  const currentSearch = searchParams.get('search') || ''
  const currentPage = Number(searchParams.get('page')) || 1

  // Local state for API data
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<PaginationMetaType | null>(null)
  const [links, setLinks] = useState<PaginationLinks | null>(null)

  // 2. NEW STATE: For pagination links (numbered pages)
  const [paginationLinks, setPaginationLinks] = useState<PaginationLink[]>([])

  // Local state for Search Input
  const [searchInput, setSearchInput] = useState(currentSearch)

  // Edit State
  const [editingDebtor, setEditingDebtor] = useState<Debtor | null>(null)
  const [formData, setFormData] = useState<EditDebtorForm>({ model: 'legacy' })
  const [isSaving, setIsSaving] = useState(false)
  const [showLegacyWarning, setShowLegacyWarning] = useState(false)

  const LIFETIME_LIMIT = 750;

  const activeFilterCount =
      (currentStatus !== 'all' ? 1 : 0) +
      (currentModel !== 'all' ? 1 : 0) +
      (currentSearch ? 1 : 0);

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

  useEffect(() => {
    setSearchInput(currentSearch)
  }, [currentSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateUrl({ search: searchInput })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, currentSearch, updateUrl])

  // 3. UPDATED FETCH: Extract pagination links from response
  const fetchDebtors = useCallback(async () => {
    setLoading(true)
    try {
      const filters: any = {
        page: currentPage,
        per_page: 50,
      }

      if (currentSearch) filters.search = currentSearch
      if (currentStatus !== 'all') filters.status = currentStatus
      if (currentModel !== 'all') filters.model = currentModel

      const response = await api.getDebtors(filters)
      setDebtors(response.data)
      setMeta(response.meta || null)
      setLinks(response.links || null)

      // Match the logic from BillingPage to get the array of page links
      if (response.meta && 'links' in response.meta) {
        setPaginationLinks((response.meta as PaginationMetaType & { links?: PaginationLink[] }).links || [])
      }
    } catch (error) {
      console.error('Failed to fetch debtors:', error)
    } finally {
      setLoading(false)
    }
  }, [currentStatus, currentModel, currentSearch, currentPage])

  useEffect(() => {
    fetchDebtors()
  }, [fetchDebtors])

  // Handlers
  const handleStatusFilterChange = (status: string) => updateUrl({ status })
  const handleModelFilterChange = (model: string) => updateUrl({ model })

  // 4. NEW HANDLERS: For pagination interactions
  const handlePageClick = (page: number) => updateUrl({ page })
  const handlePreviousPage = () => links?.prev && updateUrl({ page: currentPage - 1 })
  const handleNextPage = () => links?.next && updateUrl({ page: currentPage + 1 })

  const handleResetFilters = () => {
    setSearchInput('')
    router.replace(pathname)
  }

  const handleEditClick = (debtor: Debtor) => {
    const profile = (debtor as any).debtor_profile
    setFormData({
      model: profile?.billing_model || 'legacy',
    })
    setEditingDebtor(debtor)
  }

  const handleFormChange = (field: keyof EditDebtorForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveClick = () => {
    if (!editingDebtor) return
    const originalModel = (editingDebtor as any).debtor_profile?.billing_model || 'legacy'
    if (formData.model === 'legacy' && originalModel !== 'legacy') {
      setShowLegacyWarning(true)
    } else {
      executeSave()
    }
  }

  const executeSave = async () => {
    if (!editingDebtor) return
    setIsSaving(true)
    setShowLegacyWarning(false)
    try {
      await api.updateDebtor(editingDebtor.id, formData)
      setEditingDebtor(null)
      fetchDebtors()
    } catch (error) {
      console.error('Failed to update debtor', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
      <>
        <Header
            title="Debtors"
            description="View and manage debtor records"
        />
        <div className="p-6">

          {/* Filters Bar */}
          <div className="mb-4 flex flex-col xl:flex-row gap-4 xl:items-center">
            <div className="flex flex-wrap gap-3 flex-1 w-full items-center">

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search name, email or IBAN..."
                    className="pl-9 bg-white"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

              {/* Model Select */}
              <Select value={currentModel} onValueChange={handleModelFilterChange}>
                <SelectTrigger className="w-full sm:w-48 bg-white">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  <SelectItem value="flywheel">Flywheel</SelectItem>
                  <SelectItem value="recovery">Recovery</SelectItem>
                  <SelectItem value="legacy">Legacy</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Select */}
              <Select value={currentStatus} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-full sm:w-48 bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="chargebacked">Chargebacked</SelectItem>
                  <SelectItem value="recovered">Recovered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset Button */}
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
              label="debtors"
              containerClassName='px-2'
          />

          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-white hover:bg-white">
                  <TableHead>Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="whitespace-nowrap">Last Billed</TableHead>
                  <TableHead className="whitespace-nowrap">Next Bill</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Lifetime Billed</TableHead>
                  <TableHead>IBAN</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Bank Name</TableHead>
                  <TableHead>Bank Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                ) : debtors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-8">
                        No debtors found
                      </TableCell>
                    </TableRow>
                ) : (
                    debtors.map((debtor) => {
                      const profile = (debtor as any).debtor_profile;
                      const isLegacy = !profile || profile.billing_model === 'legacy';
                      const isActive = profile?.is_active;

                      let rowClass = 'bg-white hover:bg-slate-50';

                      if (!isLegacy && !isActive) {
                        rowClass = statusRowStyles[debtor.status] || 'bg-slate-50/60';
                      } else {
                        const modelKey = (profile?.billing_model || 'legacy').toLowerCase();
                        rowClass = modelRowStyles[modelKey] || modelRowStyles.legacy;
                      }

                      let nextBillInfo = null;
                      if (!isLegacy && isActive && profile?.next_bill_at) {
                        nextBillInfo = getDaysRemaining(profile.next_bill_at);
                      }

                      const lifetimeAmount = Number(profile?.lifetime_charged_amount || 0);
                      const percentage = Math.min((lifetimeAmount / LIFETIME_LIMIT) * 100, 100);

                      let barColor = 'bg-blue-500';
                      let textColor = 'text-slate-600';

                      if (percentage > 75) {
                        barColor = 'bg-orange-500';
                        textColor = 'text-orange-700';
                      }
                      if (percentage >= 90) {
                        barColor = 'bg-red-500';
                        textColor = 'text-red-700 font-semibold';
                      }

                      return (
                          <TableRow key={debtor.id} className={`${rowClass} transition-colors group`}>
                            <TableCell>
                                <span className="font-medium">
                                  {debtor.full_name}
                                </span>
                              <div className="text-sm text-slate-500">
                                {debtor.email}
                              </div>
                            </TableCell>

                            <TableCell>
                              <ModelBadge model={profile?.billing_model} />
                            </TableCell>

                            <TableCell>
                              {!isLegacy ? (
                                  isActive ? (
                                      <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2 py-1 rounded-md w-fit border border-green-100/50">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="text-xs font-medium">Active</span>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 py-1 rounded-md w-fit border border-slate-200">
                                        <XCircle className="h-4 w-4" />
                                        <span className="text-xs font-medium">Inactive</span>
                                      </div>
                                  )
                              ) : (
                                  <span className="text-slate-300">-</span>
                              )}
                            </TableCell>

                            <TableCell className="text-sm whitespace-nowrap">
                              {!isLegacy ? formatDateTime(profile?.last_billed_at) : <span className="text-slate-300">-</span>}
                            </TableCell>

                            <TableCell>
                              {!isLegacy && isActive && profile?.next_bill_at ? (
                                  <div className="flex flex-col">
                                    <span className="text-sm text-slate-900">
                                      {formatDateTime(profile.next_bill_at)}
                                    </span>
                                    {nextBillInfo && (
                                        <span className={`text-xs flex items-center gap-1 ${nextBillInfo.color}`}>
                                          {nextBillInfo.icon && <nextBillInfo.icon className="h-3 w-3" />}
                                          {nextBillInfo.text}
                                        </span>
                                    )}
                                  </div>
                              ) : (
                                  <span className="text-slate-300">-</span>
                              )}
                            </TableCell>

                            <TableCell className="text-right align-top pt-4">
                              {!isLegacy && profile?.lifetime_charged_amount ? (
                                  <div className="flex flex-col items-end gap-1">
                                    <span className={`font-medium ${textColor}`}>
                                      {formatCurrency(lifetimeAmount, debtor.currency)}
                                    </span>
                                    <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                          className={`h-full ${barColor} transition-all duration-300`}
                                          style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-slate-400 leading-none">
                                      {Math.round(percentage)}% of limit
                                    </span>
                                  </div>
                              ) : (
                                  <span className="text-slate-300">-</span>
                              )}
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
                              <StatusBadge status={debtor.status} />
                            </TableCell>
                            <TableCell>
                              {debtor.risk_class && (
                                  <RiskBadge risk={debtor.risk_class} />
                              )}
                            </TableCell>

                            <TableCell>
                              <TooltipProvider delayDuration={300}>
                                <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-1">

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                          variant="ghost"
                                          size="icon"
                                          asChild
                                          className="h-8 w-8"
                                      >
                                        <Link href={`/admin/billing?debtor_id=${debtor.id}`}>
                                          <FileText className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                                          <span className="sr-only">View Billing History</span>
                                        </Link>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View Billing History</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditClick(debtor)}
                                          className="h-8 w-8 cursor-pointer"
                                      >
                                        <Pencil className="h-4 w-4 text-slate-400 hover:text-slate-700" />
                                        <span className="sr-only">Edit Debtor</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Edit Debtor</p>
                                    </TooltipContent>
                                  </Tooltip>

                                </div>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                      )
                    })
                )}
              </TableBody>
            </Table>
          </div>

          {/* 5. ADDED PAGINATION COMPONENT (Matching BillingPage) */}
          <Pagination
              meta={meta}
              links={links}
              paginationLinks={paginationLinks}
              onPageChange={handlePageClick}
              onPreviousClick={handlePreviousPage}
              onNextClick={handleNextPage}
          />

          <Dialog open={!!editingDebtor} onOpenChange={(open) => !open && setEditingDebtor(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Debtor Details</DialogTitle>
                <DialogDescription>
                  Update information for {editingDebtor?.full_name}.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="model">Billing Model</Label>
                  <Select
                      value={formData.model}
                      onValueChange={(val) => handleFormChange('model', val)}
                  >
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flywheel">Flywheel</SelectItem>
                      <SelectItem value="recovery">Recovery</SelectItem>
                      <SelectItem value="legacy">Legacy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingDebtor(null)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveClick} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={showLegacyWarning} onOpenChange={setShowLegacyWarning}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <TriangleAlert className="h-5 w-5" />
                  Confirm Model Change
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to switch to <strong>Legacy</strong> model?
                  <br /><br />
                  <span className="block font-medium text-slate-900">
                    Warning: This action will permanently delete the associated Debtor Profile.
                  </span>
                  All lifetime spending data, next bill dates, and profile history will be lost. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={executeSave} className="bg-red-600 hover:bg-red-700">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirm & Delete Profile
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
      </>
  )
}

export default function DebtorsPage() {
  return (
      <Suspense fallback={
        <div className="p-6">
          <Header title="Debtors" description="Loading..." />
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      }>
        <DebtorsContent />
      </Suspense>
  )
}