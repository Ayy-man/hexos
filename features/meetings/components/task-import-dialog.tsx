'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Upload, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TaskImportDialogProps {
  meetingId: string
  children?: React.ReactNode
}

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export function TaskImportDialog({ meetingId, children }: TaskImportDialogProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file')
        return
      }
      setSelectedFile(file)
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(
        `/api/meeting-tasks/import?meeting_id=${meetingId}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setResult(data)

      if (data.imported > 0) {
        toast.success(
          `${data.imported} task${data.imported === 1 ? '' : 's'} imported successfully`
        )
        router.refresh()
      }

      if (data.skipped > 0) {
        toast.warning(`${data.skipped} row${data.skipped === 1 ? '' : 's'} skipped`)
      }

      // Reset file input
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Failed to import tasks:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import tasks')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setSelectedFile(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Tasks from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: title, description, assigned_to_name, due_date, priority, status
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          {result && (
            <div className="space-y-2">
              <Alert>
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {result.imported} task{result.imported === 1 ? '' : 's'} imported
                      {result.skipped > 0 && `, ${result.skipped} skipped`}
                    </p>
                    {result.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Errors:</p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {result.errors.slice(0, 5).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                          {result.errors.length > 5 && (
                            <li>...and {result.errors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {!selectedFile && !result && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                CSV format: Include a header row with column names. Supported columns:
                title (required), description, assigned_to_name, due_date (YYYY-MM-DD),
                priority (low/normal/high/urgent), status (pending/in_progress/done/cancelled)
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={isUploading || !selectedFile}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
