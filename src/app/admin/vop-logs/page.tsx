/**
 * VOP Logs list page.
 * Shows IBAN verification results with scores and status.
 */

'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
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
import type { VopLog, VopResult } from '@/types'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const resultColors: Record<VopResult, string> = {
  verified: 'bg-green-100 text-green-800',
  likely_verified: 'bg-blue-100 text-blue-800',
  inconclusive: 'bg-yellow-100 text-yellow-800',
  mismatch: 'bg-orange-100 text-orange-800',
  rejected: 'bg-red-100 text-red-800',
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

function ScoreIndicator({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
  const bg = score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
  
  return (
    <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium ${bg} ${color}`}>
      {score}
    </div>
  )
}

export default function VopLogsPage() {
  const [vopLogs, setVopLogs] = useState<VopLog[]>([])
  const [loading, setLoading] = useState(true)
  const [resultFilter, setResultFilter] = useState<string>('all')

  useEffect(() => {
    const fetchVopLogs = async () => {
      setLoading(true)
      try {
        const filters: { result?: VopResult; per_page: number } = { per_page: 50 }
        if (resultFilter !== 'all') {
          filters.result = resultFilter as VopResult
        }
        const response = await api.getVopLogs(filters)
        setVopLogs(response.data)
      } catch (error) {
        console.error('Failed to fetch VOP logs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVopLogs()
  }, [resultFilter])

  return (
    <>
      <Header
        title="VOP Verifications"
        description="IBAN validation and bank verification results"
      />
      <div className="p-6">
        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="w-48">
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
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IBAN</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Valid</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : vopLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No VOP logs found
                  </TableCell>
                </TableRow>
              ) : (
                vopLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {log.iban_masked}
                    </TableCell>
                    <TableCell>
                      {log.bank_identified ? (
                        <div>
                          <div className="font-medium">{log.bank_name}</div>
                          <div className="text-sm text-slate-500">{log.bic}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Not identified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.iban_valid ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      <ScoreIndicator score={log.vop_score} />
                    </TableCell>
                    <TableCell>
                      <Badge className={resultColors[log.result]}>
                        {log.result.replace('_', ' ')}
                      </Badge>
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
      </div>
    </>
  )
}
