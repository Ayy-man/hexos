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
      { title: 'Metrics', url: '/dashboard/admin/metrics', icon: 'BarChart3' },
      { title: 'Time Reports', url: '/admin/time-reports', icon: 'Clock' },
      { title: 'Blockers', url: '/admin/blockers', icon: 'AlertTriangle' },
      { title: 'Developers', url: '/admin/devs', icon: 'Users' },
      { title: 'Opportunities', url: '/admin/opportunities', icon: 'Briefcase' },
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
      { title: 'Metrics', url: '/dashboard/admin/metrics', icon: 'BarChart3' },
      { title: 'Time Reports', url: '/admin/time-reports', icon: 'Clock' },
      { title: 'Blockers', url: '/admin/blockers', icon: 'AlertTriangle' },
      { title: 'Developers', url: '/admin/devs', icon: 'Users' },
      { title: 'Opportunities', url: '/admin/opportunities', icon: 'Briefcase' },
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
    ],
  },
  {
    label: 'Settings',
    items: [
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
