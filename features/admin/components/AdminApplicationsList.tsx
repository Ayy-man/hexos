'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { approveDevApplicationAction, rejectDevApplicationAction } from '@/features/organizations/actions/invitationActions'
import type { InvitationWithDetails, DevApplicationData } from '@/lib/types/organization'

interface AdminApplicationsListProps {
  applications: InvitationWithDetails[]
}

export function AdminApplicationsList({ applications }: AdminApplicationsListProps) {
  const [search, setSearch] = useState('')
  const [selectedApp, setSelectedApp] = useState<InvitationWithDetails | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Filter applications
  const filteredApps = applications.filter((app) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    const appData = app.application_data as DevApplicationData | null
    return (
      app.email.toLowerCase().includes(searchLower) ||
      appData?.name?.toLowerCase().includes(searchLower) ||
      appData?.skills?.some((s) => s.toLowerCase().includes(searchLower))
    )
  })

  const handleApprove = async (invitationId: string) => {
    setIsProcessing(true)
    await approveDevApplicationAction(invitationId)
    setIsProcessing(false)
    setSelectedApp(null)
  }

  const handleReject = async (invitationId: string) => {
    setIsProcessing(true)
    await rejectDevApplicationAction(invitationId)
    setIsProcessing(false)
    setSelectedApp(null)
  }

  const getAppData = (app: InvitationWithDetails): DevApplicationData | null => {
    return app.application_data as DevApplicationData | null
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg">No pending applications</h3>
            <p className="text-muted-foreground text-sm mt-1">
              New developer applications will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredApps.map((app) => {
            const appData = getAppData(app)
            return (
              <Card key={app.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium">{appData?.name || 'Unknown'}</h3>
                      <p className="text-sm text-muted-foreground">{app.email}</p>
                    </div>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      Pending
                    </Badge>
                  </div>

                  {/* Skills */}
                  {appData?.skills && appData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {appData.skills.slice(0, 5).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {appData.skills.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{appData.skills.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Availability */}
                  {appData?.availability && (
                    <p className="text-sm text-muted-foreground mb-3">
                      Availability: <span className="capitalize">{appData.availability.replace('-', ' ')}</span>
                    </p>
                  )}

                  {/* Portfolio */}
                  {appData?.portfolio && (
                    <a
                      href={appData.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1 mb-3"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Portfolio
                    </a>
                  )}

                  {/* Applied date */}
                  <p className="text-xs text-muted-foreground mb-4">
                    Applied {new Date(app.created_at).toLocaleDateString()}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedApp(app)}
                    >
                      Review
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApprove(app.id)}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              Review this developer application
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4 py-4">
              {(() => {
                const appData = getAppData(selectedApp)
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Name</label>
                        <p className="font-medium">{appData?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Email</label>
                        <p className="font-medium">{selectedApp.email}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Availability</label>
                        <p className="capitalize">{appData?.availability?.replace('-', ' ') || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Applied</label>
                        <p>{new Date(selectedApp.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {appData?.portfolio && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Portfolio</label>
                        <a
                          href={appData.portfolio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                        >
                          {appData.portfolio}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}

                    {appData?.skills && appData.skills.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-2 block">Skills</label>
                        <div className="flex flex-wrap gap-1">
                          {appData.skills.map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {appData?.bio && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">About</label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{appData.bio}</p>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => selectedApp && handleReject(selectedApp.id)}
              disabled={isProcessing}
              className="text-red-600 hover:text-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => selectedApp && handleApprove(selectedApp.id)}
              disabled={isProcessing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
