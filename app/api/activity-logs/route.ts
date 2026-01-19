import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import type { ActivityLogFilters, ActivityLogWithUser } from '@/lib/types/activity-logs'

/**
 * GET /api/activity-logs
 * Fetch activity logs with filtering and pagination
 *
 * Query params:
 * - entity_type: Filter by entity type (project, invoice, etc.)
 * - entity_id: Filter by specific entity ID
 * - category: Filter by category (crud, auth, ai, payment, etc.)
 * - user_id: Filter by user ID
 * - search: Full-text search
 * - from_date: Start date (ISO string)
 * - to_date: End date (ISO string)
 * - limit: Number of results (default 50, max 200)
 * - offset: Pagination offset
 *
 * Access control:
 * - Admin/internal: Full access to all logs
 * - Regular users: Own activity + entity activity for accessible entities (via RLS)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role && ['admin', 'internal'].includes(profile.role)

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams
    const filters: ActivityLogFilters = {}

    // Entity filters
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')
    if (entityType) filters.entity_type = entityType
    if (entityId) filters.entity_id = entityId

    // Category filter
    const category = searchParams.get('category')
    if (category && category !== 'all') {
      filters.category = category as ActivityLogFilters['category']
    }

    // User filter (admin only, otherwise restricted to own user)
    const userId = searchParams.get('user_id')
    if (userId) {
      // Non-admins can only filter by their own user_id
      if (!isAdmin && userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      filters.user_id = userId
    }

    // Search
    const search = searchParams.get('search')
    if (search) filters.search = search

    // Date range
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    if (fromDate) filters.from_date = fromDate
    if (toDate) filters.to_date = toDate

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')
    filters.limit = limit
    filters.offset = offset

    // Use admin client for admins, regular client for users (RLS applies)
    const queryClient = isAdmin ? createAdminClient() : supabase

    // Build and execute query
    let query = queryClient
      .from('activity_logs')
      .select(
        `
        *,
        user:profiles!user_id(id, name, email, role)
      `,
        { count: 'exact' }
      )
      .order('timestamp', { ascending: false })

    // Apply filters
    if (filters.search) {
      query = query.textSearch('search_text', filters.search, {
        type: 'websearch',
        config: 'english',
      })
    }

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters.entity_type) {
      query = query.eq('entity_type', filters.entity_type)
    }

    if (filters.entity_id) {
      query = query.eq('entity_id', filters.entity_id)
    }

    if (filters.from_date) {
      query = query.gte('timestamp', filters.from_date)
    }

    if (filters.to_date) {
      query = query.lte('timestamp', filters.to_date)
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching activity logs:', error)
      return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 })
    }

    // Normalize user relation
    const normalizedData = (data || []).map((log) => {
      const logUser = Array.isArray(log.user) ? log.user[0] : log.user
      return { ...log, user: logUser } as ActivityLogWithUser
    })

    return NextResponse.json({
      data: normalizedData,
      count: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Activity logs API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
