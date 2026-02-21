'use client'

import { useState, useEffect } from 'react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import {
  Star,
  EyeOff,
  Clock,
  Calendar,
  AlertCircle,
  Briefcase,
  BarChart3,
  ArrowRight,
  X,
  Users,
  FileText,
  Heart,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDuration, type OpportunityWithPrefs, type ProjectComplexity, type CommitmentStatus } from '@/lib/api/opportunity-types'
import { BidList } from '@/features/opportunities/components/BidList'
import { RedactedBriefCard } from '@/features/opportunities/components/RedactedBriefCard'
import { getBidsForOpportunityAction } from '@/features/opportunities/actions/bidActions'
import { getBriefForOpportunityAction } from '@/features/opportunities/actions/briefActions'
import { getCommittedDevsAction } from '@/features/opportunities/actions/preCommitmentActions'
import type { DevOpportunityBid } from '@/lib/api/bid-types'
import type { BriefExtraction } from '@/lib/api/brief-extraction-types'

interface CommittedDev {
  dev_id: string
  name: string
  email: string
  commitment_status: CommitmentStatus
  commitment_note: string | null
  committed_at: string | null
}

interface OpportunityDetailModalProps {
  opportunity: OpportunityWithPrefs | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (coverMessage: string) => void
  onToggleStar: () => void
  onToggleHide: () => void
  isApplying?: boolean
  isStarring?: boolean
  isHiding?: boolean
  isAdmin?: boolean // New prop to show admin-only tabs
}

const complexityConfig: Record<ProjectComplexity, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  high: { label: 'High', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
}

