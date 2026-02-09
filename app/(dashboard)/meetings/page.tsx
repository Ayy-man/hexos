import { requireAuth } from '@/lib/auth/guards'
import { getProfile } from '@/lib/auth/guards'
import { redirect } from 'next/navigation'
import { getMeetings } from '@/lib/api/meetings'
import { MeetingList } from '@/features/meetings/components/meeting-list'
import { NewMeetingDialog } from '@/features/meetings/components/new-meeting-dialog'

export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  await requireAuth()

  // Verify admin role
  const profile = await getProfile()
  if (!profile || !['admin', 'internal'].includes(profile.role)) {
    redirect('/unauthorized')
  }

  // Fetch all meetings
  const meetings = await getMeetings()

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Meetings
        </h1>
        <NewMeetingDialog />
      </div>

      <MeetingList meetings={meetings} />
    </div>
  )
}
