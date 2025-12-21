import { requireRole } from '@/lib/auth/guards'
import { getBlueprints } from '@/lib/api/blueprints'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Layers } from 'lucide-react'

export default async function BlueprintsPage() {
  await requireRole(['admin', 'internal'])

  let blueprints: Awaited<ReturnType<typeof getBlueprints>> = []

  try {
    blueprints = await getBlueprints()
  } catch (error) {
    console.error('Failed to fetch blueprints:', error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Blueprints</h1>
        <p className="text-muted-foreground">
          Pre-built automation solutions catalog
        </p>
      </div>

      {blueprints.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No blueprints found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Run the blueprints seed migration in Supabase
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {blueprints.map((blueprint) => (
            <Card key={blueprint.id}>
              <CardHeader>
                <CardTitle className="text-lg">{blueprint.name}</CardTitle>
                {blueprint.description && (
                  <CardDescription>{blueprint.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {blueprint.base_price ? (
                    <Badge variant="secondary">
                      ${blueprint.base_price.toLocaleString()}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Price TBD</Badge>
                  )}
                  {blueprint.estimated_hours && (
                    <span className="text-sm text-muted-foreground">
                      ~{blueprint.estimated_hours}h
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
