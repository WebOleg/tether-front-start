/**
 * Upload detail page with VOP verification.
 */

'use client'

import { useEffect, useState, Fragment } from 'react'
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
} from 'lucide-react'
import type { Upload, Debtor, ValidationStats, VopStats } from '@/types'

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

  const fetchVopStats = async () => {
    try {
      const data = await api.getVopStats(uploadId)
      setVopStats(data)
    } catch (error) {
      console.error('Failed to fetch VOP stats:', error)
    }
  }

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
        
        await fetchVopStats()
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
  }, [uploadId])

  useEffect(() => {
    if (!loading && upload) {
      const timer = setTimeout(() => {
        api.getUploadDebtors(uploadId, { per_page: 100, search: search || undefined })
          .then(res => setDebtors(res.data))
          .catch(console.error)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [search, uploadId, loading, upload])

  const handleSync = async () => {
    setSyncing(true)
    toast.info('Sync functionality coming soon...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSyncing(false)
  }

  const handleVerifyVop = async () => {
    setVerifyingVop(true)
    try {
      await api.verifyVop(uploadId)
      toast.success('VOP verification started. This may take a few minutes.')
      
      // Poll for updates
      const pollInterval = setInterval(async () => {
        await fetchVopStats()
      }, 5000)
      
      // Stop polling after 2 minutes
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

  return (
    <>
      <Header
        title={upload.original_filename}
        description={`Uploaded ${formatDate(upload.created_at)}`}
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
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
              disabled={syncing || (stats?.ready_for_sync || 0) === 0}
              className="gap-2"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync to Gateway ({stats?.ready_for_sync || 0})
                </>
              )}
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
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

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
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
                  {debtors.length === 0 ? (
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
