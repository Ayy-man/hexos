'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Share2, Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface ShareLinkButtonProps {
  publicToken: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function ShareLinkButton({
  publicToken,
  variant = 'outline',
  size = 'default',
}: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${publicToken}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleOpenLink = () => {
    window.open(publicUrl, '_blank')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={variant} size={size}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-1">Share Proposal</h4>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can view the proposal
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-url" className="text-xs">
              Public Link
            </Label>
            <div className="flex gap-2">
              <Input
                id="share-url"
                value={publicUrl}
                readOnly
                className="text-xs h-9"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenLink}
            className="w-full text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Open in new tab
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
