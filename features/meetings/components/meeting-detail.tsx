'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MeetingWithLinks } from '@/lib/types/meetings'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MeetingSummary } from './meeting-summary'
import { MeetingTranscript } from './meeting-transcript'
import { MeetingParticipants } from './meeting-participants'
import { MeetingLinkPicker } from './meeting-link-picker'
import { TaskList } from './task-list'
import { LinkIcon, CalendarIcon, ClockIcon } from 'lucide-react'

interface MeetingDetailProps {
  meeting: MeetingWithLinks
  userRole: string
}

export function MeetingDetail({ meeting, userRole }: MeetingDetailProps) {
  const [showLinkPicker, setShowLinkPicker] = useState(false)

  // Format duration from seconds to readable format
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ready':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
      case 'pending':
      case 'joining':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
      case 'recording':
      case 'processing':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
      case 'failed':
        return 'bg-red-500/10 text-red-700 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
    }
  }

  // Get status message for non-ready states
  const getStatusMessage = (status: string, errorMessage: string | null): string => {
    switch (status) {
      case 'pending':
        return 'Waiting for bot to join the meeting...'
      case 'joining':
        return 'Bot is joining the meeting...'
      case 'recording':
        return 'Meeting in progress - recording...'
      case 'processing':
        return 'AI is processing the transcript and generating insights...'
      case 'failed':
        return `Processing failed: ${errorMessage || 'Unknown error'}`
      default:
        return 'Meeting status unknown'
    }
  }

  const isReady = meeting.status === 'ready'

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{meeting.title}</h1>
              <div className="flex items-center gap-2 mb-3">
                <Badge className={getStatusColor(meeting.status)}>
                  {meeting.status}
                </Badge>
                <Badge variant="outline">
                  {meeting.platform}
                </Badge>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {meeting.started_at
                  ? formatDate(meeting.started_at)
                  : meeting.scheduled_at
                  ? formatDate(meeting.scheduled_at)
                  : 'Not scheduled'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClockIcon className="h-4 w-4" />
              <span>Duration: {formatDuration(meeting.duration_seconds)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LinkIcon className="h-4 w-4" />
              <a
                href={meeting.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Meeting Link
              </a>
            </div>
          </div>

          {/* Linked Entities */}
          {meeting.links && meeting.links.length > 0 && (
            <div className="mb-3">
              <p className="text-sm text-muted-foreground mb-2">Linked to:</p>
              <div className="flex flex-wrap gap-2">
                {meeting.links.map((link) => (
                  <Link
                    key={link.id}
                    href={
                      link.linkable_type === 'project'
                        ? `/projects/${link.linkable_id}`
                        : `/inquiries/${link.linkable_id}`
                    }
                  >
                    <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                      {link.linkable_type === 'project' ? '📁' : '📋'}{' '}
                      {link.project_name || link.inquiry_title || link.linkable_id}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Link to Project/Inquiry Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLinkPicker(true)}
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Link to Project/Inquiry
          </Button>
        </CardContent>
      </Card>

      {/* Content - Status Message or Tabs */}
      {!isReady ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <Badge className={`${getStatusColor(meeting.status)} mb-4`}>
                {meeting.status}
              </Badge>
              <p className="text-muted-foreground">
                {getStatusMessage(meeting.status, meeting.error_message)}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="recording">Recording</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <MeetingSummary
              summary={meeting.summary}
              keyDecisions={meeting.key_decisions}
            />
          </TabsContent>

          <TabsContent value="tasks">
            <TaskList tasks={meeting.tasks || []} meetingId={meeting.id} />
          </TabsContent>

          <TabsContent value="transcript">
            <MeetingTranscript transcript={meeting.transcript} />
          </TabsContent>

          <TabsContent value="recording">
            <Card>
              <CardContent className="p-6">
                {meeting.recall_recording_url ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Recording</h3>
                    <video
                      controls
                      className="w-full rounded-lg"
                      src={meeting.recall_recording_url}
                    >
                      Your browser does not support the video element.
                    </video>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Recording not available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants">
            <MeetingParticipants participants={meeting.participants} />
          </TabsContent>
        </Tabs>
      )}

      {/* Link Picker Dialog */}
      {showLinkPicker && (
        <MeetingLinkPicker
          meetingId={meeting.id}
          existingLinks={meeting.links}
          onClose={() => setShowLinkPicker(false)}
        />
      )}
    </div>
  )
}
