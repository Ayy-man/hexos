'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, FolderKanban, MessageSquare, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

interface QuickAction {
  label: string
  icon: React.ElementType
  route: string
  color: string
}

const adminActions: QuickAction[] = [
  { label: 'New Inquiry', icon: FileText, route: '/inquiries/new', color: 'bg-blue-500' },
  { label: 'New Project', icon: FolderKanban, route: '/projects/new', color: 'bg-purple-500' },
  { label: 'New Meeting', icon: Video, route: '/meetings', color: 'bg-orange-500' },
]

const dfyActions: QuickAction[] = [
  { label: 'Submit Inquiry', icon: FileText, route: '/inquiries/new', color: 'bg-blue-500' },
]

interface FloatingActionButtonProps {
  role: 'admin' | 'internal' | 'dev' | 'dfy' | 'client'
}

function getActions(role: FloatingActionButtonProps['role']): QuickAction[] {
  switch (role) {
    case 'admin':
    case 'internal':
      return adminActions
    case 'dfy':
      return dfyActions
    default:
      return []
  }
}

export function FloatingActionButton({ role }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const isMobile = useIsMobile()
  const actions = getActions(role)

  if (!isMobile || actions.length === 0) return null

  const handleAction = (route: string) => {
    setIsOpen(false)
    router.push(route)
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action menu */}
      {isOpen && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-50 flex flex-col-reverse gap-3">
          {actions.map((action) => (
            <button
              key={action.route}
              type="button"
              onClick={() => handleAction(action.route)}
              className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <span className="rounded-lg bg-bg-surface px-3 py-2 text-sm font-medium shadow-lg">
                {action.label}
              </span>
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-full shadow-lg', action.color)}>
                <action.icon className="h-5 w-5 text-white" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* FAB button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Create new item"
        className={cn(
          'fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-50',
          'flex h-14 w-14 items-center justify-center rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'transition-transform duration-200 active:scale-95',
          isOpen && 'rotate-45'
        )}
      >
        <Plus className="h-6 w-6" />
      </button>
    </>
  )
}
