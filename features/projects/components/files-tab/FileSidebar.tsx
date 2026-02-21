'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText,
  FolderOpen,
  Plus,
  Upload,
  Lock,
  Users,
  ChevronRight,
  ChevronDown,
  File,
  Image,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectDocument } from '@/lib/api/project-documents'
import type { ProjectFileItem, FileView } from '@/lib/api/project-files.shared'
import { buildFileTree, isVisibleInView } from '@/lib/api/project-files.shared'
import type { UserRole } from '@/lib/auth/types'
import type { SelectedFileType } from './useFilesTabState'

interface FileSidebarProps {
  isExpanded: boolean
  documents: ProjectDocument[]
  files: ProjectFileItem[]
  visibility: FileView
  selectedFileId: string | null
  selectedFileType: SelectedFileType
  canToggleVisibility: boolean
  userRole: UserRole
  onVisibilityChange: (visibility: FileView) => void
  onDocumentSelect: (docId: string) => void
  onFileSelect: (fileId: string) => void
  onNewDocument: () => void
  onUploadFile: () => void
}

function getFileIcon(item: ProjectFileItem) {
  if (item.content_type === 'folder') {
    return <FolderOpen className="h-4 w-4 text-amber-500" />
  }
  if (item.content_type === 'document') {
    return <FileText className="h-4 w-4 text-blue-500" />
  }
  if (item.file_type?.startsWith('image/')) {
    return <Image className="h-4 w-4 text-blue-500" />
  }
  if (item.file_type?.includes('pdf')) {
    return <FileText className="h-4 w-4 text-red-500" />
  }
  return <File className="h-4 w-4 text-muted-foreground" />
}

interface FileTreeItemProps {
  item: ProjectFileItem
  level: number
  selectedId: string | null
  onSelect: (id: string) => void
}

function FileTreeItem({ item, level, selectedId, onSelect }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(true)
  const hasChildren = item.children && item.children.length > 0
  const isSelected = item.id === selectedId
  const isFolder = item.content_type === 'folder'

  return (
    <div>
      <button
        onClick={() => {
          if (isFolder) {
            setIsOpen(!isOpen)
          } else {
            onSelect(item.id)
          }
        }}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors text-left',
          isSelected && !isFolder
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
        style={{ paddingLeft: `${8 + level * 12}px` }}
      >
        {isFolder && (
          <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        )}
        {!isFolder && <span className="w-4" />}
        {getFileIcon(item)}
        <span className="truncate flex-1">{item.file_name}</span>
      </button>
      {isFolder && isOpen && hasChildren && (
        <div>
          {item.children!.map(child => (
            <FileTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileSidebar({
  isExpanded,
  documents,
  files,
  visibility,
  selectedFileId,
  selectedFileType,
  canToggleVisibility,
  userRole,
  onVisibilityChange,
  onDocumentSelect,
  onFileSelect,
  onNewDocument,
  onUploadFile,
}: FileSidebarProps) {
  // Filter documents and files by visibility
  const filteredDocuments = useMemo(() => {
    return documents.filter(d => d.visibility === visibility)
  }, [documents, visibility])

  const filteredFiles = useMemo(() => {
    return files.filter(f => isVisibleInView(f, visibility))
  }, [files, visibility])

  // Build file tree from filtered files
  const fileTree = useMemo(() => {
    return buildFileTree(filteredFiles)
  }, [filteredFiles])

  // Determine if user can create documents/upload in current visibility
  const canEdit = useMemo(() => {
    if (visibility === 'internal') {
      return ['admin', 'internal', 'dev'].includes(userRole)
    } else {
      // Client visibility - admin/internal can write, dfy can only upload (not docs)
      return ['admin', 'internal'].includes(userRole)
    }
  }, [visibility, userRole])

  const canUpload = useMemo(() => {
    if (visibility === 'internal') {
      return ['admin', 'internal', 'dev'].includes(userRole)
    } else {
      return ['admin', 'internal', 'dfy'].includes(userRole)
    }
  }, [visibility, userRole])

  // Smooth easing curve matching design principles
  const smoothTransition = {
    duration: 0.25,
    ease: [0.25, 1, 0.5, 1] as const,
  }

  return (
    <motion.div
      className="h-full border-r border-border/50 bg-background flex flex-col"
      initial={false}
      animate={{
        width: isExpanded ? 260 : 0,
        opacity: isExpanded ? 1 : 0,
      }}
      transition={smoothTransition}
      style={{ overflow: 'hidden' }}
    >
      <div className="flex-shrink-0 px-4 py-3 border-b border-border/50">
        {/* Header with toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Files</span>
          {canToggleVisibility ? (
            <Tabs value={visibility} onValueChange={(v) => onVisibilityChange(v as FileView)}>
              <TabsList className="h-7 bg-muted/50">
                <TabsTrigger value="internal" className="h-5 text-xs gap-1.5 px-2 data-[state=active]:bg-background">
                  <Lock className="h-3 w-3" />
                  Internal
                </TabsTrigger>
                <TabsTrigger value="client" className="h-5 text-xs gap-1.5 px-2 data-[state=active]:bg-background">
                  <Users className="h-3 w-3" />
                  Client
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">
              {visibility === 'internal' ? 'Internal' : 'Client'}
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-4 space-y-6">
          {/* DOCUMENTS Section */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-mono font-medium text-text-tertiary uppercase tracking-wider">
                Documents
              </span>
            </div>
            <div className="space-y-0.5">
              {filteredDocuments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2">
                  No documents yet
                </p>
              ) : (
                filteredDocuments.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => onDocumentSelect(doc.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors text-left',
                      selectedFileType === 'document' && selectedFileId === doc.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <FileText className={cn(
                      "h-4 w-4 flex-shrink-0",
                      selectedFileType === 'document' && selectedFileId === doc.id
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    )} />
                    <span className="truncate">{doc.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* UPLOADS Section */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-mono font-medium text-text-tertiary uppercase tracking-wider">
                Uploads
              </span>
            </div>
            <div className="space-y-0.5">
              {fileTree.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2">
                  No files uploaded
                </p>
              ) : (
                fileTree.map(item => (
                  <FileTreeItem
                    key={item.id}
                    item={item}
                    level={0}
                    selectedId={selectedFileType === 'upload' ? selectedFileId : null}
                    onSelect={onFileSelect}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Action buttons */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-border/50 space-y-2">
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            onClick={onNewDocument}
          >
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        )}
        {canUpload && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            onClick={onUploadFile}
          >
            <Upload className="h-4 w-4" />
            Upload File
          </Button>
        )}
      </div>
    </motion.div>
  )
}
