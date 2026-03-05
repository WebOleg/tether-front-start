/**
 * Upload detail page with VOP verification, billing cycles and billing cap.
 */

'use client'

import { useEffect, useState, Fragment, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Header } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import type { BillingCyclesResponse } from '@/lib/api'
import {
  ArrowLeft,
  Loader2,
  Search,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Ban,
  ShieldCheck,
  ShieldX,
  CreditCard,
  Send,
  UserCheck,
  PlayCircle,
  RefreshCw,
  Settings,
  RotateCcw,
  Save,
} from 'lucide-react'
import type { Upload, Debtor, ValidationStats, VopStats, BillingStats, EmpAccount, PaginationMeta as PaginationMetaType, PaginationLinks, PaginationLink } from '@/types'
import { Pagination, PaginationMeta } from '@/components/ui/pagination'
import { Progress } from '@/components/ui/progress'
import { ModelTabs } from '@/components/ui/model-tabs'
import { formatDate, formatCurrency } from '@/lib/utils'
import { validationStatusConfig } from '@/lib/styles'
import { ModelBadge, StatusBadge } from '@/components/ui/badges'
import { BavVerificationModal } from '@/components/bav-verification-modal'

type DebtorType = 'all' | 'legacy' | 'flywheel' | 'recovery'

function getValidationDisplayStatus(debtor: Debtor): string {
  if (debtor.latest_billing?.status === 'chargebacked') {
    return 'chargebacked'
  }
  if (debtor.latest_billing?.status === 'approved') {
    return 'approved'
  }
  if (debtor.validation_errors?.some(e => e.toLowerCase().includes('encoding'))) {
    return 'error'
  }
  return debtor.validation_status
}

