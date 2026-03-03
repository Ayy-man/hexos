'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProjectHeader } from './ProjectHeader'
import { ProjectProgressBar } from './ProjectProgressBar'
import { ProjectStatusControl } from './ProjectStatusControl'
import { ProjectTabs } from './ProjectTabs'
import { CollapsedHeader } from './files-tab/CollapsedHeader'
import { HexLoaderCentered } from '@/components/ui/hex-loader'
import { useProjectPreload } from '@/hooks/use-project-preload'
import { useSidebar } from '@/components/ui/sidebar'
import type { ProjectWithRelations, ProjectStatus } from '@/lib/api/projects'
import type { OnboardingRequirement } from '@/lib/api/onboarding-requirements'
import type { UserRole } from '@/lib/auth/types'
import type { DelaySummary } from '@/lib/api/project-delays'
import type { TestingInfo } from '@/lib/api/testing'
import type { OnboardingCategory } from '@/lib/api/onboarding-categories'
import type { OnboardingQuestion } from '@/lib/api/onboarding-questions'
import type { OnboardingAnswer } from '@/lib/api/onboarding-answers'

interface ProjectPageClientProps {
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
  pendingScopeChanges: number
  delaySummary: DelaySummary
  testingInfo: Record<string, TestingInfo>
  isAdmin: boolean
  effectiveDeliveryDate: string | null
  categories?: OnboardingCategory[]
  questions?: OnboardingQuestion[]
  answers?: OnboardingAnswer[]
}

export function ProjectPageClient({
  project,
  userRole,
  userId,
  availableDevs,
  pendingScopeChanges,
  delaySummary,
  testingInfo,
  isAdmin,
  effectiveDeliveryDate,
  categories,
  questions,
  answers,
}: ProjectPageClientProps) {
  const [isFileMode, setIsFileMode] = useState(false)
  const [isChatMode, setIsChatMode] = useState(false)
  const { setOpen: setSidebarOpen } = useSidebar()
  const wasOpenBeforeExpandedMode = useRef<boolean | null>(null)

  // Helper to get current sidebar state from cookie
  const getSidebarState = () => {
    return document.cookie.includes('sidebar_state=true') ||
           !document.cookie.includes('sidebar_state=false')
  }

  // Handle file mode changes - collapse sidebar on enter, restore on exit
  const handleFileModeChange = (newFileMode: boolean) => {
    if (newFileMode && !isFileMode) {
      // Entering file mode - save current state then collapse (if not already in expanded mode)
      if (wasOpenBeforeExpandedMode.current === null) {
        wasOpenBeforeExpandedMode.current = getSidebarState()
      }
      setSidebarOpen(false)
    } else if (!newFileMode && isFileMode) {
      // Exiting file mode - restore previous state (only if not entering another expanded mode)
      if (!isChatMode && wasOpenBeforeExpandedMode.current !== null) {
        setSidebarOpen(wasOpenBeforeExpandedMode.current)
        wasOpenBeforeExpandedMode.current = null
      }
    }
    setIsFileMode(newFileMode)
  }

  // Handle chat mode changes - collapse sidebar on enter, restore on exit
  const handleChatModeChange = (newChatMode: boolean) => {
    if (newChatMode && !isChatMode) {
      // Entering chat mode - save current state then collapse (if not already in expanded mode)
      if (wasOpenBeforeExpandedMode.current === null) {
        wasOpenBeforeExpandedMode.current = getSidebarState()
      }
      setSidebarOpen(false)
    } else if (!newChatMode && isChatMode) {
      // Exiting chat mode - restore previous state (only if not entering another expanded mode)
      if (!isFileMode && wasOpenBeforeExpandedMode.current !== null) {
        setSidebarOpen(wasOpenBeforeExpandedMode.current)
        wasOpenBeforeExpandedMode.current = null
      }
    }
    setIsChatMode(newChatMode)
  }

  // Track whether we're in any expanded mode (file or chat)
  const isExpandedMode = isFileMode || isChatMode

  // Preload all tab data in parallel
  const { isReady, data: preloadedData } = useProjectPreload(project.id)

  // Smooth crossfade transition for header swap
  const fadeTransition = {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1] as const, // Material Design standard easing
  }

  // Show branded loader while preloading all tab data
  if (!isReady) {
    return (
      <div className="h-[60vh]">
        <HexLoaderCentered />
      </div>
    )
  }

  // Handler to exit expanded mode
  const handleExitExpandedMode = () => {
    if (isFileMode) setIsFileMode(false)
    if (isChatMode) setIsChatMode(false)
  }

  return (
    <div className="space-y-6">
      {/* Animated header section - pure crossfade for smoothness */}
      <AnimatePresence mode="wait" initial={false}>
        {isExpandedMode ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={fadeTransition}
          >
            <CollapsedHeader
              project={project}
              onExit={handleExitExpandedMode}
            />
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={fadeTransition}
            className="space-y-6"
          >
            {/* Header with Delivery Badge */}
            <ProjectHeader project={project} isAdmin={isAdmin} />

            {/* Progress Summary */}
            <div className="rounded-lg border bg-card p-4">
              <ProjectProgressBar project={project} variant="detailed" />
            </div>

            {/* Status Control */}
            <ProjectStatusControl
              projectId={project.id}
              currentStatus={project.status as ProjectStatus}
              isAdmin={isAdmin}
              userRole={userRole}
              deliverables={(project.deliverables || []).map(d => ({ id: d.id, title: d.title }))}
              blockers={(project.requirements || [])
                .filter(r => r.status === 'blocked')
                .map(r => ({ id: r.id, title: r.title }))}
              targetDeliveryDate={effectiveDeliveryDate}
              project={project}
              availableDevs={availableDevs}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <ProjectTabs
        project={project}
        userRole={userRole}
        userId={userId}
        availableDevs={availableDevs}
        pendingScopeChanges={pendingScopeChanges}
        delaySummary={delaySummary}
        testingInfo={testingInfo}
        isFileMode={isFileMode}
        onFileModeChange={handleFileModeChange}
        isChatMode={isChatMode}
        onChatModeChange={handleChatModeChange}
        preloadedData={preloadedData}
        categories={categories}
        questions={questions}
        answers={answers}
      />
    </div>
  )
}
