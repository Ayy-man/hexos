'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/auth/types'

// Search result types
export interface SearchResult {
  id: string
  type:
  | 'project'
  | 'inquiry'
  | 'blueprint'
  | 'case-study'
  | 'conversation'
  | 'action'
  | 'pulse'
  | 'finance'
  | 'metric'
  | 'payout'
  | 'opportunity'
  | 'suggestion'
  | 'blocker'
  | 'team'
  | 'settings'
  | 'profile'
  title: string
  subtitle: string
  link: string
}

export interface SearchResults {
  projects: SearchResult[]
  inquiries: SearchResult[]
  blueprints: SearchResult[]
  caseStudies: SearchResult[]
  conversations: SearchResult[]
}

// Role-aware URL generation
function generateLink(
  type: SearchResult['type'],
  id: string,
  role: UserRole
): string {
  switch (type) {
    case 'project':
      return role === 'client' ? '/dashboard/client' : `/projects/${id}`
    case 'inquiry':
      // Only admin, internal, and dfy can access inquiries
      if (['admin', 'internal', 'dfy'].includes(role)) {
        return `/inquiries/${id}`
      }
      return '/inquiries'
    case 'blueprint':
      return `/blueprints/${id}`
    case 'case-study':
      return `/case-studies/${id}`
    case 'conversation':
      return `/conversations?id=${id}`
    default:
      return '/'
  }
}

// Format status for display
function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Main search function with parallel queries
export async function globalSearch(
  query: string,
  role: UserRole
): Promise<SearchResults> {
  if (!query.trim()) {
    return {
      projects: [],
      inquiries: [],
      blueprints: [],
      caseStudies: [],
      conversations: [],
    }
  }

  const supabase = await createClient()
  const searchPattern = `%${query.trim()}%`

  // Execute all queries in parallel
  const [projectsResult, inquiriesResult, blueprintsResult, caseStudiesResult, conversationsResult] =
    await Promise.all([
      // Projects: search project_name, client_name
      supabase
        .from('projects')
        .select('id, project_name, client_name, status')
        .or(`project_name.ilike.${searchPattern},client_name.ilike.${searchPattern}`)
        .limit(5),

      // Inquiries: search prospect_company_name, partner_name (only for admin/internal/dfy)
      ['admin', 'internal', 'dfy'].includes(role)
        ? supabase
          .from('inquiries')
          .select('id, prospect_company_name, partner_name, proposal_stage')
          .or(`prospect_company_name.ilike.${searchPattern},partner_name.ilike.${searchPattern}`)
          .eq('is_deleted', false)
          .limit(5)
        : Promise.resolve({ data: [], error: null }),

      // Blueprints: search name, description
      supabase
        .from('blueprints')
        .select('id, name, description, icon, status')
        .or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .limit(5),

      // Case Studies: search name, client_name
      supabase
        .from('case_studies')
        .select('id, name, client_name, icon, status')
        .or(`name.ilike.${searchPattern},client_name.ilike.${searchPattern}`)
        .limit(5),

      // Conversations: search by project name relation
      supabase
        .from('conversations')
        .select('id, type, project:projects(project_name)')
        .limit(5),
    ])

  // Transform projects
  const projects: SearchResult[] = (projectsResult.data || []).map((p) => ({
    id: p.id,
    type: 'project' as const,
    title: p.project_name || 'Untitled Project',
    subtitle: `${p.client_name || 'No client'} • ${formatStatus(p.status)}`,
    link: generateLink('project', p.id, role),
  }))

  // Transform inquiries
  const inquiries: SearchResult[] = (inquiriesResult.data || []).map((i) => ({
    id: i.id,
    type: 'inquiry' as const,
    title: i.prospect_company_name || 'Untitled Inquiry',
    subtitle: `${i.partner_name || 'Unknown partner'} • ${formatStatus(i.proposal_stage || 'unopened')}`,
    link: generateLink('inquiry', i.id, role),
  }))

  // Transform blueprints
  const blueprints: SearchResult[] = (blueprintsResult.data || []).map((b) => ({
    id: b.id,
    type: 'blueprint' as const,
    title: `${b.icon || ''} ${b.name}`.trim(),
    subtitle: b.description?.slice(0, 60) || 'No description',
    link: generateLink('blueprint', b.id, role),
  }))

  // Transform case studies
  const caseStudies: SearchResult[] = (caseStudiesResult.data || []).map((cs) => ({
    id: cs.id,
    type: 'case-study' as const,
    title: `${cs.icon || ''} ${cs.name}`.trim(),
    subtitle: cs.client_name || 'No client',
    link: generateLink('case-study', cs.id, role),
  }))

  // Transform conversations (filter by query match in project name)
  const conversations: SearchResult[] = (conversationsResult.data || [])
    .filter((c) => {
      const projectName = (c.project as { project_name?: string })?.project_name || ''
      return projectName.toLowerCase().includes(query.toLowerCase())
    })
    .map((c) => ({
      id: c.id,
      type: 'conversation' as const,
      title: (c.project as { project_name?: string })?.project_name || 'Direct Message',
      subtitle: c.type === 'project' ? 'Project conversation' : 'Direct message',
      link: generateLink('conversation', c.id, role),
    }))

  return {
    projects,
    inquiries,
    blueprints,
    caseStudies,
    conversations,
  }
}

