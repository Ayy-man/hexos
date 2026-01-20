'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Loader2, Save, Video } from 'lucide-react'
import { TagInput } from './TagInput'
import { PricingTiersEditor } from './PricingTiersEditor'
import { BlueprintEditor } from './BlueprintEditor'
import { IconPicker } from './IconPicker'
import { LoomVideoEmbed } from './LoomVideoEmbed'
import { isValidLoomUrl } from '@/lib/utils/loom'
import {
  createBlueprintAction,
  updateBlueprintAction,
} from '../actions/blueprintActions'
import type { Blueprint, PricingTier, CreateBlueprintInput } from '@/lib/api/blueprints'

interface BlueprintFormProps {
  blueprint?: Blueprint
  mode: 'create' | 'edit'
}

export function BlueprintForm({ blueprint, mode }: BlueprintFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState(blueprint?.name || '')
  const [description, setDescription] = useState(blueprint?.description || '')
  const [icon, setIcon] = useState(blueprint?.icon || '🤖')
  const [estimatedHours, setEstimatedHours] = useState(blueprint?.estimated_hours?.toString() || '')
  const [basePrice, setBasePrice] = useState(blueprint?.base_price?.toString() || '')
  const [tags, setTags] = useState<string[]>(blueprint?.tags || [])
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(blueprint?.pricing_tiers || [])
  const [isPublished, setIsPublished] = useState(blueprint?.status === 'published')
  const [loomUrl, setLoomUrl] = useState(blueprint?.loom_video_url || '')

  const isValidLoom = !loomUrl || isValidLoomUrl(loomUrl)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Clean up pricing tiers - filter out empty features before saving
    const cleanedPricingTiers = pricingTiers.map((tier) => ({
      ...tier,
      features: tier.features.map((f) => f.trim()).filter((f) => f.length > 0),
    }))

    const data: CreateBlueprintInput = {
      name,
      description: description || undefined,
      icon,
      estimated_hours: estimatedHours ? parseInt(estimatedHours) : undefined,
      base_price: basePrice ? parseFloat(basePrice) : undefined,
      tags,
      pricing_tiers: cleanedPricingTiers,
      status: isPublished ? 'published' : 'draft',
      loom_video_url: loomUrl || undefined,
    }

    startTransition(async () => {
      if (mode === 'create') {
        await createBlueprintAction(data)
      } else if (blueprint) {
        await updateBlueprintAction(blueprint.id, data)
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Name and description of the blueprint</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[auto_1fr]">
            <div className="space-y-2">
              <Label>Icon</Label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Instagram DM AI Agent"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this blueprint does..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price ($)</Label>
              <Input
                id="basePrice"
                type="text"
                inputMode="decimal"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="Add tags (e.g., lead-gen, instagram, ai)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loom Video */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Loom Video
          </CardTitle>
          <CardDescription>Add a Loom video walkthrough for this blueprint (optional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loomUrl">Loom Video URL</Label>
            <Input
              id="loomUrl"
              value={loomUrl}
              onChange={(e) => setLoomUrl(e.target.value)}
              placeholder="https://www.loom.com/share/..."
              className={!isValidLoom ? 'border-destructive' : ''}
            />
            {!isValidLoom && (
              <p className="text-sm text-destructive">
                Please enter a valid Loom URL (e.g., https://www.loom.com/share/abc123...)
              </p>
            )}
          </div>
          {loomUrl && isValidLoom && (
            <LoomVideoEmbed url={loomUrl} title={`${name || 'Blueprint'} walkthrough`} />
          )}
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Tiers</CardTitle>
          <CardDescription>Define different pricing options for this blueprint</CardDescription>
        </CardHeader>
        <CardContent>
          <PricingTiersEditor value={pricingTiers} onChange={setPricingTiers} />
        </CardContent>
      </Card>

      {/* Status & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
              <Label htmlFor="published" className="cursor-pointer">
                {isPublished ? 'Published (visible to DFY partners)' : 'Draft (hidden)'}
              </Label>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !name || !isValidLoom}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {mode === 'create' ? 'Create Blueprint' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Editor Note */}
      {mode === 'create' && (
        <p className="text-sm text-muted-foreground text-center">
          After creating the blueprint, you can add the full content using the rich text editor.
        </p>
      )}
    </form>
  )
}
