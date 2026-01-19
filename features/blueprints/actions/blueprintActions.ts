'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createBlueprint,
  updateBlueprint,
  deleteBlueprint,
  duplicateBlueprint,
  type CreateBlueprintInput,
  type UpdateBlueprintInput,
} from '@/lib/api/blueprints'

export async function createBlueprintAction(input: CreateBlueprintInput) {
  const blueprint = await createBlueprint(input)
  revalidatePath('/blueprints')
  redirect(`/blueprints/${blueprint.id}`)
}

export async function updateBlueprintAction(id: string, input: UpdateBlueprintInput) {
  await updateBlueprint(id, input)
  revalidatePath('/blueprints')
  revalidatePath(`/blueprints/${id}`)
}

export async function updateBlueprintContentAction(id: string, content: unknown) {
  await updateBlueprint(id, { content })
  // Don't revalidate path on content save - it's auto-saved frequently
}

export async function deleteBlueprintAction(id: string) {
  await deleteBlueprint(id)
  revalidatePath('/blueprints')
  redirect('/blueprints')
}

export async function publishBlueprintAction(id: string) {
  await updateBlueprint(id, { status: 'published' })
  revalidatePath('/blueprints')
  revalidatePath(`/blueprints/${id}`)
}

export async function unpublishBlueprintAction(id: string) {
  await updateBlueprint(id, { status: 'draft' })
  revalidatePath('/blueprints')
  revalidatePath(`/blueprints/${id}`)
}

export async function duplicateBlueprintAction(id: string) {
  const newBlueprint = await duplicateBlueprint(id)
  revalidatePath('/blueprints')
  redirect(`/blueprints/${newBlueprint.id}?edit=true`)
}
