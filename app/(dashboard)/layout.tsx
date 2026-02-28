import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthUser, getAuthProfile } from '@/lib/auth/cached'
import { getNavigation } from '@/lib/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { DynamicBreadcrumb } from '@/components/dynamic-breadcrumb'
import { LazyCommandPalette } from '@/components/lazy-command-palette'
import { NotificationPopover } from '@/components/notifications'
import { Toaster } from 'sonner'
import { PresenceProvider } from '@/components/presence-provider'
import { getMyNotifications, getUnreadCount } from '@/lib/api/notifications'
import { getInquiryStatusCounts } from '@/lib/api/inquiries'
import { getProjectStats } from '@/lib/api/projects'
import { getUnreadConversationsSummary } from '@/lib/api/conversations'
import { getSuggestionCounts } from '@/lib/api/suggestions'
import { OnboardingShell } from '@/components/onboarding-shell'
import { CheckinPromptProvider } from '@/features/dev-logging/components'
import { getDevLoggingStatus } from '@/lib/api/dev-logging'
import { MobileShell } from '@/components/mobile/mobile-shell'
import type { Profile } from '@/lib/auth/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, error: authError } = await getAuthUser()

  if (authError || !user) {
    redirect('/login?error=' + encodeURIComponent(authError?.message || 'Not authenticated'))
  }

  const profile = await getAuthProfile()

  if (!profile) {
    redirect('/login?error=' + encodeURIComponent('Profile not found'))
  }

  const navigation = getNavigation((profile as Profile).role)

  // Fetch notifications, active timer, and dev logging status for the header
  const isAdminOrInternal = ['admin', 'internal'].includes((profile as Profile).role)
  const isDev = (profile as Profile).role === 'dev'

  const [notifications, unreadCount, devLoggingStatus, inquiryStatusCounts, projectStats, conversationSummary, suggestionCounts] = await Promise.all([
    getMyNotifications(20).catch(() => []),
    getUnreadCount().catch(() => 0),
    isDev ? getDevLoggingStatus().catch(() => null) : Promise.resolve(null),
    isAdminOrInternal ? getInquiryStatusCounts().catch(() => null) : Promise.resolve(null),
    isAdminOrInternal ? getProjectStats().catch(() => null) : Promise.resolve(null),
    getUnreadConversationsSummary().catch(() => ({ total_unread: 0, conversations: [] })),
    isAdminOrInternal ? getSuggestionCounts().catch(() => null) : Promise.resolve(null),
  ])

  const inquiryCounts = inquiryStatusCounts ? {
    unopened: inquiryStatusCounts.unopened,
    working: inquiryStatusCounts.working + inquiryStatusCounts.in_queue + inquiryStatusCounts.admin_reviewed,
    ready: inquiryStatusCounts.ready + inquiryStatusCounts.final_review,
    total: Object.values(inquiryStatusCounts).reduce((a, b) => a + b, 0) - inquiryStatusCounts.closed - inquiryStatusCounts.lost,
  } : undefined

  // Get sidebar state from cookie
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'

  const pageContent = (
    <PresenceProvider profile={profile as Profile}>
      <CheckinPromptProvider
        initialStatus={devLoggingStatus}
        isDev={isDev}
      >
        {children}
      </CheckinPromptProvider>
    </PresenceProvider>
  )

  return (
    <OnboardingShell
      userId={user.id}
      role={(profile as Profile).role}
      onboardingStatus={(profile as any).onboarding_status}
    >
      <SidebarProvider defaultOpen={defaultOpen}>
        <MobileShell
          role={(profile as Profile).role}
          profileName={(profile as Profile).name}
          profileEmail={(profile as Profile).email}
          notificationSlot={
            <NotificationPopover
              userId={user.id}
              initialNotifications={notifications}
              initialUnreadCount={unreadCount}
            />
          }
          inquiryCount={inquiryCounts?.total}
          conversationCount={conversationSummary.total_unread}
          desktopLayout={
            <>
              <AppSidebar
                profile={profile as Profile}
                navigation={navigation}
                inquiryCounts={inquiryCounts}
                projectStats={projectStats ?? undefined}
                conversationSummary={conversationSummary}
                suggestionCounts={suggestionCounts ?? undefined}
              />
              <SidebarInset>
                <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-hairline bg-bg-surface px-4">
                  <SidebarTrigger id="sidebar-trigger" className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <DynamicBreadcrumb />
                  <div className="ml-auto flex items-center gap-2">
                    <LazyCommandPalette role={(profile as Profile).role} />
                    <div id="desktop-notification-target" />
                  </div>
                </header>
                <main className="flex-1 bg-bg-void p-4 md:p-8">
                  {pageContent}
                </main>
              </SidebarInset>
            </>
          }
        >
          {pageContent}
        </MobileShell>

        <Toaster richColors position="bottom-right" />
      </SidebarProvider>
    </OnboardingShell>
  )
}
