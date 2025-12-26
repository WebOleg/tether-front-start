'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PaginationMeta, PaginationLinks, PaginationLink, PaginationProps, PaginationMetaProps } from '@/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function PaginationMeta({ 
  meta, 
  label = 'records',
  containerClassName,
  leftSectionClassName,
  rightSectionClassName,
  textClassName,
}: PaginationMetaProps) {
  if (!meta) {
    return null
  }

  return (
    <div className={cn('px-8 py-2 flex items-center justify-between w-full', containerClassName)}>
      <div className={cn('text-sm text-slate-600', leftSectionClassName, textClassName)}>
        Page {meta.current_page} of {meta.last_page}
      </div>
      <div className={cn('text-sm text-slate-600', rightSectionClassName, textClassName)}>
        Showing {meta.from} to {meta.to} of {meta.total} {label}
      </div>
    </div>
  )
}

export function Pagination({
  meta,
  links,
  paginationLinks,
  onPageChange,
  onPreviousClick,
  onNextClick,
}: PaginationProps) {
  const handlePreviousClick = () => {
    if (onPreviousClick) {
      onPreviousClick()
    } else if (links?.prev && meta) {
      onPageChange(meta!.current_page - 1)
    }
  }

  const handleNextClick = () => {
    if (onNextClick) {
      onNextClick()
    } else if (links?.next && meta) {
      onPageChange(meta.current_page + 1)
    }
  }
  if (!meta) {
    return null
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <div className="flex items-center justify-center gap-2">
        <Button
          onClick={handlePreviousClick}
          disabled={!links?.prev}
          variant="outline"
          size="sm"
        >
          <ChevronLeft />
        </Button>

        <div className="flex gap-1">
          {paginationLinks
            .filter((link) => {
              if (
                !link.page ||
                link.label === '...' ||
                link.label.includes('«') ||
                link.label.includes('»') ||
                link.label.includes('Next') ||
                link.label.includes('Previous')
              ) {
                return false
              }
              return true
            })
            .map((link) => (
              <Button
                key={`${link.page}-${link.url}`}
                onClick={() => link.page && onPageChange(link.page)}
                variant={link.active ? 'default' : 'outline'}
                disabled={!link.url}
                size="sm"
              >
                {link.page}
              </Button>
            ))}
        </div>

        <Button
          onClick={handleNextClick}
          disabled={!links?.next}
          variant="outline"
          size="sm"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}