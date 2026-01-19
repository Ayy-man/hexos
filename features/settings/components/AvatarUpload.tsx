'use client'

import { useState, useRef, useTransition } from 'react'
import Image from 'next/image'
import { Camera, Loader2, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { uploadAvatarAction, removeAvatarAction } from '../actions/settingsActions'
import { cn } from '@/lib/utils'

interface AvatarUploadProps {
  currentAvatarUrl: string | null
  userName: string
}

export function AvatarUpload({ currentAvatarUrl, userName }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const [isHovering, setIsHovering] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.')
      return
    }

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Invalid file type. Use PNG, JPG, or WebP.')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('avatar', file)

      const result = await uploadAvatarAction(formData)

      if (result.success && result.url) {
        setAvatarUrl(result.url)
        toast.success('Avatar updated')
      } else {
        toast.error(result.error || 'Failed to upload avatar')
      }
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeAvatarAction()

      if (result.success) {
        setAvatarUrl(null)
        toast.success('Avatar removed')
      } else {
        toast.error(result.error || 'Failed to remove avatar')
      }
    })
  }

  return (
    <div className="flex items-center gap-6">
      {/* Avatar */}
      <div
        className="relative group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          className={cn(
            'relative h-24 w-24 rounded-full overflow-hidden ring-2 ring-border transition-all duration-200',
            isHovering && 'ring-primary/50'
          )}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={userName}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="h-full w-full bg-muted flex items-center justify-center">
              <span className="text-2xl font-semibold text-muted-foreground">
                {initials || <User className="h-10 w-10" />}
              </span>
            </div>
          )}

          {/* Hover overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className={cn(
              'absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-200',
              isHovering && !isPending ? 'opacity-100' : 'opacity-0'
            )}
          >
            {isPending ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                {avatarUrl ? 'Change photo' : 'Upload photo'}
              </>
            )}
          </Button>

          {avatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          PNG, JPG, or WebP. Max 5MB.
        </p>
      </div>
    </div>
  )
}
