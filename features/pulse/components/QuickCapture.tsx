'use client'

import { useState, useEffect, useRef } from 'react'
import { Command } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface QuickCaptureProps {
  onCapture: (title: string) => Promise<void>
}

export function QuickCapture({ onCapture }: QuickCaptureProps) {
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
        <Command className="h-3 w-3" />
        <span className="text-xs">K</span>
      </div>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Quick capture: Type anything..."
        className="pl-12"
        disabled={isSubmitting}
      />
    </div>
  )
}
