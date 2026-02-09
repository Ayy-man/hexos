'use server'

import { revalidatePath } from 'next/cache'
import {
  createImprovement,
  updateImprovement,
  markAsConverted,
  type CreateImprovementInput,
  type ImprovementPriority,
  type ProjectImprovement,
} from '@/lib/api/project-improvements'
import { createProject } from '@/lib/api/projects'

/**
 * Create a new improvement for a project
 */
export async function createImprovementAction(params: {
  projectId: string
  title: string
  description?: string
  priority?: ImprovementPriority
}): Promise<{ data?: ProjectImprovement; error?: string }> {
  try {
    const improvement = await createImprovement(params)
    revalidatePath(`/projects/${params.projectId}`)
    return { data: improvement }
  } catch (error) {
    console.error('[createImprovementAction] Error:', error)
    return { error: 'Failed to create improvement' }
  }
}

/**
 * Update an existing improvement
 */
export async function updateImprovementAction(params: {
  id: string
  projectId: string
  title?: string
  description?: string
  priority?: ImprovementPriority
}): Promise<{ data?: ProjectImprovement; error?: string }> {
  try {
    const { id, projectId, ...updateData } = params
    const improvement = await updateImprovement(id, updateData)
    revalidatePath(`/projects/${projectId}`)
    return { data: improvement }
  } catch (error) {
    console.error('[updateImprovementAction] Error:', error)
    return { error: 'Failed to update improvement' }
  }
}

/**
 * Convert selected improvements into a new project
 * Admin-only action that creates a new project and marks improvements as converted
 */
export async function convertToProjectAction(params: {
  projectId: string
  improvementIds: string[]
  newProjectName: string
  clientName: string
}): Promise<{ data?: { projectId: string }; error?: string }> {
  try {
    // Create new project with the provided details
    const newProject = await createProject({
      project_name: params.newProjectName,
      client_name: params.clientName,
      project_type: 'full_custom',
      operational_mode: 'internal',
    })

    // Mark the improvements as converted
    await markAsConverted(params.improvementIds, newProject.id)

    // Revalidate both the source project page and projects list
    revalidatePath(`/projects/${params.projectId}`)
    revalidatePath('/projects')

    return { data: { projectId: newProject.id } }
  } catch (error) {
    console.error('[convertToProjectAction] Error:', error)
    return { error: 'Failed to convert improvements to project' }
  }
}
