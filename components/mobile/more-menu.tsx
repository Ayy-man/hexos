'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  ChevronRight,
  Code,
  DollarSign,
  FileText,
  Layers,
  Lightbulb,
  Send,
  Settings,
  Shield,
  Users,
  Video,
  Wallet,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface MobileMoreMenuProps {
  role: 'admin' | 'internal' | 'dev' | 'dfy' | 'client'
}

interface GridItem {
  label: string
  icon: LucideIcon
  color: string
  route: string
}

interface AdminListItem {
  label: string
  icon: LucideIcon
  route: string
}

const adminInternalGrid: GridItem[] = [
  { label: 'Pulse', icon: Zap, color: 'bg-blue-500/15 text-blue-500', route: '/pulse' },
  { label: 'Blueprints', icon: Layers, color: 'bg-purple-500/15 text-purple-500', route: '/blueprints' },
  { label: 'Case Studies', icon: BookOpen, color: 'bg-green-500/15 text-green-500', route: '/case-studies' },
  { label: 'Meetings', icon: Video, color: 'bg-orange-500/15 text-orange-500', route: '/meetings' },
  { label: 'Suggestions', icon: Lightbulb, color: 'bg-yellow-500/15 text-yellow-500', route: '/suggestions' },
  { label: 'Finances', icon: DollarSign, color: 'bg-emerald-500/15 text-emerald-500', route: '/finances' },
  { label: 'Metrics', icon: BarChart3, color: 'bg-pink-500/15 text-pink-500', route: '/dashboard/admin/metrics' },
  { label: 'Settings', icon: Settings, color: 'bg-zinc-500/15 text-zinc-400', route: '/settings' },
]

const devGrid: GridItem[] = [
  { label: 'Opportunities', icon: Briefcase, color: 'bg-blue-500/15 text-blue-500', route: '/opportunities' },
  { label: 'Payouts', icon: Wallet, color: 'bg-emerald-500/15 text-emerald-500', route: '/dashboard/dev/payouts' },
  { label: 'My Suggestions', icon: Lightbulb, color: 'bg-yellow-500/15 text-yellow-500', route: '/my-suggestions' },
  { label: 'Team', icon: Users, color: 'bg-purple-500/15 text-purple-500', route: '/dashboard/dev/settings/team' },
  { label: 'Dev Profile', icon: Code, color: 'bg-cyan-500/15 text-cyan-500', route: '/settings/developer' },
  { label: 'Settings', icon: Settings, color: 'bg-zinc-500/15 text-zinc-400', route: '/settings' },
]

const dfyGrid: GridItem[] = [
  { label: 'Blueprints', icon: Layers, color: 'bg-purple-500/15 text-purple-500', route: '/blueprints' },
  { label: 'Case Studies', icon: BookOpen, color: 'bg-green-500/15 text-green-500', route: '/case-studies' },
  { label: 'Submit Inquiry', icon: Send, color: 'bg-blue-500/15 text-blue-500', route: '/inquiries/new' },
  { label: 'My Suggestions', icon: Lightbulb, color: 'bg-yellow-500/15 text-yellow-500', route: '/my-suggestions' },
  { label: 'Team', icon: Users, color: 'bg-purple-500/15 text-purple-500', route: '/dashboard/dfy/settings/team' },
  { label: 'Settings', icon: Settings, color: 'bg-zinc-500/15 text-zinc-400', route: '/settings' },
]

const clientGrid: GridItem[] = [
  { label: 'Settings', icon: Settings, color: 'bg-zinc-500/15 text-zinc-400', route: '/settings' },
]

const adminListItems: AdminListItem[] = [
  { label: 'Blockers', icon: AlertTriangle, route: '/admin/blockers' },
  { label: 'Developers', icon: Users, route: '/admin/devs' },
  { label: 'Hexona Team', icon: Shield, route: '/admin/team' },
  { label: 'DFY Partners', icon: Building2, route: '/admin/partners' },
  { label: 'Applications', icon: FileText, route: '/admin/applications' },
  { label: 'Opportunities', icon: Briefcase, route: '/admin/opportunities' },
]

function getGridItems(role: MobileMoreMenuProps['role']): GridItem[] {
  switch (role) {
    case 'admin':
    case 'internal':
      return adminInternalGrid
    case 'dev':
      return devGrid
    case 'dfy':
      return dfyGrid
    case 'client':
      return clientGrid
  }
}

export function MobileMoreMenu({ role }: MobileMoreMenuProps) {
  const gridItems = getGridItems(role)
  const showAdminList = role === 'admin' || role === 'internal'

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">More</h1>

      <div className="grid grid-cols-3 gap-3">
        {gridItems.map((item) => (
          <Link
            key={item.route}
            href={item.route}
            className="flex flex-col items-center justify-center gap-2 rounded-xl bg-bg-surface p-4 active:bg-bg-surface/80"
          >
            <div className={`rounded-xl p-2.5 ${item.color}`}>
              <item.icon size={28} />
            </div>
            <span className="text-xs font-medium text-center">{item.label}</span>
          </Link>
        ))}
      </div>

      {showAdminList && (
        <>
          <div className="mt-6 mb-4 border-t" />
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Admin
          </h2>
          <div>
            {adminListItems.map((item) => (
              <Link
                key={item.route}
                href={item.route}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm active:bg-bg-surface"
              >
                <item.icon className="size-5 text-muted-foreground" />
                <span>{item.label}</span>
                <ChevronRight className="ml-auto size-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
