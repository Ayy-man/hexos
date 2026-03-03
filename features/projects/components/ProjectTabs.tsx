'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LayoutDashboard, CheckSquare, TrendingUp, FileText, FolderOpen, Activity, Info, MessageSquare, DollarSign, Flag, ClipboardCheck, MoreHorizontal, TestTube, Video, Clock, Lightbulb } from 'lucide-react'
import { OverviewTab } from './tabs/OverviewTab'
import { DeliverablesTab } from './tabs/DeliverablesTab'
import { HillChartTab } from './hill-chart/HillChartTab'
import { RequirementsTab } from './tabs/RequirementsTab'
import { TestingTab } from './tabs/TestingTab'
import { OnboardingTab } from './tabs/OnboardingTab'
import { FilesTabContainer } from './files-tab'
import { ChatTabContainer } from './chat-tab'
import { ActivityTab } from './tabs/ActivityTab'
import { ProjectInfoTab } from './tabs/ProjectInfoTab'
import { FinancialsTab } from './tabs/FinancialsTab'
import { ScopeTab } from './tabs/ScopeTab'
import { MeetingsTab } from './tabs/MeetingsTab'
import { CheckInsTab } from './retainer/CheckInsTab'
import { RetainerTasksTab } from './retainer/RetainerTasksTab'
import { ImprovementsSection } from './improvements/ImprovementsSection'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { OnboardingRequirement } from '@/lib/api/onboarding-requirements'
import type { UserRole } from '@/lib/auth/types'
import type { DelaySummary } from '@/lib/api/project-delays'
import type { PreloadedProjectData } from '@/hooks/use-project-preload'
import type { TestingInfo } from '@/lib/api/testing'
import type { OnboardingCategory } from '@/lib/api/onboarding-categories'
import type { OnboardingQuestion } from '@/lib/api/onboarding-questions'
import type { OnboardingAnswer } from '@/lib/api/onboarding-answers'
import { isOnboardingPhase, isRetainerPhase, isPostDeliveryPhase } from '@/lib/utils/projectPhases'
import { cn } from '@/lib/utils'

