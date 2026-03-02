'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { getRoleColor } from '@/lib/constants/role-colors'
import type { UserRole } from '@/lib/auth/types'

interface RoleAvatarProps {
  role: UserRole
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'default' | 'lg'
  className?: string
  style?: React.CSSProperties
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function RoleAvatar({
  role,
  name,
  avatarUrl,
  size = 'default',
  className,
  style,
}: RoleAvatarProps) {
  const colors = getRoleColor(role)

  return (
    <Avatar
      size={size}
      className={cn('ring-2', colors.ring, className)}
      style={style}
    >
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={name} />
      )}
      <AvatarFallback className="text-xs">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
