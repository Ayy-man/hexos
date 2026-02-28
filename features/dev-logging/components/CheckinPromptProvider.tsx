'use client'

import { useState, useEffect, useMemo, createContext, useContext } from 'react'
import { CheckinModal } from './CheckinModal'
import type { DevLoggingStatus } from '@/lib/api/dev-logging'

interface CheckinPromptContextValue {
  showModal: boolean
  setShowModal: (show: boolean) => void
  overdueProjects: string[]
}

const CheckinPromptContext = createContext<CheckinPromptContextValue>({
  showModal: false,
  setShowModal: () => {},
  overdueProjects: [],
})

export function useCheckinPrompt() {
  return useContext(CheckinPromptContext)
}

interface CheckinPromptProviderProps {
  children: React.ReactNode
  initialStatus: DevLoggingStatus | null
  isDev: boolean
}

export function CheckinPromptProvider({
  children,
  initialStatus,
  isDev,
}: CheckinPromptProviderProps) {
  const [showModal, setShowModal] = useState(false)
  const [hasPrompted, setHasPrompted] = useState(false)

  // Only check for devs
  useEffect(() => {
    if (!isDev || hasPrompted) return
    if (!initialStatus) return

    // If needs check-in and not snoozed, show modal after short delay
    if (initialStatus.needs_checkin && !initialStatus.is_snoozed) {
      const timer = setTimeout(() => {
        setShowModal(true)
        setHasPrompted(true)
      }, 2000) // 2 second delay after page load

      return () => clearTimeout(timer)
    }
  }, [isDev, initialStatus, hasPrompted])

  const stableOverdueProjects = useMemo(
    () => initialStatus?.overdue_projects ?? [],
    [initialStatus]
  )

  const contextValue = useMemo(
    () => ({ showModal, setShowModal, overdueProjects: stableOverdueProjects }),
    [showModal, stableOverdueProjects]
  )

  return (
    <CheckinPromptContext.Provider value={contextValue}>
      {children}
      {isDev && initialStatus?.needs_checkin && (
        <CheckinModal
          open={showModal}
          onOpenChange={setShowModal}
          overdueProjects={initialStatus.overdue_projects}
          lastCheckinDate={initialStatus.last_checkin_date}
        />
      )}
    </CheckinPromptContext.Provider>
  )
}
