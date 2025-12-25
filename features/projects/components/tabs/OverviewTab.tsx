'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, User, Building2, DollarSign, Clock, UserPlus } from 'lucide-react'
import type { ProjectWithRelations } from '@/lib/api/projects'
import type { UserRole } from '@/lib/auth/types'
import { assignDevAction } from '../../actions/projectActions'

interface OverviewTabProps {
  project: ProjectWithRelations
  userRole: UserRole
  isAdmin: boolean
  availableDevs: Array<{ id: string; name: string; email: string }>
}

const STATUS_COLORS: Record<string, string> = {
  deliverables_pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  awaiting_signoff: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  signed_off: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  collecting_access: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(date: string | null) {
  if (!date) return 'Not set'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrency(value: number | null) {
  if (!value) return 'Not set'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

export function OverviewTab({ project, userRole, isAdmin, availableDevs }: OverviewTabProps) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [showDevSelect, setShowDevSelect] = useState(false)

  const handleAssignDev = async (devId: string) => {
    setIsAssigning(true)
    try {
      await assignDevAction(project.id, devId)
      setShowDevSelect(false)
    } catch (error) {
      console.error('Failed to assign dev:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Badge
          variant="secondary"
          className={STATUS_COLORS[project.status] || 'bg-stone-100 text-stone-700'}
        >
          {formatStatus(project.status)}
        </Badge>
      </div>

      {/* Info Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Client Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{project.client_name}</p>
            {project.client_email && (
              <p className="text-sm text-muted-foreground">{project.client_email}</p>
            )}
            {project.client_business && (
              <p className="text-sm text-muted-foreground">{project.client_business}</p>
            )}
          </CardContent>
        </Card>

        {/* DFY Partner */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              DFY Partner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{project.dfy_partner?.name || 'None'}</p>
            {project.dfy_partner?.email && (
              <p className="text-sm text-muted-foreground">{project.dfy_partner.email}</p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Dev */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Assigned Developer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.assigned_dev ? (
              <>
                <p className="font-semibold">{project.assigned_dev.name}</p>
                <p className="text-sm text-muted-foreground">{project.assigned_dev.email}</p>
              </>
            ) : (
              <div>
                <p className="font-semibold text-muted-foreground">Unassigned</p>
                {isAdmin && !showDevSelect && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setShowDevSelect(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Dev
                  </Button>
                )}
                {isAdmin && showDevSelect && (
                  <div className="mt-2 space-y-2">
                    <Select
                      onValueChange={handleAssignDev}
                      disabled={isAssigning}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select developer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDevs.map((dev) => (
                          <SelectItem key={dev.id} value={dev.id}>
                            {dev.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDevSelect(false)}
                      disabled={isAssigning}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
            {isAdmin && project.assigned_dev && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowDevSelect(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Reassign
              </Button>
            )}
            {isAdmin && project.assigned_dev && showDevSelect && (
              <div className="mt-2 space-y-2">
                <Select
                  onValueChange={handleAssignDev}
                  disabled={isAssigning}
                  defaultValue={project.assigned_dev.id}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select developer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDevs.map((dev) => (
                      <SelectItem key={dev.id} value={dev.id}>
                        {dev.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDevSelect(false)}
                  disabled={isAssigning}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Target Delivery */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Target Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{formatDate(project.target_delivery_date)}</p>
          </CardContent>
        </Card>

        {/* Created */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{formatDate(project.created_at)}</p>
          </CardContent>
        </Card>

        {/* Quoted Price - Admin Only */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Quoted Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{formatCurrency(project.quoted_price)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes */}
      {project.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {project.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
