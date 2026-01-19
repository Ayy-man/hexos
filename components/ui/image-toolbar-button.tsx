'use client'

import { useRef, useState } from 'react'
import { ImageIcon, Loader2 } from 'lucide-react'
import { useEditorPlugin } from 'platejs/react'
import { ImagePlugin } from '@platejs/media/react'
import { insertImage } from '@platejs/media'
import { ToolbarButton } from './toolbar'
import { createClient } from '@/lib/supabase/client'

export function ImageToolbarButton() {
  const { editor } = useEditorPlugin(ImagePlugin)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      // Upload to Supabase storage
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `editor-images/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('general-purpose')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('general-purpose')
        .getPublicUrl(data.path)

      // Insert image into editor
      insertImage(editor, urlData.publicUrl)
    } catch (error) {
      console.error('Failed to upload image:', error)
    } finally {
      setIsUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <ToolbarButton
        onClick={handleClick}
        disabled={isUploading}
        tooltip="Insert image"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </ToolbarButton>
    </>
  )
}
