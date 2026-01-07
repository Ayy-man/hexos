'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { YearlyGoalCard } from '../YearlyGoalCard'
import { TargetCardEnhanced } from '../TargetCardEnhanced'
import type { PulseGoal, PulseTargetWithOwners, Quarter } from '@/lib/types/pulse'

interface GoalsTabProps {
  goal: PulseGoal | null
  targets: PulseTargetWithOwners[]
  quarter: Quarter
  year: number
  isAdmin: boolean
  onUpdate: () => void
}

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4']

export function GoalsTab({
  goal,
  targets,
  quarter: currentQuarter,
  year,
  isAdmin,
  onUpdate,
}: GoalsTabProps) {
  const [expandedQuarters, setExpandedQuarters] = useState<Quarter[]>([currentQuarter])

  const toggleQuarter = (q: Quarter) => {
    setExpandedQuarters((prev) =>
      prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
    )
  }

  const getTargetsForQuarter = (q: Quarter) =>
    targets.filter((t) => t.quarter === q)

  const monthRanges: Record<Quarter, string> = {
    Q1: 'Jan - Mar',
    Q2: 'Apr - Jun',
    Q3: 'Jul - Sep',
    Q4: 'Oct - Dec',
  }

  return (
    <div className="space-y-6">
      {/* Yearly Goal */}
      <YearlyGoalCard goal={goal} year={year} isAdmin={isAdmin} onUpdate={onUpdate} />

      {/* Quarterly Sections */}
      {QUARTERS.map((q) => {
        const quarterTargets = getTargetsForQuarter(q)
        const isExpanded = expandedQuarters.includes(q)
        const isCurrent = q === currentQuarter

        return (
          <Card key={q} className="overflow-hidden">
            <button
              onClick={() => toggleQuarter(q)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {q} ({monthRanges[q]})
                </span>
                {isCurrent && (
                  <span className="text-xs bg-cyan-400/20 text-cyan-400 px-2 py-0.5 rounded">
                    Current
                  </span>
                )}
              </div>

              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    // TODO: Open add target modal
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Target
                </Button>
              )}
            </button>

            {isExpanded && (
              <div className="p-4 pt-0 space-y-4">
                {quarterTargets.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No targets yet. What do you want to achieve this quarter?
                  </p>
                ) : (
                  quarterTargets.map((target) => (
                    <TargetCardEnhanced
                      key={target.id}
                      target={target}
                      isAdmin={isAdmin}
                      onUpdate={onUpdate}
                    />
                  ))
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
