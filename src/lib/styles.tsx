/**
 * Centralized color and style definitions for the application
 * Used across admin pages for consistent theming
 */

import type { DebtorStatus } from '@/types'
import { CheckCircle, XCircle, AlertCircle, Clock, Ban } from 'lucide-react'

// ============ BADGE COLORS ============

/**
 * Status colors for badges across different entities
 * Used in debtors, uploads, billing, and dashboard pages
 */
export const statusColors: Record<DebtorStatus | string, string> = {
  uploaded: 'bg-slate-100 text-slate-800',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  recovered: 'bg-green-100 text-green-800',
  approved: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  declined: 'bg-red-100 text-red-800',
  error: 'bg-red-100 text-red-800',
  chargebacked: 'bg-orange-100 text-orange-800',
  voided: 'bg-slate-100 text-slate-800',
}

/**
 * Risk level colors for badges
 * Used in debtors and chargebacks pages
 */
export const riskColors: Record<string, string> = {
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-rose-50 text-rose-700 border-rose-200',
}

/**
 * VOP verification result colors for badges
 * Used in VOP logs page
 */
export const vopResultColors: Record<string, string> = {
  verified: 'bg-green-50 text-green-700 border-green-200',
  likely_verified: 'bg-blue-50 text-blue-700 border-blue-200',
  inconclusive: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  mismatch: 'bg-orange-50 text-orange-700 border-orange-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

/**
 * VOP name match colors for badges
 * Used in VOP logs page
 */
export const vopNameMatchColors: Record<string, string> = {
  yes: 'bg-green-50 text-green-700 border-green-200',
  partial: 'bg-blue-50 text-blue-700 border-blue-200',
  no: 'bg-red-50 text-red-700 border-red-200',
  unavailable: 'bg-slate-50 text-slate-600 border-slate-200',
  error: 'bg-orange-50 text-orange-700 border-orange-200',
}

/**
 * VOP score badge colors
 * Used in VOP logs page - color-coded by score range
 */
export const vopScoreColors = {
  high: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low: 'bg-red-50 text-red-700 border-red-200',
}

// ============ MODEL STYLES ============

/**
 * Billing model badge colors (primary variant)
 * Used in debtors and upload detail pages
 */
export const modelBadgeColors: Record<string, string> = {
  flywheel: 'border-blue-300 text-blue-700 bg-blue-50',
  recovery: 'border-purple-300 text-purple-700 bg-purple-50',
  legacy: 'border-slate-300 text-slate-700 bg-slate-50',
}

/**
 * Billing model badge colors (alternative softer variant)
 * Used in billing page for a different visual style
 */
export const modelBadgeColorsAlt: Record<string, string> = {
  flywheel: 'bg-sky-50 text-sky-700 border-sky-200',
  recovery: 'bg-violet-50 text-violet-700 border-violet-200',
  legacy: 'bg-slate-100 text-slate-800 border-slate-200',
}

// ============ ROW STYLES ============

/**
 * Table row background styles based on billing model
 * Provides visual differentiation for different model types
 */
export const modelRowStyles: Record<string, string> = {
  flywheel: 'bg-blue-50/60 hover:bg-blue-100/60',
  recovery: 'bg-purple-50/60 hover:bg-purple-100/60',
  legacy: 'bg-white hover:bg-slate-50',
}

/**
 * Table row background styles based on status
 * Used for status-based visual feedback in tables
 */
export const statusRowStyles: Record<DebtorStatus | string, string> = {
  pending: 'bg-yellow-50/60 hover:bg-yellow-100/60',
  processing: 'bg-blue-50/60 hover:bg-blue-100/60',
  recovered: 'bg-green-50/60 hover:bg-green-100/60',
  failed: 'bg-red-50/60 hover:bg-red-100/60',
}

// ============ VALIDATION CONFIG ============

/**
 * Comprehensive configuration for validation status display
 * Includes colors, icons, and row styles for upload validation
 */
export const validationStatusConfig: Record<
  string,
  {
    color: string
    textColor: string
    rowBg: string
    hoverBg: string
    icon: React.ReactNode
    label: string
  }
> = {
  valid: {
    color: 'text-green-600',
    textColor: 'text-green-600',
    rowBg: 'bg-white',
    hoverBg: 'bg-slate-50',
    icon: <CheckCircle className="h-5 w-5" />,
    label: 'Valid',
  },
  invalid: {
    color: 'text-orange-500',
    textColor: 'text-orange-600',
    rowBg: 'bg-orange-50',
    hoverBg: 'bg-orange-100',
    icon: <XCircle className="h-5 w-5" />,
    label: 'Invalid',
  },
  error: {
    color: 'text-red-500',
    textColor: 'text-red-600',
    rowBg: 'bg-red-50',
    hoverBg: 'bg-red-100',
    icon: <AlertCircle className="h-5 w-5" />,
    label: 'Error',
  },
  pending: {
    color: 'text-gray-400',
    textColor: 'text-gray-500',
    rowBg: 'bg-white',
    hoverBg: 'bg-slate-50',
    icon: <Clock className="h-5 w-5" />,
    label: 'Pending',
  },
  chargebacked: {
    color: 'text-red-600',
    textColor: 'text-red-700',
    rowBg: 'bg-red-100',
    hoverBg: 'bg-red-200',
    icon: <Ban className="h-5 w-5" />,
    label: 'Chargebacked',
  },
  approved: {
    color: 'text-green-600',
    textColor: 'text-green-700',
    rowBg: 'bg-green-50',
    hoverBg: 'bg-green-100',
    icon: <CheckCircle className="h-5 w-5" />,
    label: 'Approved',
  },
}

/**
 * Billing status badge styles with softer colors
 * Used in billing page for a refined look
 */
export const billingStatusStyles: Record<string, string> = {
  uploaded: 'bg-slate-100 text-slate-700 border-slate-200',
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  recovered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-rose-50 text-rose-700 border-rose-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  error: 'bg-orange-50 text-orange-700 border-orange-200',
  voided: 'bg-slate-100 text-slate-700 border-slate-200',
  chargebacked: 'bg-purple-50 text-purple-700 border-purple-200',
}

// ============ HELPER FUNCTIONS ============

/**
 * Get the appropriate badge color for a billing model
 * @param model - The billing model name (flywheel, recovery, legacy)
 * @param useAlt - Whether to use the alternative color scheme
 * @returns Tailwind CSS classes for the badge
 */
export function getModelBadgeColor(model: string | null | undefined, useAlt = false): string {
  const normalized = (model || 'legacy').toLowerCase()
  const colors = useAlt ? modelBadgeColorsAlt : modelBadgeColors
  return colors[normalized] ?? colors.legacy
}

/**
 * Get the status badge color
 * @param status - The status string
 * @returns Tailwind CSS classes for the badge
 */
export function getStatusColor(status: string): string {
  return statusColors[status] ?? statusColors.pending
}

/**
 * Get the risk level badge color
 * @param risk - The risk level (low, medium, high)
 * @returns Tailwind CSS classes for the badge
 */
export function getRiskColor(risk: string): string {
  return riskColors[risk] ?? ''
}

/**
 * Get the model-based row style
 * @param model - The billing model name
 * @returns Tailwind CSS classes for the table row
 */
export function getModelRowStyle(model: string | null | undefined): string {
  const normalized = (model || 'legacy').toLowerCase()
  return modelRowStyles[normalized] ?? modelRowStyles.legacy
}

/**
 * Get the status-based row style
 * @param status - The status string
 * @returns Tailwind CSS classes for the table row
 */
export function getStatusRowStyle(status: string): string {
  return statusRowStyles[status] ?? 'bg-slate-50/60'
}
