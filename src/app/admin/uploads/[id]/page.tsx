/**
 * Upload detail page with VOP verification and billing.
 */

'use client'

import { useEffect, useState, Fragment, useCallback } from 'react'
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
import { 
  ArrowLeft, 
  RefreshCw, 
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
  Filter,
  ShieldCheck,
  CreditCard,
  Send,
} from 'lucide-react'
import type { Upload, Debtor, ValidationStats, VopStats, BillingStats, PaginationMeta as PaginationMetaType, PaginationLinks, PaginationLink } from '@/types'
import { Pagination, PaginationMeta } from '@/components/ui/pagination'

const uploadStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

const validationStatusConfig: Record<string, { color: string; textColor: string; rowBg: string; hoverBg: string; icon: React.ReactNode; label: string }> = {
  valid: { 
    color: 'text-green-600',
    textColor: 'text-green-600',
    rowBg: 'bg-white',
    hoverBg: 'bg-slate-50',
    icon: <CheckCircle className="h-5 w-5" />,
    label: 'Valid'
  },
  invalid: { 
    color: 'text-orange-500',
    textColor: 'text-orange-600',
    rowBg: 'bg-orange-50',
    hoverBg: 'bg-orange-100',
    icon: <XCircle className="h-5 w-5" />,
    label: 'Invalid'
  },
  error: { 
    color: 'text-red-500',
    textColor: 'text-red-600',
    rowBg: 'bg-red-50',
    hoverBg: 'bg-red-100',
    icon: <AlertCircle className="h-5 w-5" />,
    label: 'Error'
  },
  pending: { 
    color: 'text-gray-400',
    textColor: 'text-gray-500',
    rowBg: 'bg-white',
    hoverBg: 'bg-slate-50',
    icon: <Clock className="h-5 w-5" />,
    label: 'Pending'
  },
  chargebacked: { 
    color: 'text-red-600',
    textColor: 'text-red-700',
    rowBg: 'bg-red-100',
    hoverBg: 'bg-red-200',
    icon: <Ban className="h-5 w-5" />,
    label: 'Chargebacked'
  },
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function getValidationDisplayStatus(debtor: Debtor): string {
  if (debtor.latest_billing?.status === 'chargebacked') {
    return 'chargebacked'
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
  const [validating, setValidating] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [filtering, setFiltering] = useState(false)
  const [verifyingVop, setVerifyingVop] = useState(false)
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

  const fetchVopStats = async () => {
    try {
      const data = await api.getVopStats(uploadId)
      setVopStats(data)
    } catch (error) {
      console.error('Failed to fetch VOP stats:', error)
    }
  }

  const fetchBillingStats = useCallback(async () => {
    try {
      const data = await api.getBillingStats(uploadId)
      setBillingStats(data)
      return data
    } catch (error) {
      console.error('Failed to fetch billing stats:', error)
      return null
    }
  }, [uploadId])

  useEffect(() => {
    const initPage = async () => {
      setLoading(true)
      try {
        const uploadData = await api.getUpload(uploadId)
        setUpload(uploadData)
        
        setValidating(true)
        await api.validateUpload(uploadId)
        setValidating(false)
        
        const [debtorsResponse, statsData] = await Promise.all([
          api.getUploadDebtors(uploadId, { per_page: 100 }),
          api.getUploadValidationStats(uploadId),
        ])
        setDebtors(debtorsResponse.data)
        setStats(statsData)
        setMeta(debtorsResponse.meta || null)
        setLinks(debtorsResponse.links || null)
        
        if (debtorsResponse.meta && 'links' in debtorsResponse.meta) {
          setPaginationLinks((debtorsResponse.meta as PaginationMetaType & {links?: PaginationLink[]}).links || [])
        }
        await fetchVopStats()
        await fetchBillingStats()
      } catch (error) {
        console.error('Failed to initialize:', error)
        toast.error('Failed to load upload')
      } finally {
        setLoading(false)
        setValidating(false)
      }
    }
    
    if (uploadId) {
      initPage()
    }
  }, [uploadId, fetchBillingStats])

  useEffect(() => {
    if (!billingStats?.is_processing) return
    
    const interval = setInterval(async () => {
      const data = await fetchBillingStats()
      if (data && !data.is_processing) {
        clearInterval(interval)
        toast.success('Billing processing completed!')
      }
    }, 5000)
    
    return () => clearInterval(interval)
  }, [billingStats?.is_processing, fetchBillingStats])

  useEffect(() => {
    if (!uploadId || loading) return
    
    const isInitialState = currentPage === 1 && search === ''
    if (isInitialState) return
    
    const fetchData = async () => {
      setTableLoading(true)
      try {
        const debtorsResponse = await api.getUploadDebtors(uploadId, { 
          page: currentPage,
          per_page: 100, 
          search: search || undefined 
        })
        setDebtors(debtorsResponse.data)
        setMeta(debtorsResponse.meta || null)
        setLinks(debtorsResponse.links || null)
        
        if (debtorsResponse.meta && 'links' in debtorsResponse.meta) {
          setPaginationLinks((debtorsResponse.meta as PaginationMetaType & {links?: PaginationLink[]}).links || [])
        }
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
  }, [uploadId, currentPage, search, loading])

  const handleVerifyVop = async () => {
    setVerifyingVop(true)
    try {
      await api.verifyVop(uploadId)
      toast.success('VOP verification started. This may take a few minutes.')
      
      const pollInterval = setInterval(async () => {
        await fetchVopStats()
      }, 5000)
      
      setTimeout(() => {
        clearInterval(pollInterval)
        fetchVopStats()
      }, 120000)
      
    } catch (error) {
      toast.error('Failed to start VOP verification')
    } finally {
      setVerifyingVop(false)
    }
  }

  const handleSync = async () => {
    // VOP Gate: Check on frontend first
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
      const result = await api.syncToGateway(uploadId)
      
      if (result.data.duplicate) {
        toast.warning('Billing already in progress for this upload')
      } else if (result.data.queued) {
        toast.success(result.message)
        await fetchBillingStats()
      } else {
        toast.info(result.message)
      }
    } catch (error: any) {
      // Handle VOP gate error from backend (422)
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

  const handleFilterChargebacks = async () => {
    if (!stats?.chargebacked) return
    
    if (!confirm(`Remove ${stats.chargebacked} chargebacked records from this upload?`)) {
      return
    }
    
    setFiltering(true)
    try {
      const result = await api.filterChargebacks(uploadId)
      toast.success(`Removed ${result.removed} chargebacked records`)
      
      const [debtorsResponse, statsData] = await Promise.all([
        api.getUploadDebtors(uploadId, { per_page: 100, search: search || undefined }),
        api.getUploadValidationStats(uploadId),
      ])
      setDebtors(debtorsResponse.data)
      setStats(statsData)
    } catch (error) {
      toast.error('Failed to filter chargebacks')
    } finally {
      setFiltering(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
          <p className="mt-2 text-sm text-slate-500">
            {validating ? 'Validating records...' : 'Loading...'}
          </p>
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
  const vopVerified = vopStats ? vopStats.verified : 0
  const vopTotalEligible = vopStats ? vopStats.total_eligible : 0
  const hasBillingActivity = billingStats && billingStats.total_attempts > 0
  
  // VOP Gate: Disable sync button if VOP not completed
  const canSync = vopTotalEligible === 0 || vopPending === 0

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
        description={`Uploaded ${formatDate(upload.created_at)}`}
      />
      <div className="">
        <div className="px-6 pt-4 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/admin/uploads">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Badge className={uploadStatusColors[upload.status]}>
              {upload.status}
            </Badge>
            <span className="text-sm text-slate-500">
              {stats?.total || 0} records
            </span>
            {billingStats?.is_processing && (
              <Badge className="bg-blue-100 text-blue-800 gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Billing in progress
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(stats?.chargebacked ?? 0) > 0 && (
              <Button 
                variant="destructive"
                onClick={handleFilterChargebacks} 
                disabled={filtering}
                className="gap-2"
              >
                {filtering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Filtering...
                  </>
                ) : (
                  <>
                    <Filter className="h-4 w-4" />
                    Filter Chargebacks ({stats?.chargebacked})
                  </>
                )}
              </Button>
            )}
            {vopPending > 0 && (
              <Button 
                variant="outline"
                onClick={handleVerifyVop} 
                disabled={verifyingVop}
                className="gap-2"
              >
                {verifyingVop ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verify VOP ({vopPending})
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

        {/* VOP Gate Warning Banner */}
        {vopPending > 0 && (stats?.ready_for_sync || 0) > 0 && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
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
              disabled={verifyingVop}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              {verifyingVop ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Verify Now'
              )}
            </Button>
          </div>
        )}

        {stats && (
          <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm text-slate-500">Valid</span>
                </div>
                <p className="text-2xl font-semibold mt-1">{stats.valid}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  <span className="text-sm text-slate-500">Invalid</span>
                </div>
                <p className="text-2xl font-semibold mt-1">{stats.invalid}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full" />
                  <span className="text-sm text-slate-500">Blacklisted</span>
                </div>
                <p className="text-2xl font-semibold mt-1">{stats.blacklisted}</p>
              </CardContent>
            </Card>
            <Card className={stats.chargebacked > 0 ? 'border-red-300 bg-red-50' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full" />
                  <span className="text-sm text-slate-500">Chargebacked</span>
                </div>
                <p className="text-2xl font-semibold mt-1">{stats.chargebacked}</p>
              </CardContent>
            </Card>
            <Card className={vopVerified > 0 ? 'border-green-300 bg-green-50' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3 text-green-600" />
                  <span className="text-sm text-slate-500">VOP Verified</span>
                </div>
                <p className="text-2xl font-semibold mt-1">{vopVerified}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  <span className="text-sm text-slate-500">Pending</span>
                </div>
                <p className="text-2xl font-semibold mt-1">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm text-slate-500">Ready for Sync</span>
                </div>
                <p className="text-2xl font-semibold mt-1">{stats.ready_for_sync}</p>
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
                    <p className="text-xl font-semibold text-green-800 mt-1">
                      {billingStats.approved}
                    </p>
                    <p className="text-xs text-green-600">
                      {formatCurrency(billingStats.approved_amount)}
                    </p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">Pending</span>
                    </div>
                    <p className="text-xl font-semibold text-yellow-800 mt-1">
                      {billingStats.pending}
                    </p>
                    <p className="text-xs text-yellow-600">
                      {formatCurrency(billingStats.pending_amount)}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700">Declined</span>
                    </div>
                    <p className="text-xl font-semibold text-red-800 mt-1">
                      {billingStats.declined}
                    </p>
                    <p className="text-xs text-red-600">
                      {formatCurrency(billingStats.declined_amount)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-slate-600" />
                      <span className="text-sm text-slate-700">Errors</span>
                    </div>
                    <p className="text-xl font-semibold text-slate-800 mt-1">
                      {billingStats.error}
                    </p>
                    <p className="text-xs text-slate-600">
                      {formatCurrency(billingStats.error_amount)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <span className="text-sm text-slate-500">
                    Total attempts: {billingStats.total_attempts}
                  </span>
                  <Link href={`/admin/billing?upload_id=${uploadId}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
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
                      {headers.map((h, idx) => (
                        <TableHead key={`header-${idx}-${h}`} className="whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableLoading ? (
                      <TableRow>
                        <TableCell colSpan={headers.length + 1} className="text-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                          <p className="mt-2 text-sm text-slate-500">Loading...</p>
                        </TableCell>
                      </TableRow>
                    ) : debtors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={headers.length + 1} className="text-center py-8 text-slate-500">
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
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEditClick(debtor)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700"
                                    onClick={() => handleDelete(debtor)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
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
                                <TableCell colSpan={headers.length + 1} className="pt-0 pb-3">
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
            <Button
              variant="destructive"
              onClick={() => editingDebtor && handleDelete(editingDebtor)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setEditingDebtor(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
