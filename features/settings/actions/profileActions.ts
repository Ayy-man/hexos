'use server'

import { revalidatePath } from 'next/cache'
import { uploadDfyLogo, updateCurrentUserLogo, removeDfyLogo } from '@/lib/api/profiles'

export async function uploadDfyLogoAction(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    const url = await uploadDfyLogo(file)
    await updateCurrentUserLogo(url)
    revalidatePath('/settings')

    return { success: true, url }
  } catch (error) {
    console.error('Upload logo error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload logo'
    }
  }
}

export async function removeDfyLogoAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await removeDfyLogo()
    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('Remove logo error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove logo'
    }
  }
}
