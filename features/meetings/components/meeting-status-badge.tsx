import { Badge } from '@/components/ui/badge'
import type { MeetingStatus } from '@/lib/types/meetings'

interface MeetingStatusBadgeProps {
  status: MeetingStatus
}

export function MeetingStatusBadge({ status }: MeetingStatusBadgeProps) {
  const statusConfig: Record<MeetingStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string, showPulse?: boolean }> = {
    pending: {
      variant: 'secondary',
      label: 'Pending',
    },
    joining: {
      variant: 'secondary',
      label: 'Joining...',
    },
    recording: {
      variant: 'destructive',
      label: 'Recording',
      showPulse: true,
    },
    processing: {
      variant: 'secondary',
      label: 'Processing...',
    },
    ready: {
      variant: 'default',
      label: 'Ready',
    },
    failed: {
      variant: 'destructive',
      label: 'Failed',
    },
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2">
      {config.showPulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}
      <Badge variant={config.variant}>{config.label}</Badge>
    </div>
  )
}
