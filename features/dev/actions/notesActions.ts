'use server'

import { revalidatePath } from 'next/cache'
import {
  addNote,
  addStatusChangeNote,
  updateNote,
  deleteNote,
  type NoteVisibility,
} from '@/lib/api/deliverable-notes'

export async function addDeliverableNoteAction(params: {
  deliverableId: string
  content: string
  visibility?: NoteVisibility
  projectId?: string // For revalidation
}) {
  try {
    const note = await addNote({
      deliverableId: params.deliverableId,
      content: params.content,
      visibility: params.visibility,
    })

    if (params.projectId) {
      revalidatePath(`/projects/${params.projectId}`)
    }
    revalidatePath('/dashboard/dev')

    return { success: true, note }
  } catch (error) {
    console.error('Error adding note:', error)
    return { success: false, message: 'Failed to add note' }
  }
}

export async function addStatusChangeNoteAction(params: {
  deliverableId: string
  content: string
  fromStatus: string
  toStatus: string
  visibility?: NoteVisibility
  projectId?: string
}) {
  try {
    const note = await addStatusChangeNote({
      deliverableId: params.deliverableId,
      content: params.content,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      visibility: params.visibility,
    })

    if (params.projectId) {
      revalidatePath(`/projects/${params.projectId}`)
    }
    revalidatePath('/dashboard/dev')

    return { success: true, note }
  } catch (error) {
    console.error('Error adding status change note:', error)
    return { success: false, message: 'Failed to add note' }
  }
}

export async function updateNoteAction(noteId: string, content: string, projectId?: string) {
  try {
    const note = await updateNote(noteId, content)

    if (projectId) {
      revalidatePath(`/projects/${projectId}`)
    }

    return { success: true, note }
  } catch (error) {
    console.error('Error updating note:', error)
    return { success: false, message: 'Failed to update note' }
  }
}

export async function deleteNoteAction(noteId: string, projectId?: string) {
  try {
    await deleteNote(noteId)

    if (projectId) {
      revalidatePath(`/projects/${projectId}`)
    }
    revalidatePath('/dashboard/dev')

    return { success: true }
  } catch (error) {
    console.error('Error deleting note:', error)
    return { success: false, message: 'Failed to delete note' }
  }
}
