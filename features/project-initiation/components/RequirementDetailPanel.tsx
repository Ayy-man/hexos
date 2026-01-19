'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Video, Link as LinkIcon } from 'lucide-react'
import type { RequirementNode } from '../utils/treeHelpers'

interface RequirementDetailPanelProps {
  node: RequirementNode
  onUpdate: (updates: Partial<RequirementNode>) => void
  isEditing: boolean
  onStartEdit: () => void
}

export function RequirementDetailPanel({
  node,
  onUpdate,
  isEditing,
  onStartEdit,
}: RequirementDetailPanelProps) {
  const handleFocus = () => {
    if (!isEditing) onStartEdit()
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor={`title-${node.id}`}>Title</Label>
        <Input
          id={`title-${node.id}`}
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          onFocus={handleFocus}
          placeholder="Requirement title"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor={`desc-${node.id}`}>Description</Label>
        <Textarea
          id={`desc-${node.id}`}
          value={node.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          onFocus={handleFocus}
          placeholder="Describe what needs to be done..."
          rows={3}
        />
      </div>

      {/* Owner & Blocker row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Owner</Label>
          <Select
            value={node.owner_type}
            onValueChange={(value) =>
              onUpdate({ owner_type: value as RequirementNode['owner_type'] })
            }
          >
            <SelectTrigger onFocus={handleFocus}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hexona">Hexona</SelectItem>
              <SelectItem value="dfy">DFY Partner</SelectItem>
              <SelectItem value="client">Client</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Blocker Type</Label>
          <Select
            value={node.blocker_type}
            onValueChange={(value) =>
              onUpdate({ blocker_type: value as RequirementNode['blocker_type'] })
            }
          >
            <SelectTrigger onFocus={handleFocus}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="partial">Partial Blocker</SelectItem>
              <SelectItem value="absolute">Absolute Blocker</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* URLs row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`loom-${node.id}`} className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Loom URL
          </Label>
          <Input
            id={`loom-${node.id}`}
            value={node.loom_url}
            onChange={(e) => onUpdate({ loom_url: e.target.value })}
            onFocus={handleFocus}
            placeholder="https://loom.com/..."
            type="url"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`resource-${node.id}`} className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Resource URL
          </Label>
          <Input
            id={`resource-${node.id}`}
            value={node.resource_url}
            onChange={(e) => onUpdate({ resource_url: e.target.value })}
            onFocus={handleFocus}
            placeholder="https://..."
            type="url"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor={`notes-${node.id}`}>Internal Notes</Label>
        <Textarea
          id={`notes-${node.id}`}
          value={node.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          onFocus={handleFocus}
          placeholder="Notes for internal reference..."
          rows={2}
        />
      </div>
    </div>
  )
}