export function OpportunityDetailModal({
  opportunity,
  open,
  onOpenChange,
  onApply,
  onToggleStar,
  onToggleHide,
  isApplying,
  isStarring,
  isHiding,
  isAdmin = false,
}: OpportunityDetailModalProps) {
  const [coverMessage, setCoverMessage] = useState('')
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  // Admin-only state
  const [bids, setBids] = useState<DevOpportunityBid[]>([])
  const [brief, setBrief] = useState<BriefExtraction | null>(null)
  const [committedDevs, setCommittedDevs] = useState<CommittedDev[]>([])
  const [isLoadingBids, setIsLoadingBids] = useState(false)
  const [isLoadingBrief, setIsLoadingBrief] = useState(false)
  const [isLoadingCommitted, setIsLoadingCommitted] = useState(false)

  // Load admin data when tab changes or opportunity changes
  useEffect(() => {
    if (!isAdmin || !opportunity || !open) return

    if (activeTab === 'bids' && bids.length === 0 && !isLoadingBids) {
      setIsLoadingBids(true)
      getBidsForOpportunityAction(opportunity.id)
        .then(setBids)
        .catch(console.error)
        .finally(() => setIsLoadingBids(false))
    }

    if (activeTab === 'brief' && !brief && !isLoadingBrief) {
      setIsLoadingBrief(true)
      getBriefForOpportunityAction(opportunity.id)
        .then(setBrief)
        .catch(console.error)
        .finally(() => setIsLoadingBrief(false))
    }

    if (activeTab === 'committed' && committedDevs.length === 0 && !isLoadingCommitted) {
      setIsLoadingCommitted(true)
      getCommittedDevsAction(opportunity.id)
        .then(setCommittedDevs)
        .catch(console.error)
        .finally(() => setIsLoadingCommitted(false))
    }
  }, [activeTab, isAdmin, opportunity, open, bids.length, brief, committedDevs.length, isLoadingBids, isLoadingBrief, isLoadingCommitted])

  // Reset state when opportunity changes
  useEffect(() => {
    setBids([])
    setBrief(null)
    setCommittedDevs([])
    setActiveTab('details')
  }, [opportunity?.id])

  if (!opportunity) return null

  const isExpired = !!(opportunity.expires_at && isPast(new Date(opportunity.expires_at)))
  const expiresIn = opportunity.expires_at
    ? formatDistanceToNow(new Date(opportunity.expires_at), { addSuffix: true })
    : null

  const handleApply = () => {
    onApply(coverMessage)
    setCoverMessage('')
    setShowApplyForm(false)
  }

  // Details content - shared between dev and admin views
  const DetailsContent = () => (
    <>
      {/* Description */}
      {opportunity.description && (
        <div className="space-y-2">
          <Label className="text-xs font-mono text-text-tertiary uppercase tracking-wider">
            Description
          </Label>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {opportunity.description}
          </p>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
        {/* Duration - uses formatDuration */}
        <div className="space-y-1">
          <Label className="text-xs font-mono text-text-tertiary uppercase tracking-wider flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Duration
          </Label>
          <p className="text-lg font-semibold">
            {formatDuration(opportunity)}
          </p>
        </div>

        {/* Complexity */}
        <div className="space-y-1">
          <Label className="text-xs font-mono text-text-tertiary uppercase tracking-wider flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Complexity
          </Label>
          <Badge className={cn('mt-1', complexityConfig[opportunity.complexity].color)}>
            {complexityConfig[opportunity.complexity].label}
          </Badge>
        </div>

        {/* Expiry */}
        {opportunity.expires_at && (
          <div className="space-y-1">
            <Label className="text-xs font-mono text-text-tertiary uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Expires
            </Label>
            <p className={cn('text-sm font-medium', isExpired && 'text-red-500')}>
              {isExpired ? 'Expired' : expiresIn}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(opportunity.expires_at), 'MMM d, yyyy')}
            </p>
          </div>
        )}
      </div>

      {/* Requirements */}
      {opportunity.requirements && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <Label className="text-xs font-mono text-text-tertiary uppercase tracking-wider">
              Requirements
            </Label>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {opportunity.requirements}
            </p>
          </div>
        </>
      )}
    </>
  )

  // Bids tab content (admin only)
  const BidsContent = () => (
    <div className="py-4">
      {isLoadingBids ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <BidList
          opportunityId={opportunity.id}
          bids={bids}
          estimatedWeeks={opportunity.estimated_weeks || undefined}
        />
      )}
    </div>
  )

  // Brief tab content (admin only)
  const BriefContent = () => (
    <div className="py-4">
      {isLoadingBrief ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : brief ? (
        <RedactedBriefCard
          extraction={brief}
          sourceType="opportunity"
          sourceId={opportunity.id}
          sourceData={{
            title: opportunity.title,
            description: opportunity.description,
            requirements: opportunity.requirements,
            techStack: opportunity.tech_stack,
            complexity: opportunity.complexity,
            estimatedHours: opportunity.estimated_hours,
            projectName: opportunity.project?.project_name,
            clientBusiness: opportunity.project?.client_name,
          }}
          showRegenerateButton={true}
          onRegenerate={(newExtraction) => setBrief(newExtraction)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            No brief generated yet. Click below to generate one.
          </p>
          <Button
            onClick={() => {
              setIsLoadingBrief(true)
              getBriefForOpportunityAction(opportunity.id)
                .then(setBrief)
                .catch(console.error)
                .finally(() => setIsLoadingBrief(false))
            }}
            disabled={isLoadingBrief}
          >
            {isLoadingBrief ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Brief'
            )}
          </Button>
        </div>
      )}
    </div>
  )

  // Committed devs tab content (admin only)
  const CommittedDevsContent = () => (
    <div className="py-4">
      {isLoadingCommitted ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : committedDevs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Heart className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-sm text-muted-foreground">
            No developers have pre-committed to this opportunity yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {committedDevs.map((dev) => (
            <Card key={dev.dev_id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{dev.name}</p>
                    <p className="text-xs text-muted-foreground">{dev.email}</p>
                    {dev.commitment_note && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        &quot;{dev.commitment_note}&quot;
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      dev.commitment_status === 'committed'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    )}
                  >
                    {dev.commitment_status === 'committed' ? 'Committed' : 'Interested'}
                  </Badge>
                </div>
                {dev.committed_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Since {formatDistanceToNow(new Date(dev.committed_at), { addSuffix: true })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span>Opportunities</span>
          <span>/</span>
          <span className="text-foreground truncate">{opportunity.title}</span>
        </div>

        {/* Title */}
        <DialogHeader className="pb-0">
          <DialogTitle className="text-xl font-semibold pr-8">
            {opportunity.title}
          </DialogTitle>
        </DialogHeader>

        {/* Meta row: Status, Client, Dates, Bids */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Status */}
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
            Open
          </Badge>

          {/* Client */}
          {opportunity.project && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>{opportunity.project.client_name}</span>
            </div>
          )}

          {/* Date range */}
          {opportunity.deadline && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(), 'MMM d, yyyy')}
                <ArrowRight className="h-3 w-3 inline mx-1" />
                {format(new Date(opportunity.deadline), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          {/* Bid count */}
          {opportunity.bids_count !== undefined && opportunity.bids_count > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{opportunity.bids_count} bid{opportunity.bids_count !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {opportunity.tech_stack && opportunity.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {opportunity.tech_stack.map((tech) => (
              <Badge key={tech} variant="secondary">
                {tech}
              </Badge>
            ))}
          </div>
        )}

        <Separator className="my-4" />

        {/* Admin view: Tabs */}
        {isAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="bids">
                Bids {opportunity.bids_count ? `(${opportunity.bids_count})` : ''}
              </TabsTrigger>
              <TabsTrigger value="brief">Brief</TabsTrigger>
              <TabsTrigger value="committed">Committed</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              <DetailsContent />
            </TabsContent>
            <TabsContent value="bids">
              <BidsContent />
            </TabsContent>
            <TabsContent value="brief">
              <BriefContent />
            </TabsContent>
            <TabsContent value="committed">
              <CommittedDevsContent />
            </TabsContent>
          </Tabs>
        ) : (
          /* Dev view: Just details */
          <DetailsContent />
        )}

        <Separator className="my-4" />

        {/* Apply form (expandable) - dev only */}
        {!isAdmin && showApplyForm ? (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between">
              <Label>Cover Message (optional)</Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowApplyForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Introduce yourself and explain why you're a good fit for this opportunity..."
              value={coverMessage}
              onChange={(e) => setCoverMessage(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApplyForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={isApplying}>
                {isApplying ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </div>
        ) : !isAdmin ? (
          /* Action buttons - dev only */
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleStar}
                disabled={isStarring}
              >
                <Star
                  className={cn(
                    'h-4 w-4 mr-1.5',
                    opportunity.is_starred
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground'
                  )}
                />
                {opportunity.is_starred ? 'Starred' : 'Star'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleHide}
                disabled={isHiding}
              >
                <EyeOff
                  className={cn(
                    'h-4 w-4 mr-1.5',
                    opportunity.is_hidden ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                {opportunity.is_hidden ? 'Hidden' : 'Hide'}
              </Button>
            </div>

            <Button
              onClick={() => setShowApplyForm(true)}
              disabled={isExpired}
            >
              {isExpired ? 'Expired' : 'Apply'}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
