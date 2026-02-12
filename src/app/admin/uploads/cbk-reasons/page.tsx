/**
 * Upload CBK Reasons page.
 * Shows chargeback reason breakdown per upload file.
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import { Header } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, generateMonthOptions } from '@/lib/utils'
import type { 
  EmpAccount,
  Upload, 
  UploadCbkReason,
  UploadCbkReasonRecord,
  UploadCbkReasonSummary
} from '@/types'
import { 
  Building2, 
  FileSpreadsheet, 
  AlertCircle,
  Loader2,
  Eye,
  CheckCircle2,
  XCircle,
  Percent,
  Search
} from 'lucide-react'

export default function UploadCbkReasonsPage() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [empAccounts, setEmpAccounts] = useState<EmpAccount[]>([])
  const [selectedUploadId, setSelectedUploadId] = useState<string>('')
  const [selectedEmpAccountId, setSelectedEmpAccountId] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [cbkData, setCbkData] = useState<UploadCbkReasonSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [drilldownOpen, setDrilldownOpen] = useState(false)
  const [drilldownRecords, setDrilldownRecords] = useState<UploadCbkReasonRecord[]>([])
  const [drilldownCode, setDrilldownCode] = useState<string>('')
  const [drilldownReason, setDrilldownReason] = useState<string>('')
  const [drilldownLoading, setDrilldownLoading] = useState(false)

  const monthOptions = useMemo(() => generateMonthOptions(), [])

  // Fetch uploads with search
  useEffect(() => {
    const fetchUploads = async () => {
      try {
        const response = await api.searchUploads(searchQuery || undefined)
        setUploads(response.data)
        // Auto-select first upload if available
        if (response.data.length > 0 && !selectedUploadId) {
          setSelectedUploadId(response.data[0].id.toString())
        }
      } catch (error) {
        console.error('Failed to fetch uploads:', error)
      }
    }
    
    const timeoutId = setTimeout(() => {
      fetchUploads()
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Fetch CBK data when upload changes
  useEffect(() => {
    const fetchCbkData = async () => {
      if (!selectedUploadId) {
        setCbkData(null)
        return
      }

      setLoading(true)
      try {
        const data = await api.getUploadCbkReasons(Number(selectedUploadId), {})
        setCbkData(data)
      } catch (error) {
        console.error('Failed to fetch CBK data:', error)
        setCbkData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCbkData()
  }, [selectedUploadId])

  const handleViewRecords = async (reason: UploadCbkReason) => {
    if (!selectedUploadId) {
      return
    }

    setDrilldownCode(reason.code || 'Unknown')
    setDrilldownReason(reason.reason || 'No reason provided')
    setDrilldownOpen(true)
    setDrilldownLoading(true)

    try {
      const response = await api.getUploadCbkReasonRecords(
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

  return (
    <>
      <Header
        title="Upload CBK Reasons"
        description="View chargeback reason breakdown per upload file"
      />
      <div className="p-6">
        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap mb-6">
          {/* Upload File Select with Search */}
          <div className="flex gap-2 items-center">
            <Label htmlFor="upload" className="text-sm whitespace-nowrap">Upload File:</Label>
            <div className="relative w-64">
              <Select value={selectedUploadId} onValueChange={setSelectedUploadId}>
                <SelectTrigger id="upload" className="w-full h-8">
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
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : cbkData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Total Records in File
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{cbkData.total_records.toLocaleString()}</div>
                  <p className="text-xs text-slate-500 mt-1">All records in upload</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Total Successful Charges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {cbkData.total_successful.toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {cbkData.approved_amount ? formatCurrency(cbkData.approved_amount, 'EUR') : '-'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Total Chargebacks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-rose-600">
                    {cbkData.total_chargebacks.toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {cbkData.chargeback_amount ? formatCurrency(cbkData.chargeback_amount, 'EUR') : '-'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    CB % for File
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className={`text-2xl font-bold ${
                      cbkData.cbk_percentage > 1 ? 'text-rose-600' : 'text-orange-600'
                    }`}>
                      {cbkData.cbk_percentage.toFixed(2)}%
                    </div>
                    {cbkData.cbk_percentage > 1 && (
                      <AlertCircle className="h-5 w-5 text-rose-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Chargeback rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Reasons Table */}
            <Card>
              <CardHeader>
                <CardTitle>Chargeback Reason Breakdown</CardTitle>
                <CardDescription>
                  {selectedUpload 
                    ? `Showing reasons for: ${selectedUpload.original_filename}`
                    : 'Select an upload file to view breakdown'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cbkData.reasons.length > 0 ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="text-right">CBK Count</TableHead>
                          <TableHead className="text-right">% of CBKs</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                          <TableHead className="text-right">CBK Amount</TableHead>
                          <TableHead>Last Occurrence</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cbkData.reasons.map((reason, idx) => (
                          <TableRow key={reason.code || `unknown-${idx}`}>
                            <TableCell>
                              {reason.code ? (
                                <Badge variant="outline" className="font-mono text-rose-600 border-rose-300">
                                  {reason.code}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="font-mono text-slate-500 border-slate-300">
                                  N/A
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              <div className="text-sm">{reason.reason || 'No reason provided'}</div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {reason.cbk_count.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="text-sm font-medium">{reason.cbk_percentage.toFixed(2)}%</div>
                                <div className="w-16 bg-slate-200 rounded-full h-2">
                                  <div 
                                    className="bg-rose-500 h-2 rounded-full" 
                                    style={{ width: `${Math.min(reason.cbk_percentage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm text-slate-600">{reason.total_percentage.toFixed(2)}%</span>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(reason.cbk_amount, 'EUR')}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {reason.last_occurrence ? formatDate(reason.last_occurrence) : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewRecords(reason)}
                                className="h-8"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    No chargeback data available for this upload
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12 text-slate-500">
            {selectedUploadId 
              ? 'No data available for the selected upload file'
              : 'Select an upload file to view chargeback breakdown'
            }
          </div>
        )}
      </div>

      {/* Drill-down Modal */}
      <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chargeback Records - {drilldownCode}
            </DialogTitle>
            <DialogDescription>
              {drilldownReason}
            </DialogDescription>
          </DialogHeader>

          {drilldownLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : drilldownRecords.length > 0 ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>BIC</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drilldownRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm">{record.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{record.first_name} {record.last_name}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{record.iban_masked}</TableCell>
                      <TableCell className="font-mono text-xs">{record.bic || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{record.transaction_id}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(record.amount, record.currency)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {formatDate(record.chargebacked_at)}
                      </TableCell>
                      <TableCell>
                        {record.emp_account_name ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-sm">{record.emp_account_name}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No records found for this reason code
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}