'use client'

import { Send, Clock, CheckCircle2, XCircle, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ProjectApplication } from '@/lib/api/opportunity-types'

interface ApplicationListProps {
  applications: ProjectApplication[]
}

const statusConfig = {
  pending: {
    label: 'Pending Review',
    icon: Clock,
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  },
  shortlisted: {
    label: 'Shortlisted',
    icon: Star,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
  },
  rejected: {
    label: 'Not Selected',
    icon: XCircle,
    className: 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-200',
  },
}

export function ApplicationList({ applications }: ApplicationListProps) {
  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Send className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            No applications yet.
            <br />
            Browse open opportunities and apply to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {applications.map((application) => {
        const config = statusConfig[application.status]
        const StatusIcon = config.icon

        return (
          <Card key={application.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <StatusIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">
                        {application.opportunity?.title || 'Application'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Applied {new Date(application.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={config.className}>
                      {config.label}
                    </Badge>
                  </div>

                  {application.cover_message && (
                    <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                      &ldquo;{application.cover_message}&rdquo;
                    </p>
                  )}

                  {application.review_notes && application.status !== 'pending' && (
                    <div className="mt-3 p-2 rounded bg-muted">
                      <p className="text-xs font-medium mb-1">Feedback:</p>
                      <p className="text-sm">{application.review_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
