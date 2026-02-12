/**
 * Upload CBK Reasons page.
 * Shows chargeback reason breakdown per upload file.
 */

'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'  // ADD THIS LINE
import Link from 'next/link'
import { Header } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, formatDateNullable, generateMonthOptions } from '@/lib/utils'
import type { 
  EmpAccount,
  Upload, 
  UploadCbReason,
  UploadCbReasonRecord,
  UploadCbReasonsFilters,
  UploadCbReasonSummary
} from '@/types'
import { 
  Building2, 
  FileSpreadsheet, 
  AlertCircle,
  Loader2,
  Eye,
  CheckCircle2,
  Percent,
  RotateCcw
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function UploadCbReasonsPage() {
  const searchParams = useSearchParams()  // ADD THIS LINE
  const [uploads, setUploads] = useState<Upload[]>([])
  const [empAccounts, setEmpAccounts] = useState<EmpAccount[]>([])
  const [selectedUploadId, setSelectedUploadId] = useState<string>('')
  const [selectedEmpAccountId, setSelectedEmpAccountId] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [cbData, setcbData] = useState<UploadCbReasonSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [drilldownOpen, setDrilldownOpen] = useState(false)
  const [drilldownRecords, setDrilldownRecords] = useState<UploadCbReasonRecord[]>([])
  const [drilldownCode, setDrilldownCode] = useState<string>('')
  const [drilldownReason, setDrilldownReason] = useState<string>('')
  const [drilldownLoading, setDrilldownLoading] = useState(false)
  const initialSelectDoneRef = useRef(false)

  const monthOptions = useMemo(() => generateMonthOptions(), [])

  // Fetch uploads with search and handle URL upload_id parameter
  useEffect(() => {
    const fetchUploads = async () => {
      try {
        // Check for upload_id in URL parameters first
        const uploadIdParam = searchParams.get('upload_id')
        
        // Fetch the specific upload if URL parameter exists
        let specificUpload: Upload | null = null
        if (uploadIdParam && !initialSelectDoneRef.current) {
          try {
            specificUpload = await api.getUpload(Number(uploadIdParam))
          } catch (error: any) {
            console.error('Failed to fetch specific upload')
            // Show toast error for 404
            if (error.status === 404) {
              toast.error(`Upload with ID ${uploadIdParam} not found`)
            } else {
              toast.error(error.message ?? 'Failed to load upload')
            }
          }
        }

        // Fetch all uploads with search
        const response = await api.searchUploads(searchQuery || undefined)
        let uploadsList = response.data

        // If we have a specific upload from URL, add it to the beginning if not already in list
        if (specificUpload && !initialSelectDoneRef.current) {
          const exists = uploadsList.some(u => u.id === specificUpload!.id)
          if (!exists) {
            uploadsList = [specificUpload, ...uploadsList]
          }
          setUploads(uploadsList)
          setSelectedUploadId(uploadIdParam!)
          initialSelectDoneRef.current = true
        } else {
          setUploads(uploadsList)
          // Auto-select first upload only on initial load if no URL parameter
          if (uploadsList.length > 0 && !initialSelectDoneRef.current) {
            setSelectedUploadId(uploadsList[0].id.toString())
            initialSelectDoneRef.current = true
          }
        }
      } catch (error) {
        console.error('Failed to fetch uploads')
        toast.error('Failed to load uploads')
      }
    }
    
    const timeoutId = setTimeout(() => {
      fetchUploads()
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchParams])  // ADD searchParams TO DEPENDENCIES

  // Convert period to start_date and end_date
  const getFilterDates = (period: string): { start_date?: string; end_date?: string } => {
    const endDate = new Date()
    const startDate = new Date()

    if (period === 'all') {
      return {}
    }
    if (period === '24h') {
      startDate.setDate(endDate.getDate() - 1)
    } else if (period === '7d') {
      startDate.setDate(endDate.getDate() - 7)
    } else if (period === '30d') {
      startDate.setDate(endDate.getDate() - 30)
    } else if (period === '90d') {
      startDate.setDate(endDate.getDate() - 90)
    } else if (period.includes('-')) {
      // Month format: "2026-1"
      const [year, month] = period.split('-').map(Number)
      startDate.setFullYear(year, month - 1, 1)
      endDate.setFullYear(year, month, 0) // Last day of month
    }

    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    }
  }

  // Fetch CBK data when upload or filters change
  useEffect(() => {
    const fetchcbData = async () => {
      if (!selectedUploadId) {
        setcbData(null)
        return
      }

      setLoading(true)
      try {
        const filters: UploadCbReasonsFilters = {
          ...getFilterDates(selectedPeriod),
          ...(selectedEmpAccountId !== 'all' && { emp_account_id: Number(selectedEmpAccountId) }),
        }
        const data = await api.getUploadCbReasons(Number(selectedUploadId), filters)
        setcbData(data)
      } catch (error) {
        console.error('Failed to fetch CBK data:', error)
        setcbData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchcbData()
  }, [selectedUploadId, selectedEmpAccountId, selectedPeriod])

  const handleViewRecords = async (reason: UploadCbReason) => {
    if (!selectedUploadId) {
      return
    }

    setDrilldownCode(reason.code || 'Unknown')
    setDrilldownReason(reason.reason || 'No reason provided')
    setDrilldownOpen(true)
    setDrilldownLoading(true)

    try {
      const response = await api.getUploadCbReasonRecords(
        Number(selectedUploadId), 
        reason.code || ''
      )
      setDrilldownRecords(response.records)
    } catch (error) {
      console.error('Failed to fetch records:', error)
      setDrilldownRecords([])
    } finally {
      setDrilldownLoading(false)
    }
  }

  const selectedUpload = uploads.find(u => u.id.toString() === selectedUploadId)

  // Fetch EMP accounts on mount
  useEffect(() => {
    const fetchEmpAccounts = async () => {
      try {
        const accounts = await api.getEmpAccounts()
        setEmpAccounts(accounts)
      } catch (err) {
        console.error('Failed to fetch EMP accounts:', err)
      }
    }
    fetchEmpAccounts()
  }, [])

  return (
    <>
      <Header
        title="Upload CB Reasons"
        description={selectedUpload ? `${selectedUpload.original_filename} (${selectedUpload.filename})` : "Select an upload file to view breakdown"}
      />
      <div className="p-6">
        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap mb-6">
          {/* Upload File Select with Search */}
          <div className="flex gap-2 items-center">
            <Label htmlFor="upload" className="text-sm whitespace-nowrap">Upload File:</Label>
            <div className="relative w-64">
              <Select value={selectedUploadId} onValueChange={setSelectedUploadId}>
                <SelectTrigger id="upload" className="w-64 h-8">
                  <SelectValue placeholder="Search and select upload..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 pb-2">
                    <Input
                      type="text"
                      placeholder="Search uploads..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {uploads.length === 0 ? (
                    <div className="p-2 text-sm text-slate-500 text-center">
                      {searchQuery ? 'No uploads found' : 'Loading...'}
                    </div>
                  ) : (
                    uploads.map((upload) => (
                      <SelectItem key={upload.id} value={upload.id.toString()} className="justify-start">
                        <FileSpreadsheet className="h-4 w-4 text-blue-600 shrink-0" />
                        <div className="flex flex-col min-w-0 items-start">
                          <div className="text-sm truncate w-full text-left">{upload.original_filename}</div>
                          <div className="text-xs text-slate-500 truncate w-full text-left">{upload.filename}</div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* EMP Account Filter */}
          <div className="flex gap-2 items-center">
            <Label htmlFor="emp-account" className="text-sm whitespace-nowrap">Account:</Label>
            <Select value={selectedEmpAccountId} onValueChange={setSelectedEmpAccountId}>
              <SelectTrigger id="emp-account" className="w-44 h-8">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <span>All Accounts</span>
                  </div>
                </SelectItem>
                {empAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                      <span>{account.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Filter */}
          <div className="flex gap-2 items-center">
            <Label htmlFor="period" className="text-sm whitespace-nowrap">Period:</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger id="period" className="w-44 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <>
            {/* Skeleton Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="py-2 gap-1">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-9 w-9 rounded-lg" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-9 w-24 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Skeleton Table */}
            <div className="rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">CB Count</TableHead>
                    <TableHead className="text-right">CB %</TableHead>
                    <TableHead className="text-right">Total %</TableHead>
                    <TableHead className="text-right">CB Amount</TableHead>
                    <TableHead>Last Occurrence</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-12 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-20 ml-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-8 w-16 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : cbData ? (
          <>
            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total Records in File
                  </CardTitle>
                  <div className="rounded-lg p-2 bg-blue-100">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{(cbData?.total_records ?? 0).toLocaleString()}</div>
                  <p className="text-sm text-slate-500 mt-1">All records in upload</p>
                </CardContent>
              </Card>

              <Card className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total Successful Charges
                  </CardTitle>
                  <div className="rounded-lg p-2 bg-green-100">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {(cbData?.total_successful ?? 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {cbData?.approved_amount ? formatCurrency(cbData.approved_amount, 'EUR') : '€'}
                  </p>
                </CardContent>
              </Card>

              <Card className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total Chargebacks
                  </CardTitle>
                  <div className="rounded-lg p-2 bg-rose-100">
                    <RotateCcw className="h-5 w-5 text-rose-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-rose-600">
                    {(cbData?.total_chargebacks ?? 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {cbData?.cb_amount ? formatCurrency(cbData.cb_amount, 'EUR') : '€'}
                  </p>
                </CardContent>
              </Card>

              <Card className="py-2 gap-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    CB % for File
                  </CardTitle>
                  <div className="rounded-lg p-2 bg-orange-100">
                    <Percent className="h-5 w-5 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className={`text-3xl font-bold ${
                      (cbData?.cb_percentage ?? 0) > 1 ? 'text-rose-600' : 'text-orange-600'
                    }`}>
                      {(cbData?.cb_percentage ?? 0).toFixed(2)}%
                    </div>
                    {(cbData?.cb_percentage ?? 0) > 1 && (
                      <AlertCircle className="h-5 w-5 text-rose-600" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Chargeback rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Reasons Table */}
            <div className="rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">CB Count</TableHead>
                    <TableHead className="text-right">CB %</TableHead>
                    <TableHead className="text-right">Total %</TableHead>
                    <TableHead className="text-right">CB Amount</TableHead>
                    <TableHead>Last Occurrence</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(cbData?.reasons ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                        No chargeback reasons found
                      </TableCell>
                    </TableRow>
                  ) : (
                    (cbData?.reasons ?? []).map((reason) => (
                      <TableRow key={reason.code}>
                        <TableCell>
                          <span className="font-mono text-rose-600">
                            {reason.code || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-slate-600 text-xs">
                            {reason.reason || 'Unknown'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {reason.cb_count?.toLocaleString() ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {reason.cb_percentage?.toFixed(2) ?? '0.00'} %
                        </TableCell>
                        <TableCell className="text-right">
                          {reason.total_percentage?.toFixed(2) ?? '0.00'}%
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {reason.cb_amount ? formatCurrency(reason.cb_amount, 'EUR') : '€0.00'}
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-500 text-sm">
                            {reason.last_occurrence ? formatDateNullable(reason.last_occurrence) : 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Link href={`/admin/uploads/cb-reasons/${reason.code}?upload_id=${selectedUploadId}`}>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleViewRecords(reason)}
                              className="h-8 px-3"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-slate-500 bg-white">
            No chargeback data available for this upload
          </div>
        )}
      </div>
    </>
  )
}