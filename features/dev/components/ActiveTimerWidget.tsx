'use client'

import { useState, useEffect, useTransition } from 'react'
import { Play, Square, Clock, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { stopTimerAction } from '@/features/dev/actions/timeTrackingActions'
import type { ActiveTimer } from '@/lib/api/time-tracking'

interface ActiveTimerWidgetProps {
  initialTimer: ActiveTimer | null
  variant?: 'compact' | 'full'
  className?: string
}

export function ActiveTimerWidget({
  initialTimer,
  variant = 'compact',
  className,
}: ActiveTimerWidgetProps) {
  const [timer, setTimer] = useState<ActiveTimer | null>(initialTimer)
  const [elapsed, setElapsed] = useState(0)
  const [isPending, startTransition] = useTransition()

  // Calculate initial elapsed time
  useEffect(() => {
    if (timer?.started_at) {
      const start = new Date(timer.started_at).getTime()
      const now = Date.now()
      setElapsed(Math.floor((now - start) / 1000))
    } else {
      setElapsed(0)
    }
  }, [timer?.started_at])

  // Update elapsed time every second
  useEffect(() => {
    if (!timer) return

    const interval = setInterval(() => {
      const start = new Date(timer.started_at).getTime()
      const now = Date.now()
      setElapsed(Math.floor((now - start) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [timer])

  const handleStop = () => {
    startTransition(async () => {
      const result = await stopTimerAction()
      if (result.success) {
        const minutes = result.entry?.duration_minutes || Math.floor(elapsed / 60)
        toast.success(`Logged ${formatDuration(minutes * 60)}`)
        setTimer(null)
        setElapsed(0)
      } else {
        toast.error(result.message || 'Failed to stop timer')
      }
    })
  }

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!timer) {
    return null
  }

  const deliverable = timer.deliverable
  const project = deliverable?.project

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 ${className}`}>
              <Badge
                variant="outline"
                className="gap-1.5 bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300 animate-pulse"
              >
                <Clock className="h-3 w-3" />
                {formatDuration(elapsed)}
              </Badge>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={handleStop}
                disabled={isPending}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Square className="h-3 w-3 fill-current" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-medium">{deliverable?.title || 'Timer running'}</p>
            {project && (
              <p className="text-xs text-muted-foreground">{project.project_name}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Full variant
  return (
    <div className={`rounded-lg border bg-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-muted-foreground">Timer Running</span>
        </div>
        <Badge variant="secondary" className="font-mono text-lg">
          {formatDuration(elapsed)}
        </Badge>
      </div>

      <div className="mb-4">
        <p className="font-semibold line-clamp-1">{deliverable?.title || 'Unknown task'}</p>
        {project && (
          <Link
            href={`/projects/${project.id}`}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {project.project_name}
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      <Button
        onClick={handleStop}
        disabled={isPending}
        variant="destructive"
        className="w-full"
      >
        <Square className="h-4 w-4 mr-2 fill-current" />
        {isPending ? 'Stopping...' : 'Stop Timer'}
      </Button>
    </div>
  )
}

// Separate component for starting a timer on a specific deliverable
interface TimerStartButtonProps {
  deliverableId: string
  deliverableTitle: string
  hasActiveTimer: boolean
  onStart: () => void
  className?: string
}

export function TimerStartButton({
  deliverableId,
  deliverableTitle,
  hasActiveTimer,
  onStart,
  className,
}: TimerStartButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleStart = () => {
    startTransition(async () => {
      // Import dynamically to avoid circular deps
      const { startTimerAction } = await import('@/features/dev/actions/timeTrackingActions')
      const result = await startTimerAction(deliverableId)
      if (result.success) {
        toast.success(`Timer started for "${deliverableTitle}"`)
        onStart()
      } else {
        toast.error(result.message || 'Failed to start timer')
      }
    })
  }

  return (
    <Button
      size="sm"
      variant={hasActiveTimer ? 'outline' : 'default'}
      onClick={handleStart}
      disabled={isPending}
      className={className}
    >
      <Play className="h-3 w-3 mr-1" />
      {isPending ? 'Starting...' : hasActiveTimer ? 'Switch Timer' : 'Start Timer'}
    </Button>
  )
}
