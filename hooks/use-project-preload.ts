'use client'

import { useState, useEffect, useRef } from 'react'
import {
  getProjectDocumentsAction,
  getMentionablesAction,
} from '@/features/projects/actions/documentActions'
import { getProjectFilesAction } from '@/features/projects/actions/fileActions'
import { getProjectConversationsAction } from '@/features/conversations/actions/conversationActions'
import type { ProjectDocument } from '@/lib/api/project-documents'
import type { ProjectFileItem } from '@/lib/api/project-files.shared'
import type { ProjectMentionables } from '@/lib/api/mentionables'
import type { Conversation, Message } from '@/lib/api/conversations.shared'

interface Participant {
  id: string
  name: string
  email: string
}

export interface ConversationData {
  conversation: Conversation
  messages: Message[]
  participants: Participant[]
}

export interface PreloadedProjectData {
  documents: ProjectDocument[]
  files: ProjectFileItem[]
  mentionables: ProjectMentionables
  conversations: ConversationData[]
}

interface UseProjectPreloadResult {
  isReady: boolean
  isLoading: boolean
  error: string | null
  data: PreloadedProjectData | null
  refetch: () => Promise<void>
}

/**
 * Preloads all project tab data in parallel when a project is opened.
 * This eliminates loading states when switching between tabs.
 */
export function useProjectPreload(projectId: string): UseProjectPreloadResult {
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PreloadedProjectData | null>(null)

  // Track if we've already started loading to prevent double-fetches
  const hasStartedLoading = useRef(false)

  const fetchAllData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch all tab data in parallel
      const [docsResult, filesResult, mentionablesResult, conversationsResult] = await Promise.all([
        getProjectDocumentsAction(projectId),
        getProjectFilesAction(projectId),
        getMentionablesAction(projectId),
        getProjectConversationsAction(projectId),
      ])

      // Check for errors but still use available data
      if (docsResult.error) {
        console.warn('[Preload] Documents error:', docsResult.error)
      }
      if (filesResult.error) {
        console.warn('[Preload] Files error:', filesResult.error)
      }
      if (conversationsResult.error) {
        console.warn('[Preload] Conversations error:', conversationsResult.error)
      }

      setData({
        documents: docsResult.documents || [],
        files: filesResult.files || [],
        mentionables: mentionablesResult,
        conversations: conversationsResult.conversations || [],
      })

      setIsReady(true)
    } catch (err) {
      console.error('[Preload] Failed to preload project data:', err)
      setError('Failed to load project data')
      // Still mark as ready so UI can show error state
      setIsReady(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Prevent double-fetching in strict mode
    if (hasStartedLoading.current) return
    hasStartedLoading.current = true

    fetchAllData()
  }, [projectId])

  const refetch = async () => {
    await fetchAllData()
  }

  return {
    isReady,
    isLoading,
    error,
    data,
    refetch,
  }
}
