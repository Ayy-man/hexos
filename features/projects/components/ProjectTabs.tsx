'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LayoutDashboard, CheckSquare, FileText, FolderOpen, Activity, Info, MessageSquare, PenTool } from 'lucide-react'
import { OverviewTab } from './tabs/OverviewTab'
import { DeliverablesTab } from './tabs/DeliverablesTab'
import { RequirementsTab } from './tabs/RequirementsTab'
import { FilesTab } from './tabs/FilesTab'
import { ActivityTab } from './tabs/ActivityTab'
import { ProjectInfoTab } from './tabs/ProjectInfoTab'
import { ChatTab } from './tabs/ChatTab'
import { MainWhiteboardTab } from './tabs/MainWhiteboardTab'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { OnboardingRequirement } from '@/lib/api/onboarding-requirements'
import type { UserRole } from '@/lib/auth/types'

interface ProjectTabsProps {
  project: ProjectWithRelations & {
    requirements?: OnboardingRequirement[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    files?: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    main_whiteboard?: any
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
}

export function ProjectTabs({ project, userRole, userId, availableDevs }: ProjectTabsProps) {
  const isAdmin = userRole === 'admin'
  const isDfy = userRole === 'dfy'
  const isDev = userRole === 'dev'

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList variant="line" className="w-full justify-start border-b">
        <TabsTrigger value="overview" className="gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="deliverables" className="gap-2">
          <CheckSquare className="h-4 w-4" />
          Deliverables
        </TabsTrigger>
        <TabsTrigger value="requirements" className="gap-2">
          <FileText className="h-4 w-4" />
          Requirements
        </TabsTrigger>
        <TabsTrigger value="files" className="gap-2">
          <FolderOpen className="h-4 w-4" />
          Files
        </TabsTrigger>
        <TabsTrigger value="whiteboard" className="gap-2">
          <PenTool className="h-4 w-4" />
          Whiteboard
        </TabsTrigger>
        <TabsTrigger value="activity" className="gap-2">
          <Activity className="h-4 w-4" />
          Activity
        </TabsTrigger>
        <TabsTrigger value="chat" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Chat
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="info" className="gap-2">
            <Info className="h-4 w-4" />
            Project Info
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="overview" className="mt-6" forceMount>
        <OverviewTab
          project={project}
          userRole={userRole}
          isAdmin={isAdmin}
          availableDevs={availableDevs}
        />
      </TabsContent>

      <TabsContent value="deliverables" className="mt-6" forceMount>
        <DeliverablesTab
          project={project}
          userRole={userRole}
          isAdmin={isAdmin}
          isDfy={isDfy}
        />
      </TabsContent>

      <TabsContent value="requirements" className="mt-6" forceMount>
        <RequirementsTab
          project={project}
          requirements={project.requirements || []}
          userRole={userRole}
          isAdmin={isAdmin}
        />
      </TabsContent>

      <TabsContent value="files" className="mt-6" forceMount>
        <FilesTab
          projectId={project.id}
          files={project.files || []}
          userRole={userRole}
          currentUserId={userId}
        />
      </TabsContent>

      <TabsContent value="whiteboard" className="mt-6">
        <MainWhiteboardTab
          projectId={project.id}
          projectName={project.project_name}
          initialContent={project.main_whiteboard}
        />
      </TabsContent>

      <TabsContent value="activity" className="mt-6" forceMount>
        <ActivityTab
          activity={project.activity || []}
        />
      </TabsContent>

      <TabsContent value="chat" className="mt-6" forceMount>
        <ChatTab
          projectId={project.id}
          currentUserId={userId}
          userRole={userRole}
        />
      </TabsContent>

      {isAdmin && (
        <TabsContent value="info" className="mt-6" forceMount>
          <ProjectInfoTab
            project={project}
            userRole={userRole}
          />
        </TabsContent>
      )}
    </Tabs>
  )
}
