'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

// Map paths to page titles
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/admin': 'Admin Dashboard',
  '/dashboard/dev': 'Dev Dashboard',
  '/dashboard/dfy': 'DFY Dashboard',
  '/dashboard/client': 'My Project',
  '/projects': 'Projects',
  '/projects/new': 'New Project',
  '/inquiries': 'Inquiries',
  '/inquiries/new': 'New Inquiry',
  '/blueprints': 'Blueprints',
  '/blueprints/new': 'New Blueprint',
  '/case-studies': 'Case Studies',
  '/case-studies/new': 'New Case Study',
  '/conversations': 'Conversations',
  '/suggestions': 'Suggestions',
  '/settings': 'Settings',
  '/settings/team': 'Team',
}

// Parent paths for nested routes
const PARENT_PATHS: Record<string, { path: string; title: string }> = {
  '/projects/': { path: '/projects', title: 'Projects' },
  '/inquiries/': { path: '/inquiries', title: 'Inquiries' },
  '/blueprints/': { path: '/blueprints', title: 'Blueprints' },
  '/case-studies/': { path: '/case-studies', title: 'Case Studies' },
  '/settings/': { path: '/settings', title: 'Settings' },
}

function getPageTitle(pathname: string): string {
  // Exact match
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname]
  }

  // Dynamic routes - extract detail page info
  // /projects/[id], /inquiries/[id], etc.
  const segments = pathname.split('/')
  if (segments.length >= 3) {
    const section = segments[1]
    const id = segments[2]

    // Handle initiate sub-routes
    if (segments[3] === 'initiate') {
      return 'Initiate Project'
    }

    // For detail pages, return the section name + "Details"
    if (id && id !== 'new') {
      const sectionTitles: Record<string, string> = {
        'projects': 'Project Details',
        'inquiries': 'Inquiry Details',
        'blueprints': 'Blueprint Details',
        'case-studies': 'Case Study Details',
      }
      return sectionTitles[section] || 'Details'
    }
  }

  return 'hexOS'
}

function getParentPath(pathname: string): { path: string; title: string } | null {
  for (const [prefix, parent] of Object.entries(PARENT_PATHS)) {
    if (pathname.startsWith(prefix) && pathname !== parent.path) {
      return parent
    }
  }
  return null
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)
  const parent = getParentPath(pathname)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              hexOS
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {parent && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={parent.path} className="text-muted-foreground hover:text-foreground">
                  {parent.title}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}

        {pageTitle !== 'hexOS' && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
