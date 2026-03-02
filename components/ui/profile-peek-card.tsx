'use client'

import { MapPin, MessageCircle, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { RoleAvatar } from '@/components/ui/role-avatar'
import { Button } from '@/components/ui/button'
import { getRoleColor } from '@/lib/constants/role-colors'
import type { UserRole } from '@/lib/auth/types'

interface ProfilePeekCardProps {
  userId: string
  name: string
  role: UserRole
  avatarUrl?: string | null
  email?: string | null
  location?: string | null
  isOnline?: boolean
  onMessage?: () => void
}

export function ProfilePeekCard({
  userId,
  name,
  role,
  avatarUrl,
  email,
  location,
  isOnline,
  onMessage,
}: ProfilePeekCardProps) {
  const router = useRouter()
  const colors = getRoleColor(role)

  return (
    <div className="bg-card w-72 rounded-lg border p-4 shadow-lg">
      {/* Avatar + name header */}
      <div className="flex items-start gap-3">
        <RoleAvatar
          role={role}
          name={name}
          avatarUrl={avatarUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{name}</h3>
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
          >
            {colors.label}
          </span>
        </div>
      </div>

      {/* Status + location */}
      <div className="mt-3 space-y-1.5">
        {isOnline !== undefined && (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex size-2 rounded-full ${
                isOnline ? 'bg-success' : 'bg-muted-foreground/50'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        )}

        {location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            <span>{location}</span>
          </div>
        )}

        {email && (
          <div className="text-xs text-muted-foreground truncate">
            {email}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="-mx-4 mt-3 border-t" />

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        {onMessage && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onMessage}
          >
            <MessageCircle className="size-3.5" data-icon="inline-start" />
            Message
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => router.push(`/settings/profile`)}
        >
          <User className="size-3.5" data-icon="inline-start" />
          Profile
        </Button>
      </div>
    </div>
  )
}
