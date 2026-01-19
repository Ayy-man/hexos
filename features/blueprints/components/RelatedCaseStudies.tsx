import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

interface RelatedCaseStudy {
  id: string
  name: string
  description: string | null
  icon: string | null
  image_url: string | null
  client_name: string | null
  industry: string | null
}

interface RelatedCaseStudiesProps {
  caseStudies: RelatedCaseStudy[]
}

export function RelatedCaseStudies({ caseStudies }: RelatedCaseStudiesProps) {
  if (caseStudies.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Related Case Studies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {caseStudies.map((study) => (
          <Link
            key={study.id}
            href={`/case-studies/${study.id}`}
            className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {study.icon && (
                <span className="text-xl shrink-0">{study.icon}</span>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{study.name}</div>
                {study.client_name && (
                  <div className="text-sm text-muted-foreground truncate">
                    {study.client_name}
                    {study.industry && ` - ${study.industry}`}
                  </div>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
