'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Filter } from 'lucide-react'
import { BlockerCard } from './BlockerCard'
import { BlockerSidebar } from './BlockerSidebar'
import type { Blocker, BlockerPriority } from '@/lib/api/blockers'

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

export function AdminBlockerQueue({ blockers, projects }: AdminBlockerQueueProps) {
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [selectedBlocker, setSelectedBlocker] = useState<Blocker | null>(null)

  // Filter
  let filtered = blockers

  if (filterProject !== 'all') {
    filtered = filtered.filter(b => b.project_id === filterProject)
  }
  if (filterPriority !== 'all') {
    filtered = filtered.filter(b => b.priority === filterPriority)
  }
  if (filterStatus === 'active') {
    filtered = filtered.filter(b => !['resolved', 'closed'].includes(b.status))
  } else if (filterStatus !== 'all') {
    filtered = filtered.filter(b => b.status === filterStatus)
  }

  // Sort: priority first, then oldest first
  filtered = [...filtered].sort((a, b) => {
    const pd = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (pd !== 0) return pd
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  // Keep selected blocker in sync with latest data after router.refresh()
  const selectedBlockerData = selectedBlocker
    ? blockers.find(b => b.id === selectedBlocker.id) ?? null
    : null

  return (
    <div className="space-y-3">
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
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="reported">New</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Blocker card list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
          <Check className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No blockers matching your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
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
