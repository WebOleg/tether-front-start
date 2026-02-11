/**
 * Upload CBK Reasons page.
 * Shows chargeback reason breakdown per upload file.
 */

'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import type { 
  Upload, 
  EmpAccount, 
  UploadCbkReasonSummary, 
  UploadCbkReason,
  UploadCbkReasonRecord
} from '@/types'
import { 
  Building2, 
  FileSpreadsheet, 
  TrendingUp, 
  AlertCircle,
  Loader2,
  Eye 
} from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function UploadCbkReasonsPage() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [empAccounts, setEmpAccounts] = useState<EmpAccount[]>([])
  const [selectedUploadId, setSelectedUploadId] = useState<string>('all')
  const [selectedEmpAccountId, setSelectedEmpAccountId] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [summary, setSummary] = useState<UploadCbkReasonSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [drilldownOpen, setDrilldownOpen] = useState(false)
  const [drilldownRecords, setDrilldownRecords] = useState<UploadCbkReasonRecord[]>([])
  const [drilldownCode, setDrilldownCode] = useState<string>('')
  const [drilldownReason, setDrilldownReason] = useState<string>('')
  const [drilldownLoading, setDrilldownLoading] = useState(false)

  // Set default date range to last 30 days
  useEffect(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  // Fetch uploads and EMP accounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uploadsResponse, accountsResponse] = await Promise.all([
          api.getUploads({ per_page: 1000 }),
          api.getEmpAccounts()
        ])
        setUploads(uploadsResponse.data)
        setEmpAccounts(accountsResponse)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }
    fetchData()
  }, [])

  // Fetch CBK reasons when filters change
  useEffect(() => {
    if (!startDate || !endDate) return

    const fetchReasons = async () => {
      setLoading(true)
      try {
        const filters: any = {
          start_date: startDate,
          end_date: endDate,
        }

        if (selectedUploadId !== 'all') {
          filters.upload_id = Number(selectedUploadId)
        }

        if (selectedEmpAccountId !== 'all') {
          filters.emp_account_id = Number(selectedEmpAccountId)
        }

        const data = await api.getUploadCbkReasons(filters)
        setSummary(data)
      } catch (error) {
        console.error('Failed to fetch CBK reasons:', error)
        setSummary(null)
      } finally {
        setLoading(false)
      }
    }

    fetchReasons()
  }, [selectedUploadId, selectedEmpAccountId, startDate, endDate])

  const handleViewRecords = async (reason: UploadCbkReason) => {
    if (!summary || selectedUploadId === 'all') {
      alert('Please select a specific upload file to view records')
      return
    }

    setDrilldownCode(reason.code)
    setDrilldownReason(reason.reason)
    setDrilldownOpen(true)
    setDrilldownLoading(true)

    try {
      const response = await api.getUploadCbkReasonRecords(Number(selectedUploadId), reason.code)
      setDrilldownRecords(response.records)
    } catch (error) {
      console.error('Failed to fetch records:', error)
      setDrilldownRecords([])
    } finally {
      setDrilldownLoading(false)
    }
  }

  return (
    <>
      <Header
        title="Upload CBK Reasons"
        description="View chargeback reason breakdown per upload file"
      />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Select upload and date range to view chargeback reasons</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Upload selector */}
              <div className="space-y-2">
                <Label htmlFor="upload">Upload File</Label>
                <Select value={selectedUploadId} onValueChange={setSelectedUploadId}>
                  <SelectTrigger id="upload">
                    <SelectValue placeholder="Select upload" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                        <span>All Uploads</span>
                      </div>
                    </SelectItem>
                    {uploads.map((upload) => (
                      <SelectItem key={upload.id} value={upload.id.toString()}>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                          <span className="truncate max-w-[200px]">{upload.original_filename}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* EMP Account filter */}
              <div className="space-y-2">
                <Label htmlFor="emp-account">Account</Label>
                <Select value={selectedEmpAccountId} onValueChange={setSelectedEmpAccountId}>
                  <SelectTrigger id="emp-account">
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

              {/* Date range */}
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_records.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Successful Charges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary.total_successful.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Chargebacks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-600">{summary.total_chargebacks.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">CBK Percentage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-orange-600">
                    {summary.cbk_percentage.toFixed(2)}%
                  </div>
                  {summary.cbk_percentage > 1 && (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reasons Table */}
        <Card>
          <CardHeader>
            <CardTitle>Chargeback Reason Breakdown</CardTitle>
            <CardDescription>
              {selectedUploadId !== 'all' 
                ? `Showing reasons for: ${uploads.find(u => u.id.toString() === selectedUploadId)?.original_filename}`
                : 'Showing aggregated reasons across all uploads'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : summary && summary.reasons.length > 0 ? (
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
                    {summary.reasons.map((reason) => (
                      <TableRow key={reason.code}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-rose-600 border-rose-300">
                            {reason.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="text-sm">{reason.reason}</div>
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
                            disabled={selectedUploadId === 'all'}
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
                {selectedUploadId === 'all' 
                  ? 'No chargeback data available for the selected filters'
                  : 'Select an upload file and date range to view chargeback reasons'
                }
              </div>
            )}
          </CardContent>
        </Card>
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