import { requireProfile } from '@/lib/auth/guards'
import { getAllConversationsWithUnread } from '@/lib/api/conversations'
import { ConversationsView } from './ConversationsView'

export const metadata = {
  title: 'Conversations | hexOS',
  description: 'View and manage all your project conversations',
}

export default async function ConversationsPage() {
  const profile = await requireProfile()
  const conversations = await getAllConversationsWithUnread()

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">Conversations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All your project conversations in one place
        </p>
      </div>

      <ConversationsView
        conversations={conversations}
        currentUserId={profile.id}
        userRole={profile.role}
      />
    </div>
  )
}
