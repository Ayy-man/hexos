'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface TaskExportButtonProps {
  meetingId: string
}

export function TaskExportButton({ meetingId }: TaskExportButtonProps) {
  const handleExport = () => {
    const url = `/api/meeting-tasks/export?meeting_id=${meetingId}`
    // Trigger download by opening URL in new tab
    window.open(url, '_blank')
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  )
}
