'use client'

import { useRouter } from 'next/navigation'
import { ExtensionApprovalCard } from './ExtensionApprovalCard'
import type { ProjectExtension } from '@/lib/api/project-extensions'

interface PendingExtensionsListProps {
  extensions: ProjectExtension[]
}

export function PendingExtensionsList({ extensions }: PendingExtensionsListProps) {
  const router = useRouter()

  const handleAction = () => {
    router.refresh()
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {extensions.map((extension) => (
        <div key={extension.id} className="space-y-2">
          {extension.project && (
            <p className="text-sm font-medium">{extension.project.project_name}</p>
          )}
          <ExtensionApprovalCard
            extension={extension}
            projectId={extension.project_id}
            onAction={handleAction}
          />
        </div>
      ))}
    </div>
  )
}
