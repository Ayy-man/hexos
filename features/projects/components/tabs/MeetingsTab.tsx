'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Meeting } from '@/lib/types/meetings'
import { Video, Calendar, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MeetingsTabProps {
  projectId: string
}

export function MeetingsTab({ projectId }: MeetingsTabProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch meetings for this project
    const fetchMeetings = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/meetings?project_id=${projectId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch meetings')
        }
        const data = await response.json()
        setMeetings(data.meetings || [])
      } catch (err) {
        console.error('Failed to fetch meetings:', err)
        setError(err instanceof Error ? err.message : 'Failed to load meetings')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMeetings()
  }, [projectId])

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

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading meetings...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Meetings</CardTitle>
          <Link href="/meetings">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View All Meetings
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No meetings linked to this project.</p>
              <p className="text-sm mt-2">
                Link meetings from the{' '}
                <Link href="/meetings" className="text-primary hover:underline">
                  meetings page
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/meetings/${meeting.id}`}
                  className="block"
                >
                  <div className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <h4 className="font-medium truncate">{meeting.title}</h4>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {meeting.started_at
                                ? formatDate(meeting.started_at)
                                : meeting.scheduled_at
                                ? formatDate(meeting.scheduled_at)
                                : 'Not scheduled'}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {meeting.platform}
                          </Badge>
                        </div>
                      </div>
                      <Badge className={cn('flex-shrink-0', getStatusColor(meeting.status))}>
                        {meeting.status}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
