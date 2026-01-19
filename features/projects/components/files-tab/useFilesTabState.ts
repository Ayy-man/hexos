'use client'

import { useState, useCallback, useEffect } from 'react'
import type { DocumentVisibility, ProjectDocument } from '@/lib/api/project-documents'
import type { ProjectFileItem, FileView } from '@/lib/api/project-files.shared'
import type { UserRole } from '@/lib/auth/types'

export type SelectedFileType = 'document' | 'upload' | null

export interface FilesTabState {
  selectedFileId: string | null
  selectedFileType: SelectedFileType
  visibility: FileView
}

interface UseFilesTabStateOptions {
  userRole: UserRole
  documents: ProjectDocument[]
  files: ProjectFileItem[]
}

function getDefaultVisibility(userRole: UserRole): FileView {
  // DFY users only see client view
  if (userRole === 'dfy') return 'client'
  // Everyone else defaults to internal
  return 'internal'
}

function canToggleVisibility(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'internal'
}

export function useFilesTabState({ userRole, documents, files }: UseFilesTabStateOptions) {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [selectedFileType, setSelectedFileType] = useState<SelectedFileType>(null)
  const [visibility, setVisibility] = useState<FileView>(getDefaultVisibility(userRole))

  // Auto-select Gameplan document on mount if available
  useEffect(() => {
    if (!selectedFileId && documents.length > 0) {
      // Try to find the gameplan document first
      const gameplan = documents.find(d => d.slug === 'gameplan')
      if (gameplan) {
        setSelectedFileId(gameplan.id)
        setSelectedFileType('document')
      } else if (documents[0]) {
        // Fall back to first document
        setSelectedFileId(documents[0].id)
        setSelectedFileType('document')
      }
    }
  }, [documents, selectedFileId])

  const selectDocument = useCallback((docId: string) => {
    setSelectedFileId(docId)
    setSelectedFileType('document')
  }, [])

  const selectFile = useCallback((fileId: string) => {
    setSelectedFileId(fileId)
    setSelectedFileType('upload')
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedFileId(null)
    setSelectedFileType(null)
  }, [])

  const toggleVisibility = useCallback(() => {
    if (canToggleVisibility(userRole)) {
      setVisibility(v => v === 'internal' ? 'client' : 'internal')
    }
  }, [userRole])

  const setVisibilityDirect = useCallback((v: FileView) => {
    if (canToggleVisibility(userRole) || v === getDefaultVisibility(userRole)) {
      setVisibility(v)
    }
  }, [userRole])

  // Get the currently selected document
  const selectedDocument = selectedFileType === 'document' && selectedFileId
    ? documents.find(d => d.id === selectedFileId)
    : null

  // Get the currently selected file (upload)
  const selectedUpload = selectedFileType === 'upload' && selectedFileId
    ? files.find(f => f.id === selectedFileId)
    : null

  return {
    // State
    selectedFileId,
    selectedFileType,
    visibility,
    selectedDocument,
    selectedUpload,

    // Actions
    selectDocument,
    selectFile,
    clearSelection,
    toggleVisibility,
    setVisibility: setVisibilityDirect,

    // Helpers
    canToggleVisibility: canToggleVisibility(userRole),
  }
}
