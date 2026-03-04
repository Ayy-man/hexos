'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function deletePasskeyAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('passkey_credentials')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidatePath('/settings/account')
    return { success: true }
  } catch (error) {
    console.error('Delete passkey error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete passkey',
    }
  }
}
