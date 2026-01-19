import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export type TestingStage = 'dev' | 'admin_int' | 'client'
export type TestStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'escalated'
export type ChecklistCategory = 'functional' | 'edge_cases' | 'integration' | 'security' | 'ui_responsive' | 'custom'

export interface TestingInfo {
  stage: TestingStage | null
  status: TestStatus | null
  isLocked: boolean  // True if position can't change without completing tests
  unlockPosition: number | null  // Position that will unlock (90/95/100)
}

export interface DeliverableTest {
  id: string
  deliverable_id: string
  stage: TestingStage
  status: TestStatus
  tested_by: string | null
  started_at: string | null
  completed_at: string | null
  total_items: number
  passed_items: number
  failed_items: number
  notes: string | null
  created_at: string
  updated_at: string
  tester?: {
    id: string
    name: string
    email: string
    avatar_url: string | null
  }
}

export interface TestChecklistItem {
  id: string
  test_id: string
  category: ChecklistCategory
  description: string
  is_auto_generated: boolean
  sort_order: number
  passed: boolean | null
  failure_reason: string | null
  screenshot_url: string | null
  tested_at: string | null
  blocker_id: string | null
  created_at: string
  blocker?: {
    id: string
    title: string
    status: string
  }
}

export interface TestSessionWithItems extends DeliverableTest {
  items: TestChecklistItem[]
}

export interface DeliverableTestSummary {
  deliverable_id: string
  deliverable_title: string
  project_id: string
  current_stage: TestingStage
  dev_status: TestStatus
  admin_int_status: TestStatus
  client_status: TestStatus
  is_ready_for_next: boolean
  next_stage: TestingStage | null
}

// ============================================
// Test Sessions
// ============================================

export async function getTestsForDeliverable(deliverableId: string): Promise<DeliverableTest[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverable_tests')
    .select('*, tester:profiles!tested_by(id, name, email, avatar_url)')
    .eq('deliverable_id', deliverableId)
    .order('stage', { ascending: true })

  if (error) throw error

  return (data || []).map(test => ({
    ...test,
    tester: Array.isArray(test.tester) ? test.tester[0] : test.tester,
  }))
}

