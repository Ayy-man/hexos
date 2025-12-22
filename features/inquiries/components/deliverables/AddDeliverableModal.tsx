'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Package, PenLine, Info } from 'lucide-react'
import { BlueprintTierSelector } from './BlueprintTierSelector'
import type { Blueprint } from '@/lib/api/blueprints'

interface AddDeliverableModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  blueprints: Blueprint[]
  onAddFromBlueprint: (
    blueprintId: string,
    tierName: string,
    tierPrice: number,
    features: string[]
  ) => Promise<void>
  onAddCustom: (name: string, description: string) => Promise<void>
}

export function AddDeliverableModal({
  open,
  onOpenChange,
  blueprints,
  onAddFromBlueprint,
  onAddCustom,
}: AddDeliverableModalProps) {
  const [tab, setTab] = useState<'blueprint' | 'custom'>('blueprint')
  const [isPending, startTransition] = useTransition()

  // Blueprint selection state
  const [selectedBlueprint, setSelectedBlueprint] = useState<{
    blueprintId: string
    tierName: string
    tierPrice: number
    features: string[]
  } | null>(null)

  // Custom form state
  const [customName, setCustomName] = useState('')
  const [customDescription, setCustomDescription] = useState('')

  const handleBlueprintSelect = (
    blueprintId: string,
    tierName: string,
    tierPrice: number,
    features: string[]
  ) => {
    setSelectedBlueprint({ blueprintId, tierName, tierPrice, features })
  }

  const handleAddBlueprint = () => {
    if (!selectedBlueprint) return

    startTransition(async () => {
      await onAddFromBlueprint(
        selectedBlueprint.blueprintId,
        selectedBlueprint.tierName,
        selectedBlueprint.tierPrice,
        selectedBlueprint.features
      )
      onOpenChange(false)
      setSelectedBlueprint(null)
    })
  }

  const handleAddCustom = () => {
    if (!customName.trim()) return

    startTransition(async () => {
      await onAddCustom(customName.trim(), customDescription.trim())
      onOpenChange(false)
      setCustomName('')
      setCustomDescription('')
    })
  }

  const handleClose = () => {
    if (!isPending) {
      onOpenChange(false)
      setSelectedBlueprint(null)
      setCustomName('')
      setCustomDescription('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Deliverable</DialogTitle>
          <DialogDescription>
            Add a deliverable from an existing blueprint or create a custom one.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'blueprint' | 'custom')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="blueprint" className="gap-2">
              <Package className="h-4 w-4" />
              From Blueprint
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-2">
              <PenLine className="h-4 w-4" />
              Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blueprint" className="space-y-4 mt-4">
            <BlueprintTierSelector
              blueprints={blueprints.filter((b) => b.status === 'published')}
              onSelect={handleBlueprintSelect}
            />

            {selectedBlueprint && (
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Will add {selectedBlueprint.features.length} features from{' '}
                  <span className="font-medium">{selectedBlueprint.tierName}</span>
                </div>
                <Button onClick={handleAddBlueprint} disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add All Features
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Custom deliverables will have their price set to &quot;Pending Review&quot;.
                The internal team will set the price during review.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Deliverable Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Custom Integration, Additional Feature"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this deliverable includes..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleAddCustom}
                disabled={isPending || !customName.trim()}
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Custom Deliverable
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
