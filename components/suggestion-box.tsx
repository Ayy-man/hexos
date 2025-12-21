'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Lightbulb, ImagePlus, X, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useImageUpload } from '@/components/hooks/use-image-upload'
import { createSuggestionAction, uploadSuggestionImageAction } from '@/lib/actions/suggestions'
import { cn } from '@/lib/utils'

export function SuggestionBox() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const {
    previewUrl,
    fileName,
    file,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  } = useImageUpload()

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const droppedFile = e.dataTransfer.files?.[0]
      if (droppedFile && droppedFile.type.startsWith('image/')) {
        const fakeEvent = {
          target: {
            files: [droppedFile],
          },
        } as unknown as React.ChangeEvent<HTMLInputElement>
        handleFileChange(fakeEvent)
      }
    },
    [handleFileChange],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)

    try {
      let imageUrl: string | undefined

      // Upload image if present
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        const uploadResult = await uploadSuggestionImageAction(formData)
        if (uploadResult.error) {
          console.error('Image upload failed:', uploadResult.error)
        } else {
          imageUrl = uploadResult.url
        }
      }

      // Create suggestion
      const result = await createSuggestionAction({
        title: title.trim(),
        description: description.trim() || undefined,
        image_url: imageUrl,
      })

      if (result.error) {
        console.error('Failed to create suggestion:', result.error)
        return
      }

      // Reset form and close dialog
      setTitle('')
      setDescription('')
      handleRemove()
      setOpen(false)
    } catch (error) {
      console.error('Submit error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      setOpen(newOpen)
      if (!newOpen) {
        // Reset form when closing
        setTitle('')
        setDescription('')
        handleRemove()
      }
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip="Submit a suggestion"
              className="text-muted-foreground hover:text-foreground"
            >
              <Lightbulb className="h-4 w-4" />
              <span>Suggestion Box</span>
            </SidebarMenuButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Submit a Suggestion
                </DialogTitle>
                <DialogDescription>
                  Share your ideas to help improve hexOS. We review all suggestions!
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief title for your suggestion"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your suggestion in more detail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Screenshot (optional)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />

                  {!previewUrl ? (
                    <div
                      onClick={handleThumbnailClick}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        'flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:bg-muted',
                        isDragging && 'border-primary/50 bg-primary/5',
                      )}
                    >
                      <div className="rounded-full bg-background p-2 shadow-sm">
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium">Click to select</p>
                        <p className="text-xs text-muted-foreground">
                          or drag and drop
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative h-32 overflow-hidden rounded-lg border">
                        <Image
                          src={previewUrl}
                          alt="Preview"
                          fill
                          className="object-cover"
                          sizes="(max-width: 500px) 100vw, 500px"
                        />
                      </div>
                      {fileName && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="truncate flex-1">{fileName}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemove}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!title.trim() || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Suggestion'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
