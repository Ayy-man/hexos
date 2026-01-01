'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProposalDeliverable } from '@/lib/api/proposal-deliverables'

interface DeliverablesStepProps {
  deliverables: ProposalDeliverable[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  totalPrice: number
}

export function DeliverablesStep({
  deliverables,
  selectedIds,
  onSelectionChange,
  totalPrice,
}: DeliverablesStepProps) {
  const allSelected = selectedIds.length === deliverables.length
  const noneSelected = selectedIds.length === 0

  const toggleDeliverable = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const selectAll = () => {
    onSelectionChange(deliverables.map(d => d.id))
  }

  const selectNone = () => {
    onSelectionChange([])
  }

  const formatCurrency = (value: number | null) => {
    if (value == null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Select Deliverables</h2>
        <p className="text-muted-foreground">
          Choose which deliverables from the proposal to include in the project
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button
                  variant={allSelected ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={selectAll}
                >
                  Select All
                </Button>
                <Button
                  variant={noneSelected ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={selectNone}
                >
                  Select None
                </Button>
              </div>
              <div className="h-6 w-px bg-border" />
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} of {deliverables.length} selected
              </span>
            </div>

            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPrice)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliverables List */}
      {deliverables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Deliverables Found</h3>
            <p className="text-muted-foreground">
              There are no deliverables in this proposal to select.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {deliverables.map((deliverable) => {
            const isSelected = selectedIds.includes(deliverable.id)
            const price = deliverable.counter_price ?? deliverable.price

            return (
              <Card
                key={deliverable.id}
                className={cn(
                  'cursor-pointer transition-all',
                  isSelected
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                )}
                onClick={() => toggleDeliverable(deliverable.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center pt-0.5">
                      {isSelected ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-medium">{deliverable.name}</h3>
                          {deliverable.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {deliverable.description}
                            </p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          {price != null ? (
                            <span className="font-semibold text-green-600">
                              {formatCurrency(price)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>

                      {/* Status badges */}
                      <div className="flex items-center gap-2 mt-2">
                        {deliverable.source === 'ai_parsed' && (
                          <Badge variant="outline" className="text-xs">
                            AI Parsed
                          </Badge>
                        )}
                        {deliverable.source === 'blueprint_tier' && (
                          <Badge variant="outline" className="text-xs">
                            Blueprint
                          </Badge>
                        )}
                        {deliverable.change_status === 'edited' && (
                          <Badge variant="secondary" className="text-xs">
                            Edited
                          </Badge>
                        )}
                        {deliverable.change_status === 'added' && (
                          <Badge variant="secondary" className="text-xs">
                            Added
                          </Badge>
                        )}
                        {deliverable.change_status === 'countered' && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                            Countered
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
