import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNavigation } from '@/lib/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { DynamicBreadcrumb } from '@/components/dynamic-breadcrumb'
import { CommandPalette } from '@/components/command-palette'
import { NotificationPopover } from '@/components/notifications'
import { ThemeToggle } from '@/components/theme-toggle'
import { Toaster } from 'sonner'
import { PresenceProvider } from '@/components/presence-provider'
import { getMyNotifications, getUnreadCount } from '@/lib/api/notifications'
import { getInquiryStatusCounts } from '@/lib/api/inquiries'
import { getProjectStats } from '@/lib/api/projects'
import { getUnreadConversationsSummary } from '@/lib/api/conversations'
import { getSuggestionCounts } from '@/lib/api/suggestions'
import { OnbordaProvider, Onborda } from 'onborda'
import { OnboardingWrapper } from '@/features/onboarding/components/OnboardingWrapper'
import { onboardingTours } from '@/features/onboarding/lib/tours'
import { TourCard } from '@/features/onboarding/components/TourCard'
import { CheckinPromptProvider } from '@/features/dev-logging/components'
import { getDevLoggingStatus } from '@/lib/api/dev-logging'
import type { Profile } from '@/lib/auth/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?error=' + encodeURIComponent(authError?.message || 'Not authenticated'))
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login?error=' + encodeURIComponent(profileError?.message || 'Profile not found'))
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

  return (
    <OnbordaProvider>
      <Onborda
        steps={onboardingTours}
        showOnborda={true}
        shadowRgb="0, 0, 0"
        shadowOpacity="0.5"
        cardComponent={TourCard}
      >
        <SidebarProvider defaultOpen={defaultOpen}>
          <OnboardingWrapper
            userId={user.id}
            role={(profile as Profile).role}
            onboardingStatus={profile.onboarding_status}
          />
          <AppSidebar
            profile={profile as Profile}
            navigation={navigation}
            inquiryCounts={inquiryCounts}
            projectStats={projectStats ?? undefined}
            conversationSummary={conversationSummary}
            suggestionCounts={suggestionCounts ?? undefined}
          />
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger id="sidebar-trigger" className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <DynamicBreadcrumb />
              <div className="ml-auto flex items-center gap-2">
                <CommandPalette role={(profile as Profile).role} />
                <NotificationPopover
                  userId={user.id}
                  initialNotifications={notifications}
                  initialUnreadCount={unreadCount}
                />
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 p-4 md:p-6">
              <PresenceProvider profile={profile as Profile}>
                <CheckinPromptProvider
                  initialStatus={devLoggingStatus}
                  isDev={isDev}
                >
                  {children}
                </CheckinPromptProvider>
              </PresenceProvider>
            </main>
          </SidebarInset>
          <Toaster richColors position="bottom-right" />
        </SidebarProvider>
      </Onborda>
    </OnbordaProvider>
  )
}
