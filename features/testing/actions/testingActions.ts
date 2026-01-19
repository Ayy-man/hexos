'use server'

import { revalidatePath } from 'next/cache'
import { checkAuth } from '@/lib/auth/guards'
import {
  getOrCreateTestSession,
  startTestingSession,
  updateChecklistItem,
  submitTestResults,
  deleteChecklistItem,
  escalateClientTest,
  getTestSession,
  getTestingQueue,
  getProjectTestingInfo,
  addChecklistItem as addChecklistItemApi,
} from '@/lib/api/testing'
import {
  notifyDevTestingReady,
  notifyAdminIntTestingReady,
  notifyClientTestingReady,
  notifyTestingPassed,
  notifyTestingFailed,
  notifyTestingEscalated,
} from '@/lib/api/testing-notifications'
import { getProject } from '@/lib/api/projects'
import { updatePositionAction } from '@/features/projects/actions/hillChartActions'
import type { TestingStage, ChecklistCategory } from '@/lib/api/testing'

export async function getTestingQueueAction(projectId?: string) {
  const user = await checkAuth()
  return await getTestingQueue(projectId)
}

// Get testing info for all deliverables in a project
export async function getProjectTestingInfoAction(projectId: string) {
  const user = await checkAuth()
  const info = await getProjectTestingInfo(projectId)
  // Convert Map to plain object for serialization
  return Object.fromEntries(info)
}

export async function startTestingAction(deliverableId: string, stage: TestingStage) {
  const user = await checkAuth()

  const test = await getOrCreateTestSession(deliverableId, stage)
  await startTestingSession(test.id)

  const testData = await getTestSession(test.id)
  if (testData) {
    try {
      const project = await getProject(testData.deliverable_id)
      revalidatePath('/projects/' + project.id)
    } catch {
      // Project lookup failed, but continue
    }
  }

  return { success: true, testId: test.id }
}

const checklistTemplates: Record<string, Array<{ category: ChecklistCategory; description: string }>> = {
  voice: [
    { category: 'functional', description: 'Inbound call connects to agent' },
    { category: 'functional', description: 'Agent follows script correctly' },
    { category: 'functional', description: 'Transfer to human works' },
    { category: 'functional', description: 'Voicemail detection triggers fallback' },
    { category: 'edge_cases', description: 'Handles silence > 10 seconds' },
    { category: 'edge_cases', description: 'Handles caller hang-up mid-conversation' },
    { category: 'edge_cases', description: 'Handles invalid input gracefully' },
    { category: 'integration', description: 'Lead created in CRM after call' },
    { category: 'integration', description: 'Call recording saved correctly' },
  ],
  email: [
    { category: 'functional', description: 'Trigger conditions fire correctly' },
    { category: 'functional', description: 'Email parsing handles attachments' },
    { category: 'functional', description: 'Reply generation matches template' },
    { category: 'edge_cases', description: 'Handles malformed email addresses' },
    { category: 'edge_cases', description: 'Handles empty/malformed email body' },
    { category: 'integration', description: 'CRM records created/updated' },
  ],
  webhook: [
    { category: 'functional', description: 'Webhook endpoint receives payloads' },
    { category: 'functional', description: 'Authentication works correctly' },
    { category: 'functional', description: 'Error responses returned properly' },
    { category: 'edge_cases', description: 'Handles invalid payload format' },
    { category: 'edge_cases', description: 'Handles rate limiting' },
    { category: 'integration', description: 'Data syncs to destination system' },
  ],
  dashboard: [
    { category: 'functional', description: 'Page loads without errors' },
    { category: 'functional', description: 'Data displays correctly for all roles' },
    { category: 'ui_responsive', description: 'Works on mobile viewport' },
    { category: 'ui_responsive', description: 'Works on tablet viewport' },
    { category: 'edge_cases', description: 'Empty states display correctly' },
    { category: 'edge_cases', description: 'Loading states display correctly' },
  ],
  default: [
    { category: 'functional', description: 'Core functionality works as specified' },
    { category: 'functional', description: 'Acceptance criteria from spec are met' },
    { category: 'security', description: 'RLS policies prevent unauthorized access' },
    { category: 'security', description: 'Authenticated-only endpoints protected' },
  ],
}

export async function generateChecklistAction(
  testId: string,
  deliverableTitle: string,
  deliverableDesc: string | null
) {
  const user = await checkAuth()

  const context = (deliverableTitle + ' ' + (deliverableDesc || '')).toLowerCase()

  let template = checklistTemplates.default

  if (context.includes('voice') || context.includes('call') || context.includes('phone')) {
    template = [...template, ...checklistTemplates.voice]
  } else if (context.includes('email') || context.includes('mail') || context.includes('parser')) {
    template = [...template, ...checklistTemplates.email]
  } else if (context.includes('webhook') || context.includes('api') || context.includes('integration')) {
    template = [...template, ...checklistTemplates.webhook]
  } else if (context.includes('dashboard') || context.includes('ui') || context.includes('page')) {
    template = [...template, ...checklistTemplates.dashboard]
  }

  const items = await Promise.all(
    template.map((item, index) =>
      addChecklistItemApi({
        testId,
        category: item.category,
        description: item.description,
        isAutoGenerated: true,
        sortOrder: index,
      })
    )
  )

  return { success: true, itemCount: items.length }
}

export async function updateChecklistItemAction(
  itemId: string,
  passed: boolean,
  failureReason?: string,
  screenshotUrl?: string
) {
  const user = await checkAuth()

  const item = await updateChecklistItem(itemId, {
    passed,
    failureReason: failureReason || '',
    screenshotUrl: screenshotUrl || '',
  })

  return { success: true, item }
}

