import { requireProfile } from '@/lib/auth/guards'
import {
  getDirectConversations,
  getProjectConversationsOnly,
  getInquiryConversations,
} from '@/lib/api/conversations'
import { ConversationsView } from './ConversationsView'

export const metadata = {
  title: 'Conversations | hexOS',
  description: 'View and manage all your conversations',
}

export default async function ConversationsPage() {
  const profile = await requireProfile()

  // Fetch all conversation types in parallel
  const [directConversations, projectConversations, inquiryConversations] = await Promise.all([
    getDirectConversations().catch(() => []),
    getProjectConversationsOnly(),
    getInquiryConversations().catch(() => []),
  ])

  return (
    <ConversationsView
      directConversations={directConversations}
      projectConversations={projectConversations}
      inquiryConversations={inquiryConversations}
      currentUserId={profile.id}
      userRole={profile.role}
    />
  )
}
