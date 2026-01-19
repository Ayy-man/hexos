'use client'

import { Badge } from '@/components/ui/badge'
import {
  formatRequestType,
  getRequestTypeColor,
  formatTriggerType,
  getTriggerTypeColor,
  type ScopeChangeRequestType,
  type ScopeChangeTrigger,
} from '@/lib/types/scope-monitoring'

interface ScopeChangeTypeBadgeProps {
  type: ScopeChangeRequestType | ScopeChangeTrigger
  variant?: 'request' | 'trigger'
  className?: string
}

export function ScopeChangeTypeBadge({
  type,
  variant = 'request',
  className,
}: ScopeChangeTypeBadgeProps) {
  if (variant === 'trigger') {
    return (
      <Badge
        className={`${getTriggerTypeColor(type as ScopeChangeTrigger)} ${className || ''}`}
        variant="secondary"
      >
        {formatTriggerType(type as ScopeChangeTrigger)}
      </Badge>
    )
  }

  return (
    <Badge
      className={`${getRequestTypeColor(type as ScopeChangeRequestType)} ${className || ''}`}
      variant="secondary"
    >
      {formatRequestType(type as ScopeChangeRequestType)}
    </Badge>
  )
}
