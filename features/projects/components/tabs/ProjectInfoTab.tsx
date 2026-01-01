'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { DollarSign, Calendar, Settings, ChevronDown, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { ProjectWithRelations } from '@/lib/api/projects'
import { computeProjectFinancials } from '@/lib/utils/projectFinancials'
import type { UserRole } from '@/lib/auth/types'
import { updateProjectFinancialsAction } from '../../actions/financialActions'

interface ProjectInfoTabProps {
  project: ProjectWithRelations
  userRole: UserRole
}

function formatCurrency(value: number | null) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

function formatDisplayDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ProjectInfoTab({ project, userRole }: ProjectInfoTabProps) {
  const isAdmin = userRole === 'admin'
  const isInternal = userRole === 'internal'
  const canEdit = isAdmin
  const canViewInternal = isAdmin || isInternal

  const [isPending, startTransition] = useTransition()
  const [hasChanges, setHasChanges] = useState(false)

  // Form state
  const [priceDfy, setPriceDfy] = useState(project.price_dfy?.toString() || '')
  const [priceHexona, setPriceHexona] = useState(project.price_hexona?.toString() || '')
  const [priceDev, setPriceDev] = useState(project.price_dev?.toString() || '')
  const [retainerPlan, setRetainerPlan] = useState<'one_time' | 'monthly' | 'quarterly' | 'annual'>(
    (project.retainer_plan as 'one_time' | 'monthly' | 'quarterly' | 'annual') || 'one_time'
  )
  const [retainerDate, setRetainerDate] = useState(formatDate(project.retainer_date))
  const [softwarePayer, setSoftwarePayer] = useState<'hexona' | 'client'>(
    (project.software_payer as 'hexona' | 'client') || 'client'
  )
  const [dateInquiry, setDateInquiry] = useState(formatDate(project.date_inquiry))
  const [dateProposalSent, setDateProposalSent] = useState(formatDate(project.date_proposal_sent))
  const [dateClosed, setDateClosed] = useState(formatDate(project.date_closed))
  const [dateOnboarding, setDateOnboarding] = useState(formatDate(project.date_onboarding))
  const [dateDelivered, setDateDelivered] = useState(formatDate(project.date_delivered))

  // Compute financials for display
  const financials = computeProjectFinancials(project)

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateProjectFinancialsAction(project.id, {
          price_dfy: priceDfy ? parseFloat(priceDfy) : null,
          price_hexona: priceHexona ? parseFloat(priceHexona) : null,
          price_dev: priceDev ? parseFloat(priceDev) : null,
          retainer_plan: retainerPlan as 'one_time' | 'monthly' | 'quarterly' | 'annual',
          retainer_date: retainerDate || null,
          software_payer: softwarePayer as 'hexona' | 'client',
          date_inquiry: dateInquiry || null,
          date_proposal_sent: dateProposalSent || null,
          date_closed: dateClosed || null,
          date_onboarding: dateOnboarding || null,
          date_delivered: dateDelivered || null,
        })
        setHasChanges(false)
        toast.success('Financial info updated')
      } catch (error) {
        console.error('Failed to update financials:', error)
        toast.error('Failed to update financial info')
      }
    })
  }

  const markChanged = () => setHasChanges(true)

  return (
    <div className="space-y-6">
      {/* Pricing Section */}
      <Collapsible defaultOpen>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing
                </span>
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Price fields */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="price_dfy">Client Price (DFY)</Label>
                  {canEdit ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="price_dfy"
                        type="number"
                        value={priceDfy}
                        onChange={(e) => { setPriceDfy(e.target.value); markChanged() }}
                        className="pl-7"
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    <p className="text-lg font-semibold">{formatCurrency(project.price_dfy)}</p>
                  )}
                </div>

                {canViewInternal && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="price_hexona">Our Price (Hexona)</Label>
                      {canEdit ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="price_hexona"
                            type="number"
                            value={priceHexona}
                            onChange={(e) => { setPriceHexona(e.target.value); markChanged() }}
                            className="pl-7"
                            placeholder="0"
                          />
                        </div>
                      ) : (
                        <p className="text-lg font-semibold">{formatCurrency(project.price_hexona)}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price_dev">Dev Cost</Label>
                      {canEdit ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="price_dev"
                            type="number"
                            value={priceDev}
                            onChange={(e) => { setPriceDev(e.target.value); markChanged() }}
                            className="pl-7"
                            placeholder="0"
                          />
                        </div>
                      ) : (
                        <p className="text-lg font-semibold">{formatCurrency(project.price_dev)}</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Computed profits */}
              {canViewInternal && (
                <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Hexona Profit</Label>
                    <p className={`text-lg font-semibold ${financials.profit_hexona && financials.profit_hexona > 0 ? 'text-green-600' : financials.profit_hexona && financials.profit_hexona < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(financials.profit_hexona)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">DFY Profit</Label>
                    <p className={`text-lg font-semibold ${financials.profit_dfy && financials.profit_dfy > 0 ? 'text-green-600' : financials.profit_dfy && financials.profit_dfy < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(financials.profit_dfy)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Dates Section */}
      <Collapsible defaultOpen>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Dates & Cycles
                </span>
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="date_inquiry">Inquiry Date</Label>
                  {canEdit ? (
                    <Input
                      id="date_inquiry"
                      type="date"
                      value={dateInquiry}
                      onChange={(e) => { setDateInquiry(e.target.value); markChanged() }}
                    />
                  ) : (
                    <p className="text-sm">{formatDisplayDate(project.date_inquiry)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_proposal_sent">Proposal Sent</Label>
                  {canEdit ? (
                    <Input
                      id="date_proposal_sent"
                      type="date"
                      value={dateProposalSent}
                      onChange={(e) => { setDateProposalSent(e.target.value); markChanged() }}
                    />
                  ) : (
                    <p className="text-sm">{formatDisplayDate(project.date_proposal_sent)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_closed">Deal Closed</Label>
                  {canEdit ? (
                    <Input
                      id="date_closed"
                      type="date"
                      value={dateClosed}
                      onChange={(e) => { setDateClosed(e.target.value); markChanged() }}
                    />
                  ) : (
                    <p className="text-sm">{formatDisplayDate(project.date_closed)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_onboarding">Onboarding Started</Label>
                  {canEdit ? (
                    <Input
                      id="date_onboarding"
                      type="date"
                      value={dateOnboarding}
                      onChange={(e) => { setDateOnboarding(e.target.value); markChanged() }}
                    />
                  ) : (
                    <p className="text-sm">{formatDisplayDate(project.date_onboarding)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_delivered">Delivered</Label>
                  {canEdit ? (
                    <Input
                      id="date_delivered"
                      type="date"
                      value={dateDelivered}
                      onChange={(e) => { setDateDelivered(e.target.value); markChanged() }}
                    />
                  ) : (
                    <p className="text-sm">{formatDisplayDate(project.date_delivered)}</p>
                  )}
                </div>
              </div>

              {/* Computed cycles */}
              <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Sales Cycle</Label>
                  <p className="text-sm">
                    {financials.cycle_sales != null ? `${financials.cycle_sales} days` : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Delivery Cycle</Label>
                  <p className="text-sm">
                    {financials.cycle_delivery != null ? `${financials.cycle_delivery} days` : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Settings Section */}
      <Collapsible defaultOpen>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </span>
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="retainer_plan">Retainer Plan</Label>
                  {canEdit ? (
                    <Select value={retainerPlan} onValueChange={(v) => { setRetainerPlan(v as typeof retainerPlan); markChanged() }}>
                      <SelectTrigger id="retainer_plan">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">One-Time</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm capitalize">{retainerPlan.replace('_', ' ')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retainer_date">Retainer Date</Label>
                  {canEdit ? (
                    <Input
                      id="retainer_date"
                      type="date"
                      value={retainerDate}
                      onChange={(e) => { setRetainerDate(e.target.value); markChanged() }}
                    />
                  ) : (
                    <p className="text-sm">{formatDisplayDate(project.retainer_date)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="software_payer">Software Payer</Label>
                  {canEdit ? (
                    <Select value={softwarePayer} onValueChange={(v) => { setSoftwarePayer(v as typeof softwarePayer); markChanged() }}>
                      <SelectTrigger id="software_payer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="hexona">Hexona</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm capitalize">{softwarePayer}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Save Button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className="w-full md:w-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : hasChanges ? (
              'Save Changes'
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
