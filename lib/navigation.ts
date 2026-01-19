import type { UserRole } from '@/lib/auth/types'

export interface NavItem {
  title: string
  url: string
  icon: string  // Icon name as string
  badge?: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

// Navigation config per role
const adminNav: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', url: '/dashboard/admin', icon: 'LayoutDashboard' },
      { title: 'Pulse', url: '/pulse', icon: 'Zap' },
    ],
  },
  {
    label: 'Management',
    items: [
      { title: 'Projects', url: '/projects', icon: 'FolderKanban' },
      { title: 'Conversations', url: '/conversations', icon: 'MessageSquare' },
      { title: 'Inquiries', url: '/inquiries', icon: 'FileText' },
      { title: 'Blueprints', url: '/blueprints', icon: 'Layers' },
      { title: 'Case Studies', url: '/case-studies', icon: 'BookOpen' },
      { title: 'Suggestions', url: '/suggestions', icon: 'Lightbulb' },
      { title: 'Team', url: '/settings/team', icon: 'Users' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { title: 'Blockers', url: '/admin/blockers', icon: 'AlertTriangle' },
      { title: 'Metrics', url: '/dashboard/admin/metrics', icon: 'BarChart3' },
      { title: 'Finances', url: '/finances', icon: 'DollarSign' },
      { title: 'Time Reports', url: '/admin/time-reports', icon: 'Clock' },
      { title: 'Developers', url: '/admin/devs', icon: 'Users' },
      { title: 'Opportunities', url: '/admin/opportunities', icon: 'Briefcase' },
    ],
  },
  {
    label: 'Teams',
    items: [
      { title: 'Hexona Team', url: '/admin/team', icon: 'Shield' },
      { title: 'DFY Partners', url: '/admin/partners', icon: 'Building2' },
      { title: 'Applications', url: '/admin/applications', icon: 'FileText' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { title: 'Settings', url: '/settings', icon: 'Settings' },
    ],
  },
]

const internalNav: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', url: '/dashboard/admin', icon: 'LayoutDashboard' },
      { title: 'Pulse', url: '/pulse', icon: 'Zap' },
    ],
  },
  {
    label: 'Management',
    items: [
      { title: 'Projects', url: '/projects', icon: 'FolderKanban' },
      { title: 'Conversations', url: '/conversations', icon: 'MessageSquare' },
      { title: 'Inquiries', url: '/inquiries', icon: 'FileText' },
      { title: 'Blueprints', url: '/blueprints', icon: 'Layers' },
      { title: 'Case Studies', url: '/case-studies', icon: 'BookOpen' },
      { title: 'Suggestions', url: '/suggestions', icon: 'Lightbulb' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { title: 'Blockers', url: '/admin/blockers', icon: 'AlertTriangle' },
      { title: 'Metrics', url: '/dashboard/admin/metrics', icon: 'BarChart3' },
      { title: 'Finances', url: '/finances', icon: 'DollarSign' },
      { title: 'Time Reports', url: '/admin/time-reports', icon: 'Clock' },
      { title: 'Developers', url: '/admin/devs', icon: 'Users' },
      { title: 'Opportunities', url: '/admin/opportunities', icon: 'Briefcase' },
    ],
  },
  {
    label: 'Teams',
    items: [
      { title: 'DFY Partners', url: '/admin/partners', icon: 'Building2' },
      { title: 'Applications', url: '/admin/applications', icon: 'FileText' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { title: 'Settings', url: '/settings', icon: 'Settings' },
    ],
  },
]

const devNav: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', url: '/dashboard/dev', icon: 'LayoutDashboard' },
    ],
  },
  {
    label: 'Work',
    items: [
      { title: 'My Projects', url: '/projects', icon: 'FolderKanban' },
      { title: 'Opportunities', url: '/opportunities', icon: 'Briefcase' },
      { title: 'Conversations', url: '/conversations', icon: 'MessageSquare' },
      { title: 'Payouts', url: '/dashboard/dev/payouts', icon: 'Wallet' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { title: 'Team', url: '/dashboard/dev/settings/team', icon: 'Users' },
      { title: 'Developer Profile', url: '/settings/developer', icon: 'Code' },
      { title: 'Settings', url: '/settings', icon: 'Settings' },
    ],
  },
]

const dfyNav: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', url: '/dashboard/dfy', icon: 'LayoutDashboard' },
    ],
  },
  {
    label: 'Business',
    items: [
      { title: 'Blueprints', url: '/blueprints', icon: 'Layers' },
      { title: 'Case Studies', url: '/case-studies', icon: 'BookOpen' },
      { title: 'My Deals', url: '/projects', icon: 'Briefcase' },
      { title: 'Conversations', url: '/conversations', icon: 'MessageSquare' },
      { title: 'Submit Inquiry', url: '/inquiries/new', icon: 'Send' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { title: 'Team', url: '/dashboard/dfy/settings/team', icon: 'Users' },
      { title: 'Settings', url: '/settings', icon: 'Settings' },
    ],
  },
]

const clientNav: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'My Project', url: '/dashboard/client', icon: 'FolderKanban' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { title: 'Settings', url: '/settings', icon: 'Settings' },
    ],
  },
]

export function getNavigation(role: UserRole): NavGroup[] {
  switch (role) {
    case 'admin':
      return adminNav
    case 'internal':
      return internalNav
    case 'dev':
      return devNav
    case 'dfy':
      return dfyNav
    case 'client':
      return clientNav
    default:
      return clientNav
  }
}
