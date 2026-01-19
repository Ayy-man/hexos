'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  bulkCreateOnboardingRequirements,
  type RequirementOwner,
  type RequirementBlocker,
} from '@/lib/api/onboarding-requirements'

// ============================================
// Types
// ============================================

export interface InitiateProjectInput {
  project_name: string
  client_name: string
  client_email?: string
  client_business?: string
  project_type?: string
  operational_mode?: string
  target_delivery_date?: string
  price_dfy?: number
  price_hexona?: number
  price_dev?: number
  notes?: string
  payment_structure?: '100_upfront' | '50_50' | '40_30_30' | 'custom'
  custom_milestones?: Array<{ label: string; percentage: number }>
}

export interface InitiateRequirementInput {
  temp_id: string // For mapping parent relationships
  parent_temp_id?: string | null
  title: string
  description?: string
  notes?: string
  owner_type?: RequirementOwner
  blocker_type?: RequirementBlocker
  loom_url?: string
  resource_url?: string
  position: number
}

// ============================================
// Main Initiation Action
// ============================================

export async function completeInitiationAction(
  inquiryId: string,
  projectData: InitiateProjectInput,
  deliverableIds: string[],
  requirements: InitiateRequirementInput[]
): Promise<{ projectId: string }> {
  console.log('[completeInitiation] Starting with:', {
    inquiryId,
    deliverableCount: deliverableIds.length,
    requirementCount: requirements.length,
  })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Check if a project already exists for this inquiry (prevent duplicates)
  const { data: existingProject } = await supabase
    .from('projects')
    .select('id, project_name')
    .eq('source_inquiry_id', inquiryId)
    .maybeSingle()

  if (existingProject) {
    console.log('[completeInitiation] Project already exists:', existingProject.id)
    // Return existing project instead of creating duplicate
    return { projectId: existingProject.id }
  }

  // Get the inquiry to extract source info
  const { data: inquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .select('submitted_by, blueprint_id, status')
    .eq('id', inquiryId)
    .single()

  if (inquiryError) {
    console.error('[completeInitiation] Failed to fetch inquiry:', inquiryError)
    throw inquiryError
  }
  console.log('[completeInitiation] Fetched inquiry, creating project...')

  // 1. Create the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      project_name: projectData.project_name,
      client_name: projectData.client_name,
      client_email: projectData.client_email || null,
      client_business: projectData.client_business || null,
      project_type: projectData.project_type || 'blueprint',
      operational_mode: projectData.operational_mode || 'hexona_devs_dfy',
      target_delivery_date: projectData.target_delivery_date || null,
      price_dfy: projectData.price_dfy || null,
      price_hexona: projectData.price_hexona || null,
      price_dev: projectData.price_dev || null,
      notes: projectData.notes || null,
      payment_structure: projectData.payment_structure || '50_50',
      dfy_partner_id: inquiry.submitted_by,
      matched_blueprint_id: inquiry.blueprint_id,
      source_inquiry_id: inquiryId,
      status: 'deliverables_pending', // Start with sign-off flow
    })
    .select()
    .single()

  if (projectError) {
    console.error('[completeInitiation] Failed to create project:', projectError)
    throw projectError
  }
  console.log('[completeInitiation] Project created:', project.id)

  // 2. Create payment milestones based on structure
  const priceDfy = projectData.price_dfy || 0
  const paymentStructure = projectData.payment_structure || '50_50'

  let milestones: Array<{ label: string; amount: number; sort_order: number }> = []

  if (paymentStructure === '100_upfront') {
    milestones = [{ label: 'Full Payment', amount: priceDfy, sort_order: 0 }]
  } else if (paymentStructure === '50_50') {
    milestones = [
      { label: 'Deposit (50%)', amount: priceDfy * 0.5, sort_order: 0 },
      { label: 'Final Payment (50%)', amount: priceDfy * 0.5, sort_order: 1 },
    ]
  } else if (paymentStructure === '40_30_30') {
    milestones = [
      { label: 'Deposit (40%)', amount: priceDfy * 0.4, sort_order: 0 },
      { label: 'Midpoint (30%)', amount: priceDfy * 0.3, sort_order: 1 },
      { label: 'Final Payment (30%)', amount: priceDfy * 0.3, sort_order: 2 },
    ]
  } else if (paymentStructure === 'custom' && projectData.custom_milestones) {
    milestones = projectData.custom_milestones.map((m, i) => ({
      label: m.label,
      amount: priceDfy * (m.percentage / 100),
      sort_order: i,
    }))
  }

  if (milestones.length > 0) {
    const { error: milestoneError } = await supabase
      .from('payment_milestones')
      .insert(milestones.map(m => ({ ...m, project_id: project.id })))

    if (milestoneError) console.error('Failed to create payment milestones:', milestoneError)
  }

  console.log('[completeInitiation] Payment milestones created, copying deliverables...')

  // 3. Copy deliverables from proposal_deliverables to project deliverables
  if (deliverableIds.length > 0) {
    const { data: proposalDeliverables, error: delError } = await supabase
      .from('proposal_deliverables')
      .select('*')
      .in('id', deliverableIds)

    if (delError) throw delError

    const projectDeliverables = proposalDeliverables
      .filter((d) => d.change_status !== 'removed' && d.change_status !== 'rejected')
      .map((d, index) => ({
        project_id: project.id,
        title: d.name,
        description: d.description,
        status: 'pending',
        sort_order: index,
      }))

    if (projectDeliverables.length > 0) {
      const { error: insertDelError } = await supabase
        .from('deliverables')
        .insert(projectDeliverables)

      if (insertDelError) throw insertDelError
    }
  }

  console.log('[completeInitiation] Deliverables copied, creating requirements...')

  // 4. Create onboarding requirements with tree structure
  if (requirements.length > 0) {
    // Map temp_ids to real UUIDs for parent relationships
    // First, create all root requirements (no parent)
    const rootReqs = requirements.filter(r => !r.parent_temp_id)
    const childReqs = requirements.filter(r => r.parent_temp_id)

    // Create root requirements
    const createdRoots = await bulkCreateOnboardingRequirements(
      project.id,
      rootReqs.map(r => ({
        title: r.title,
        description: r.description,
        notes: r.notes,
        owner_type: r.owner_type,
        blocker_type: r.blocker_type,
        loom_url: r.loom_url,
        resource_url: r.resource_url,
        position: r.position,
      }))
    )

    // Build temp_id -> real_id mapping
    const idMap = new Map<string, string>()
    rootReqs.forEach((r, i) => {
      if (createdRoots[i]) {
        idMap.set(r.temp_id, createdRoots[i].id)
      }
    })

    // Create children level by level to ensure parents exist
    const remainingChildren = [...childReqs]
    let maxIterations = 10 // Prevent infinite loop

    while (remainingChildren.length > 0 && maxIterations > 0) {
      const batchToCreate: InitiateRequirementInput[] = []
      const indicesToRemove: number[] = []

      remainingChildren.forEach((child, index) => {
        if (child.parent_temp_id && idMap.has(child.parent_temp_id)) {
          batchToCreate.push(child)
          indicesToRemove.push(index)
        }
      })

      if (batchToCreate.length === 0) break // No more valid parents found

      // Remove processed items (in reverse to maintain indices)
      indicesToRemove.reverse().forEach(i => remainingChildren.splice(i, 1))

      // Create this batch
      const createdBatch = await bulkCreateOnboardingRequirements(
        project.id,
        batchToCreate.map(r => ({
          parent_id: idMap.get(r.parent_temp_id!)!,
          title: r.title,
          description: r.description,
          notes: r.notes,
          owner_type: r.owner_type,
          blocker_type: r.blocker_type,
          loom_url: r.loom_url,
          resource_url: r.resource_url,
          position: r.position,
        }))
      )

      // Add to mapping
      batchToCreate.forEach((r, i) => {
        if (createdBatch[i]) {
          idMap.set(r.temp_id, createdBatch[i].id)
        }
      })

      maxIterations--
    }
  }

  // 5. Update the inquiry to link to the project and set stage to 'closed'
  const { data: currentInquiry } = await supabase
    .from('inquiries')
    .select('proposal_stage, stage_history')
    .eq('id', inquiryId)
    .single()

  const stageHistory = (currentInquiry?.stage_history as Array<unknown>) || []
  const historyEntry = {
    from: currentInquiry?.proposal_stage || 'sent',
    to: 'closed',
    changed_by: user.id,
    changed_at: new Date().toISOString(),
    notes: 'Deal closed - converted to project',
  }

  const { error: updateError } = await supabase
    .from('inquiries')
    .update({
      status: 'converted',
      converted_to_project_id: project.id,
      proposal_stage: 'closed',
      stage_entered_at: new Date().toISOString(),
      stage_history: [...stageHistory, historyEntry],
    })
    .eq('id', inquiryId)

  if (updateError) throw updateError

  // Revalidate paths
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')
  revalidatePath('/projects')
  revalidatePath(`/projects/${project.id}`)

  return { projectId: project.id }
}
