'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AvatarUpload } from './AvatarUpload'
import { LocationSettings } from './LocationSettings'
import { updateProfileAction } from '../actions/settingsActions'
import { toast } from 'sonner'
import { Loader2, Mail, Phone, Building2, FileText, User } from 'lucide-react'
import type { ProfileWithRole } from '@/lib/api/profiles'

interface ProfileSettingsFormProps {
  profile: ProfileWithRole & {
    avatar_url?: string | null
    bio?: string | null
    phone?: string | null
    company_name?: string | null
    city?: string | null
    country?: string | null
    timezone?: string | null
  }
}

export function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
  const [name, setName] = useState(profile.name)
  const [bio, setBio] = useState(profile.bio || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [companyName, setCompanyName] = useState(profile.company_name || '')
  const [isPending, startTransition] = useTransition()

  const bioCharCount = bio.length
  const bioMaxChars = 250

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateProfileAction({
        name: name.trim(),
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        company_name: companyName.trim() || null,
      })

      if (result.success) {
        toast.success('Profile updated')
      } else {
        toast.error(result.error || 'Failed to update profile')
      }
    })
  }

  const hasChanges =
    name !== profile.name ||
    bio !== (profile.bio || '') ||
    phone !== (profile.phone || '') ||
    companyName !== (profile.company_name || '')

  const showCompanyField = profile.role === 'dfy' || profile.role === 'client'

  return (
    <div className="space-y-6">
      {/* Avatar & Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Your profile photo and basic details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <AvatarUpload
            currentAvatarUrl={profile.avatar_url || null}
            userName={profile.name}
          />

          <Separator />

          {/* Name & Email */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="pl-10 bg-muted/50"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </div>

          {/* Role Badge */}
          <div className="space-y-2">
            <Label>Role</Label>
            <div>
              <Badge variant="outline" className="capitalize">
                {profile.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            About
          </CardTitle>
          <CardDescription>
            A brief description that appears on your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, bioMaxChars))}
              placeholder="Tell us a bit about yourself..."
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
            <p className={`text-xs ${bioCharCount > bioMaxChars - 20 ? 'text-amber-500' : 'text-muted-foreground'}`}>
              {bioCharCount}/{bioMaxChars} characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Company */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact
          </CardTitle>
          <CardDescription>
            Additional contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                For WhatsApp notifications (coming soon)
              </p>
            </div>

            {showCompanyField && (
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your company"
                    className="pl-10"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <LocationSettings
        currentCity={profile.city}
        currentCountry={profile.country}
        currentTimezone={profile.timezone}
      />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isPending || !hasChanges}
          size="lg"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  )
}
