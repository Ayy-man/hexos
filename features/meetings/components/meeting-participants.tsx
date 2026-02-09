'use client'

import Link from 'next/link'
import type { MeetingParticipant } from '@/lib/types/meetings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface MeetingParticipantsProps {
  participants: MeetingParticipant[]
}

export function MeetingParticipants({ participants }: MeetingParticipantsProps) {
  if (!participants || participants.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          No participants recorded
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Speaker Label</TableHead>
              <TableHead>Hexos Profile</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((participant) => (
              <TableRow key={participant.id}>
                <TableCell className="font-medium">
                  {participant.display_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {participant.email || '-'}
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {participant.speaker_label || '-'}
                  </code>
                </TableCell>
                <TableCell>
                  {participant.profile_id ? (
                    <Link
                      href={`/admin/devs`}
                      className="text-blue-600 hover:underline"
                    >
                      View Profile
                    </Link>
                  ) : (
                    <Badge variant="secondary">External</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
