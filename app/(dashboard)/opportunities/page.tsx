import { requireAuth } from '@/lib/auth/guards'
import {
  getPublicOpportunities,
  getPendingInvitations,
  getMyApplications,
} from '@/lib/api/project-invitations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Briefcase, Mail, Send, Clock } from 'lucide-react'
import { OpportunityList } from '@/features/dev/components/OpportunityList'
import { InvitationList } from '@/features/dev/components/InvitationList'
import { ApplicationList } from '@/features/dev/components/ApplicationList'

export default async function OpportunitiesPage() {
  const user = await requireAuth()

  // Fetch all data in parallel
  const [opportunities, invitations, applications] = await Promise.all([
    getPublicOpportunities().catch(() => []),
    getPendingInvitations().catch(() => []),
    getMyApplications().catch(() => []),
  ])

  const pendingInvitations = invitations.filter(i => i.status === 'pending')
  const pendingApplications = applications.filter(a => a.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
        <p className="text-muted-foreground">
          Browse available projects and manage your invitations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Open Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{opportunities.length}</div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Invitations</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-blue-600">
              {pendingInvitations.length}
            </div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Pending Apps</CardTitle>
            <Send className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-amber-600">
              {pendingApplications.length}
            </div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Applied</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{applications.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations Banner */}
      {pendingInvitations.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                You have {pendingInvitations.length} pending invitation
                {pendingInvitations.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Review and respond to project invitations
              </p>
            </div>
            <Badge variant="secondary">{pendingInvitations.length} new</Badge>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue={pendingInvitations.length > 0 ? 'invitations' : 'browse'}>
        <TabsList>
          <TabsTrigger value="browse">
            Browse
            {opportunities.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {opportunities.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations
            {pendingInvitations.length > 0 && (
              <Badge className="ml-2 bg-blue-500">{pendingInvitations.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="applications">
            My Applications
            {applications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {applications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-6">
          <OpportunityList opportunities={opportunities} />
        </TabsContent>

        <TabsContent value="invitations" className="mt-6">
          <InvitationList invitations={invitations} />
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          <ApplicationList applications={applications} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
