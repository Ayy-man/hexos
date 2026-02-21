'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { getProfile } from '@/lib/auth/guards'
import {
  updateProjectDocument,
  createDocumentVersion,
  restoreDocumentVersion,
  createProjectDocument,
  deleteProjectDocument,
  type ProjectDocument,
} from '@/lib/api/project-documents'
import { createNotification } from '@/lib/api/notifications'

// ============================================
// Mention Utilities
// ============================================

/**
 * Recursively extract user IDs from Plate.js mention nodes (trigger === '@')
 * Returns a deduplicated array of user IDs
 */
function extractMentionUserIds(content: unknown): string[] {
  if (!Array.isArray(content)) return []

  const ids = new Set<string>()

  function walk(nodes: unknown[]): void {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue
      const n = node as Record<string, unknown>

      // Check if this is a user mention node
      if (n.type === 'mention' && n.trigger === '@' && typeof n.key === 'string' && n.key) {
        ids.add(n.key)
      }

      // Recurse into children
      if (Array.isArray(n.children)) {
        walk(n.children)
      }
    }
  }

  walk(content)
  return Array.from(ids)
}

// ============================================
// Document Actions
// ============================================

/**
 * Update gameplan content with auto-save
 * Creates a version every 10 saves
 */
export async function updateGameplanContentAction(
  documentId: string,
  projectId: string,
  content: unknown
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Fetch current document content BEFORE saving (for mention diff)
  const { data: currentDoc } = await supabase
    .from('project_documents')
    .select('content')
    .eq('id', documentId)
    .single()

  const oldMentions = new Set(extractMentionUserIds(currentDoc?.content))
  const newMentions = extractMentionUserIds(content)
  const addedMentions = newMentions.filter((id) => !oldMentions.has(id) && id !== user.id)

  // Update the document content
  await updateProjectDocument(documentId, { content })

  // Check if we should create a version (every 10 saves)
  const { count } = await supabase
    .from('document_versions')
    .select('*', { count: 'exact', head: true })
    .eq('document_id', documentId)

  const versionCount = count || 0

  // Get last version's created_at to determine if enough time has passed
  const { data: lastVersion } = await supabase
    .from('document_versions')
    .select('created_at')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  // Create version if: first save, or 10+ saves since last version, or 30+ minutes since last version
  const shouldCreateVersion =
    versionCount === 0 ||
    versionCount % 10 === 0 ||
    (lastVersion && new Date().getTime() - new Date(lastVersion.created_at).getTime() > 30 * 60 * 1000)

  if (shouldCreateVersion) {
    await createDocumentVersion(documentId, content, {
      description: 'Auto-saved version',
      isCheckpoint: false,
    })
  }

  revalidatePath(`/projects/${projectId}`)

  // Fire-and-forget: send mention notifications for newly mentioned users
  if (addedMentions.length > 0) {
    Promise.allSettled(
      addedMentions.map((mentionedUserId) =>
        createNotification({
          userId: mentionedUserId,
          type: 'mention',
          title: 'You were mentioned in a gameplan',
          message: 'Someone mentioned you in a project gameplan document',
          projectId,
          actorId: user.id,
        }).catch((err) => {
          console.error('[updateGameplanContentAction] Mention notification failed:', err)
        })
      )
    ).catch((err) => {
      console.error('[updateGameplanContentAction] Promise.allSettled failed:', err)
    })
  }
}

/**
 * Create a manual checkpoint (named version)
 */
export async function createCheckpointAction(
  documentId: string,
  projectId: string,
  content: unknown,
  checkpointName?: string
): Promise<void> {
  await createDocumentVersion(documentId, content, {
    description: checkpointName || 'Manual checkpoint',
    checkpointName: checkpointName || undefined,
    isCheckpoint: true,
  })

  revalidatePath(`/projects/${projectId}`)
}

/**
 * Restore a previous version
 */
export async function restoreVersionAction(
  documentId: string,
  versionId: string,
  projectId: string
): Promise<void> {
  await restoreDocumentVersion(documentId, versionId)

  // Log activity
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await supabase.from('activity_log').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'document_version_restored',
      details: {
        document_id: documentId,
        version_id: versionId,
      },
    })
  }

  revalidatePath(`/projects/${projectId}`)
}

/**
 * Create a new document in the project
 */
export async function createDocumentAction(
  projectId: string,
  title: string,
  slug: string,
  visibility: 'internal' | 'client' = 'internal'
): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get next position
  const { count } = await supabase
    .from('project_documents')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const document = await createProjectDocument({
    project_id: projectId,
    title,
    slug,
    position: count || 0,
    visibility,
  })

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'document_created',
    details: {
      document_id: document.id,
      title,
    },
  })

  revalidatePath(`/projects/${projectId}`)
  return document.id
}

/**
 * Delete a document
 */
export async function deleteDocumentAction(
  documentId: string,
  projectId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get document title for activity log
  const { data: doc } = await supabase
    .from('project_documents')
    .select('title')
    .eq('id', documentId)
    .single()

  await deleteProjectDocument(documentId)

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'document_deleted',
    details: {
      document_id: documentId,
      title: doc?.title,
    },
  })

  revalidatePath(`/projects/${projectId}`)
}

/**
 * Update document title
 */
export async function updateDocumentTitleAction(
  documentId: string,
  projectId: string,
  title: string
): Promise<void> {
  await updateProjectDocument(documentId, { title })
  revalidatePath(`/projects/${projectId}`)
}

/**
 * Update inline discussions
 */
export async function updateDocumentDiscussionsAction(
  documentId: string,
  projectId: string,
  discussions: unknown
): Promise<void> {
  await updateProjectDocument(documentId, { discussions })
  revalidatePath(`/projects/${projectId}`)
}

