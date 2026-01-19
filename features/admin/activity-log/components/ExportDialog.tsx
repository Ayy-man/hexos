'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, Loader2 } from 'lucide-react'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ExportFormat = 'csv' | 'json' | 'jsonl'

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [includeAiContent, setIncludeAiContent] = useState(true)
  const [includeMetadata, setIncludeMetadata] = useState(true)

  const handleExport = () => {
    startTransition(async () => {
      try {
        // Build query params
        const params = new URLSearchParams()
        params.set('format', format)
        if (fromDate) params.set('from', fromDate)
        if (toDate) params.set('to', toDate)
        if (!includeAiContent) params.set('exclude_ai', 'true')
        if (!includeMetadata) params.set('exclude_metadata', 'true')

        // Fetch export data
        const response = await fetch(`/api/activity-logs/export?${params}`)

        if (!response.ok) {
          throw new Error('Export failed')
        }

        const blob = await response.blob()

        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        onOpenChange(false)
      } catch (error) {
        console.error('Export error:', error)
        // Could add toast notification here
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Activity Logs</DialogTitle>
          <DialogDescription>
            Download activity logs in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-date">From Date</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">To Date</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex flex-col">
                    <span>CSV</span>
                    <span className="text-xs text-muted-foreground">
                      Spreadsheet compatible
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex flex-col">
                    <span>JSON</span>
                    <span className="text-xs text-muted-foreground">
                      Structured data format
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="jsonl">
                  <div className="flex flex-col">
                    <span>JSON Lines</span>
                    <span className="text-xs text-muted-foreground">
                      One record per line
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Include</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-ai"
                  checked={includeAiContent}
                  onCheckedChange={(checked) => setIncludeAiContent(!!checked)}
                />
                <label
                  htmlFor="include-ai"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Full AI prompts and responses
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-metadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(!!checked)}
                />
                <label
                  htmlFor="include-metadata"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Metadata and context
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
