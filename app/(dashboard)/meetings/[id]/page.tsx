import { notFound } from 'next/navigation'
import { getMeeting } from '@/lib/api/meetings'
import { requireAuth, getProfile } from '@/lib/auth/guards'
import { MeetingDetail } from '@/features/meetings/components/meeting-detail'

// Force dynamic rendering - never cache this page
export const dynamic = 'force-dynamic'

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAuth()
  const profile = await getProfile()
  const { id } = await params

  if (!profile) notFound()

  // Only admins can view meetings (per V1 RLS policy)
  if (profile.role !== 'admin') {
    notFound()
  }

  const meeting = await getMeeting(id)

  if (!meeting) {
    notFound()
  }

  return (
    <MeetingDetail
      meeting={meeting}
      userRole={profile.role}
    />
  )
}
