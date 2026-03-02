import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth/cached'
import { getInquiriesByStage } from '@/lib/api/inquiries'
import { getProjectsByStatusGroup } from '@/lib/api/projects'
import { getSuggestionsByStatus } from '@/lib/api/suggestions'
import { getBlueprintsByStatus } from '@/lib/api/blueprints'
import { getCaseStudiesByStatus } from '@/lib/api/case-studies'
import { getActiveBlockersByPriority } from '@/lib/api/blockers'

export async function GET(request: NextRequest) {
  const profile = await getAuthProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 10)

  if (!type || !status) {
    return NextResponse.json({ error: 'Missing type or status' }, { status: 400 })
  }

  const isAdminOrInternal = ['admin', 'internal'].includes(profile.role)

  try {
    switch (type) {
      case 'inquiries': {
        if (!isAdminOrInternal) return NextResponse.json({ items: [] })
        const inquiries = await getInquiriesByStage(status, limit)
        return NextResponse.json({
          items: inquiries.map((i: any) => ({
            id: i.id,
            name: [i.prospect_company_name, (i.form_data as any)?.project_type].filter(Boolean).join(' — ') || 'Unnamed Inquiry',
            href: `/inquiries/${i.id}`,
          })),
        })
      }

      case 'projects': {
        if (!isAdminOrInternal) return NextResponse.json({ items: [] })
        const projects = await getProjectsByStatusGroup(status as 'active' | 'inquiry' | 'completed', limit)
        return NextResponse.json({
          items: projects.map((p: any) => ({
            id: p.id,
            name: [p.project_name, p.client_name].filter(Boolean).join(' — ') || 'Unnamed Project',
            href: `/projects/${p.id}`,
          })),
        })
      }

      case 'suggestions': {
        if (!isAdminOrInternal) return NextResponse.json({ items: [] })
        const suggestions = await getSuggestionsByStatus(status, limit)
        return NextResponse.json({
          items: suggestions.map((s: any) => ({
            id: s.id,
            name: s.title || 'Untitled Suggestion',
            href: '/suggestions',
          })),
        })
      }

      case 'blueprints': {
        if (!isAdminOrInternal) return NextResponse.json({ items: [] })
        const blueprints = await getBlueprintsByStatus(status, limit)
        return NextResponse.json({
          items: blueprints.map((b: any) => ({
            id: b.id,
            name: b.name || 'Untitled Blueprint',
            href: `/blueprints/${b.id}`,
          })),
        })
      }

      case 'case-studies': {
        if (!isAdminOrInternal) return NextResponse.json({ items: [] })
        const caseStudies = await getCaseStudiesByStatus(status, limit)
        return NextResponse.json({
          items: caseStudies.map((cs: any) => ({
            id: cs.id,
            name: cs.name || 'Untitled Case Study',
            href: `/case-studies/${cs.id}`,
          })),
        })
      }

      case 'blockers': {
        if (!isAdminOrInternal) return NextResponse.json({ items: [] })
        const blockers = await getActiveBlockersByPriority(status, limit)
        return NextResponse.json({
          items: blockers.map((b: any) => ({
            id: b.id,
            name: [b.title, (b.projects as any)?.project_name].filter(Boolean).join(' — ') || 'Untitled Blocker',
            href: '/admin/blockers',
          })),
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