export async function getTestSession(testId: string): Promise<TestSessionWithItems | null> {
  const supabase = await createClient()

  const { data: test, error } = await supabase
    .from('deliverable_tests')
    .select('*, tester:profiles!tested_by(id, name, email, avatar_url)')
    .eq('id', testId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  const { data: items } = await supabase
    .from('test_checklist_items')
    .select('*, blocker:blockers(id, title, status)')
    .eq('test_id', testId)
    .order('sort_order', { ascending: true })

  const normalizedItems = (items || []).map(item => ({
    ...item,
    blocker: Array.isArray(item.blocker) ? item.blocker[0] : item.blocker,
  }))

  return {
    ...test,
    tester: Array.isArray(test.tester) ? test.tester[0] : test.tester,
    items: normalizedItems,
  }
}

export async function getOrCreateTestSession(
  deliverableId: string,
  stage: TestingStage
): Promise<DeliverableTest> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: existing, error: fetchError } = await supabase
    .from('deliverable_tests')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .eq('stage', stage)
    .single()

  if (existing && !fetchError) {
    return existing
  }

  const { data, error } = await supabase
    .from('deliverable_tests')
    .insert({ deliverable_id: deliverableId, stage })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function startTestingSession(testId: string): Promise<DeliverableTest> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('deliverable_tests')
    .update({
      status: 'in_progress',
      tested_by: user.id,
      started_at: new Date().toISOString(),
    })
    .eq('id', testId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTestNotes(testId: string, notes: string): Promise<DeliverableTest> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverable_tests')
    .update({ notes })
    .eq('id', testId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================
// Checklist Items
// ============================================

export async function getChecklistItems(testId: string): Promise<TestChecklistItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('test_checklist_items')
    .select('*, blocker:blockers(id, title, status)')
    .eq('test_id', testId)
    .order('sort_order', { ascending: true })

  if (error) throw error

  return (data || []).map(item => ({
    ...item,
    blocker: Array.isArray(item.blocker) ? item.blocker[0] : item.blocker,
  }))
}

export async function addChecklistItem(params: {
  testId: string
  category: ChecklistCategory
  description: string
  isAutoGenerated?: boolean
  sortOrder?: number
}): Promise<TestChecklistItem> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('test_checklist_items')
    .select('sort_order')
    .eq('test_id', params.testId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSortOrder = params.sortOrder ?? (existing?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('test_checklist_items')
    .insert({
      test_id: params.testId,
      category: params.category,
      description: params.description,
      is_auto_generated: params.isAutoGenerated ?? false,
      sort_order: nextSortOrder,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function addChecklistItems(
  testId: string,
  items: Array<{
    category: ChecklistCategory
    description: string
    isAutoGenerated?: boolean
  }>
): Promise<TestChecklistItem[]> {
  const results = await Promise.all(
    items.map((item, index) =>
      addChecklistItem({
        testId,
        category: item.category,
        description: item.description,
        isAutoGenerated: item.isAutoGenerated ?? false,
        sortOrder: index,
      })
    )
  )

  return results
}

export async function updateChecklistItem(
  itemId: string,
  updates: {
    passed: boolean
    failureReason?: string
    screenshotUrl?: string
  }
): Promise<TestChecklistItem> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('test_checklist_items')
    .update({
      passed: updates.passed,
      failure_reason: updates.failureReason || null,
      screenshot_url: updates.screenshotUrl || null,
      tested_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('test_checklist_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
}

// ============================================
// Test Submission and Completion
// ============================================

export interface SubmitTestResultsParams {
  testId: string
  notes?: string
  createBlockers?: boolean
}

export async function submitTestResults(params: SubmitTestResultsParams): Promise<{
  test: DeliverableTest
  blockersCreated: string[]
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const test = await getTestSession(params.testId)
  if (!test) throw new Error('Test session not found')

  const totalItems = test.items.length
  const passedItems = test.items.filter(i => i.passed === true).length
  const failedItems = test.items.filter(i => i.passed === false).length
  const untestedItems = test.items.filter(i => i.passed === null).length

  if (untestedItems > 0) {
    throw new Error(`${untestedItems} items have not been tested yet`)
  }

  const status: TestStatus = failedItems > 0 ? 'failed' : 'passed'

  const { data: updatedTest, error: updateError } = await supabase
    .from('deliverable_tests')
    .update({
      status,
      total_items: totalItems,
      passed_items: passedItems,
      failed_items: failedItems,
      notes: params.notes || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', params.testId)
    .select()
    .single()

  if (updateError) throw updateError

  const blockersCreated: string[] = []

  if (params.createBlockers && failedItems > 0) {
    const { data: deliverable } = await supabase
      .from('deliverables')
      .select('project_id, title')
      .eq('id', test.deliverable_id)
      .single()

    if (deliverable) {
      for (const item of test.items) {
        if (item.passed === false && !item.blocker_id) {
          const { data: blocker } = await supabase
            .from('blockers')
            .insert({
              project_id: deliverable.project_id,
              deliverable_id: test.deliverable_id,
              title: `Test failed: ${item.description}`,
              description: item.failure_reason || 'Test item failed during testing',
              priority: 'medium',
              reported_by: user.id,
              test_item_id: item.id,
            })
            .select('id')
            .single()

          if (blocker) {
            await supabase
              .from('test_checklist_items')
              .update({ blocker_id: blocker.id })
              .eq('id', item.id)

            blockersCreated.push(blocker.id)
          }
        }
      }
    }
  }

  return {
    test: updatedTest,
    blockersCreated,
  }
}

// ============================================
// Testing Queue and Summary
// ============================================

export async function getTestingQueue(): Promise<{
  readyForDev: DeliverableTestSummary[]
  readyForAdminInt: DeliverableTestSummary[]
  readyForClient: DeliverableTestSummary[]
  inProgress: DeliverableTestSummary[]
}> {
  const supabase = await createClient()

  // Include deliverables at 90-100% that are in the testing phase
  // We'll filter out completed ones below
  const { data: deliverables, error } = await supabase
    .from('deliverables')
    .select('id, title, hill_position, project_id, deliverable_tests(id, stage, status)')
    .gte('hill_position', 90)
    .lte('hill_position', 100)

  if (error) throw error

  // Defensive: Ensure deliverables at 90%+ have test records
  // This handles cases where deliverables reached testing zone before
  // the auto-create feature or migration ran
  for (const deliverable of (deliverables || [])) {
    const tests = (deliverable.deliverable_tests as any) || []
    const hasDevTest = tests.some((t: any) => t.stage === 'dev')

    if (!hasDevTest) {
      try {
        await ensureTestSessionForDeliverable(deliverable.id)
        // Refetch this deliverable to get the newly created test record
        const { data: updated } = await supabase
          .from('deliverables')
          .select('id, title, hill_position, project_id, deliverable_tests(id, stage, status)')
          .eq('id', deliverable.id)
          .single()
        if (updated) {
          Object.assign(deliverable, updated)
        }
      } catch (e) {
        // Log but don't fail - the migration should handle most cases
        console.error('Failed to ensure test session for deliverable:', deliverable.id, e)
      }
    }
  }

  const summaries: DeliverableTestSummary[] = (deliverables || []).map(d => {
    const tests = (d.deliverable_tests as any) || []
    const devTest = tests.find((t: any) => t.stage === 'dev')
    const adminIntTest = tests.find((t: any) => t.stage === 'admin_int')
    const clientTest = tests.find((t: any) => t.stage === 'client')

    // Determine current and next stage based on test statuses
    let currentStage: TestingStage = 'dev'
    let nextStage: TestingStage | null = 'dev'
    let allTestsPassed = false

    if (devTest?.status === 'passed') {
      if (!adminIntTest || adminIntTest.status === 'pending') {
        nextStage = 'admin_int'
        currentStage = 'dev'
      } else if (adminIntTest.status === 'passed') {
        if (!clientTest || clientTest.status === 'pending') {
          nextStage = 'client'
          currentStage = 'admin_int'
        } else if (clientTest.status === 'passed') {
          // All tests passed - this deliverable is done
          nextStage = null
          currentStage = 'client'
          allTestsPassed = true
        } else {
          nextStage = null
          currentStage = 'client'
        }
      } else {
        nextStage = null
        currentStage = 'admin_int'
      }
    } else if (devTest && devTest.status !== 'pending') {
      nextStage = null
      currentStage = 'dev'
    }

    return {
      deliverable_id: d.id,
      deliverable_title: d.title,
      project_id: d.project_id,
      current_stage: currentStage,
      dev_status: devTest?.status ?? 'pending',
      admin_int_status: adminIntTest?.status ?? 'pending',
      client_status: clientTest?.status ?? 'pending',
      is_ready_for_next: nextStage !== null,
      next_stage: nextStage,
      all_tests_passed: allTestsPassed,
    } as DeliverableTestSummary & { all_tests_passed: boolean }
  })

  // Filter out deliverables that have completed all testing stages
  const activeSummaries = summaries.filter(s => !(s as any).all_tests_passed)

  const readyForDev = activeSummaries.filter(s => s.dev_status === 'pending' && s.next_stage === 'dev')
  const readyForAdminInt = activeSummaries.filter(s => s.dev_status === 'passed' && s.admin_int_status === 'pending')
  const readyForClient = activeSummaries.filter(s => s.admin_int_status === 'passed' && s.client_status === 'pending')
  const inProgress = activeSummaries.filter(s =>
    s.dev_status === 'in_progress' || s.admin_int_status === 'in_progress' || s.client_status === 'in_progress'
  )

  return { readyForDev, readyForAdminInt, readyForClient, inProgress }
}

export async function getDeliverableTestSummary(
  deliverableId: string
): Promise<DeliverableTestSummary | null> {
  const supabase = await createClient()

  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('id, title, project_id')
    .eq('id', deliverableId)
    .single()

  if (!deliverable) return null

  const tests = await getTestsForDeliverable(deliverableId)

  const devTest = tests.find(t => t.stage === 'dev')
  const adminIntTest = tests.find(t => t.stage === 'admin_int')
  const clientTest = tests.find(t => t.stage === 'client')

  let nextStage: TestingStage | null = null
  if (!devTest || devTest.status === 'pending') {
    nextStage = 'dev'
  } else if (devTest.status === 'passed') {
    if (!adminIntTest || adminIntTest.status === 'pending') {
      nextStage = 'admin_int'
    } else if (adminIntTest.status === 'passed') {
      if (!clientTest || clientTest.status === 'pending') {
        nextStage = 'client'
      }
    }
  }

  return {
    deliverable_id: deliverable.id,
    deliverable_title: deliverable.title,
    project_id: deliverable.project_id,
    current_stage: devTest?.stage ?? 'dev',
    dev_status: devTest?.status ?? 'pending',
    admin_int_status: adminIntTest?.status ?? 'pending',
    client_status: clientTest?.status ?? 'pending',
    is_ready_for_next: nextStage !== null,
    next_stage: nextStage,
  }
}

export async function projectHasTestingDeliverables(projectId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverables')
    .select('id')
    .eq('project_id', projectId)
    .gte('hill_position', 90)
    .limit(1)

  if (error) throw error
  return (data?.length ?? 0) > 0
}

// Get testing info for all deliverables in a project
// Returns a map of deliverable_id to testing info
export async function getProjectTestingInfo(
  projectId: string
): Promise<Map<string, TestingInfo>> {
  const supabase = await createClient()

  // Get all deliverables in the testing zone (90-100%)
  const { data: deliverables, error: delError } = await supabase
    .from('deliverables')
    .select('id, hill_position')
    .eq('project_id', projectId)
    .gte('hill_position', 90)
    .lte('hill_position', 100)

  if (delError) throw delError
  if (!deliverables || deliverables.length === 0) return new Map()

  const deliverableIds = deliverables.map(d => d.id)

  // Get all tests for these deliverables
  const { data: tests, error: testError } = await supabase
    .from('deliverable_tests')
    .select('deliverable_id, stage, status')
    .in('deliverable_id', deliverableIds)

  if (testError) throw testError

  return calculateTestingInfo(deliverables, tests || [])
}

/**
 * Client-side helper to calculate testing info from deliverables and tests
 * This can be used in realtime hooks to avoid server round-trips
 */
export function calculateTestingInfo(
  deliverables: Array<{ id: string; hill_position: number }>,
  tests: Array<{ deliverable_id: string; stage: TestingStage; status: TestStatus }>
): Map<string, TestingInfo> {
  const testingMap = new Map<string, TestingInfo>()

  // Initialize all deliverables in testing zone
  deliverables.forEach(d => {
    const dTests = tests.filter(t => t.deliverable_id === d.id)
    const devTest = dTests.find(t => t.stage === 'dev')
    const adminIntTest = dTests.find(t => t.stage === 'admin_int')
    const clientTest = dTests.find(t => t.stage === 'client')

    // Determine current stage and lock status
    let stage: TestingStage | null = null
    let status: TestStatus | null = null
    let isLocked = false
    let unlockPosition: number | null = null

    if (devTest?.status === 'passed') {
      if (adminIntTest?.status === 'passed') {
        if (clientTest?.status === 'passed') {
          // All tests passed - done
          stage = 'client'
          status = 'passed'
        } else {
          // Admin passed, waiting for client
          stage = 'client'
          status = clientTest?.status ?? 'pending'
          isLocked = true
          unlockPosition = 100
        }
      } else {
        // Dev passed, waiting for admin or admin in progress
        stage = 'admin_int'
        status = adminIntTest?.status ?? 'pending'
        isLocked = true
        unlockPosition = 95
      }
    } else {
      // Dev test pending or in progress
      stage = 'dev'
      status = devTest?.status ?? 'pending'
      isLocked = true
      unlockPosition = 90
    }

    testingMap.set(d.id, { stage, status, isLocked, unlockPosition })
  })

  return testingMap
}

// ============================================
// Re-testing
// ============================================

export async function resetItemForRetest(itemId: string): Promise<TestChecklistItem> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('test_checklist_items')
    .update({
      passed: null,
      failure_reason: null,
      tested_at: null,
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error

  const { data: item } = await supabase
    .from('test_checklist_items')
    .select('test_id')
    .eq('id', itemId)
    .single()

  if (item) {
    await supabase
      .from('deliverable_tests')
      .update({ status: 'in_progress' })
      .eq('id', item.test_id)
      .eq('status', 'failed')
  }

  return data
}

// ============================================
// Escalation
// ============================================

export async function escalateClientTest(
  testId: string,
  approverNotes: string
): Promise<DeliverableTest> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('deliverable_tests')
    .update({
      status: 'escalated',
      notes: `Escalated by admin: ${approverNotes}`,
      completed_at: new Date().toISOString(),
    })
    .eq('id', testId)
    .eq('stage', 'client')
    .select()
    .single()

  if (error) throw error

  await supabase
    .from('deliverables')
    .update({ hill_position: 100 })
    .eq('id', data.deliverable_id)

  return data
}

// ============================================
// Auto-create Test Sessions
// ============================================

/**
 * Ensures a deliverable has an initial test session when entering the testing zone (90%+).
 * Creates a 'dev' stage test record if no tests exist for this deliverable.
 * This ensures deliverables appear in the Testing tab immediately.
 *
 * @param deliverableId - The ID of the deliverable to check
 * @returns The created test session, or null if one already existed
 */
export async function ensureTestSessionForDeliverable(
  deliverableId: string
): Promise<DeliverableTest | null> {
  const supabase = await createClient()

  // Check if any tests exist for this deliverable
  const { data: existingTests, error: fetchError } = await supabase
    .from('deliverable_tests')
    .select('id')
    .eq('deliverable_id', deliverableId)
    .limit(1)

  if (fetchError) throw fetchError

  // If tests already exist, no need to create one
  if (existingTests && existingTests.length > 0) {
    return null
  }

  // Create the initial 'dev' stage test record
  const { data, error } = await supabase
    .from('deliverable_tests')
    .insert({
      deliverable_id: deliverableId,
      stage: 'dev',
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}
