'use client'

import { LogOut, User } from 'lucide-react'
import { RoleAvatar } from '@/components/ui/role-avatar'
import type { UserRole } from '@/lib/auth/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/lib/auth/actions'

interface MobileAvatarMenuProps {
  name: string
  email: string
  role: string
  avatarUrl?: string | null
}

export function MobileAvatarMenu({ name, email, role, avatarUrl }: MobileAvatarMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex-shrink-0">
          <RoleAvatar
            role={role as UserRole}
            name={name}
            avatarUrl={avatarUrl}
            className="rounded-lg"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <RoleAvatar
              role={role as UserRole}
              name={name}
              avatarUrl={avatarUrl}
              className="rounded-lg"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs text-muted-foreground">{email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/settings/profile">
            <User className="mr-2 size-4" />
            Profile
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center">
              <LogOut className="mr-2 size-4" />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
