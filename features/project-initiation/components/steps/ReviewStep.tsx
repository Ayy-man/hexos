'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, Package, ClipboardList, DollarSign, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProposalDeliverable } from '@/lib/api/proposal-deliverables'
import type { RequirementNode, RequirementTreeNode } from '../../utils/treeHelpers'
import { buildTree } from '../../utils/treeHelpers'
import type { InitiateProjectInput } from '../../actions/initiationActions'

interface InquiryData {
  id: string
  prospect_company_name: string
  prospect_website: string | null
  industry: string | null
  partner_name: string
  price_dfy: number | null
  price_hexona: number | null
  price_dev: number | null
  blueprint: { id: string; name: string } | null
  proposal_content: unknown
}

interface ReviewStepProps {
  projectData: InitiateProjectInput
  onProjectDataChange: (data: InitiateProjectInput) => void
  selectedDeliverables: ProposalDeliverable[]
  requirements: RequirementNode[]
  totalPrice: number
  inquiry: InquiryData
}

const OWNER_COLORS = {
  hexona: 'bg-cyan-100 text-cyan-700',
  dfy: 'bg-purple-100 text-purple-700',
  client: 'bg-amber-100 text-amber-700',
} as const

export function ReviewStep({
  projectData,
  onProjectDataChange,
  selectedDeliverables,
  requirements,
  totalPrice,
  inquiry,
}: ReviewStepProps) {
  const tree = buildTree(requirements)
  const hasAbsoluteBlockers = requirements.some((r) => r.blocker_type === 'absolute')

  const formatCurrency = (value: number | null) => {
    if (value == null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const updateField = <K extends keyof InitiateProjectInput>(
    field: K,
    value: InitiateProjectInput[K]
  ) => {
    onProjectDataChange({ ...projectData, [field]: value })
  }

  // Recursive requirement preview
  const renderRequirementPreview = (node: RequirementTreeNode, depth = 0) => (
    <div key={node.id} style={{ marginLeft: `${depth * 16}px` }}>
      <div className="flex items-center gap-2 py-1">
        {depth > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        <span className="text-sm">{node.title || 'Untitled'}</span>
        <Badge variant="outline" className={cn('text-xs', OWNER_COLORS[node.owner_type])}>
          {node.owner_type}
        </Badge>
        {node.blocker_type !== 'none' && (
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              node.blocker_type === 'absolute' ? 'bg-red-500' : 'bg-amber-500'
            )}
          />
        )}
      </div>
      {node.children.map((child) => renderRequirementPreview(child, depth + 1))}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Review & Create Project</h2>
        <p className="text-muted-foreground">
          Review the details below and create the project
        </p>
      </div>

      {/* Absolute blocker warning */}
      {hasAbsoluteBlockers && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Absolute Blockers Present</p>
                <p className="text-sm text-red-600">
                  Some requirements are marked as absolute blockers. The project will not be able
                  to proceed until these are resolved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Details Form */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Configure the project settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_name">Project Name</Label>
              <Input
                id="project_name"
                value={projectData.project_name}
                onChange={(e) => updateField('project_name', e.target.value)}
                placeholder="Project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_name">Client Name</Label>
              <Input
                id="client_name"
                value={projectData.client_name}
                onChange={(e) => updateField('client_name', e.target.value)}
                placeholder="Client name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_structure">Payment Structure</Label>
              <Select
                value={projectData.payment_structure}
                onValueChange={(value) =>
                  updateField('payment_structure', value as InitiateProjectInput['payment_structure'])
                }
              >
                <SelectTrigger id="payment_structure">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100_upfront">100% Upfront</SelectItem>
                  <SelectItem value="50_50">50/50 Split</SelectItem>
                  <SelectItem value="40_30_30">40/30/30 Split</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>DFY Partner</Label>
              <Input value={inquiry.partner_name} disabled className="bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Deliverables Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedDeliverables.length}</p>
                <p className="text-sm text-muted-foreground">Deliverables</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{requirements.length}</p>
                <p className="text-sm text-muted-foreground">Requirements</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Value */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPrice)}</p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deliverables Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selected Deliverables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {selectedDeliverables.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{d.name}</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(d.counter_price ?? d.price)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requirements Preview */}
      {requirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requirements Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {tree.map((node) => renderRequirementPreview(node))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
