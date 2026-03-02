import type { UserRole } from '@/lib/auth/types'

export const ROLE_COLORS: Record<
  UserRole,
  {
    ring: string
    bg: string
    text: string
    dot: string
    label: string
  }
> = {
  admin: {
    ring: 'ring-teal-400',
    bg: 'bg-teal-400/15',
    text: 'text-teal-400',
    dot: 'bg-teal-400',
    label: 'Admin',
  },
  internal: {
    ring: 'ring-slate-400',
    bg: 'bg-slate-400/15',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
    label: 'Internal',
  },
  dev: {
    ring: 'ring-sky-400',
    bg: 'bg-sky-400/15',
    text: 'text-sky-400',
    dot: 'bg-sky-400',
    label: 'Developer',
  },
  dfy: {
    ring: 'ring-amber-400',
    bg: 'bg-amber-400/15',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    label: 'DFY Partner',
  },
  client: {
    ring: 'ring-stone-400',
    bg: 'bg-stone-400/15',
    text: 'text-stone-400',
    dot: 'bg-stone-400',
    label: 'Client',
  },
} as const

export function getRoleColor(role: UserRole) {
  return ROLE_COLORS[role]
}

export function getRoleRingClass(role: UserRole) {
  return ROLE_COLORS[role].ring
}
