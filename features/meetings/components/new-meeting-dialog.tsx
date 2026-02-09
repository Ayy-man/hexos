'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createMeetingAction } from '@/features/meetings/actions/meetingActions'

export function NewMeetingDialog() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !meetingUrl.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    const result = await createMeetingAction({
      title: title.trim(),
      meeting_url: meetingUrl.trim(),
    })

    setIsSubmitting(false)

    if (result.success) {
      toast.success('Meeting created successfully! Bot is joining...')
      setOpen(false)
      setTitle('')
      setMeetingUrl('')
    } else {
      toast.error(result.error || 'Failed to create meeting')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Meeting
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Meeting Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Client Kickoff Call"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting_url">
              Meeting Link <span className="text-red-500">*</span>
            </Label>
            <Input
              id="meeting_url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="Paste Zoom, Meet, or Teams link"
              type="url"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Meeting'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
