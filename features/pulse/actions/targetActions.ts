'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createTarget,
  updateTarget,
  deleteTarget,
  setTargetOwners,
  createAction,
  updateAction,
  completeAction,
  uncompleteAction,
  deleteAction,
  reorderTargets,
  reorderActions,
  moveTargetToQuarter,
} from '@/lib/api/pulse-targets'
import type {
  CreateTargetInput,
  UpdateTargetInput,
  CreateActionInput,
  UpdateActionInput,
  PulseTarget,
  PulseAction,
  Quarter
} from '@/lib/types/pulse'

// ============================================================================
// Target CRUD Actions
// ============================================================================

export async function createTargetAction(
  input: CreateTargetInput
): Promise<{ success: boolean; target?: PulseTarget; error?: string }> {
  try {
    const target = await createTarget(input)

    if (!target) {
      return { success: false, error: 'Failed to create target' }
    }

    revalidatePath('/pulse')
    return { success: true, target }
  } catch (error) {
    console.error('[Pulse Target Action] Create error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function updateTargetAction(
  targetId: string,
  input: UpdateTargetInput
): Promise<{ success: boolean; target?: PulseTarget; error?: string }> {
  try {
    const target = await updateTarget(targetId, input)

    if (!target) {
      return { success: false, error: 'Failed to update target' }
    }

    revalidatePath('/pulse')
    return { success: true, target }
  } catch (error) {
    console.error('[Pulse Target Action] Update error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function deleteTargetAction(
  targetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteTarget(targetId)

    if (!success) {
      return { success: false, error: 'Failed to delete target' }
    }

    revalidatePath('/pulse')
    return { success: true }
  } catch (error) {
    console.error('[Pulse Target Action] Delete error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function setTargetOwnersAction(
  targetId: string,
  ownerIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await setTargetOwners(targetId, ownerIds)

    if (!success) {
      return { success: false, error: 'Failed to set target owners' }
    }

    revalidatePath('/pulse')
    return { success: true }
  } catch (error) {
    console.error('[Pulse Target Action] Set owners error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function moveTargetToQuarterAction(
  targetId: string,
  quarter: Quarter
): Promise<{ success: boolean; target?: PulseTarget; error?: string }> {
  try {
    const target = await moveTargetToQuarter(targetId, quarter)

    if (!target) {
      return { success: false, error: 'Failed to move target' }
    }

    revalidatePath('/pulse')
    return { success: true, target }
  } catch (error) {
    console.error('[Pulse Target Action] Move error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function reorderTargetsAction(
  quarter: Quarter,
  targetIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await reorderTargets(quarter, targetIds)

    if (!success) {
      return { success: false, error: 'Failed to reorder targets' }
    }

    revalidatePath('/pulse')
    return { success: true }
  } catch (error) {
    console.error('[Pulse Target Action] Reorder error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

// ============================================================================
// Action CRUD Actions
// ============================================================================

export async function createActionAction(
  input: CreateActionInput
): Promise<{ success: boolean; action?: PulseAction; error?: string }> {
  try {
    const action = await createAction(input)

    if (!action) {
      return { success: false, error: 'Failed to create action' }
    }

    revalidatePath('/pulse')
    return { success: true, action }
  } catch (error) {
    console.error('[Pulse Action Action] Create error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function updateActionAction(
  actionId: string,
  input: UpdateActionInput
): Promise<{ success: boolean; action?: PulseAction; error?: string }> {
  try {
    const action = await updateAction(actionId, input)

    if (!action) {
      return { success: false, error: 'Failed to update action' }
    }

    revalidatePath('/pulse')
    return { success: true, action }
  } catch (error) {
    console.error('[Pulse Action Action] Update error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function completeActionAction(
  actionId: string
): Promise<{ success: boolean; action?: PulseAction; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const action = await completeAction(actionId, user.id)

    if (!action) {
      return { success: false, error: 'Failed to complete action' }
    }

    revalidatePath('/pulse')
    return { success: true, action }
  } catch (error) {
    console.error('[Pulse Action Action] Complete error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function uncompleteActionAction(
  actionId: string
): Promise<{ success: boolean; action?: PulseAction; error?: string }> {
  try {
    const action = await uncompleteAction(actionId)

    if (!action) {
      return { success: false, error: 'Failed to uncomplete action' }
    }

    revalidatePath('/pulse')
    return { success: true, action }
  } catch (error) {
    console.error('[Pulse Action Action] Uncomplete error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function deleteActionAction(
  actionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteAction(actionId)

    if (!success) {
      return { success: false, error: 'Failed to delete action' }
    }

    revalidatePath('/pulse')
    return { success: true }
  } catch (error) {
    console.error('[Pulse Action Action] Delete error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function reorderActionsAction(
  targetId: string,
  actionIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await reorderActions(targetId, actionIds)

    if (!success) {
      return { success: false, error: 'Failed to reorder actions' }
    }

    revalidatePath('/pulse')
    return { success: true }
  } catch (error) {
    console.error('[Pulse Action Action] Reorder error:', error)
    return { success: false, error: 'An error occurred' }
  }
}
