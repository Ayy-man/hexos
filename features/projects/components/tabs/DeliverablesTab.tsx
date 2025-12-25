'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Clock, AlertCircle, Lock } from 'lucide-react'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'
import { confirmDeliverablesAction, sendForSignoffAction, signOffDeliverablesAction } from '../../actions/projectActions'

interface DeliverablesTabProps {
  project: ProjectWithRelations
  userRole: UserRole
  isAdmin: boolean
  isDfy: boolean
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-muted-foreground" />,
  in_progress: <Clock className="h-4 w-4 text-cyan-500" />,
  blocked: <AlertCircle className="h-4 w-4 text-red-500" />,
  done: <CheckCircle2 className="h-4 w-4 text-green-500" />,
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function DeliverablesTab({ project, userRole, isAdmin, isDfy }: DeliverablesTabProps) {
  const [isLoading, setIsLoading] = useState(false)
  const deliverables = project.deliverables || []

  // Determine if deliverables are locked (after sign-off)
  const isLocked = ['signed_off', 'collecting_access', 'in_progress', 'delivered', 'completed'].includes(project.status)

  // Sign-off flow status
  const isDeliverablesConfirmed = ['awaiting_signoff', 'signed_off'].includes(project.status) || isLocked
  const isAwaitingSignoff = project.status === 'awaiting_signoff'
  const isSignedOff = isLocked

  const handleConfirmDeliverables = async () => {
    setIsLoading(true)
    try {
      await confirmDeliverablesAction(project.id)
    } catch (error) {
      console.error('Failed to confirm deliverables:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendForSignoff = async () => {
    setIsLoading(true)
    try {
      await sendForSignoffAction(project.id)
    } catch (error) {
      console.error('Failed to send for signoff:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOff = async () => {
    setIsLoading(true)
    try {
      await signOffDeliverablesAction(project.id)
    } catch (error) {
      console.error('Failed to sign off:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const completedCount = deliverables.filter((d) => d.status === 'done').length

  return (
    <div className="space-y-6">
      {/* Sign-off Status Banner */}
      {isSignedOff && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="py-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Deliverables Signed Off
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                These deliverables have been confirmed and locked as the source of truth.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isAwaitingSignoff && isDfy && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="py-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Sign-off Required
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Please review the deliverables and confirm on behalf of your client.
              </p>
            </div>
            <ButtonHoldAndRelease
              onHoldComplete={handleSignOff}
              disabled={isLoading}
              variant="default"
              defaultText="Confirm on Behalf of Client"
              holdingText="Release to Confirm"
            />
          </CardContent>
        </Card>
      )}

      {/* Admin Actions */}
      {isAdmin && !isLocked && (
        <div className="flex items-center gap-3">
          {!isDeliverablesConfirmed && (
            <Button onClick={handleConfirmDeliverables} disabled={isLoading}>
              Confirm Deliverables
            </Button>
          )}
          {isDeliverablesConfirmed && !isAwaitingSignoff && (
            <ButtonHoldAndRelease
              onHoldComplete={handleSendForSignoff}
              disabled={isLoading}
              variant="default"
              defaultText="Send for DFY Sign-off"
              holdingText="Release to Send"
            />
          )}
        </div>
      )}

      {/* Deliverables List */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Deliverables</CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedCount} / {deliverables.length} done
          </span>
        </CardHeader>
        <CardContent>
          {deliverables.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No deliverables yet.
            </p>
          ) : (
            <div className="divide-y">
              {deliverables.map((deliverable) => (
                <div
                  key={deliverable.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    {STATUS_ICONS[deliverable.status] || STATUS_ICONS.pending}
                    <span className="font-medium">{deliverable.title}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {deliverable.due_date && (
                      <span className="text-sm text-muted-foreground">
                        Due {new Date(deliverable.due_date).toLocaleDateString()}
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[deliverable.status] || STATUS_COLORS.pending}
                    >
                      {formatStatus(deliverable.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
