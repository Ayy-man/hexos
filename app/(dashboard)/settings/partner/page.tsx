import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { getCurrentProfile } from '@/lib/api/profiles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LogoUpload } from '@/features/settings/components/LogoUpload'
import { Building2, TrendingUp, Award, DollarSign } from 'lucide-react'

export default async function PartnerSettingsPage() {
  await requireAuth()
  const profile = await getCurrentProfile()

  if (!profile) {
    return null
  }

  // Only DFY partners can access this page
  if (profile.role !== 'dfy') {
    redirect('/settings')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Partner Settings</h1>
        <p className="text-muted-foreground">
          Manage your company branding and view your performance
        </p>
      </div>

      {/* Company Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Branding
          </CardTitle>
          <CardDescription>
            Your logo appears on proposals and client-facing documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUpload currentLogoUrl={profile.logo_url || null} />
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Overview
          </CardTitle>
          <CardDescription>
            Your partnership metrics and achievements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold">--</div>
              <div className="text-sm text-muted-foreground">Total Inquiries</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold">--</div>
              <div className="text-sm text-muted-foreground">Won Deals</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold">--%</div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold">$--</div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground text-center">
            Detailed analytics coming soon
          </p>
        </CardContent>
      </Card>

      {/* Commission Tier */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Partnership Tier
          </CardTitle>
          <CardDescription>
            Your current partnership level and benefits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Standard Partner</p>
                <p className="text-sm text-muted-foreground">
                  Active since {new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-primary">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Payouts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payouts
              </CardTitle>
              <CardDescription>
                Commission payouts and payment history
              </CardDescription>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Payout tracking and bank account configuration will be available
            when Stripe integration is complete.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
