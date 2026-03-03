'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Shield,
  Building2,
  Users,
  Code,
  LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { completeOnboarding } from '../actions/completeOnboarding'
import { DASHBOARD_ROUTES, type Profile } from '@/lib/auth/types'

interface OnboardingWizardProps {
  userId: string
  profile: Profile
  organizationName: string | null
  isOrgOwner: boolean
}

export function OnboardingWizard({
  profile,
  organizationName,
  isOrgOwner,
}: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState(profile.name || '')
  const [timezone, setTimezone] = useState(
    profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [isPending, startTransition] = useTransition()
  const totalSteps = 3

  const handleComplete = () => {
    startTransition(async () => {
      const result = await completeOnboarding({ name, timezone })
      if (result.success) {
        router.push(DASHBOARD_ROUTES[profile.role] || '/dashboard')
      } else {
        toast.error(result.error || 'Failed to complete onboarding')
      }
    })
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="pb-2">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                s <= step ? 'bg-cyan-600' : 'bg-stone-300 dark:bg-stone-700'
              )}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* Step 1: Profile Completion */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <CardTitle className="text-xl">Complete your profile</CardTitle>
              <CardDescription>
                Let&apos;s set up your account before you get started.
              </CardDescription>
            </div>

            {/* Avatar preview if available */}
            {profile.avatar_url && (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatar_url}
                  alt="Your avatar"
                  className="h-12 w-12 rounded-full object-cover border border-border"
                />
                <p className="text-sm text-text-secondary">Your Google profile photo</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Email — read-only */}
              <div className="space-y-1.5">
                <Label className="text-text-secondary text-xs uppercase tracking-wide">
                  Email
                </Label>
                <p className="text-sm text-text-primary font-medium">{profile.email}</p>
              </div>

              {/* Display name */}
              <div className="space-y-1.5">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoFocus
                />
              </div>

              {/* Timezone */}
              <div className="space-y-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g. America/New_York"
                />
                <p className="text-xs text-text-tertiary">
                  Auto-detected from your browser. You can update this in Settings.
                </p>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => setStep(2)}
              disabled={!name.trim()}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Role-Specific Intro */}
        {step === 2 && (
          <div className="space-y-6">
            <RoleIntroContent
              role={profile.role}
              organizationName={organizationName}
              isOrgOwner={isOrgOwner}
            />

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-cyan-600" />
              <div className="space-y-1">
                <CardTitle className="text-xl">You&apos;re all set!</CardTitle>
                <CardDescription>Let&apos;s get started.</CardDescription>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                className="flex-1"
                disabled={isPending}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleComplete}
                disabled={isPending}
              >
                {isPending ? 'Setting up...' : 'Go to Dashboard'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Role-specific intro content
interface RoleIntroContentProps {
  role: Profile['role']
  organizationName: string | null
  isOrgOwner: boolean
}

function RoleIntroContent({ role, organizationName, isOrgOwner }: RoleIntroContentProps) {
  switch (role) {
    case 'admin':
    case 'internal':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-cyan-600 shrink-0" />
            <div>
              <CardTitle className="text-lg">Welcome to the team</CardTitle>
              <CardDescription>Here&apos;s what you can do as an admin.</CardDescription>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 mt-0.5">&#x2022;</span>
              Manage inquiries and project proposals from partners
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 mt-0.5">&#x2022;</span>
              Track active projects and team activity across the platform
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 mt-0.5">&#x2022;</span>
              Monitor project health, blockers, and deliverable progress
            </li>
          </ul>
        </div>
      )

    case 'dfy':
      if (isOrgOwner) {
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-cyan-600 shrink-0" />
              <div>
                <CardTitle className="text-lg">Your agency is set up</CardTitle>
                {organizationName && (
                  <CardDescription>{organizationName}</CardDescription>
                )}
              </div>
            </div>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-cyan-600 mt-0.5">&#x2022;</span>
                Invite teammates to collaborate on projects
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-600 mt-0.5">&#x2022;</span>
                Manage active projects and track deliverables
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-600 mt-0.5">&#x2022;</span>
                Submit inquiries and review proposals from the hexOS team
              </li>
            </ul>
          </div>
        )
      }
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-cyan-600 shrink-0" />
            <div>
              <CardTitle className="text-lg">
                You&apos;ve joined {organizationName || 'your agency'}
              </CardTitle>
              <CardDescription>Collaborate with your team on shared projects.</CardDescription>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 mt-0.5">&#x2022;</span>
              Collaborate with your team on active projects
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 mt-0.5">&#x2022;</span>
              Track assigned work and deliverable progress
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 mt-0.5">&#x2022;</span>
              Communicate with clients and review project updates
            </li>
          </ul>
        </div>
      )

    case 'dev':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Code className="h-8 w-8 text-cyan-600 shrink-0" />
            <div>
              <CardTitle className="text-lg">Welcome to the dev network</CardTitle>
              <CardDescription>Start finding and tracking your work.</CardDescription>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 mt-0.5">&#x2022;</span>
              Find and apply for projects that match your skills
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 mt-0.5">&#x2022;</span>
              Track your active work, deliverables, and progress
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 mt-0.5">&#x2022;</span>
              Build your profile — you can set up skills and availability in Settings
            </li>
          </ul>
        </div>
      )

    case 'client':
    default:
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-cyan-600 shrink-0" />
            <div>
              <CardTitle className="text-lg">Your project dashboard</CardTitle>
              <CardDescription>Stay in the loop on everything.</CardDescription>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 mt-0.5">&#x2022;</span>
              Track your project&apos;s progress in real time
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 mt-0.5">&#x2022;</span>
              Communicate directly with your project team
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 mt-0.5">&#x2022;</span>
              Review deliverables and provide feedback
            </li>
          </ul>
        </div>
      )
  }
}