/**
 * Get all documents for a project (server action that bypasses RLS)
 * Filters by visibility based on user role:
 * - Admin/Internal: Can see all documents
 * - Dev: Can see internal documents only
 * - DFY: Can see client documents only
 */
export async function getProjectDocumentsAction(
  projectId: string,
  visibility?: 'internal' | 'client'
): Promise<{ documents: ProjectDocument[]; error?: string }> {
  try {
    const profile = await getProfile()
    if (!profile) {
      return { documents: [], error: 'Not authenticated' }
    }

    // Role-based access control
    const canAccessInternal = ['admin', 'internal', 'dev'].includes(profile.role)
    const canAccessClient = ['admin', 'internal', 'dfy'].includes(profile.role)

    if (!canAccessInternal && !canAccessClient) {
      return { documents: [], error: 'Access denied' }
    }

    // Use admin client to bypass RLS after manual auth check
    const adminClient = createAdminClient()
    let query = adminClient
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)

    // Apply visibility filter
    if (visibility) {
      // Check if user can access the requested visibility
      if (visibility === 'internal' && !canAccessInternal) {
        return { documents: [], error: 'Access denied to internal documents' }
      }
      if (visibility === 'client' && !canAccessClient) {
        return { documents: [], error: 'Access denied to client documents' }
      }
      query = query.eq('visibility', visibility)
    } else {
      // No specific visibility requested - filter based on role
      if (canAccessInternal && canAccessClient) {
        // Admin/Internal can see all - no additional filter
      } else if (canAccessInternal) {
        query = query.eq('visibility', 'internal')
      } else if (canAccessClient) {
        query = query.eq('visibility', 'client')
      }
    }

    const { data, error } = await query.order('position', { ascending: true })

    if (error) {
      console.error('[Action] Error fetching documents:', error)
      return { documents: [], error: error.message }
    }

    return { documents: data || [] }
  } catch (err) {
    console.error('[Action] Unexpected error:', err)
    return { documents: [], error: 'Failed to fetch documents' }
  }
}

// Types for mentionables
interface MentionableUser {
  type: 'user'
  id: string
  name: string
  email: string
}

interface MentionableDeliverable {
  type: 'deliverable'
  id: string
  title: string
  status: string
  parent_id: string | null
}

export interface ProjectMentionables {
  users: MentionableUser[]
  deliverables: MentionableDeliverable[]
}

/**
 * Get mentionables for a project (users and deliverables)
 * Server action that bypasses RLS
 */
export async function getMentionablesAction(
  projectId: string
): Promise<ProjectMentionables> {
  try {
    const profile = await getProfile()
    if (!profile) {
      return { users: [], deliverables: [] }
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Get project with related users (dfy_partner, assigned_dev, client)
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select(`
        dfy_partner:profiles!dfy_partner_id(id, name, email),
        assigned_dev:profiles!assigned_dev_id(id, name, email),
        client:profiles!client_id(id, name, email)
      `)
      .eq('id', projectId)
      .single()

    if (projectError) {
      console.error('[Action] Error fetching project for mentionables:', projectError)
      // Don't bail — still fetch admin/internal profiles below
    }

    // Get deliverables for the project
    const { data: deliverables, error: deliverableError } = await adminClient
      .from('deliverables')
      .select('id, title, status, parent_id')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (deliverableError) {
      console.error('[Action] Error fetching deliverables:', deliverableError)
    }

    // Get all admin and internal users (they always have project access)
    const { data: adminProfiles, error: adminError } = await adminClient
      .from('profiles')
      .select('id, name, email')
      .in('role', ['admin', 'internal'])

    if (adminError) {
      console.error('[Action] Error fetching admin/internal profiles:', adminError)
    }

    // Build user list (deduplicated)
    const userMap = new Map<string, MentionableUser>()

    // Add DFY partner
    const dfyRaw = project?.dfy_partner
    const dfy = Array.isArray(dfyRaw) ? dfyRaw[0] : dfyRaw
    if (dfy && dfy.id && !userMap.has(dfy.id)) {
      userMap.set(dfy.id, {
        type: 'user',
        id: dfy.id,
        name: dfy.name,
        email: dfy.email,
      })
    }

    // Add assigned dev
    const devRaw = project?.assigned_dev
    const dev = Array.isArray(devRaw) ? devRaw[0] : devRaw
    if (dev && dev.id && !userMap.has(dev.id)) {
      userMap.set(dev.id, {
        type: 'user',
        id: dev.id,
        name: dev.name,
        email: dev.email,
      })
    }

    // Add client
    const clientRaw = project?.client
    const client = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw
    if (client && client.id && !userMap.has(client.id)) {
      userMap.set(client.id, {
        type: 'user',
        id: client.id,
        name: client.name,
        email: client.email,
      })
    }

    // Add all admin/internal users (deduplication handled by Map)
    for (const adminProfile of adminProfiles || []) {
      if (adminProfile.id && !userMap.has(adminProfile.id)) {
        userMap.set(adminProfile.id, {
          type: 'user',
          id: adminProfile.id,
          name: adminProfile.name,
          email: adminProfile.email,
        })
      }
    }

    // Build deliverable list
    const mentionableDeliverables: MentionableDeliverable[] = (deliverables || []).map((d) => ({
      type: 'deliverable',
      id: d.id,
      title: d.title,
      status: d.status,
      parent_id: d.parent_id,
    }))

    return {
      users: Array.from(userMap.values()),
      deliverables: mentionableDeliverables,
    }
  } catch (err) {
    console.error('[Action] Unexpected error in getMentionablesAction:', err)
    return { users: [], deliverables: [] }
  }
}
