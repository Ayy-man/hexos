'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createSuggestion,
  updateSuggestion,
  deleteSuggestion,
  type CreateSuggestionInput,
  type UpdateSuggestionInput,
} from '@/lib/api/suggestions'

// Upload image to storage (server action)
export async function uploadSuggestionImageAction(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) {
    return { error: 'No file provided' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `suggestions/${user.id}/${Date.now()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('general-purpose')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Upload error:', error)
    return { error: 'Failed to upload image' }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('general-purpose')
    .getPublicUrl(data.path)

  return { url: urlData.publicUrl }
}

// Create suggestion action
export async function createSuggestionAction(input: CreateSuggestionInput) {
  try {
    const suggestion = await createSuggestion(input)
    revalidatePath('/suggestions')
    return { success: true, suggestion }
  } catch (error) {
    console.error('Create suggestion action error:', error)
    return { error: 'Failed to create suggestion' }
  }
}

// Update suggestion action (admin only)
export async function updateSuggestionAction(id: string, input: UpdateSuggestionInput) {
  try {
    const suggestion = await updateSuggestion(id, input)
    revalidatePath('/suggestions')
    return { success: true, suggestion }
  } catch (error) {
    console.error('Update suggestion action error:', error)
    return { error: 'Failed to update suggestion' }
  }
}

// Delete suggestion action (admin only)
export async function deleteSuggestionAction(id: string) {
  try {
    await deleteSuggestion(id)
    revalidatePath('/suggestions')
    return { success: true }
  } catch (error) {
    console.error('Delete suggestion action error:', error)
    return { error: 'Failed to delete suggestion' }
  }
}
