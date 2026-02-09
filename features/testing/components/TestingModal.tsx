'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, XCircle, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  generateChecklistAction,
  getTestSessionAction,
  getOrCreateTestSessionAction,
  startTestingSessionAction,
  updateChecklistItemServerAction,
  submitTestResultsAction,
  addChecklistItemAction,
} from '@/features/testing/actions/testingActions'
import type { ChecklistCategory, TestChecklistItem, TestingStage } from '@/lib/api/testing'
import type { DeliverableTestSummary } from '@/lib/api/testing'
import type { UserRole } from '@/lib/auth/types'

interface TestingModalProps {
  deliverable: DeliverableTestSummary
  open: boolean
  onClose: () => void
  userRole: UserRole
  userId: string
}

const categoryLabels: Record<ChecklistCategory, string> = {
  functional: 'Functional',
  edge_cases: 'Edge Cases',
  integration: 'Integration',
  security: 'Security',
  ui_responsive: 'UI/Responsive',
  custom: 'Custom',
}

const stageLabels: Record<TestingStage, string> = {
  dev: 'Self-Testing',
  admin_int: 'QA Review',
  client: 'Client UAT',
}

export function TestingModal({ deliverable, open, onClose, userRole, userId }: TestingModalProps) {
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [testSession, setTestSession] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [activeTab, setActiveTab] = useState('checklist')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [newItemDesc, setNewItemDesc] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<ChecklistCategory>('functional')
  const [addingItem, setAddingItem] = useState(false)

  const stageToTest: TestingStage = deliverable.next_stage || 'dev'

  useEffect(() => {
    if (open) {
      loadTestSession()
    }
  }, [open, deliverable.deliverable_id, stageToTest])

  const loadTestSession = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const session = await getOrCreateTestSessionAction(deliverable.deliverable_id, stageToTest)
      if (!session?.id) {
        setLoadError('Failed to create test session')
        return
      }
      const fullSession = await getTestSessionAction(session.id)
      setTestSession(fullSession)
    } catch (error) {
      console.error('Failed to load test session:', error)
      setLoadError('Failed to load test session. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!testSession || !newItemDesc.trim()) return
    setAddingItem(true)
    try {
      await addChecklistItemAction(testSession.id, newItemCategory, newItemDesc.trim())
      setNewItemDesc('')
      await loadTestSession()
      toast.success('Item added')
    } catch (error) {
      console.error('Failed to add checklist item:', error)
      toast.error('Failed to add item')
    } finally {
      setAddingItem(false)
    }
  }

  const handleStartTesting = async () => {
    if (!testSession) return
    setStarting(true)
    try {
      await startTestingSessionAction(testSession.id)
      await loadTestSession()
    } catch (error) {
      console.error('Failed to start testing:', error)
    } finally {
      setStarting(false)
    }
  }

  const handleGenerateChecklist = async () => {
    if (!testSession) return
    setGenerating(true)
    try {
      const result = await generateChecklistAction(
        testSession.id,
        deliverable.deliverable_title,
        null
      )
      if (result.success) {
        toast.success(`Generated ${result.itemCount} checklist items`)
      }
      await loadTestSession()
    } catch (error) {
      console.error('Failed to generate checklist:', error)
      toast.error('Failed to generate checklist')
    } finally {
      setGenerating(false)
    }
  }

  const handleItemChange = async (
    itemId: string,
    passed: boolean,
    failureReason?: string
  ) => {
    try {
      await updateChecklistItemServerAction(itemId, passed, failureReason || '')
      await loadTestSession()
    } catch (error) {
      console.error('Failed to update item:', error)
    }
  }

  const handleSubmit = async () => {
    if (!testSession) return
    setSubmitting(true)
    try {
      await submitTestResultsAction(
        testSession.id,
        notes,
        true
      )
      onClose()
    } catch (error: any) {
      console.error('Failed to submit test:', error)
      alert(error.message || 'Failed to submit test')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = testSession?.items?.every(
    (item: TestChecklistItem) => item.passed !== null
  )

  const passedCount = testSession?.items?.filter((i: TestChecklistItem) => i.passed === true).length ?? 0
  const failedCount = testSession?.items?.filter((i: TestChecklistItem) => i.passed === false).length ?? 0
  const totalCount = testSession?.items?.length ?? 0

  const itemsByCategory = testSession?.items?.reduce((acc: Record<string, TestChecklistItem[]>, item: TestChecklistItem) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, TestChecklistItem[]>) ?? {}

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Testing: {deliverable.deliverable_title}</span>
            <Badge variant="outline">{stageLabels[stageToTest]}</Badge>
          </DialogTitle>
          <DialogDescription>
            {testSession?.status === 'pending'
              ? 'Start testing to begin the checklist'
              : `Progress: ${passedCount}/${totalCount} passed`
            }
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" onClick={loadTestSession}>Retry</Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="checklist">
                Checklist ({totalCount})
              </TabsTrigger>
              <TabsTrigger value="notes">
                Notes & Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="checklist" className="mt-4">
              {testSession?.status === 'pending' ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Ready to start {stageLabels[stageToTest].toLowerCase()}?
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={handleStartTesting} disabled={starting}>
                      {starting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Start Testing
                    </Button>
                    {totalCount === 0 && (
                      <Button variant="outline" onClick={handleGenerateChecklist} disabled={generating}>
                        {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {generating ? 'Generating...' : 'Generate Checklist'}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  {totalCount === 0 ? (
                    <div className="text-center py-8 space-y-6">
                      <p className="text-muted-foreground">No checklist items yet.</p>
                      <Button variant="outline" onClick={handleGenerateChecklist} disabled={generating}>
                        {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {generating ? 'Generating...' : 'Generate Checklist'}
                      </Button>
                      <div className="border-t pt-4">
                        <p className="text-sm text-muted-foreground mb-3">Or add items manually:</p>
                        <div className="flex gap-2">
                          <Select value={newItemCategory} onValueChange={(v) => setNewItemCategory(v as ChecklistCategory)}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(categoryLabels) as Array<[ChecklistCategory, string]>).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Describe the test item..."
                            value={newItemDesc}
                            onChange={(e) => setNewItemDesc(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                          />
                          <Button size="sm" onClick={handleAddItem} disabled={addingItem || !newItemDesc.trim()}>
                            {addingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {(Object.entries(itemsByCategory) as Array<[string, TestChecklistItem[]]>).map(([category, items]) => (
                        <div key={category}>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            {categoryLabels[category as ChecklistCategory]}
                            <Badge variant="secondary" className="text-xs">
                              {items.filter(i => i.passed === true).length}/{items.length}
                            </Badge>
                          </h4>
                          <div className="space-y-3">
                            {items.map((item) => (
                              <ChecklistItem
                                key={item.id}
                                item={item}
                                onChange={handleItemChange}
                              />
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Add item + Generate controls */}
                      <div className="border-t pt-4 space-y-3">
                        <div className="flex gap-2">
                          <Select value={newItemCategory} onValueChange={(v) => setNewItemCategory(v as ChecklistCategory)}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(categoryLabels) as Array<[ChecklistCategory, string]>).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Add a test item..."
                            value={newItemDesc}
                            onChange={(e) => setNewItemDesc(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                          />
                          <Button size="sm" onClick={handleAddItem} disabled={addingItem || !newItemDesc.trim()}>
                            {addingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          </Button>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleGenerateChecklist} disabled={generating}>
                          {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {generating ? 'Generating...' : 'Generate More Items'}
                        </Button>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <div className="space-y-4">
                <div>
                  <Textarea
                    placeholder="Add any observations, issues found, or context for this test..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                    className="mt-2"
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Items:</span>
                      <span className="ml-2 font-medium">{totalCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Passed:</span>
                      <span className="ml-2 font-medium text-green-600">{passedCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Failed:</span>
                      <span className="ml-2 font-medium text-red-600">{failedCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-between border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {testSession?.status !== 'pending' && totalCount > 0 && (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              variant={failedCount > 0 ? 'destructive' : 'default'}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {failedCount > 0 ? 'Submit with Failures' : 'Submit Passed Test'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ChecklistItemProps {
  item: TestChecklistItem
  onChange: (itemId: string, passed: boolean, failureReason?: string) => void
}

function ChecklistItem({ item, onChange }: ChecklistItemProps) {
  const [failureReason, setFailureReason] = useState(item.failure_reason || '')
  const [showFailureInput, setShowFailureInput] = useState(item.passed === false)

  const handleCheck = (checked: boolean) => {
    if (checked) {
      onChange(item.id, true)
      setShowFailureInput(false)
      setFailureReason('')
    } else {
      setShowFailureInput(true)
    }
  }

  const handleFail = () => {
    onChange(item.id, false, failureReason)
  }

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-colors',
      item.passed === true && 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
      item.passed === false && 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
      item.passed === null && 'bg-background'
    )}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={item.passed === true}
          onCheckedChange={handleCheck}
          disabled={item.passed !== null}
        />
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm',
            item.passed === true && 'line-through text-muted-foreground',
            item.passed === false && 'text-red-700 dark:text-red-300'
          )}>
            {item.description}
          </p>
          {item.is_auto_generated && (
            <Badge variant="outline" className="mt-1 text-xs">AI-suggested</Badge>
          )}
        </div>
        {item.passed === true && (
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
        )}
        {item.passed === false && (
          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
        )}
      </div>

      {showFailureInput && (
        <div className="mt-3 ml-7">
          <Textarea
            placeholder="Describe what failed..."
            value={failureReason}
            onChange={(e) => setFailureReason(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <Button
            size="sm"
            variant="destructive"
            onClick={handleFail}
            className="mt-2"
          >
            Mark as Failed
          </Button>
        </div>
      )}

      {item.passed === false && item.failure_reason && (
        <div className="mt-2 ml-7 text-sm text-red-600 dark:text-red-400">
          <span className="font-medium">Reason:</span> {item.failure_reason}
        </div>
      )}
    </div>
  )
}
