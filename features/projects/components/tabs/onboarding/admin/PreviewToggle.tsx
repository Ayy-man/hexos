'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Eye } from 'lucide-react'

interface PreviewToggleProps {
  isPreview: boolean
  onToggle: (preview: boolean) => void
}

export function PreviewToggle({ isPreview, onToggle }: PreviewToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id="preview-toggle"
        checked={isPreview}
        onCheckedChange={onToggle}
      />
      <Label
        htmlFor="preview-toggle"
        className="flex items-center gap-1.5 text-sm cursor-pointer select-none"
      >
        <Eye className="h-4 w-4" />
        Preview as DFY
      </Label>
    </div>
  )
}
