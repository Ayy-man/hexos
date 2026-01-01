'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LayoutDashboard, CheckSquare, FileText, FolderOpen, Activity, Info } from 'lucide-react'
import { OverviewTab } from './tabs/OverviewTab'
import { DeliverablesTab } from './tabs/DeliverablesTab'
import { RequirementsTab } from './tabs/RequirementsTab'
import { FilesTab } from './tabs/FilesTab'
import { ActivityTab } from './tabs/ActivityTab'
import { ProjectInfoTab } from './tabs/ProjectInfoTab'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { ProjectRequirement } from '@/lib/api/project-requirements'
import type { UserRole } from '@/lib/auth/types'

interface ProjectTabsProps {
  project: ProjectWithRelations & {
    requirements?: ProjectRequirement[]
    files?: Array<{
      id: string
      file_name: string
      file_path: string
      file_size: number | null
      file_type: string | null
      uploaded_by: string | null
      uploaded_at: string
    }>
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
        <TabsTrigger value="activity" className="gap-2">
          <Activity className="h-4 w-4" />
          Activity
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="info" className="gap-2">
            <Info className="h-4 w-4" />
            Project Info
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <OverviewTab
          project={project}
          userRole={userRole}
          isAdmin={isAdmin}
          availableDevs={availableDevs}
        />
      </TabsContent>

      <TabsContent value="deliverables" className="mt-6">
        <DeliverablesTab
          project={project}
          userRole={userRole}
          isAdmin={isAdmin}
          isDfy={isDfy}
        />
      </TabsContent>

      <TabsContent value="requirements" className="mt-6">
        <RequirementsTab
          project={project}
          requirements={project.requirements || []}
          userRole={userRole}
          isAdmin={isAdmin}
        />
      </TabsContent>

      <TabsContent value="files" className="mt-6">
        <FilesTab
          projectId={project.id}
          files={project.files || []}
          userRole={userRole}
        />
      </TabsContent>

      <TabsContent value="activity" className="mt-6">
        <ActivityTab
          activity={project.activity || []}
        />
      </TabsContent>

      {isAdmin && (
        <TabsContent value="info" className="mt-6">
          <ProjectInfoTab
            project={project}
            userRole={userRole}
          />
        </TabsContent>
      )}
    </Tabs>
  )
}
