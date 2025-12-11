/**
 * Expandable list of upload errors by row.
 */

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { UploadError } from '@/types'

interface UploadErrorsProps {
  errors: UploadError[]
  maxVisible?: number
}

export function UploadErrors({ errors, maxVisible = 5 }: UploadErrorsProps) {
  const [expanded, setExpanded] = useState(false)

  if (!errors || errors.length === 0) return null

  const visibleErrors = expanded ? errors : errors.slice(0, maxVisible)
  const hasMore = errors.length > maxVisible

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium text-sm">
                {errors.length} error{errors.length !== 1 ? 's' : ''} found
              </span>
            </div>
            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
              >
                {expanded ? (
                  <>
                    Show less <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Show all ({errors.length}) <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Error List */}
          <div className="space-y-2">
            {visibleErrors.map((error, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-red-700 bg-white/50 rounded p-2"
              >
                <Badge variant="outline" className="shrink-0 text-xs border-red-300">
                  Row {error.row}
                </Badge>
                <span>{error.message}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
