'use client'

import dynamic from 'next/dynamic'
import type { UserRole } from '@/lib/auth/types'

const CommandPalette = dynamic(
  () => import('@/components/command-palette').then((m) => m.CommandPalette),
  { ssr: false }
)

export function LazyCommandPalette({ role }: { role: UserRole }) {
  return <CommandPalette role={role} />
}
