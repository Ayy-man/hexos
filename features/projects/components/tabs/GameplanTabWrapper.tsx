'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { GameplanTab } from '../gameplan'
import { getProjectDocumentsAction, getMentionablesAction } from '../../actions/documentActions'
import type { ProjectDocument } from '@/lib/api/project-documents'
import type { ProjectMentionables } from '../../actions/documentActions'
import type { UserRole } from '@/lib/auth/types'

interface GameplanTabWrapperProps {
  projectId: string
  userRole: UserRole
  isAdmin: boolean
}

export function GameplanTabWrapper({
  projectId,
  userRole,
  isAdmin,
}: GameplanTabWrapperProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [mentionables, setMentionables] = useState<ProjectMentionables>({
    users: [],
    deliverables: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setError(null)

      try {
        const [docsResult, mentionablesResult] = await Promise.all([
          getProjectDocumentsAction(projectId),
          getMentionablesAction(projectId),
        ])

        if (docsResult.error) {
          throw new Error(docsResult.error)
        }

        setDocuments(docsResult.documents || [])
        setMentionables(mentionablesResult)
      } catch (err) {
        console.error('Failed to load gameplan data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [projectId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-destructive mb-2">Failed to load gameplan</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <GameplanTab
      projectId={projectId}
      documents={documents}
      mentionables={mentionables}
      userRole={userRole}
      isAdmin={isAdmin}
    />
  )
}
