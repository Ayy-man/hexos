'use client'

import { useState, useMemo } from 'react'
import type { TranscriptSegment } from '@/lib/types/meetings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SearchIcon } from 'lucide-react'

interface MeetingTranscriptProps {
  transcript: TranscriptSegment[] | null
}

export function MeetingTranscript({ transcript }: MeetingTranscriptProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Format seconds to MM:SS or H:MM:SS
  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Filter segments by search term
  const filteredSegments = useMemo(() => {
    if (!transcript) return []
    if (!searchTerm.trim()) return transcript

    const term = searchTerm.toLowerCase()
    return transcript.filter(
      (segment) =>
        segment.text.toLowerCase().includes(term) ||
        segment.speaker.toLowerCase().includes(term)
    )
  }, [transcript, searchTerm])

  if (!transcript || transcript.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          Transcript not available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcript</CardTitle>
        <div className="relative mt-2">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search transcript..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredSegments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No results found for "{searchTerm}"
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSegments.map((segment, index) => {
              // Alternate background for different speakers
              const prevSpeaker =
                index > 0 ? filteredSegments[index - 1].speaker : null
              const isDifferentSpeaker = segment.speaker !== prevSpeaker

              return (
                <div
                  key={index}
                  className={`p-3 rounded ${
                    isDifferentSpeaker && index % 2 === 0
                      ? 'bg-muted/30'
                      : index % 2 === 1
                      ? 'bg-muted/30'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-16 text-xs text-muted-foreground font-mono">
                      {formatTimestamp(segment.start_time)}
                    </div>
                    <div className="flex-shrink-0 font-semibold text-sm min-w-[100px]">
                      {segment.speaker}
                    </div>
                    <div className="flex-1 text-sm">{segment.text}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
