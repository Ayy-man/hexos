'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import type { PricingTier } from '@/lib/api/blueprints'

interface PricingTiersEditorProps {
  value: PricingTier[]
  onChange: (tiers: PricingTier[]) => void
}

export function PricingTiersEditor({ value, onChange }: PricingTiersEditorProps) {
  const addTier = () => {
    onChange([
      ...value,
      {
        name: `Tier ${value.length + 1}`,
        setup_price: 0,
        monthly_price: 0,
        features: [],
      },
    ])
  }

  const updateTier = (index: number, updates: Partial<PricingTier>) => {
    const newTiers = [...value]
    newTiers[index] = { ...newTiers[index], ...updates }
    onChange(newTiers)
  }

  const removeTier = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const updateFeatures = (index: number, featuresText: string) => {
    const features = featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
    updateTier(index, { features })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Pricing Tiers</Label>
        <Button type="button" variant="outline" size="sm" onClick={addTier}>
          <Plus className="h-4 w-4 mr-1" />
          Add Tier
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No pricing tiers yet. Click "Add Tier" to create one.
        </p>
      ) : (
        <div className="space-y-4">
          {value.map((tier, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Tier {index + 1}</CardTitle>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeTier(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`tier-name-${index}`}>Name</Label>
                    <Input
                      id={`tier-name-${index}`}
                      value={tier.name}
                      onChange={(e) => updateTier(index, { name: e.target.value })}
                      placeholder="e.g., Essentials"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`tier-setup-${index}`}>Setup Price ($)</Label>
                    <Input
                      id={`tier-setup-${index}`}
                      type="number"
                      min="0"
                      value={tier.setup_price}
                      onChange={(e) =>
                        updateTier(index, { setup_price: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`tier-monthly-${index}`}>Monthly Price ($)</Label>
                    <Input
                      id={`tier-monthly-${index}`}
                      type="number"
                      min="0"
                      value={tier.monthly_price}
                      onChange={(e) =>
                        updateTier(index, { monthly_price: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tier-features-${index}`}>Features (one per line)</Label>
                  <Textarea
                    id={`tier-features-${index}`}
                    value={tier.features.join('\n')}
                    onChange={(e) => updateFeatures(index, e.target.value)}
                    placeholder="Automated keyword triggers&#10;Captures lead details&#10;Basic CRM integration"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
