'use client'

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Filter,
  Search,
  ChevronDown,
  Download,
  Bot,
  ArrowLeftRight,
  Activity,
} from 'lucide-react'
import type { ActivityLogWithUser, ActivityLogCategory } from '@/lib/types/activity-logs'
import {
  formatActivityCategory,
  getActivityCategoryColor,
  formatActivityAction,
  ENTITY_TYPES,
} from '@/lib/types/activity-logs'
import { ExportDialog } from './ExportDialog'

interface ActivityLogContentProps {
  initialLogs: ActivityLogWithUser[]
  initialCount: number
  users: Array<{ id: string; email: string; name: string }>
}

const categories: ActivityLogCategory[] = [
  'crud',
  'auth',
  'ai',
  'payment',
  'conversation',
  'status',
  'file',
  'error',
]

export function ActivityLogContent({
  initialLogs,
  initialCount,
  users,
}: ActivityLogContentProps) {
  // Filters
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [userId, setUserId] = useState<string>('all')
  const [entityType, setEntityType] = useState<string>('all')

  // Expanded rows
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Export dialog
  const [showExport, setShowExport] = useState(false)

  // Client-side filtering for demo (real implementation would use server actions)
  const filteredLogs = initialLogs.filter((log) => {
    if (category !== 'all' && log.category !== category) return false
    if (userId !== 'all' && log.user_id !== userId) return false
    if (entityType !== 'all' && log.entity_type !== entityType) return false
    if (search) {
      const searchLower = search.toLowerCase()
      const searchableText = [
        log.action,
        log.user_email,
        log.entity_name,
        log.entity_type,
        JSON.stringify(log.metadata),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!searchableText.includes(searchLower)) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {formatActivityCategory(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {ENTITY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setShowExport(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        {filteredLogs.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No activity logs found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters
            </p>
          </CardContent>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Timestamp</TableHead>
                  <TableHead className="w-[180px]">User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="w-[180px]">Entity</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <Collapsible key={log.id} asChild open={expandedId === log.id}>
                    <>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">
                          <div
                            title={format(new Date(log.timestamp), 'PPpp')}
                            className="text-muted-foreground"
                          >
                            {formatDistanceToNow(new Date(log.timestamp), {
                              addSuffix: true,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm truncate max-w-[160px]">
                              {log.user?.name || log.user_email || 'System'}
                            </span>
                            {log.user_role && (
                              <span className="text-xs text-muted-foreground">
                                {log.user_role}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={getActivityCategoryColor(log.category)}>
                              {formatActivityCategory(log.category)}
                            </Badge>
                            <span className="text-sm">
                              {formatActivityAction(log.action)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.entity_type && (
                            <div className="flex flex-col">
                              <span className="text-sm truncate max-w-[160px]">
                                {log.entity_name || log.entity_id?.slice(0, 8)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {log.entity_type}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setExpandedId(expandedId === log.id ? null : log.id)
                              }
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  expandedId === log.id ? 'rotate-180' : ''
                                }`}
                              />
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={5}>
                            <div className="py-4 space-y-4">
                              {/* AI Details */}
                              {log.ai_prompt && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <Bot className="h-4 w-4 text-cyan-500" />
                                    AI Interaction ({log.ai_model})
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="rounded-lg bg-background p-3 border">
                                      <p className="text-xs text-muted-foreground mb-1">
                                        Prompt
                                      </p>
                                      <p className="text-sm whitespace-pre-wrap max-h-48 overflow-auto">
                                        {log.ai_prompt}
                                      </p>
                                    </div>
                                    <div className="rounded-lg bg-background p-3 border">
                                      <p className="text-xs text-muted-foreground mb-1">
                                        Response
                                      </p>
                                      <p className="text-sm whitespace-pre-wrap max-h-48 overflow-auto">
                                        {log.ai_response}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-4 text-xs text-muted-foreground">
                                    <span>
                                      {log.ai_tokens_used?.toLocaleString()} tokens
                                    </span>
                                    <span>{log.ai_latency_ms}ms</span>
                                  </div>
                                </div>
                              )}

                              {/* Changes Diff */}
                              {log.changes && Object.keys(log.changes).length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <ArrowLeftRight className="h-4 w-4 text-orange-500" />
                                    Changes
                                  </div>
                                  <div className="rounded-lg bg-background p-3 border">
                                    {Object.entries(log.changes).map(([field, change]) => (
                                      <div
                                        key={field}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <span className="font-medium min-w-[80px]">
                                          {field}:
                                        </span>
                                        <span className="text-red-500 line-through">
                                          {String(change.old)}
                                        </span>
                                        <span className="text-muted-foreground">→</span>
                                        <span className="text-green-500">
                                          {String(change.new)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Error Stack */}
                              {log.error_stack && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-red-500">
                                    Error Stack
                                  </p>
                                  <pre className="text-xs bg-background p-3 rounded-lg border overflow-auto max-h-48">
                                    {log.error_stack}
                                  </pre>
                                </div>
                              )}

                              {/* Metadata */}
                              {log.metadata &&
                                Object.keys(log.metadata).length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium">Metadata</p>
                                    <pre className="text-xs bg-background p-3 rounded-lg border overflow-auto max-h-32">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}

                              {/* Request Context */}
                              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
                                {log.ip_address && <span>IP: {log.ip_address}</span>}
                                {log.browser && <span>Browser: {log.browser}</span>}
                                {log.os && <span>OS: {log.os}</span>}
                                {log.request_path && <span>Path: {log.request_path}</span>}
                                {log.duration_ms && (
                                  <span>Duration: {log.duration_ms}ms</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>

            {/* Pagination info */}
            <div className="p-4 border-t text-sm text-muted-foreground">
              Showing {filteredLogs.length} of {initialCount.toLocaleString()} logs
            </div>
          </>
        )}
      </Card>

      {/* Export Dialog */}
      <ExportDialog open={showExport} onOpenChange={setShowExport} />
    </div>
  )
}
