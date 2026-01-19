'use client'

import { Badge } from '@/components/ui/badge'
import {
  formatScopeStatus,
  getScopeStatusColor,
  type ScopeChangeStatus,
} from '@/lib/types/scope-monitoring'

interface ScopeChangeStatusBadgeProps {
  status: ScopeChangeStatus
  className?: string
}

export function ScopeChangeStatusBadge({ status, className }: ScopeChangeStatusBadgeProps) {
  return (
    <Badge className={`${getScopeStatusColor(status)} ${className || ''}`} variant="secondary">
      {formatScopeStatus(status)}
    </Badge>
  )
}
