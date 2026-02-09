'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreVertical, Trash2, Video } from 'lucide-react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MeetingStatusBadge } from './meeting-status-badge'
import { deleteMeetingAction } from '@/features/meetings/actions/meetingActions'
import type { Meeting, MeetingStatus, MeetingPlatform } from '@/lib/types/meetings'

interface MeetingListProps {
  meetings: Meeting[]
  initialStatus?: string
}

const PLATFORM_LABELS: Record<MeetingPlatform, string> = {
  zoom: 'Zoom',
  google_meet: 'Meet',
  teams: 'Teams',
  other: 'Other',
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'recording', label: 'Recording' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'failed', label: 'Failed' },
]

export function MeetingList({ meetings, initialStatus = 'all' }: MeetingListProps) {
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredMeetings = meetings.filter((meeting) => {
    if (statusFilter === 'all') return true
    return meeting.status === statusFilter
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) {
      return
    }

    setDeletingId(id)
    const result = await deleteMeetingAction(id)
    setDeletingId(null)

    if (result.success) {
      toast.success('Meeting deleted')
    } else {
      toast.error(result.error || 'Failed to delete meeting')
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Badge
            key={filter.value}
            variant={statusFilter === filter.value ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-muted"
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </Badge>
        ))}
      </div>

      {/* Empty State */}
      {filteredMeetings.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 md:p-12 text-center dark:border-stone-800 dark:bg-stone-900">
          <Video className="mx-auto h-12 w-12 text-stone-400 mb-4" />
          <p className="text-stone-500 dark:text-stone-400 text-sm md:text-base">
            {statusFilter === 'all'
              ? 'No meetings yet. Create your first meeting to get started.'
              : `No ${statusFilter} meetings.`}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {filteredMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/meetings/${meeting.id}`}
                      className="font-medium text-stone-900 hover:text-cyan-600 dark:text-stone-100 dark:hover:text-cyan-400"
                    >
                      {meeting.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
                      <span>{PLATFORM_LABELS[meeting.platform]}</span>
                      <span>•</span>
                      <span>{formatDate(meeting.created_at)}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === meeting.id}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDelete(meeting.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3">
                  <MeetingStatusBadge status={meeting.status} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeetings.map((meeting) => (
                  <TableRow key={meeting.id}>
                    <TableCell>
                      <Link
                        href={`/meetings/${meeting.id}`}
                        className="font-medium text-stone-900 hover:text-cyan-600 dark:text-stone-100 dark:hover:text-cyan-400"
                      >
                        {meeting.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-stone-600 dark:text-stone-400">
                      {PLATFORM_LABELS[meeting.platform]}
                    </TableCell>
                    <TableCell className="text-sm text-stone-600 dark:text-stone-400">
                      {formatDate(meeting.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-stone-600 dark:text-stone-400">
                      {formatDuration(meeting.duration_seconds)}
                    </TableCell>
                    <TableCell>
                      <MeetingStatusBadge status={meeting.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === meeting.id}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDelete(meeting.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
