/**
 * Chargebacks list page.
 * Shows all chargebacks with chargeback code filter.
 */

'use client'

import { Header } from '@/components/layout'
import { Pagination, PaginationMeta } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { ChargebackCodes, Chargebacks, PaginationLink, PaginationLinks, PaginationMeta as PaginationMetaType } from '@/types';
import { CHARGEBACK_RULES, getChargebackRule } from '@/lib/chargebacks'
import { useEffect, useState } from 'react'
import { formatDate, formatDateNullable, formatCurrency } from '@/lib/utils'
import { RiskBadge } from '@/components/ui/badges'

export default function ChargebacksPage() {
  const [chargebackCodes, setChargebackCodes] = useState<ChargebackCodes[]>([])
  const [selectedCode, setSelectedCode] = useState<string>('all')
  const [chargebacks, setChargebacks] = useState<Chargebacks[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [meta, setMeta] = useState<PaginationMetaType | null>(null)
  const [links, setLinks] = useState<PaginationLinks | null>(null)
  const [paginationLinks, setPaginationLinks] = useState<PaginationLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChargebackCodes = async () => {
      try{
        const response = await api.getChargebackCodes()
        setChargebackCodes(response)
      } catch (error) {
        console.log('Error fetching chargeback codes', error);
      }
    }

    fetchChargebackCodes()
  }, [])

  useEffect(() => {
    const fetchChargebacks = async () => {
      try {
        setLoading(true)
        const params = { 
          page: currentPage,
          per_page: 50,
          code: selectedCode === 'all' ? undefined : selectedCode
        }

        const response = await api.getChargebacks(params)
        setChargebacks(response.data)
        setMeta(response.meta || null)
        setLinks(response.links || null)
        
        // Extract pagination links from meta if they exist
        if (response.meta && 'links' in response.meta) {
          setPaginationLinks((response.meta as any).links || [])
        }
      } catch (error) {
        console.log('Error fetching chargebacks:', error);
      } finally {
        setLoading(false)
      }
    }

    fetchChargebacks()
  }, [selectedCode, currentPage])

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const handleNextPage = () => {
    if (meta && currentPage < meta.last_page) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const handlePageClick = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <>
      <Header
        title="Chargebacks"
        description="List of chargebacks with debtors and bank details"
      />
      <div className="p-6">
        {/** Filter Chargeback */}
        {chargebackCodes && chargebackCodes.length > 1 && (
          <div className="mb-4 flex gap-4">
            <Select value={selectedCode} onValueChange={(val) => { setSelectedCode(val); setCurrentPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by code" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All CB Codes</SelectItem>
                {chargebackCodes.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {meta && (
          <PaginationMeta
            meta={meta}
            label="Chargebacks"
            containerClassName='px-2'
          />
        )}
        
        <div className="rounded-lg border bg-white mb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CB Code</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Required Actions</TableHead>
                <TableHead>Debtor</TableHead>
                <TableHead>IBAN</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Chargeback</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Bank</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                      Loading chargebacks...
                    </TableCell>
                  </TableRow>
                ) : chargebacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                      No chargebacks found
                    </TableCell>
                  </TableRow>
                ) : ( chargebacks.map((cb) => {
                  const rule = cb.error_code ? getChargebackRule(cb.error_code) : undefined
                  return (
                    <TableRow key={cb.id}>
                      <TableCell>
                        <div className="font-mono text-blue-600">
                          {cb.error_code}
                        </div>
                        <div className="text-slate-600 text-xs">
                          {rule?.detail}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cb.error_code && CHARGEBACK_RULES[cb.error_code] && (
                          <RiskBadge risk={CHARGEBACK_RULES[cb.error_code].risk} />
                        )}
                      </TableCell>
                      <TableCell>
                        {cb.error_code && CHARGEBACK_RULES[cb.error_code]?.action.map((action, index) => (
                          <div key={index} className="text-xs text-slate-500">
                            {action}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>
                        {cb.debtor ? (
                          <>
                            <div className="font-medium text-blue-600">
                              {cb.debtor.first_name} {cb.debtor.last_name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {cb.debtor.email}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-slate-500">
                            -
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {cb.debtor ? ((cb.debtor as any).iban || cb.debtor.iban_masked) : '-'}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        { formatDateNullable(cb.emp_created_at) }
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        { formatDateNullable(cb.chargebacked_at) }
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        { formatCurrency(cb.amount, cb.currency) }
                      </TableCell>
                      <TableCell>
                        <div>
                          {cb.bank_name ?? '-'}
                        </div>
                        <div className="text-sm text-slate-600">
                          {cb.bank_country ?? '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                }
              ))}
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


