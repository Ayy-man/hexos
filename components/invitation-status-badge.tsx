import { Badge } from '@/components/ui/badge'
import type { InvitationStatus } from '@/lib/types/organization'

interface InvitationStatusBadgeProps {
  status: InvitationStatus
}

const statusConfig: Record<InvitationStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  },
  pending_approval: {
    label: 'Awaiting Approval',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-success/10 text-success',
  },
  expired: {
    label: 'Expired',
    className: 'bg-muted text-muted-foreground',
  },
  revoked: {
    label: 'Revoked',
    className: 'bg-destructive/10 text-destructive',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/10 text-destructive',
  },
}

export function InvitationStatusBadge({ status }: InvitationStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
