'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { MeetingLink, MeetingLinkableType } from '@/lib/types/meetings'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { XIcon } from 'lucide-react'
import {
  addMeetingLinkAction,
  removeMeetingLinkAction,
} from '@/features/meetings/actions/meetingActions'

interface MeetingLinkPickerProps {
  meetingId: string
  existingLinks: (MeetingLink & { project_name?: string; inquiry_title?: string })[]
  onClose: () => void
}

interface Project {
  id: string
  name: string
}

interface Inquiry {
  id: string
  title: string
}

export function MeetingLinkPicker({
  meetingId,
  existingLinks,
  onClose,
}: MeetingLinkPickerProps) {
  const router = useRouter()
  const [linkableType, setLinkableType] = useState<MeetingLinkableType | ''>('')
  const [projects, setProjects] = useState<Project[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Fetch projects when type is selected
  useEffect(() => {
    if (linkableType === 'project') {
      setIsLoading(true)
      fetch('/api/projects')
        .then((res) => res.json())
        .then((data) => {
          setProjects(data.projects || [])
          setIsLoading(false)
        })
        .catch(() => {
          toast.error('Failed to load projects')
          setIsLoading(false)
        })
    }
  }, [linkableType])

  // Fetch inquiries when type is selected
  useEffect(() => {
    if (linkableType === 'inquiry') {
      setIsLoading(true)
      fetch('/api/inquiries')
        .then((res) => res.json())
        .then((data) => {
          setInquiries(data.inquiries || [])
          setIsLoading(false)
        })
        .catch(() => {
          toast.error('Failed to load inquiries')
          setIsLoading(false)
        })
    }
  }, [linkableType])

  // Filter items by search term
  const filteredItems =
    linkableType === 'project'
      ? projects.filter((p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : linkableType === 'inquiry'
      ? inquiries.filter((i) =>
          i.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : []

  const handleAddLink = async () => {
    if (!linkableType || !selectedId) {
      toast.error('Please select a type and item')
      return
    }

    // Check if link already exists
    const alreadyLinked = existingLinks.some(
      (link) =>
        link.linkable_type === linkableType && link.linkable_id === selectedId
    )

    if (alreadyLinked) {
      toast.error('This item is already linked to the meeting')
      return
    }

    setIsLoading(true)
    const result = await addMeetingLinkAction(meetingId, linkableType, selectedId)

    if (result.success) {
      toast.success('Link added successfully')
      router.refresh()
      setLinkableType('')
      setSelectedId('')
      setSearchTerm('')
    } else {
      toast.error(result.error || 'Failed to add link')
    }
    setIsLoading(false)
  }

  const handleRemoveLink = async (linkId: string) => {
    setIsLoading(true)
    const result = await removeMeetingLinkAction(linkId)

    if (result.success) {
      toast.success('Link removed successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to remove link')
    }
    setIsLoading(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Meeting to Project/Inquiry</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Links */}
          {existingLinks.length > 0 && (
            <div>
              <Label className="mb-2 block">Current Links</Label>
              <div className="flex flex-wrap gap-2">
                {existingLinks.map((link) => (
                  <Badge key={link.id} variant="secondary" className="gap-2 pr-1">
                    {link.linkable_type === 'project' ? '📁' : '📋'}{' '}
                    {link.project_name || link.inquiry_title || link.linkable_id}
                    <button
                      onClick={() => handleRemoveLink(link.id)}
                      disabled={isLoading}
                      className="hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Add New Link Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">Link Type</Label>
              <Select
                value={linkableType}
                onValueChange={(value) => {
                  setLinkableType(value as MeetingLinkableType)
                  setSelectedId('')
                  setSearchTerm('')
                }}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="inquiry">Inquiry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {linkableType && (
              <>
                <div>
                  <Label htmlFor="search">
                    Search {linkableType === 'project' ? 'Projects' : 'Inquiries'}
                  </Label>
                  <Input
                    id="search"
                    type="text"
                    placeholder="Type to filter..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="item">
                    Select {linkableType === 'project' ? 'Project' : 'Inquiry'}
                  </Label>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger id="item">
                      <SelectValue placeholder="Choose one..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredItems.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          No items found
                        </div>
                      ) : (
                        filteredItems.map((item: any) => (
                          <SelectItem key={item.id} value={item.id}>
                            {linkableType === 'project' ? item.name : item.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleAddLink}
                  disabled={!selectedId || isLoading}
                  className="w-full"
                >
                  Add Link
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
