'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import {
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  ChevronDown,
  Trash2,
  MessageSquare,
  User,
  MoreHorizontal,
  ImageIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Suggestion } from '@/lib/api/suggestions'
import { updateSuggestionAction, deleteSuggestionAction } from '@/lib/actions/suggestions'

const statusConfig = {
  new: { label: 'New', icon: Clock, className: 'bg-info-muted text-info border-info/20' },
  reviewed: { label: 'Reviewed', icon: Eye, className: 'bg-warning-muted text-warning border-warning/20' },
  implemented: { label: 'Implemented', icon: CheckCircle, className: 'bg-success-muted text-success border-success/20' },
  declined: { label: 'Declined', icon: XCircle, className: 'bg-error-muted text-error border-error/20' },
}

interface SuggestionsListProps {
  suggestions: Suggestion[]
}

export function SuggestionsList({ suggestions: initialSuggestions }: SuggestionsListProps) {
  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [imageDialogUrl, setImageDialogUrl] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const handleStatusChange = (id: string, status: Suggestion['status']) => {
    startTransition(async () => {
      const result = await updateSuggestionAction(id, { status })
      if (result.success && result.suggestion) {
        setSuggestions(prev =>
          prev.map(s => s.id === id ? { ...s, status } : s)
        )
      }
    })
  }

  const handleNotesChange = (id: string) => {
    const notes = adminNotes[id]
    if (!notes?.trim()) return

    startTransition(async () => {
      const result = await updateSuggestionAction(id, { admin_notes: notes })
      if (result.success) {
        setSuggestions(prev =>
          prev.map(s => s.id === id ? { ...s, admin_notes: notes } : s)
        )
        setAdminNotes(prev => ({ ...prev, [id]: '' }))
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteSuggestionAction(id)
      if (result.success) {
        setSuggestions(prev => prev.filter(s => s.id !== id))
        setDeleteId(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion) => {
        const status = statusConfig[suggestion.status]
        const StatusIcon = status.icon
        const isExpanded = expandedId === suggestion.id

        return (
          <Card key={suggestion.id} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{suggestion.title}</h3>
                    <Badge variant="outline" className={status.className}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                    {suggestion.image_url && (
                      <Badge variant="secondary" className="text-xs">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        Image
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {suggestion.user_name || 'Unknown'}
                      {suggestion.user_role && (
                        <Badge variant="outline" className="text-xs ml-1">
                          {suggestion.user_role}
                        </Badge>
                      )}
                    </span>
                    <span>
                      {format(new Date(suggestion.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStatusChange(suggestion.id, 'reviewed')}>
                        <Eye className="h-4 w-4 mr-2" />
                        Mark Reviewed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(suggestion.id, 'implemented')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Implemented
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(suggestion.id, 'declined')}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Mark Declined
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(suggestion.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="border-t bg-muted/30">
                <div className="space-y-4 pt-4">
                  {/* Description */}
                  {suggestion.description && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {suggestion.description}
                      </p>
                    </div>
                  )}

                  {/* Image */}
                  {suggestion.image_url && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Screenshot</h4>
                      <div
                        className="relative h-48 w-full max-w-md rounded-lg border overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setImageDialogUrl(suggestion.image_url)}
                      >
                        <Image
                          src={suggestion.image_url}
                          alt="Suggestion screenshot"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 400px"
                        />
                      </div>
                    </div>
                  )}

                  {/* Admin Notes */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      Admin Notes
                    </h4>
                    {suggestion.admin_notes && (
                      <p className="text-sm text-muted-foreground mb-2 p-2 bg-background rounded border">
                        {suggestion.admin_notes}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a note..."
                        value={adminNotes[suggestion.id] || ''}
                        onChange={(e) =>
                          setAdminNotes(prev => ({
                            ...prev,
                            [suggestion.id]: e.target.value,
                          }))
                        }
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleNotesChange(suggestion.id)}
                        disabled={!adminNotes[suggestion.id]?.trim() || isPending}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Image Dialog */}
      <Dialog open={!!imageDialogUrl} onOpenChange={() => setImageDialogUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Screenshot</DialogTitle>
          </DialogHeader>
          {imageDialogUrl && (
            <div className="relative aspect-video w-full">
              <Image
                src={imageDialogUrl}
                alt="Suggestion screenshot"
                fill
                className="object-contain"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The suggestion will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
