'use client'

import { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlockerCard } from './BlockerCard'
import { BlockerSidebar } from './BlockerSidebar'
import type { Blocker, BlockerPriority, BlockerStatus } from '@/lib/api/blockers'

interface Project {
  id: string
  project_name: string
  client_name: string
}

interface AdminBlockerQueueProps {
  blockers: Blocker[]
  projects: Project[]
}

const priorityOrder: Record<BlockerPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

type StatusFilter = 'active' | 'all' | BlockerStatus

interface StatusChip {
  key: StatusFilter
  label: string
  count: (blockers: Blocker[]) => number
}

const statusChips: StatusChip[] = [
  { key: 'active', label: 'Active', count: (b) => b.filter(x => !['resolved', 'closed'].includes(x.status)).length },
  { key: 'reported', label: 'New', count: (b) => b.filter(x => x.status === 'reported').length },
  { key: 'acknowledged', label: 'Acknowledged', count: (b) => b.filter(x => x.status === 'acknowledged').length },
  { key: 'in_progress', label: 'In Progress', count: (b) => b.filter(x => x.status === 'in_progress').length },
  { key: 'resolved', label: 'Resolved', count: (b) => b.filter(x => x.status === 'resolved').length },
  { key: 'all', label: 'All', count: (b) => b.length },
]

export function AdminBlockerQueue({ blockers, projects }: AdminBlockerQueueProps) {
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('active')
  const [selectedBlocker, setSelectedBlocker] = useState<Blocker | null>(null)

  // Pre-filter by project/priority for chip counts
  const projectPriorityFiltered = useMemo(() => {
    let result = blockers
    if (filterProject !== 'all') {
      result = result.filter(b => b.project_id === filterProject)
    }
    if (filterPriority !== 'all') {
      result = result.filter(b => b.priority === filterPriority)
    }
    return result
  }, [blockers, filterProject, filterPriority])

  // Apply status filter
  const filtered = useMemo(() => {
    let result = projectPriorityFiltered
    if (filterStatus === 'active') {
      result = result.filter(b => !['resolved', 'closed'].includes(b.status))
    } else if (filterStatus !== 'all') {
      result = result.filter(b => b.status === filterStatus)
    }
    // Sort: priority first, then oldest first
    return [...result].sort((a, b) => {
      const pd = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (pd !== 0) return pd
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }, [projectPriorityFiltered, filterStatus])

  // Keep selected blocker in sync with latest data after router.refresh()
  const selectedBlockerData = selectedBlocker
    ? blockers.find(b => b.id === selectedBlocker.id) ?? null
    : null

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-text-ghost" />
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status chip filters */}
      <div className="flex flex-wrap gap-2">
        {statusChips.map((chip) => {
          const count = chip.count(projectPriorityFiltered)
          const isActive = filterStatus === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilterStatus(chip.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-bg-hover text-text-secondary hover:bg-bg-active'
              )}
            >
              {chip.label}
              <span className={cn(
                'rounded-full px-1.5 py-0 text-[10px] min-w-[18px] text-center',
                isActive ? 'bg-accent-foreground/20' : 'bg-bg-active'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bento grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
          <Check className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No blockers matching your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((blocker) => {
            const project = projects.find(p => p.id === blocker.project_id)
            return (
              <BlockerCard
                key={blocker.id}
                blocker={blocker}
                projectName={project?.project_name}
                isSelected={selectedBlocker?.id === blocker.id}
                onClick={() => setSelectedBlocker(blocker)}
              />
            )
          })}
        </div>
      )}

      {/* Sidebar */}
      <BlockerSidebar
        blocker={selectedBlockerData}
        onClose={() => setSelectedBlocker(null)}
      />
    </div>
  )
}