export async function submitTestAction(
  testId: string,
  notes: string,
  createBlockers: boolean
) {
  const user = await checkAuth()

  const result = await submitTestResults({
    testId,
    notes,
    createBlockers,
  })

  const test = await getTestSession(testId)
  if (!test) {
    return { success: false, error: 'Test session not found' }
  }

  let projectId = ''
  let deliverableTitle = 'Deliverable'

  try {
    const project = await getProject(test.deliverable_id)
    projectId = project.id

    const deliverable = project.deliverables?.find((d: any) => d.id === test.deliverable_id)
    if (deliverable) {
      deliverableTitle = deliverable.title
    }

    if (result.test.status === 'passed') {
      await notifyTestingPassed(projectId, test.deliverable_id, deliverableTitle, test.stage)

      if (test.stage === 'dev') {
        await notifyAdminIntTestingReady(projectId, test.deliverable_id, deliverableTitle)
      } else if (test.stage === 'admin_int') {
        await notifyClientTestingReady(projectId, test.deliverable_id, deliverableTitle)
      }
    } else if (result.test.status === 'failed') {
      await notifyTestingFailed(
        projectId,
        test.deliverable_id,
        deliverableTitle,
        test.stage,
        result.test.failed_items
      )
    }

    revalidatePath('/projects/' + projectId)
  } catch (error) {
    console.error('Error sending notifications:', error)
  }

  return {
    success: true,
    test: result.test,
    blockersCreated: result.blockersCreated,
  }
}

export async function addChecklistItemAction(
  testId: string,
  category: ChecklistCategory,
  description: string
) {
  const user = await checkAuth()

  const item = await addChecklistItemApi({
    testId,
    category,
    description,
    isAutoGenerated: false,
  })

  return { success: true, item }
}

export async function deleteChecklistItemAction(itemId: string) {
  const user = await checkAuth()

  await deleteChecklistItem(itemId)

  return { success: true }
}

export async function escalateClientTestAction(testId: string, notes: string) {
  const user = await checkAuth()

  if (user.role !== 'admin' && user.role !== 'internal') {
    return { success: false, error: 'Unauthorized' }
  }

  const test = await escalateClientTest(testId, notes)

  const testData = await getTestSession(testId)
  if (!testData) {
    return { success: false, error: 'Test session not found' }
  }

  try {
    const project = await getProject(testData.deliverable_id)
    const deliverable = project.deliverables?.find((d: any) => d.id === testData.deliverable_id)
    const deliverableTitle = deliverable?.title || 'Deliverable'

    await notifyTestingEscalated(project.id, testData.deliverable_id, deliverableTitle)

    revalidatePath('/projects/' + project.id)
  } catch (error) {
    console.error('Error sending escalation notification:', error)
  }

  return { success: true, test }
}

export async function getTestSessionAction(testId: string) {
  const user = await checkAuth()
  return await getTestSession(testId)
}

export async function getOrCreateTestSessionAction(deliverableId: string, stage: TestingStage) {
  const user = await checkAuth()
  return await getOrCreateTestSession(deliverableId, stage)
}

export async function startTestingSessionAction(testId: string) {
  const user = await checkAuth()
  return await startTestingSession(testId)
}

export async function updateChecklistItemServerAction(
  itemId: string,
  passed: boolean,
  failureReason?: string
) {
  const user = await checkAuth()

  const item = await updateChecklistItem(itemId, {
    passed,
    failureReason: failureReason || '',
    screenshotUrl: '',
  })

  return { success: true, item }
}

export async function submitTestResultsAction(
  testId: string,
  notes: string,
  createBlockers: boolean
) {
  const user = await checkAuth()

  const result = await submitTestResults({
    testId,
    notes,
    createBlockers,
  })

  const test = await getTestSession(testId)
  if (!test) {
    return { success: false, error: 'Test session not found' }
  }

  let projectId = ''
  let deliverableTitle = 'Deliverable'

  try {
    const project = await getProject(test.deliverable_id)
    projectId = project.id

    const deliverable = project.deliverables?.find((d: any) => d.id === test.deliverable_id)
    if (deliverable) {
      deliverableTitle = deliverable.title
    }

    if (result.test.status === 'passed') {
      await notifyTestingPassed(projectId, test.deliverable_id, deliverableTitle, test.stage)

      // Auto-progress hill position based on test stage
      // Dev test passes → stays at 90%
      // Admin/Int test passes → auto to 95%
      // Client/DFY test passes → auto to 100%
      let newPosition = 90 // Default for dev pass
      if (test.stage === 'admin_int') {
        newPosition = 95
      } else if (test.stage === 'client') {
        newPosition = 100
      }

      // Update hill position
      try {
        await updatePositionAction(test.deliverable_id, projectId, newPosition, `Auto-progressed after ${test.stage} test passed`)
      } catch (posError) {
        console.error('Failed to auto-update hill position:', posError)
        // Don't fail the test submission if position update fails
      }

      if (test.stage === 'dev') {
        await notifyAdminIntTestingReady(projectId, test.deliverable_id, deliverableTitle)
      } else if (test.stage === 'admin_int') {
        await notifyClientTestingReady(projectId, test.deliverable_id, deliverableTitle)
      }
    } else if (result.test.status === 'failed') {
      await notifyTestingFailed(
        projectId,
        test.deliverable_id,
        deliverableTitle,
        test.stage,
        result.test.failed_items
      )
    }

    revalidatePath('/projects/' + projectId)
  } catch (error) {
    console.error('Error sending notifications:', error)
  }

  return {
    success: true,
    test: result.test,
    blockersCreated: result.blockersCreated,
  }
}
