'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Users,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RequirementRole } from '@/lib/api/project-requirements'

export interface RequirementItem {
  id: string
  title: string
  description: string
  assigned_role: RequirementRole
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [customSuggestion, setCustomSuggestion] = useState('')

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedIds(newSet)
  }

  const addRequirement = () => {
    const newId = `req-${Date.now()}`
    onChange([
      ...requirements,
      { id: newId, title: '', description: '', assigned_role: 'admin' },
    ])
    // Auto-expand new items
    setExpandedIds((prev) => new Set([...prev, newId]))
  }

  const addSuggestion = (suggestion: string) => {
    const newId = `req-${Date.now()}`
    onChange([
      ...requirements,
      { id: newId, title: suggestion, description: '', assigned_role: 'admin' },
    ])
  }

  const addCustomSuggestion = () => {
    if (!customSuggestion.trim()) return
    addSuggestion(customSuggestion.trim())
    setCustomSuggestion('')
  }

  const updateRequirement = (
    id: string,
    field: 'title' | 'description' | 'assigned_role',
    value: string
  ) => {
    onChange(
      requirements.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }

  const toggleRole = (id: string) => {
    onChange(
      requirements.map((r) =>
        r.id === id
          ? { ...r, assigned_role: r.assigned_role === 'admin' ? 'client' : 'admin' }
          : r
      )
    )
  }

  const removeRequirement = (id: string) => {
    onChange(requirements.filter((r) => r.id !== id))
    setExpandedIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
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
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground mr-2 py-1">
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

        {/* Custom quick-add input */}
        <div className="flex gap-2">
          <Input
            placeholder="Add custom requirement..."
            value={customSuggestion}
            onChange={(e) => setCustomSuggestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustomSuggestion()
              }
            }}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addCustomSuggestion}
            disabled={!customSuggestion.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Requirements list */}
      <div className="space-y-2">
        {requirements.map((requirement, index) => {
          const isExpanded = expandedIds.has(requirement.id) || !!requirement.description

          return (
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
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpanded(requirement.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  <Input
                    placeholder="Requirement (e.g., Instagram login credentials)"
                    value={requirement.title}
                    onChange={(e) =>
                      updateRequirement(requirement.id, 'title', e.target.value)
                    }
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 h-8"
                  />

                  {/* Role toggle */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => toggleRole(requirement.id)}
                    title={`Assigned to: ${requirement.assigned_role === 'admin' ? 'Internal team' : 'Client'}`}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        requirement.assigned_role === 'admin'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                      )}
                    >
                      {requirement.assigned_role === 'admin' ? (
                        <>
                          <Users className="h-3 w-3 mr-1" />
                          Internal
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          Client
                        </>
                      )}
                    </Badge>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRequirement(requirement.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {isExpanded && (
                  <div className="mt-2 ml-10 mr-10">
                    <Textarea
                      placeholder="Description (optional) - add details about what's needed..."
                      value={requirement.description}
                      onChange={(e) =>
                        updateRequirement(
                          requirement.id,
                          'description',
                          e.target.value
                        )
                      }
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add button */}
      <Button variant="outline" className="w-full" onClick={addRequirement}>
        <Plus className="h-4 w-4 mr-2" />
        Add Requirement
      </Button>

      {/* Empty state */}
      {requirements.length === 0 && (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
          <p>No requirements added yet.</p>
          <p className="text-sm mt-1">
            Use quick-add above or click &quot;Add Requirement&quot; below.
          </p>
        </div>
      )}
    </div>
  )
}
