'use client'

import { FileSearch } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CaseStudy } from '@/lib/api/case-studies'

interface CaseStudyPreviewSidebarProps {
  caseStudy: CaseStudy | null
  className?: string
}

export function CaseStudyPreviewSidebar({ caseStudy, className }: CaseStudyPreviewSidebarProps) {
  if (!caseStudy) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileSearch className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Select a case study to see a preview</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {caseStudy.icon && <span>{caseStudy.icon}</span>}
          {caseStudy.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {caseStudy.client_name && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Client</p>
            <p className="text-sm font-medium">{caseStudy.client_name}</p>
          </div>
        )}
        {caseStudy.industry && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Industry</p>
            <p className="text-sm">{caseStudy.industry}</p>
          </div>
        )}
        {caseStudy.description && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">About</p>
            <p className="text-sm line-clamp-3">{caseStudy.description}</p>
          </div>
        )}
        {caseStudy.challenge && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Challenge</p>
            <p className="text-sm line-clamp-3">{caseStudy.challenge}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