interface ProjectTabsProps {
  project: ProjectWithRelations & {
    requirements?: OnboardingRequirement[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    files?: any[]
    activity?: Array<{
      id: string
      action: string
      details: Record<string, unknown> | null
      created_at: string
      user?: { name: string } | null
    }>
  }
  userRole: UserRole
  userId: string
  availableDevs: Array<{ id: string; name: string; email: string }>
  pendingScopeChanges?: number
  delaySummary?: DelaySummary
  testingInfo: Record<string, TestingInfo>
  isFileMode?: boolean
  onFileModeChange?: (isFileMode: boolean) => void
  isChatMode?: boolean
  onChatModeChange?: (isChatMode: boolean) => void
  preloadedData?: PreloadedProjectData | null
  categories?: OnboardingCategory[]
  questions?: OnboardingQuestion[]
  answers?: OnboardingAnswer[]
}

export function ProjectTabs({
  project,
  userRole,
  userId,
  availableDevs,
  pendingScopeChanges = 0,
  delaySummary,
  testingInfo,
  isFileMode = false,
  onFileModeChange,
  isChatMode = false,
  onChatModeChange,
  preloadedData,
  categories,
  questions,
  answers,
}: ProjectTabsProps) {
  const isAdmin = userRole === 'admin'
  const isDfy = userRole === 'dfy'

  // Phase-based tab visibility
  const showOnboardingTab = isOnboardingPhase(project.status)
  const showRetainerTabs = isRetainerPhase(project.status)
  const showCompletedView = project.status === 'completed'
  const showTasksTab = showRetainerTabs || showCompletedView
  const showDevelopmentTabs = !showOnboardingTab && !showRetainerTabs && !showCompletedView

  // Check if any deliverable is ready for testing (90%+)
  const showTestingTab = showDevelopmentTabs && (project.deliverables || []).some((d: any) => (d.hill_position ?? 0) >= 90)

  // Default tab depends on phase
  const defaultTab = showOnboardingTab ? 'onboarding'
    : showRetainerTabs ? 'check-ins'
    : 'overview'

  // Track active tab for "More" dropdown highlight
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Enter file mode when Files tab is selected
  useEffect(() => {
    if (activeTab === 'files' && !isFileMode) {
      onFileModeChange?.(true)
    }
  }, [activeTab, isFileMode, onFileModeChange])

  // Enter chat mode when Chat tab is selected
  useEffect(() => {
    if (activeTab === 'chat' && !isChatMode) {
      onChatModeChange?.(true)
    }
  }, [activeTab, isChatMode, onChatModeChange])

  // Handle tab change - exit expanded modes when switching away
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab !== 'files' && isFileMode) {
      onFileModeChange?.(false)
    }
    if (tab !== 'chat' && isChatMode) {
      onChatModeChange?.(false)
    }
  }

  // Tabs that go in the "More" dropdown
  const moreTabIds = ['deliverables', 'requirements', 'activity', 'scope', 'improvements', 'financials', 'meetings', 'info']
  const isMoreTabActive = moreTabIds.includes(activeTab)

  // Get label for currently selected "More" tab
  const getMoreTabLabel = () => {
    switch (activeTab) {
      case 'deliverables': return 'Deliverables'
      case 'requirements': return 'Requirements'
      case 'activity': return 'Activity'
      case 'scope': return 'Scope'
      case 'improvements': return 'Improvements'
      case 'financials': return 'Financials'
      case 'meetings': return 'Meetings'
      case 'info': return 'Project Info'
      default: return 'More'
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList variant="line" className="w-full justify-start border-b">
        {/* Onboarding tab - shown during onboarding phases */}
        {showOnboardingTab && (
          <TabsTrigger value="onboarding" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Onboarding
          </TabsTrigger>
        )}
        {/* Retainer tabs - shown for retainer projects */}
        {showRetainerTabs && (
          <TabsTrigger value="check-ins" className="gap-2">
            <Clock className="h-4 w-4" />
            Check-ins
          </TabsTrigger>
        )}
        {/* Tasks tab - shown for retainer and completed projects */}
        {showTasksTab && (
          <TabsTrigger value="tasks" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
          </TabsTrigger>
        )}
        {/* Development tabs - shown for active development projects */}
        {!showRetainerTabs && (
          <>
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            {showDevelopmentTabs && (
              <TabsTrigger value="progress" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Progress
              </TabsTrigger>
            )}
            {/* Testing tab - shown when deliverables reach 90% */}
            {showTestingTab && (
              <TabsTrigger value="testing" className="gap-2">
                <TestTube className="h-4 w-4" />
                Testing
              </TabsTrigger>
            )}
          </>
        )}
        <TabsTrigger value="files" className="gap-2">
          <FolderOpen className="h-4 w-4" />
          Files
        </TabsTrigger>
        <TabsTrigger value="chat" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Chat
        </TabsTrigger>

        {/* More dropdown for less-used tabs */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "inline-flex items-center justify-center gap-2 whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors",
                "hover:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
                isMoreTabActive
                  ? "border-b-2 border-primary text-foreground -mb-px"
                  : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
              {isMoreTabActive ? getMoreTabLabel() : 'More'}
              {pendingScopeChanges > 0 && !isMoreTabActive && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-xs">
                  {pendingScopeChanges}
                </Badge>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {/* Deliverables - only shown during development */}
            {showDevelopmentTabs && (
              <DropdownMenuItem onClick={() => setActiveTab('deliverables')} className="gap-2">
                <CheckSquare className="h-4 w-4" />
                Deliverables
              </DropdownMenuItem>
            )}
            {/* Requirements - only shown during development */}
            {showDevelopmentTabs && (
              <DropdownMenuItem onClick={() => setActiveTab('requirements')} className="gap-2">
                <FileText className="h-4 w-4" />
                Requirements
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setActiveTab('activity')} className="gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </DropdownMenuItem>
            {/* Scope - only shown during development */}
            {showDevelopmentTabs && (
              <DropdownMenuItem onClick={() => setActiveTab('scope')} className="gap-2">
                <Flag className="h-4 w-4" />
                Scope
                {pendingScopeChanges > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    {pendingScopeChanges}
                  </Badge>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setActiveTab('improvements')} className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Improvements
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => setActiveTab('financials')} className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financials
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('meetings')} className="gap-2">
                  <Video className="h-4 w-4" />
                  Meetings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('info')} className="gap-2">
                  <Info className="h-4 w-4" />
                  Project Info
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TabsList>

      {/* Onboarding tab content - shown during onboarding phases */}
      {showOnboardingTab && (
        <TabsContent value="onboarding" className="mt-6" forceMount>
          <OnboardingTab
            project={project}
            requirements={project.requirements || []}
            userRole={userRole}
            isAdmin={isAdmin}
            isDfy={isDfy}
          />
        </TabsContent>
      )}

      {/* Check-ins tab - retainer projects only */}
      {showRetainerTabs && (
        <TabsContent value="check-ins" className="mt-6">
          <CheckInsTab project={project} userRole={userRole} />
        </TabsContent>
      )}

      {/* Tasks tab - retainer and completed projects */}
      {showTasksTab && (
        <TabsContent value="tasks" className="mt-6">
          <RetainerTasksTab
            project={project}
            userRole={userRole}
            userId={userId}
            availableDevs={availableDevs}
          />
        </TabsContent>
      )}

      <TabsContent value="overview" className="mt-6" forceMount>
        <OverviewTab
          project={project}
          userRole={userRole}
          isAdmin={isAdmin}
          availableDevs={availableDevs}
          initialDelaySummary={delaySummary}
          onNavigateToActivity={() => handleTabChange('activity')}
        />
      </TabsContent>

      {/* Deliverables tab - hidden during onboarding */}
      {!showOnboardingTab && (
        <TabsContent value="deliverables" className="mt-6" forceMount>
          <DeliverablesTab
            project={project}
            userRole={userRole}
            isAdmin={isAdmin}
            isDfy={isDfy}
          />
        </TabsContent>
      )}

      <TabsContent value="progress" className="mt-6" forceMount>
        <HillChartTab
          project={project}
          userRole={userRole}
          isAdmin={isAdmin}
          testingInfo={testingInfo}
        />
      </TabsContent>

      {/* Testing tab - shown when deliverables reach 90% */}
      {showTestingTab && (
        <TabsContent value="testing" className="mt-6" forceMount>
          <TestingTab
            project={project}
            userRole={userRole}
            userId={userId}
          />
        </TabsContent>
      )}

      {/* Requirements tab - hidden during onboarding */}
      {!showOnboardingTab && (
        <TabsContent value="requirements" className="mt-6" forceMount>
          <RequirementsTab
            project={project}
            requirements={project.requirements || []}
            userRole={userRole}
            isAdmin={isAdmin}
          />
        </TabsContent>
      )}

      <TabsContent value="files" className={cn("mt-6", isFileMode && "mt-0 h-[calc(100vh-120px)]")} forceMount>
        <FilesTabContainer
          projectId={project.id}
          userRole={userRole}
          isExpanded={isFileMode}
          preloadedData={preloadedData}
        />
      </TabsContent>

      <TabsContent value="activity" className="mt-6" forceMount>
        <ActivityTab
          activity={project.activity || []}
          projectId={project.id}
          requirements={project.requirements}
        />
      </TabsContent>

      <TabsContent value="chat" className={cn("mt-6", isChatMode && "mt-0 h-[calc(100vh-120px)]")} forceMount>
        <ChatTabContainer
          projectId={project.id}
          currentUserId={userId}
          userRole={userRole}
          isExpanded={isChatMode}
          preloadedData={preloadedData?.conversations}
        />
      </TabsContent>

      <TabsContent value="scope" className="mt-6">
        <ScopeTab
          project={project}
          userRole={userRole}
          isAdmin={isAdmin}
          isDfy={isDfy}
        />
      </TabsContent>

      <TabsContent value="improvements" className="mt-6">
        <ImprovementsSection project={project} userRole={userRole} />
      </TabsContent>

      {isAdmin && (
        <>
          <TabsContent value="financials" className="mt-6">
            <FinancialsTab project={project} />
          </TabsContent>
          <TabsContent value="meetings" className="mt-6">
            <MeetingsTab projectId={project.id} />
          </TabsContent>
          <TabsContent value="info" className="mt-6">
            <ProjectInfoTab
              project={project}
              userRole={userRole}
            />
          </TabsContent>
        </>
      )}
    </Tabs>
  )
}