export default function UploadDetailPage() {
  const params = useParams()
  const uploadId = Number(params.id)

  const [upload, setUpload] = useState<Upload | null>(null)
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [stats, setStats] = useState<ValidationStats | null>(null)
  const [vopStats, setVopStats] = useState<VopStats | null>(null)
  const [billingStats, setBillingStats] = useState<BillingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [verifyingVop, setVerifyingVop] = useState(false)
  const [validating, setValidating] = useState(false)
  const [search, setSearch] = useState('')
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [editingDebtor, setEditingDebtor] = useState<Debtor | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [meta, setMeta] = useState<PaginationMetaType | null>(null)
  const [links, setLinks] = useState<PaginationLinks | null>(null)
  const [paginationLinks, setPaginationLinks] = useState<PaginationLink[]>([])
  const [tableLoading, setTableLoading] = useState(false)
  const [hasFetchedInitial, setHasFetchedInitial] = useState(false)
  const [VerifyVopInProgress, setVerifyVopInProgress] = useState(false)
  const [debtorType, setDebtorType] = useState<DebtorType>('all')
  const [bavModalOpen, setBavModalOpen] = useState(false)
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false)
  const [skipBicBlacklist, setSkipBicBlacklist] = useState(false)

  // Reassign state
  const [reassignOpen, setReassignOpen] = useState(false)
  const [empAccounts, setEmpAccounts] = useState<EmpAccount[]>([])
  const [reassignAccountId, setReassignAccountId] = useState<number | null>(null)
  const [reassigning, setReassigning] = useState(false)

  // Billing cycles & cap state
  const [billingCycles, setBillingCycles] = useState<BillingCyclesResponse | null>(null)
  const [cyclesLoading, setCyclesLoading] = useState(false)
  const [maxBillingInput, setMaxBillingInput] = useState<string>('')
  const [savingCap, setSavingCap] = useState(false)

  const defaultCounts = { all: 0, flywheel: 0, recovery: 0, legacy: 0 }
  const modelCounts = stats?.model_counts || defaultCounts

  const debtorTypeRef = useRef(debtorType)
  useEffect(() => {
    debtorTypeRef.current = debtorType
  }, [debtorType])

  const isValidating = validating || stats?.is_processing
  const validationCompleted = stats ? !stats.is_processing && stats.pending === 0 : false
  const hasNeverValidated = stats ? stats.valid === 0 && stats.invalid === 0 && stats.blacklisted === 0 && stats.pending === (stats.total || 0) : false

  useEffect(() => {
    if (stats?.is_processing) {
      setValidating(true)
    } else if (stats && !stats.is_processing && stats.pending === 0) {
      setValidating(false)
    }
  }, [stats?.is_processing, stats?.pending])

  const fetchBillingCycles = useCallback(async () => {
    try {
      setCyclesLoading(true)
      const data = await api.getBillingCycles(uploadId)
      setBillingCycles(data)
      if (data.data.max_billing_amount !== null) {
        setMaxBillingInput(data.data.max_billing_amount.toString())
      } else {
        setMaxBillingInput('')
      }
    } catch (error) {
      console.error('Failed to fetch billing cycles:', error)
    } finally {
      setCyclesLoading(false)
    }
  }, [uploadId])

  const handleSaveCap = async () => {
    setSavingCap(true)
    try {
      const value = maxBillingInput.trim() === '' ? null : parseFloat(maxBillingInput)
      if (value !== null && (isNaN(value) || value < 0)) {
        toast.error('Please enter a valid amount or leave empty for no limit')
        setSavingCap(false)
        return
      }
      await api.updateUploadSettings(uploadId, { max_billing_amount: value })
      toast.success(value !== null ? `Billing cap set to ${value} EUR` : 'Billing cap removed')
      await fetchBillingCycles()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update billing cap')
    } finally {
      setSavingCap(false)
    }
  }

  const fetchVopStats = useCallback(async (typeOverride?: DebtorType) => {
    try {
      const currentType = typeOverride ?? debtorTypeRef.current
      const data = await api.getVopStats(
          uploadId,
          currentType !== 'all' ? { debtor_type: currentType } : undefined
      )
      setVerifyVopInProgress(data?.is_processing ?? false)
      setVopStats(data)
      return data
    } catch (error) {
      console.error('Failed to fetch VOP stats:', error)
      return null
    }
  }, [uploadId])

  const fetchBillingStats = useCallback(async (typeOverride?: DebtorType) => {
    try {
      const currentType = typeOverride ?? debtorTypeRef.current
      const data = await api.getBillingStats(
          uploadId,
          currentType !== 'all' ? { debtor_type: currentType } : undefined
      )
      setBillingStats(data)
      return data
    } catch (error) {
      console.error('Failed to fetch billing stats:', error)
      return null
    }
  }, [uploadId])

  const fetchValidationStats = useCallback(async (typeOverride?: DebtorType) => {
    const currentType = typeOverride ?? debtorTypeRef.current
    try {
      const statsData = await api.getUploadValidationStats(
          uploadId,
          currentType !== 'all' ? { debtor_type: currentType } : undefined
      )
      setStats(statsData)
      return statsData
    } catch (error) {
      console.error('Failed to fetch validation stats:', error)
      return null
    }
  }, [uploadId])

  const fetchDebtors = useCallback(async (pageNum?: number, searchQuery?: string) => {
    try {
      const debtorsResponse = await api.getUploadDebtors(uploadId, withTypeParam({
        page: pageNum || currentPage,
        per_page: 100,
        search: searchQuery !== undefined ? searchQuery : search || undefined,
      }))

      setDebtors(debtorsResponse.data)
      setMeta(debtorsResponse.meta || null)
      setLinks(debtorsResponse.links || null)

      if (debtorsResponse.meta && 'links' in debtorsResponse.meta) {
        setPaginationLinks((debtorsResponse.meta as PaginationMetaType & {links?: PaginationLink[]}).links || [])
      }
      return debtorsResponse
    } catch (error) {
      console.error('Failed to fetch debtors:', error)
      return null
    }
  }, [uploadId, currentPage, search])

  const withTypeParam = <T extends Record<string, any>>(params: T) => ({
    ...params,
    ...(debtorTypeRef.current !== 'all' ? { debtor_type: debtorTypeRef.current } : {}),
  })

  const handleTypeChange = (value: string) => {
    setDebtorType(value as DebtorType)
    setCurrentPage(1)
  }

  // Manual validation trigger
  const handleValidate = async () => {
    setValidating(true)
    try {
      api.validateUpload(uploadId, skipBicBlacklist).catch(err => {
        console.error('Validation dispatch error:', err)
      })
      const statsData = await api.getUploadValidationStats(uploadId)
      setStats(statsData)
      toast.success('Validation started')
    } catch (error) {
      console.error('Failed to start validation:', error)
      toast.error('Failed to start validation')
      setValidating(false)
    }
  }

  useEffect(() => {
    const initPage = async () => {
      setLoading(true)
      try {
        const uploadData = await api.getUpload(uploadId)
        setUpload(uploadData)

        const statsData = await api.getUploadValidationStats(uploadId)
        setStats(statsData)

        if (statsData?.is_processing) {
          setValidating(true)
        }

        const vopData = await api.getVopStats(uploadId)
        setVopStats(vopData)
        setVerifyVopInProgress(vopData?.is_processing ?? false)

        const billingData = await api.getBillingStats(uploadId)
        setBillingStats(billingData)

        // Fetch billing cycles
        try {
          const cyclesData = await api.getBillingCycles(uploadId)
          setBillingCycles(cyclesData)
          if (cyclesData.data.max_billing_amount !== null) {
            setMaxBillingInput(cyclesData.data.max_billing_amount.toString())
          }
        } catch (e) {
          console.error('Failed to fetch billing cycles:', e)
        }

        setHasFetchedInitial(true)
      } catch (error) {
        console.error('Failed to initialize:', error)
        toast.error('Failed to load upload')
      } finally {
        setLoading(false)
      }
    }

    if (uploadId) {
      initPage()
    }
  }, [uploadId])

  useEffect(() => {
    if (!isValidating || !uploadId) return

    const interval = setInterval(async () => {
      const newStats = await fetchValidationStats()
      if (newStats && !newStats.is_processing && newStats.pending === 0) {
        setValidating(false)
        fetchVopStats()
        await fetchDebtors()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [isValidating, uploadId, fetchValidationStats, fetchDebtors, fetchVopStats])

  useEffect(() => {
    if (!billingStats?.is_processing) return

    const interval = setInterval(async () => {
      const data = await fetchBillingStats()
      if (data && !data.is_processing) {
        clearInterval(interval)
        toast.success('Billing processing completed!')
        fetchBillingCycles()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [billingStats?.is_processing, fetchBillingStats, fetchBillingCycles])

  // Polling effect for VOP verification progress
  useEffect(() => {
    if (!VerifyVopInProgress) return

    const interval = setInterval(async () => {
      const vopData = await fetchVopStats()
      const validationData = await fetchValidationStats()
      
      if (vopData && !vopData.is_processing) {
        setVerifyVopInProgress(false)
        clearInterval(interval)
        toast.success('VOP verification completed.')
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [VerifyVopInProgress, fetchVopStats, fetchValidationStats])

  useEffect(() => {
    if (!uploadId || loading || !hasFetchedInitial) return

    const fetchData = async () => {
      setTableLoading(true)
      try {
        await api.getUploadDebtors(
            uploadId,
            withTypeParam({
              page: currentPage,
              per_page: 100,
              search: search || undefined,
            })
        ).then(debtorsResponse => {
          setDebtors(debtorsResponse.data)
          setMeta(debtorsResponse.meta || null)
          setLinks(debtorsResponse.links || null)

          if (debtorsResponse.meta && 'links' in debtorsResponse.meta) {
            setPaginationLinks((debtorsResponse.meta as PaginationMetaType & {links?: PaginationLink[]}).links || [])
          }
        })
      } catch (error) {
        console.error('Failed to fetch debtors:', error)
      } finally {
        setTableLoading(false)
      }
    }

    const timer = setTimeout(() => {
      fetchData()
    }, search ? 300 : 0)

    return () => clearTimeout(timer)
  }, [uploadId, currentPage, search, loading, hasFetchedInitial])

  useEffect(() => {
    if (!uploadId || loading || !hasFetchedInitial) return

    const run = async () => {
      setTableLoading(true)
      try {
        await Promise.all([
          fetchDebtors(1),
          fetchValidationStats(debtorType),
          fetchVopStats(debtorType),
          fetchBillingStats(debtorType),
        ])
      } finally {
        setTableLoading(false)
      }
    }

    run()
  }, [debtorType, fetchValidationStats, fetchBillingStats, fetchVopStats, fetchDebtors, uploadId, loading, hasFetchedInitial])

  const handleVerifyVop = async () => {
    await fetchVopStats()
    if(VerifyVopInProgress === true){
      toast.warning('VOP verification is already in progress.')
      return
    }

    setVerifyingVop(true)
    try {
      await api.verifyVop(uploadId, debtorType !== 'all' ? { debtor_type: debtorType } : undefined)
      toast.success('VOP verification started. This may take a few minutes.')

      const pollInterval = setInterval(async () => {
        const vopData = await fetchVopStats()
        await fetchValidationStats()
        if (vopData && vopData.is_processing === false) {
          clearInterval(pollInterval)
          setVerifyingVop(false)
          toast.success('VOP verification completed.')
        }
      }, 2000)

      setTimeout(() => {
        clearInterval(pollInterval)
        fetchVopStats()
        fetchValidationStats()
        setVerifyingVop(false)
      }, 900000)

    } catch (error) {
      setVerifyingVop(false)
      toast.error('Failed to start VOP verification')
    }
  }

  const handleVoidClick = () => {
    setVoidConfirmOpen(true)
  }

  const handleVoidConfirm = async () => {
    setVoidConfirmOpen(false)
    setVoiding(true)

    try {
      await api.voidBilling(uploadId)
      toast.success('Void process queued.')
      await fetchBillingStats()
    } catch (error: any) {
      console.error(error)
      const errorMessage = error.toString() || 'Failed to queue void process'
      toast.error(errorMessage)
    } finally {
      setVoiding(false)
    }
  }

  const handleCancelBilling = async () => {
    if (!confirm('Are you sure you want to stop the billing process? This will stop the loop immediately.')) {
      return
    }

    setCancelling(true)
    try {
      await api.cancelBilling(uploadId)
      toast.success('Stop signal sent. Sync will terminate shortly.')
      await fetchBillingStats()
    } catch (error) {
      console.error(error)
      toast.error('Failed to cancel billing')
    } finally {
      setCancelling(false)
    }
  }

  const handleSync = async () => {
    if (vopPending > 0) {
      toast.error(`VOP verification must be completed first. ${vopPending} debtors pending.`, {
        action: {
          label: 'Verify VOP',
          onClick: () => handleVerifyVop()
        }
      })
      return
    }

    if (!confirm(`Send ${stats?.ready_for_sync || 0} debtors to payment gateway?`)) {
      return
    }

    setSyncing(true)
    try {
      const result = await api.syncToGateway(uploadId, debtorType !== 'all' ? { debtor_type: debtorType } : undefined)

      if (result.data.duplicate) {
        toast.warning('Billing already in progress for this upload')
      } else if (result.data.queued) {
        toast.success(result.message)
        await fetchBillingStats()
        await fetchBillingCycles()
      } else {
        toast.info(result.message)
      }
    } catch (error: any) {
      if (error.response?.data?.data?.vop_required) {
        const vopData = error.response.data.data
        toast.error(`VOP verification required. ${vopData.vop_pending} debtors pending.`, {
          action: {
            label: 'Verify VOP',
            onClick: () => handleVerifyVop()
          }
        })
        await fetchVopStats()
      } else {
        toast.error(error.message || 'Failed to start billing')
      }
    } finally {
      setSyncing(false)
    }
  }

  const handleReassignOpen = async () => {
    setReassignOpen(true)
    try {
      const accounts = await api.getEmpAccounts()
      setEmpAccounts(accounts.filter(a => a.is_active))
    } catch (error) {
      toast.error('Failed to load EMP accounts')
    }
  }

  const handleReassign = async () => {
    if (!reassignAccountId) return

    setReassigning(true)
    try {
      const result = await api.reassignUpload(uploadId, reassignAccountId)
      toast.success(result.message)
      setReassignOpen(false)
      setReassignAccountId(null)

      const uploadData = await api.getUpload(uploadId)
      setUpload(uploadData)
    } catch (error: any) {
      toast.error(error.message || 'Failed to reassign upload')
    } finally {
      setReassigning(false)
    }
  }

  const handleEditClick = (debtor: Debtor) => {
    setEditingDebtor(debtor)
    setEditForm(debtor.raw_data || {})
  }

  const handleSave = async () => {
    if (!editingDebtor) return

    setSaving(true)
    try {
      const updated = await api.updateDebtor(editingDebtor.id, { raw_data: editForm })
      setDebtors(prev => prev.map(d => d.id === updated.id ? updated : d))

      const newStats = await api.getUploadValidationStats(uploadId)
      setStats(newStats)

      toast.success('Debtor updated successfully')
      setEditingDebtor(null)
    } catch (error) {
      toast.error('Failed to update debtor')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (debtor: Debtor) => {
    if (!confirm(`Delete ${debtor.first_name} ${debtor.last_name}?`)) return

    try {
      await api.deleteDebtor(debtor.id)
      setDebtors(prev => prev.filter(d => d.id !== debtor.id))

      const newStats = await api.getUploadValidationStats(uploadId)
      setStats(newStats)

      toast.success('Debtor deleted')
      setEditingDebtor(null)
    } catch (error) {
      toast.error('Failed to delete debtor')
    }
  }

  const handleBavComplete = () => {
    fetchVopStats()
    fetchValidationStats()
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Loading...</p>
          </div>
        </div>
    )
  }

  if (!upload) {
    return (
        <div className="p-6">
          <p className="text-red-600">Upload not found</p>
          <Link href="/admin/uploads" className="text-blue-600 hover:underline">
            Back to uploads
          </Link>
        </div>
    )
  }

  const headers = upload.headers || []
  const editHeaders = editingDebtor?.raw_data ? Object.keys(editingDebtor.raw_data) : headers
  const editingErrors = editingDebtor?.validation_errors || []
  const vopPending = vopStats ? vopStats.pending : 0
  const vopTotalEligible = vopStats ? vopStats.total_eligible : 0
  const hasBillingActivity = billingStats && billingStats.total_attempts > 0

  const vopPassed = (vopStats?.by_result?.verified || 0) + (vopStats?.by_result?.likely_verified || 0)
  const vopFailed = (vopStats?.by_result?.mismatch || 0) + (vopStats?.by_result?.rejected || 0) + (vopStats?.by_result?.inconclusive || 0)

  const canSync = (vopTotalEligible === 0 || vopPending === 0) && !isValidating

  const cbByAmount = new Map<number, { approved: number; chargebacks: number; cb_rate: number; cb_rate_amount: number; approved_volume: number; cb_volume: number }>()
  if (stats?.cb_breakdown) {
    for (const cb of stats.cb_breakdown) {
      cbByAmount.set(cb.amount, cb)
    }
  }

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
            title={upload.original_filename}
            description={
              <>
                <span className="block text-sm text-slate-500">{upload.filename}</span>
                <span className="block text-sm text-slate-500">
                  Uploaded {formatDate(upload.created_at)}
                  {upload.emp_account && (
                      <span className="ml-3 inline-flex items-center gap-1">
                      <span className="text-slate-400">•</span>
                      <button
                          onClick={handleReassignOpen}
                          className="text-emerald-600 font-medium hover:text-emerald-700 hover:underline cursor-pointer transition-colors"
                          title="Click to change account"
                      >
                        {upload.emp_account.name}
                      </button>
                      <RefreshCw className="h-3 w-3 text-slate-400 cursor-pointer hover:text-emerald-600" onClick={handleReassignOpen} />
                    </span>
                  )}
                  {!upload.emp_account && (
                      <button
                          onClick={handleReassignOpen}
                          className="ml-3 text-sm text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                      >
                        Assign Account
                      </button>
                  )}
                </span>
              </>
            }
        />

        <div className="px-6 pt-4">
          <ModelTabs
            value={debtorType}
            onValueChange={handleTypeChange}
            showCounts={modelCounts}
          />
        </div>

        <div className="">
          <div className="px-6 pt-4 flexlex-col sm:flex-row justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/admin/uploads">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <StatusBadge status={upload.status} />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipBicBlacklist}
                  onChange={(e) => setSkipBicBlacklist(e.target.checked)}
                  disabled={isValidating}
                  className="rounded border-slate-300"
                />
                <span className={`${isValidating ? 'text-slate-400' : 'text-slate-600'}`}>Skip BIC Blacklist</span>
              </label>
              <span className="text-sm text-slate-500">
              {stats?.total || 0} records
            </span>
              {!isValidating && (
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handleValidate}
                      className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {hasNeverValidated ? 'Validate' : 'Re-validate'}
                  </Button>
              )}
              {isValidating && (
                  <Badge className="bg-blue-100 text-blue-800 gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Validating...
                  </Badge>
              )}
              {billingStats?.is_processing && (
                  <Badge className="bg-blue-100 text-blue-800 gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Billing in progress
                  </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {validationCompleted && vopPending > 0 && (
                  <Button
                      variant="outline"
                      onClick={handleVerifyVop}
                      disabled={verifyingVop || VerifyVopInProgress}
                      className="gap-2"
                  >
                    {(verifyingVop || VerifyVopInProgress) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          VOP in progress...
                        </>
                    ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" />
                          Verify VOP ({vopPending})
                        </>
                    )}
                  </Button>
              )}
              {validationCompleted && vopPassed > 0 && (
                  <Button
                      variant="outline"
                      onClick={() => setBavModalOpen(true)}
                      className="gap-2"
                  >
                    <UserCheck className="h-4 w-4" />
                    BAV
                  </Button>
              )}

              {billingStats?.is_processing && (
                  <Button
                      variant="destructive"
                      onClick={handleCancelBilling}
                      disabled={cancelling}
                      className="gap-2 mr-2 cursor-pointer"
                  >
                    {cancelling ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Stopping...
                        </>
                    ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          Stop Billing
                        </>
                    )}
                  </Button>
              )}

              {((billingStats?.billing_status === 'cancelling' || billingStats?.billing_status === 'cancelled') && (billingStats?.approved + billingStats?.pending) > 0) && (
                  <Button
                      variant="destructive"
                      onClick={handleVoidClick}
                      disabled={voiding || billingStats?.is_processing}
                      className="gap-2 mr-2 cursor-pointer bg-red-900 hover:bg-red-950"
                  >
                    {voiding ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Voiding...
                        </>
                    ) : (
                        <>
                          <Ban className="h-4 w-4" />
                          Void All ({(billingStats?.approved + billingStats?.pending)})
                        </>
                    )}
                  </Button>
              )}

              <Button
                  onClick={handleSync}
                  disabled={syncing || billingStats?.is_processing || (stats?.ready_for_sync || 0) === 0 || !canSync}
                  className="gap-2"
                  title={!canSync ? `VOP verification required (${vopPending} pending)` : undefined}
              >
                {syncing || billingStats?.is_processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {billingStats?.is_processing ? 'Processing...' : 'Syncing...'}
                    </>
                ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Sync to Gateway ({stats?.ready_for_sync || 0})
                    </>
                )}
              </Button>
            </div>
          </div>

          {validationCompleted && vopPending > 0 && (stats?.ready_for_sync || 0) > 0 && (
              <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">
                      VOP verification required before billing
                    </p>
                    <p className="text-xs text-amber-600">
                      {vopPending} of {vopTotalEligible} debtors pending verification. Complete VOP verification to enable billing.
                    </p>
                  </div>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVerifyVop}
                      disabled={verifyingVop || VerifyVopInProgress}
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    {(verifyingVop || VerifyVopInProgress) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        'Verify Now'
                    )}
                  </Button>
                </div>
                {(verifyingVop || VerifyVopInProgress) && vopTotalEligible > 0 && (
                  <div className="mt-3">
                    <Progress 
                      value={vopTotalEligible - vopPending}
                      max={vopTotalEligible}
                      variant="yellow"
                      height="md"
                      className="bg-amber-200"
                    />
                    <p className="text-xs text-amber-600 mt-1 text-right">
                      {Math.round(((vopTotalEligible - vopPending) / vopTotalEligible) * 100)}% complete
                    </p>
                  </div>
                )}
              </div>
          )}

          {isValidating && (
              <div className="mx-6 mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-blue-700 flex-shrink-0 animate-spin" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Validation in progress
                    </p>
                    <p className="text-xs text-blue-700">
                      Validated {stats?.total ? stats.total - (stats.pending || 0) : 0} of {stats?.total || 0} debtors. Please wait for completion.
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <Progress
                      value={stats?.total ? stats.total - (stats.pending || 0) : 0}
                      max={stats?.total || 100}
                      variant="default"
                      height="md"
                      className="bg-blue-200"
                  />
                  <p className="text-xs text-blue-600 mt-1 text-right">
                    {stats?.total ? Math.round((stats.total - (stats.pending || 0)) / stats.total * 100) : 0}% complete
                  </p>
                </div>
              </div>
          )}

          {stats && (
              <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-10 gap-4">
                <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full" /><span className="text-sm text-slate-500">Valid</span></div><p className="text-2xl font-semibold mt-1">{stats.valid}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-full" /><span className="text-sm text-slate-500">Invalid</span></div><p className="text-2xl font-semibold mt-1">{stats.invalid}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-500 rounded-full" /><span className="text-sm text-slate-500">Blacklisted</span></div><p className="text-2xl font-semibold mt-1">{stats.blacklisted}</p></CardContent></Card>
                <Card className={stats.chargebacked > 0 ? 'border-red-300 bg-red-50' : ''}><CardContent className="pt-4"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-600 rounded-full" /><span className="text-sm text-slate-500">Chargebacked</span></div><p className="text-2xl font-semibold mt-1">{stats.chargebacked}{(upload?.billed_with_emp_count ?? 0) > 0 && (<span className="text-sm text-slate-500 ml-2">({Math.round((stats.chargebacked / (upload?.billed_with_emp_count ?? 1)) * 100)}%)</span>)}</p></CardContent></Card>
                <Card className={(upload.bav_passed_count ?? 0) > 0 ? 'border-green-300 bg-green-50' : ''}><CardContent className="pt-4"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full" /><span className="text-sm text-slate-500">BAV Passed</span></div><p className="text-2xl font-semibold mt-1">{upload.bav_passed_count ?? 0}</p></CardContent></Card>
                <Card className={(upload.bav_excluded_count ?? 0) > 0 ? 'border-amber-300 bg-amber-50' : ''}><CardContent className="pt-4"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-500 rounded-full" /><span className="text-sm text-slate-500">BAV Excluded</span></div><p className="text-2xl font-semibold mt-1">{upload.bav_excluded_count ?? 0}</p></CardContent></Card>
                <Card className={vopPassed > 0 ? 'border-green-300 bg-green-50' : ''}><CardContent className="pt-4"><div className="flex items-center gap-2"><ShieldCheck className="h-3 w-3 text-green-600" /><span className="text-sm text-slate-500">VOP Passed</span></div><p className="text-2xl font-semibold mt-1">{vopPassed}</p></CardContent></Card>
                <Card className={vopFailed > 0 ? 'border-red-300 bg-red-50' : ''}><CardContent className="pt-4"><div className="flex items-center gap-2"><ShieldX className="h-3 w-3 text-red-600" /><span className="text-sm text-slate-500">VOP Failed</span></div><p className="text-2xl font-semibold mt-1">{vopFailed}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-400 rounded-full" /><span className="text-sm text-slate-500">Pending</span></div><p className="text-2xl font-semibold mt-1">{stats.pending}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full" /><span className="text-sm text-slate-500">Ready for Sync</span></div><p className="text-2xl font-semibold mt-1">{stats.ready_for_sync}</p></CardContent></Card>
              </div>
          )}

          {stats?.price_breakdown && stats.price_breakdown.length > 0 && (
              <div className="px-6 pb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Price Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Price</TableHead>
                            <TableHead className="text-right">Valid</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            <TableHead className="text-right">Approved</TableHead>
                            <TableHead className="text-right">Chargebacks</TableHead>
                            <TableHead className="text-right">CB Rate</TableHead>
                            <TableHead className="text-right">CB Rate (€)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.price_breakdown.map((item, idx) => {
                            const cb = cbByAmount.get(item.amount)
                            const cbRate = cb?.cb_rate ?? 0
                            const cbRateAmount = cb?.cb_rate_amount ?? 0
                            const isAlert = cbRate > 1
                            return (
                              <TableRow key={idx} className={isAlert ? 'bg-red-50' : ''}>
                                <TableCell className="font-semibold">{formatCurrency(item.amount, 'EUR')}</TableCell>
                                <TableCell className="text-right">{item.count}</TableCell>
                                <TableCell className="text-right text-slate-600">{formatCurrency(item.total, 'EUR')}</TableCell>
                                <TableCell className="text-right text-green-700">{cb?.approved ?? '—'}</TableCell>
                                <TableCell className="text-right text-red-700">{cb?.chargebacks ?? '—'}</TableCell>
                                <TableCell className={`text-right font-semibold ${isAlert ? 'text-red-700' : 'text-slate-700'}`}>
                                  {cb ? `${cbRate}%` : '—'}
                                  {isAlert && <AlertTriangle className="inline h-3 w-3 ml-1 text-red-500" />}
                                </TableCell>
                                <TableCell className={`text-right font-semibold ${isAlert ? 'text-red-700' : 'text-slate-700'}`}>
                                  {cb ? `${cbRateAmount}%` : '—'}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-3 pt-3 border-t flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">
                        Total Valid Amount: {formatCurrency(stats.valid_total_amount || 0, 'EUR')}
                      </span>
                      <span className="text-sm text-slate-500">
                        {stats.valid} valid records
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
          )}

          {hasBillingActivity && billingStats && (
              <div className="px-6 pb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Billing Status
                      {billingStats.is_processing && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700">Approved</span>
                        </div>
                        <p className="text-xl font-semibold text-green-800 mt-1">{billingStats.approved}</p>
                        <p className="text-xs text-green-600">{formatCurrency(billingStats.approved_amount, 'EUR')}</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-700">Pending</span>
                        </div>
                        <p className="text-xl font-semibold text-yellow-800 mt-1">{billingStats.pending}</p>
                        <p className="text-xs text-yellow-600">{formatCurrency(billingStats.pending_amount, 'EUR')}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-700">Declined</span>
                        </div>
                        <p className="text-xl font-semibold text-red-800 mt-1">{billingStats.declined}</p>
                        <p className="text-xs text-red-600">{formatCurrency(billingStats.declined_amount, 'EUR')}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-slate-600" />
                          <span className="text-sm text-slate-700">Errors</span>
                        </div>
                        <p className="text-xl font-semibold text-slate-800 mt-1">{billingStats.error}</p>
                        <p className="text-xs text-slate-600">{formatCurrency(billingStats.error_amount, 'EUR')}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t flex justify-between items-center">
                      <span className="text-sm text-slate-500">Total attempts: {billingStats.total_attempts}</span>
                      <Link href={`/admin/billing?upload_id=${uploadId}`}>
                        <Button variant="outline" size="sm">View Details</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
          )}

          {/* Billing Cycles & Cap Section */}
          {(hasBillingActivity || billingCycles?.data?.max_billing_amount !== null) && (
              <div className="px-6 pb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <RotateCcw className="h-5 w-5" />
                      Billing Cycles
                      {cyclesLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-slate-500" />
                        <Label className="text-sm font-medium text-slate-700 whitespace-nowrap">Max Billing Cap (EUR):</Label>
                      </div>
                      <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="No limit"
                          value={maxBillingInput}
                          onChange={(e) => setMaxBillingInput(e.target.value)}
                          className="w-36 h-8"
                      />
                      <Button size="sm" onClick={handleSaveCap} disabled={savingCap} className="gap-1 h-8">
                        {savingCap ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Save
                      </Button>
                      {billingCycles?.data?.max_billing_amount !== null && (
                          <div className="flex items-center gap-3 ml-4 text-sm">
                            <span className="text-slate-500">
                              Total billed: <span className="font-semibold text-slate-700">{formatCurrency(billingCycles?.data?.total_billed_amount ?? 0, 'EUR')}</span>
                            </span>
                            <span className="text-slate-500">
                              Remaining: <span className={`font-semibold ${(billingCycles?.data?.cap_remaining ?? 0) <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(billingCycles?.data?.cap_remaining ?? 0, 'EUR')}
                              </span>
                            </span>
                          </div>
                      )}
                    </div>

                    {billingCycles?.data?.cycles && billingCycles.data.cycles.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cycle</TableHead>
                                <TableHead className="text-right">Approved</TableHead>
                                <TableHead className="text-right">Pending</TableHead>
                                <TableHead className="text-right">Declined</TableHead>
                                <TableHead className="text-right">Chargebacked</TableHead>
                                <TableHead className="text-right">Error</TableHead>
                                <TableHead className="text-right">Void</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {billingCycles.data.cycles.map((cycle) => (
                                  <TableRow key={cycle.cycle}>
                                    <TableCell className="font-semibold">Cycle {cycle.cycle}</TableCell>
                                    <TableCell className="text-right">
                                      {cycle.statuses.approved ? (
                                          <span className="inline-flex items-center gap-1">
                                            <span className="text-green-700 font-medium">{cycle.statuses.approved.count}</span>
                                            <span className="text-xs text-green-600">({formatCurrency(cycle.statuses.approved.amount, 'EUR')})</span>
                                          </span>
                                      ) : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {cycle.statuses.pending ? (
                                          <span className="inline-flex items-center gap-1">
                                            <span className="text-yellow-700 font-medium">{cycle.statuses.pending.count}</span>
                                            <span className="text-xs text-yellow-600">({formatCurrency(cycle.statuses.pending.amount, 'EUR')})</span>
                                          </span>
                                      ) : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {cycle.statuses.declined ? <span className="text-red-700 font-medium">{cycle.statuses.declined.count}</span> : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {cycle.statuses.chargebacked ? <span className="text-purple-700 font-medium">{cycle.statuses.chargebacked.count}</span> : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {cycle.statuses.error ? <span className="text-slate-600">{cycle.statuses.error.count}</span> : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {cycle.statuses.void ? <span className="text-gray-500">{cycle.statuses.void.count}</span> : '—'}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">{cycle.total_count}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(cycle.total_amount, 'EUR')}</TableCell>
                                  </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <div className="mt-3 pt-3 border-t flex justify-between items-center">
                            <span className="text-sm text-slate-500">
                              {billingCycles.data.total_cycles} cycle{billingCycles.data.total_cycles !== 1 ? 's' : ''} completed
                            </span>
                            <Button variant="outline" size="sm" onClick={fetchBillingCycles} className="gap-1">
                              <RefreshCw className="h-3 w-3" />
                              Refresh
                            </Button>
                          </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No billing cycles yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
          )}

          <PaginationMeta meta={meta} label="debtors" />

          <div className="px-6">
            <Card>
              <CardHeader className="px-2">
                <div className="flex flex-col sm:flex-row justify-between p-0">
                  <CardTitle>Debtors</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                          placeholder="Search..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="pl-9 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Actions</TableHead>
                        <TableHead className="w-28">Model</TableHead>
                        {headers.map((h, idx) => (
                            <TableHead key={`header-${idx}-${h}`} className="whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableLoading ? (
                          <TableRow>
                            <TableCell colSpan={headers.length + 2} className="text-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                              <p className="mt-2 text-sm text-slate-500">Loading...</p>
                            </TableCell>
                          </TableRow>
                      ) : debtors.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={headers.length + 2} className="text-center py-8 text-slate-500">
                              No debtors found
                            </TableCell>
                          </TableRow>
                      ) : (
                          debtors.map((debtor) => {
                            const displayStatus = getValidationDisplayStatus(debtor)
                            const statusConfig = validationStatusConfig[displayStatus]
                            const rawData = debtor.raw_data || {}
                            const hasErrors = debtor.validation_errors && debtor.validation_errors.length > 0
                            const isChargebacked = displayStatus === 'chargebacked'
                            const isHovered = hoveredId === debtor.id
                            const bgClass = isHovered ? statusConfig.hoverBg : statusConfig.rowBg

                            return (
                                <Fragment key={debtor.id}>
                                  <TableRow
                                      className={`${bgClass} transition-colors ${hasErrors || isChargebacked ? 'border-b-0' : ''}`}
                                      onMouseEnter={() => setHoveredId(debtor.id)}
                                      onMouseLeave={() => setHoveredId(null)}
                                  >
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                  <span className={statusConfig.color} title={statusConfig.label}>
                                    {statusConfig.icon}
                                  </span>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(debtor)}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => handleDelete(debtor)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <ModelBadge model={debtor.debtor_profile?.billing_model} />
                                    </TableCell>
                                    {headers.map((h, idx) => (
                                        <TableCell key={`cell-${debtor.id}-${idx}-${h}`} className="whitespace-nowrap max-w-[200px] truncate">
                                          {rawData[h] || '-'}
                                        </TableCell>
                                    ))}
                                  </TableRow>
                                  {(hasErrors || isChargebacked) && (
                                      <TableRow
                                          className={`${bgClass} transition-colors`}
                                          onMouseEnter={() => setHoveredId(debtor.id)}
                                          onMouseLeave={() => setHoveredId(null)}
                                      >
                                        <TableCell colSpan={headers.length + 2} className="pt-0 pb-3">
                                          <div className={`flex items-start gap-2 text-sm ${statusConfig.textColor}`}>
                                            {isChargebacked ? (
                                                <>
                                                  <Ban className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                  <span>This IBAN received a chargeback - cannot be processed again</span>
                                                </>
                                            ) : (
                                                <>
                                                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                  <span>{debtor.validation_errors?.join(', ')}</span>
                                                </>
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                  )}
                                </Fragment>
                            )
                          })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mb-8">
          <Pagination
              meta={meta}
              links={links}
              paginationLinks={paginationLinks}
              onPageChange={handlePageClick}
              onPreviousClick={handlePreviousPage}
              onNextClick={handleNextPage}
          />
        </div>

        <Dialog open={!!editingDebtor} onOpenChange={() => setEditingDebtor(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                Edit Record
                {editingDebtor && (
                    <span className={`flex items-center gap-1 text-sm font-normal ${validationStatusConfig[getValidationDisplayStatus(editingDebtor)].textColor}`}>
                  {validationStatusConfig[getValidationDisplayStatus(editingDebtor)].icon}
                      {validationStatusConfig[getValidationDisplayStatus(editingDebtor)].label}
                </span>
                )}
              </DialogTitle>
              <DialogDescription>
                Make changes to the record below. After saving, validation will re-run.
              </DialogDescription>
            </DialogHeader>

            {editingErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800 mb-1">Validation Errors:</p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {editingErrors.map((err, i) => (
                        <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 py-4">
              {editHeaders.map((field, idx) => (
                  <div key={`edit-${idx}-${field}`} className="space-y-2">
                    <Label htmlFor={`field-${idx}`}>{field}</Label>
                    <Input
                        id={`field-${idx}`}
                      value={editForm[field] ?? ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
                    />
                  </div>
              ))}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="destructive" onClick={() => editingDebtor && handleDelete(editingDebtor)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setEditingDebtor(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <BavVerificationModal
            uploadId={uploadId}
            open={bavModalOpen}
            onOpenChange={setBavModalOpen}
            onComplete={handleBavComplete}
        />

        <Dialog open={voidConfirmOpen} onOpenChange={setVoidConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Confirm Void Transaction
              </DialogTitle>
              <DialogDescription className="pt-2">
                Are you sure you want to <strong>VOID all approved/pending transactions</strong> for this upload?
              </DialogDescription>
            </DialogHeader>
            <div className="bg-red-50 border border-red-200 rounded-md p-3 my-2 text-sm text-red-800">
              <p className="font-semibold">Warning:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>This action cannot be undone.</li>
                <li>Only transactions from <strong>today</strong> can be voided.</li>
                <li>Funds will not be transferred to your account.</li>
              </ul>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button className="cursor-pointer mr-2" variant="outline" onClick={() => setVoidConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleVoidConfirm} className="bg-red-600 hover:bg-red-700 cursor-pointer">Yes, Void All Transactions</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reassign Account Dialog */}
        <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Reassign EMP Account
              </DialogTitle>
              <DialogDescription>
                Change the EMP account for this upload. All debtors and unsent billing attempts will be updated.
              </DialogDescription>
            </DialogHeader>

            {upload.emp_account && (
                <div className="text-sm text-slate-600">
                  Current account: <span className="font-medium text-emerald-600">{upload.emp_account.name}</span>
                </div>
            )}

            <div className="space-y-2 py-2">
              <Label>Select new account</Label>
              <div className="space-y-2">
                {empAccounts.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading accounts...
                    </div>
                ) : (
                    empAccounts
                        .filter(a => a.id !== upload.emp_account_id)
                        .map(account => (
                            <label
                                key={account.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    reassignAccountId === account.id
                                        ? 'border-emerald-300 bg-emerald-50'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                              <input
                                  type="radio"
                                  name="reassign_account"
                                  value={account.id}
                                  checked={reassignAccountId === account.id}
                                  onChange={() => setReassignAccountId(account.id)}
                                  className="text-emerald-600"
                              />
                              <span className="font-medium text-sm">{account.name}</span>
                              <span className="text-xs text-slate-400">{account.slug}</span>
                            </label>
                        ))
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => { setReassignOpen(false); setReassignAccountId(null) }}>Cancel</Button>
              <Button
                  onClick={handleReassign}
                  disabled={!reassignAccountId || reassigning}
                  className="bg-emerald-600 hover:bg-emerald-700"
              >
                {reassigning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Reassigning...
                    </>
                ) : (
                    'Reassign'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </>
  )
}