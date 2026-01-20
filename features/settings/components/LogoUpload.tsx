'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useImageUpload } from '@/components/hooks/use-image-upload'
import { uploadDfyLogoAction, removeDfyLogoAction } from '../actions/profileActions'
import { toast } from 'sonner'
import { Upload, Trash2, Loader2, ImageIcon } from 'lucide-react'

interface LogoUploadProps {
  currentLogoUrl: string | null
}

export function LogoUpload({ currentLogoUrl }: LogoUploadProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl)
  const [isUploading, startUploadTransition] = useTransition()
  const [isRemoving, startRemoveTransition] = useTransition()

  const {
    previewUrl,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove: clearPreview,
  } = useImageUpload()

  const displayUrl = previewUrl || logoUrl

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    startUploadTransition(async () => {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadDfyLogoAction(formData)

      if (result.success && result.url) {
        setLogoUrl(result.url)
        clearPreview()
        toast.success('Logo uploaded successfully')
      } else {
        toast.error(result.error || 'Failed to upload logo')
      }
    })
  }

  const handleRemove = () => {
    startRemoveTransition(async () => {
      const result = await removeDfyLogoAction()

      if (result.success) {
        setLogoUrl(null)
        clearPreview()
        toast.success('Logo removed')
      } else {
        toast.error(result.error || 'Failed to remove logo')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Company Logo
        </CardTitle>
        <CardDescription>
          Upload your company logo to appear on PDF proposals sent to clients.
          Recommended size: 400x150px. Supports PNG, JPG, SVG, or WebP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo Preview */}
        <div
          onClick={handleThumbnailClick}
          className="relative flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
        >
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt="Company logo"
              fill
              className="object-contain p-4"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <Upload className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Click to upload logo</p>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Actions */}
        <div className="flex gap-2">
          {previewUrl && (
            <Button
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Save Logo
                </>
              )}
            </Button>
          )}

          {logoUrl && !previewUrl && (
            <Button
              variant="outline"
              onClick={handleRemove}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Logo
                </>
              )}
            </Button>
          )}

          {previewUrl && (
            <Button
              variant="ghost"
              onClick={clearPreview}
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Info */}
        {!logoUrl && !previewUrl && (
          <p className="text-xs text-muted-foreground">
            Your logo will appear in the header of PDF proposals sent to clients.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
