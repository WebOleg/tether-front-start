/**
 * Centralized Badge Components
 * Provides consistent badge styling across the application
 * All badges use rounded-full design with proper text formatting
 */

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertCircle, Clock, Ban, MinusCircle, ShieldCheck, AlertTriangle, ShieldAlert, Zap, RotateCcw, Archive, UserCheck, User, UserX, TrendingUp } from 'lucide-react'
import {
  modelBadgeColorsAlt,
  billingStatusStyles,
  riskColors,
  vopResultColors,
  vopNameMatchColors,
  vopScoreColors,
} from '@/lib/styles'

// ============ MODEL BADGE ============

export interface ModelBadgeProps {
  model?: string | null
}

/**
 * Badge component for displaying billing model (Flywheel, Recovery, Legacy)
 * Uses rounded-full design with softer colors
 */
export function ModelBadge({ model }: ModelBadgeProps) {
  const normalized = (model || 'legacy').toLowerCase()
  const colorClasses = modelBadgeColorsAlt[normalized] ?? modelBadgeColorsAlt.legacy
  const isFlywheel = normalized === 'flywheel'
  const isRecovery = normalized === 'recovery'
  const isLegacy = normalized === 'legacy'
  
  // Capitalize first letter for display
  const displayText = normalized.charAt(0).toUpperCase() + normalized.slice(1)

  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-normal min-w-[90px] justify-center gap-1 ${colorClasses}`}>
      {isFlywheel && <Zap className="h-3 w-3" />}
      {isRecovery && <RotateCcw className="h-3 w-3" />}
      {isLegacy && <Archive className="h-3 w-3" />}
      {displayText}
    </Badge>
  )
}

// ============ STATUS BADGE ============

export interface StatusBadgeProps {
  status: string
}

/**
 * Badge component for displaying status (Approved, Pending, Failed, etc.)
 * Shows appropriate icon based on status type
 * Uses rounded-full design with status-specific colors
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const isApproved = status === 'approved' || status === 'completed' || status === 'recovered'
  const isDeclined = status === 'declined' || status === 'failed'
  const isError = status === 'error'
  const isPending = status === 'pending' || status === 'uploaded'
  const isProcessing = status === 'processing'
  const isChargebacked = status === 'chargebacked'
  const isVoided = status === 'voided'

  const colorClasses = billingStatusStyles[status] || billingStatusStyles.pending

  // Capitalize first letter for display
  const displayText = status.charAt(0).toUpperCase() + status.slice(1)

  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-normal gap-1 min-w-[90px] justify-center ${colorClasses}`}>
      {isApproved && <CheckCircle2 className="h-3 w-3" />}
      {isDeclined && <XCircle className="h-3 w-3" />}
      {isError && <AlertCircle className="h-3 w-3" />}
      {isPending && <Clock className="h-3 w-3" />}
      {isProcessing && <Clock className="h-3 w-3 animate-pulse" />}
      {isChargebacked && <Ban className="h-3 w-3" />}
      {isVoided && <MinusCircle className="h-3 w-3" />}
      {displayText}
    </Badge>
  )
}

// ============ RISK BADGE ============

export interface RiskBadgeProps {
  risk: string
}

/**
 * Badge component for displaying risk level (Low, Medium, High)
 * Uses rounded-full design with risk-specific colors and icons
 */
export function RiskBadge({ risk }: RiskBadgeProps) {
  const colorClasses = riskColors[risk] ?? riskColors.low
  const isLow = risk === 'low'
  const isMedium = risk === 'medium'
  const isHigh = risk === 'high'
  
  // Capitalize first letter for display
  const displayText = risk.charAt(0).toUpperCase() + risk.slice(1)
  
  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-normal gap-1 min-w-[90px] justify-center ${colorClasses}`}>
      {isLow && <ShieldCheck className="h-3 w-3" />}
      {isMedium && <AlertTriangle className="h-3 w-3" />}
      {isHigh && <ShieldAlert className="h-3 w-3" />}
      {displayText}
    </Badge>
  )
}

// ============ VOP RESULT BADGE ============

export interface VopResultBadgeProps {
  result: string
}

/**
 * Badge component for displaying VOP verification result
 * Used in VOP logs page
 */
export function VopResultBadge({ result }: VopResultBadgeProps) {
  const colorClasses = vopResultColors[result] ?? vopResultColors.inconclusive
  const isVerified = result === 'verified'
  const isLikelyVerified = result === 'likely_verified'
  const isInconclusive = result === 'inconclusive'
  const isMismatch = result === 'mismatch'
  const isRejected = result === 'rejected'
  
  // Format display text
  const displayText = result.replaceAll('_', ' ').split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-normal gap-1 min-w-[120px] justify-center ${colorClasses}`}>
      {isVerified && <CheckCircle2 className="h-3 w-3" />}
      {isLikelyVerified && <CheckCircle2 className="h-3 w-3" />}
      {isInconclusive && <AlertCircle className="h-3 w-3" />}
      {isMismatch && <AlertTriangle className="h-3 w-3" />}
      {isRejected && <XCircle className="h-3 w-3" />}
      {displayText}
    </Badge>
  )
}

// ============ VOP NAME MATCH BADGE ============

export interface VopNameMatchBadgeProps {
  nameMatch: string
  score?: number | null
}

/**
 * Badge component for displaying VOP name match result
 * Used in VOP logs page
 */
export function VopNameMatchBadge({ nameMatch, score }: VopNameMatchBadgeProps) {
  const colorClasses = vopNameMatchColors[nameMatch] ?? vopNameMatchColors.unavailable
  const isYes = nameMatch === 'yes'
  const isPartial = nameMatch === 'partial'
  const isNo = nameMatch === 'no'
  const isUnavailable = nameMatch === 'unavailable'
  const isError = nameMatch === 'error'
  
  // Capitalize first letter for display
  const displayText = nameMatch.charAt(0).toUpperCase() + nameMatch.slice(1)
  
  // Show score inside badge if available
  const showScore = score !== null && score !== undefined && !isUnavailable && !isError
  const badgeContent = showScore ? `${displayText} - ${score}%` : displayText

  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-normal gap-1 min-w-[100px] justify-center ${colorClasses}`}>
      {isYes && <UserCheck className="h-3 w-3" />}
      {isPartial && <User className="h-3 w-3" />}
      {isNo && <UserX className="h-3 w-3" />}
      {isUnavailable && <MinusCircle className="h-3 w-3" />}
      {isError && <XCircle className="h-3 w-3" />}
      {badgeContent}
    </Badge>
  )
}

// ============ VOP SCORE BADGE ============

export interface VopScoreBadgeProps {
  score: number
}

/**
 * Badge component for displaying VOP score
 * Used in VOP logs page - color-coded by score value
 */
export function VopScoreBadge({ score }: VopScoreBadgeProps) {
  const colorClasses = 
    score >= 80 ? vopScoreColors.high : 
    score >= 60 ? vopScoreColors.medium : 
    vopScoreColors.low
  
  return (
    <Badge variant="outline" className={`rounded-full w-7 h-7 p-0 font-semibold flex items-center justify-center ${colorClasses}`}>
      {score}
    </Badge>
  )
}
