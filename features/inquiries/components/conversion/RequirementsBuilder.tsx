'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RequirementItem {
  id: string
  title: string
  description: string
}

interface RequirementsBuilderProps {
  requirements: RequirementItem[]
  onChange: (requirements: RequirementItem[]) => void
  suggestions?: string[]
}

export function RequirementsBuilder({
  requirements,
  onChange,
  suggestions = [],
}: RequirementsBuilderProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const addRequirement = () => {
    const newId = `req-${Date.now()}`
    onChange([...requirements, { id: newId, title: '', description: '' }])
  }

  const addSuggestion = (suggestion: string) => {
    const newId = `req-${Date.now()}`
    onChange([...requirements, { id: newId, title: suggestion, description: '' }])
  }

  const updateRequirement = (
    id: string,
    field: 'title' | 'description',
    value: string
  ) => {
    onChange(
      requirements.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }

  const removeRequirement = (id: string) => {
    onChange(requirements.filter((r) => r.id !== id))
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newItems = [...requirements]
    const [draggedItem] = newItems.splice(draggedIndex, 1)
    newItems.splice(index, 0, draggedItem)
    onChange(newItems)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Filter out suggestions that are already added
  const availableSuggestions = suggestions.filter(
    (s) => !requirements.some((r) => r.title.toLowerCase() === s.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Quick add suggestions */}
      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground mr-2">
            Quick add:
          </span>
          {availableSuggestions.slice(0, 5).map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              size="sm"
              onClick={() => addSuggestion(suggestion)}
            >
              <Plus className="h-3 w-3 mr-1" />
              {suggestion}
            </Button>
          ))}
        </div>
      )}

      {/* Requirements list */}
      <div className="space-y-3">
        {requirements.map((requirement, index) => (
          <Card
            key={requirement.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'cursor-move transition-opacity',
              draggedIndex === index && 'opacity-50'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-2 text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Requirement title (e.g., Instagram login credentials)"
                    value={requirement.title}
                    onChange={(e) =>
                      updateRequirement(requirement.id, 'title', e.target.value)
                    }
                  />
                  <Textarea
                    placeholder="Additional details (optional)"
                    value={requirement.description}
                    onChange={(e) =>
                      updateRequirement(
                        requirement.id,
                        'description',
                        e.target.value
                      )
                    }
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeRequirement(requirement.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add button */}
      <Button variant="outline" className="w-full" onClick={addRequirement}>
        <Plus className="h-4 w-4 mr-2" />
        Add Requirement
      </Button>

      {/* Empty state */}
      {requirements.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No requirements added yet.</p>
          <p className="text-sm">
            Add items that need to be collected from the client before starting.
          </p>
        </div>
      )}
    </div>
  )
}
