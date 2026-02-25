'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import type { Debtor, EmpAccount, PaginationMeta as PaginationMetaType, PaginationLinks, PaginationLink } from '@/types'
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
  X,
  Trash2,
  ArrowRightLeft,
} from 'lucide-react'
import { formatCurrency, formatDateTime, getDaysRemaining } from '@/lib/utils'

interface EditDebtorForm {
  model: string;
}

function DebtorsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get('status') || 'all'
  const currentModel = searchParams.get('model') || 'all'
  const currentSearch = searchParams.get('search') || ''
  const currentPage = Number(searchParams.get('page')) || 1

  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<PaginationMetaType | null>(null)
  const [links, setLinks] = useState<PaginationLinks | null>(null)
  const [paginationLinks, setPaginationLinks] = useState<PaginationLink[]>([])

  const [searchInput, setSearchInput] = useState(currentSearch)

  const [editingDebtor, setEditingDebtor] = useState<Debtor | null>(null)
  const [formData, setFormData] = useState<EditDebtorForm>({ model: 'legacy' })
  const [isSaving, setIsSaving] = useState(false)
  const [showLegacyWarning, setShowLegacyWarning] = useState(false)

  const [showPruneDialog, setShowPruneDialog] = useState(false)
  const [orphanCount, setOrphanCount] = useState<number | null>(null)
  const [isCheckingOrphans, setIsCheckingOrphans] = useState(false)
  const [isPruning, setIsPruning] = useState(false)

  // Bulk reassign state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showReassignDialog, setShowReassignDialog] = useState(false)
  const [empAccounts, setEmpAccounts] = useState<EmpAccount[]>([])
  const [targetAccountId, setTargetAccountId] = useState<string>('')
  const [isReassigning, setIsReassigning] = useState(false)
  const [reassignResult, setReassignResult] = useState<string | null>(null)

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

  // Clear selection when page/filters change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [currentPage, currentStatus, currentModel, currentSearch])

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

  // Fetch EMP accounts for reassign dialog
  useEffect(() => {
    api.getEmpAccounts().then(setEmpAccounts).catch(() => {})
  }, [])

  const handleStatusFilterChange = (status: string) => updateUrl({ status })
  const handleModelFilterChange = (model: string) => updateUrl({ model })

  const handlePageClick = (page: number) => updateUrl({ page })
  const handlePreviousPage = () => links?.prev && updateUrl({ page: currentPage - 1 })
  const handleNextPage = () => links?.next && updateUrl({ page: currentPage + 1 })

  const handleResetFilters = () => {
    setSearchInput('')
    router.replace(pathname)
  }

  // Selection handlers
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === debtors.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(debtors.map(d => d.id)))
    }
  }

  const handleOpenReassign = () => {
    setTargetAccountId('')
    setReassignResult(null)
    setShowReassignDialog(true)
  }

  const handleReassign = async () => {
    if (!targetAccountId || selectedIds.size === 0) return
    setIsReassigning(true)
    setReassignResult(null)
    try {
      const result = await api.bulkReassignDebtors(
        Array.from(selectedIds),
        Number(targetAccountId)
      )
      setReassignResult(result.message)
      setSelectedIds(new Set())
      setTimeout(() => {
        setShowReassignDialog(false)
        setReassignResult(null)
        fetchDebtors()
      }, 1500)
    } catch (error: any) {
      setReassignResult(error?.message || 'Reassign failed')
    } finally {
      setIsReassigning(false)
    }
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

  const handleCheckOrphans = async () => {
    setIsCheckingOrphans(true)
    try {
      const res = await api.getOrphanCount()
      setOrphanCount(res.orphaned_count)
      setShowPruneDialog(true)
    } catch (error) {
      console.error("Failed to check orphans", error)
    } finally {
      setIsCheckingOrphans(false)
    }
  }

  const handlePruneOrphans = async () => {
    setIsPruning(true)
    try {
      await api.pruneOrphans()
      setShowPruneDialog(false)
      fetchDebtors()
    } catch (error) {
      console.error("Failed to prune orphans", error)
    } finally {
      setIsPruning(false)
    }
  }

  return (
      <>
        <Header
            title="Debtors"
            description="View and manage debtor records"
        />
        <div className="p-6">

          <div className="mb-4 flex flex-col xl:flex-row gap-4 xl:items-center">
            <div className="flex flex-wrap gap-3 flex-1 w-full items-center">

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search name, email or IBAN..."
                    className="pl-9 bg-white"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

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

            <div className="flex-shrink-0 flex gap-2">
              <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                  onClick={handleCheckOrphans}
                  disabled={isCheckingOrphans}
              >
                {isCheckingOrphans ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                )}
                Clean Orphans
              </Button>
            </div>

          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 animate-in slide-in-from-top-2 duration-200">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.size} debtor{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={handleOpenReassign}
              >
                <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                Move to Account
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          )}

          <PaginationMeta
              meta={meta}
              label="debtors"
              containerClassName='px-2'
          />

          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-white hover:bg-white">
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={debtors.length > 0 && selectedIds.size === debtors.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
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
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                      <TableCell colSpan={16} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                ) : debtors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={16} className="text-center py-8">
                        No debtors found
                      </TableCell>
                    </TableRow>
                ) : (
                    debtors.map((debtor) => {
                      const profile = (debtor as any).debtor_profile;
                      const isLegacy = !profile || profile.billing_model === 'legacy';
                      const isActive = profile?.is_active;
                      const isSelected = selectedIds.has(debtor.id);

                      let rowClass = 'bg-white hover:bg-slate-50';

                      if (isSelected) {
                        rowClass = 'bg-blue-50/50 hover:bg-blue-50';
                      } else if (!isLegacy && !isActive) {
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
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(debtor.id)}
                                aria-label={`Select ${debtor.full_name}`}
                              />
                            </TableCell>
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

                            <TableCell>
                              <div className="font-mono text-xs">
                                {debtor.iban}
                              </div>
                            </TableCell>
                            <TableCell>{debtor.country}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(debtor.amount, debtor.currency)}
                            </TableCell>
                            <TableCell>{debtor.bank_name_reference}</TableCell>
                            <TableCell>{debtor.bank_country_iso_reference}</TableCell>
                            <TableCell>
                              {debtor.emp_account_name ? (
                                <span className="text-xs text-slate-600">{debtor.emp_account_name}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </TableCell>
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

          <Pagination
              meta={meta}
              links={links}
              paginationLinks={paginationLinks}
              onPageChange={handlePageClick}
              onPreviousClick={handlePreviousPage}
              onNextClick={handleNextPage}
          />

          {/* Edit Debtor Dialog */}
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

          {/* Legacy Warning Dialog */}
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

          {/* Prune Orphans Dialog */}
          <AlertDialog open={showPruneDialog} onOpenChange={setShowPruneDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  Clean Up Orphans?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  We found <strong className="text-slate-900">{orphanCount}</strong> debtor records that are not attached to any active upload.
                  <br /><br />
                  These are likely remnants of deleted uploads or failed processes. Removing them will clean up your database.
                  <br /><br />
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPruning}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handlePruneOrphans();
                    }}
                    disabled={isPruning}
                    className="bg-red-600 hover:bg-red-700"
                >
                  {isPruning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Delete {orphanCount} Orphans
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Bulk Reassign Dialog */}
          <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                  Move Debtors to Account
                </DialogTitle>
                <DialogDescription>
                  Move {selectedIds.size} selected debtor{selectedIds.size !== 1 ? 's' : ''} to a different EMP account.
                  Pending billing attempts will also be reassigned.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="target-account">Target Account</Label>
                  <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                    <SelectTrigger id="target-account">
                      <SelectValue placeholder="Select target account" />
                    </SelectTrigger>
                    <SelectContent>
                      {empAccounts.filter(a => a.is_active).map((account) => (
                        <SelectItem key={account.id} value={String(account.id)}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {reassignResult && (
                  <div className={`text-sm px-3 py-2 rounded-md ${
                    reassignResult.includes('failed') || reassignResult.includes('Failed')
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {reassignResult}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReassignDialog(false)} disabled={isReassigning}>
                  Cancel
                </Button>
                <Button
                  onClick={handleReassign}
                  disabled={isReassigning || !targetAccountId}
                >
                  {isReassigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Move {selectedIds.size} Debtor{selectedIds.size !== 1 ? 's' : ''}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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