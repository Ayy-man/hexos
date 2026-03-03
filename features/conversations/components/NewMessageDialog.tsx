'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'
import { getMessageableUsersAction, startDirectConversationAction } from '../actions/conversationActions'
import { cn } from '@/lib/utils'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface NewMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConversationStarted: (conversationId: string) => void
}

export function NewMessageDialog({ open, onOpenChange, onConversationStarted }: NewMessageDialogProps) {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStarting, setIsStarting] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setSearch('')
      setIsStarting(null)
      return
    }

    setIsLoading(true)
    getMessageableUsersAction()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [open])

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectUser = async (userId: string) => {
    setIsStarting(userId)
    try {
      const { conversationId } = await startDirectConversationAction(userId)
      onOpenChange(false)
      onConversationStarted(conversationId)
    } catch (err) {
      console.error('Failed to start conversation:', err)
    } finally {
      setIsStarting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <div className="p-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto border-t">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? 'No users found' : 'No users available'}
            </p>
          ) : (
            filtered.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user.id)}
                disabled={isStarting !== null}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors',
                  'disabled:opacity-50'
                )}
              >
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <span className="text-[10px] text-muted-foreground capitalize shrink-0">
                  {user.role}
                </span>
                {isStarting === user.id && (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
