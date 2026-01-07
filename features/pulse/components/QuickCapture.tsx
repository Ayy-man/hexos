'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface QuickCaptureProps {
  onCapture: (title: string) => Promise<void>
}

export function QuickCapture({ onCapture }: QuickCaptureProps) {
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!value.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onCapture(value.trim())
      setValue('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <Plus className="h-4 w-4" />
      </div>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Quick capture: Type and press Enter..."
        className="pl-10"
        disabled={isSubmitting}
      />
    </div>
  )
}
