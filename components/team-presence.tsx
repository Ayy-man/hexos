'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOnlineUsers } from '@/hooks/use-presence'
import { useSidebar } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from '@/components/ui/avatar'
import type { Profile } from '@/lib/auth/types'

/**
 * Format relative time for last seen display
 */
function formatLastSeen(date: string | null): string {
  if (!date) return 'Never'
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}

interface TeamMember extends Profile {
  last_seen_at?: string | null
}

/**
 * TeamPresence widget showing online/offline team members.
 * Only visible to admin and internal roles.
 * Displays in sidebar footer with animated avatar stacking.
 */
export function TeamPresence() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { onlineUsers } = useOnlineUsers()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  useEffect(() => {
    async function fetchTeam() {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'internal', 'dev', 'dfy'])
        .order('name')

      setTeamMembers((data as TeamMember[]) || [])
      setIsLoading(false)
    }
    fetchTeam()
  }, [])

  const onlineIds = new Set(onlineUsers.map(u => u.id))
  const online = teamMembers.filter(m => onlineIds.has(m.id))
  const offline = teamMembers.filter(m => !onlineIds.has(m.id))

  if (isLoading) return null

  // Hide when sidebar is collapsed to prevent text overflow
  if (isCollapsed) return null

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      {/* Header with pulse indicator */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Team</span>
        {online.length > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{online.length} online</span>
      </div>

      {/* Online section - stacked avatars */}
      {online.length > 0 && (
        <div className="space-y-1">
          <AvatarGroup className="justify-start">
            {online.slice(0, 5).map((member, i) => (
              <Avatar
                key={member.id}
                size="sm"
                className="animate-pop-in ring-success/50"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <AvatarImage src={member.logo_url || undefined} />
                <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
            {online.length > 5 && (
              <div className="flex items-center justify-center size-6 rounded-full bg-muted text-xs font-medium ring-2 ring-background">
                +{online.length - 5}
              </div>
            )}
          </AvatarGroup>
        </div>
      )}

      {/* Offline section - list with last seen */}
      {offline.length > 0 && (
        <div className="space-y-1 opacity-60">
          <span className="text-xs text-muted-foreground">{offline.length} offline</span>
          <div className="flex flex-col gap-1">
            {offline.slice(0, 3).map(member => (
              <div key={member.id} className="flex items-center gap-2 text-xs">
                <Avatar size="sm">
                  <AvatarImage src={member.logo_url || undefined} />
                  <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate flex-1">{member.name}</span>
                <span className="text-muted-foreground shrink-0">
                  {formatLastSeen(member.last_seen_at ?? null)}
                </span>
              </div>
            ))}
            {offline.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{offline.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
