import { createClient } from '@/lib/supabase/server'
import type { CreateInquiryData } from '@/features/inquiries/types'

export type { CreateInquiryData }

export async function createInquiry(data: CreateInquiryData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .insert({
      submitted_by: user?.id,
      partner_name: data.partner_name,
      submission_type: data.submission_type,
      deal_type: data.deal_type,
      form_path: data.form_path,
      prospect_company_name: data.prospect_company_name,
      prospect_website: data.prospect_website,
      industry: data.industry,
      blueprint_id: data.blueprint_id || null,
      form_data: data.form_data,
      forward_emails: data.forward_emails || [],
    })
    .select()
    .single()

  if (error) throw error
  return inquiry
}

export type InquiryFilter = 'active' | 'archived' | 'all'

export async function getInquiries(filter: InquiryFilter = 'active') {
  const supabase = await createClient()

  let query = supabase
    .from('inquiries')
    .select(`
      *,
      blueprint:blueprints(name),
      submitter:profiles!submitted_by(name, email),
      project:projects!converted_to_project_id(id, project_name)
    `)
    .is('deleted_at', null) // Never show soft-deleted

  // Filter by archive status
  if (filter === 'active') {
    query = query.is('archived_at', null)
  } else if (filter === 'archived') {
    query = query.not('archived_at', 'is', null)
  }
  // 'all' shows both archived and active

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getInquiry(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquiries')
    .select(`
      *,
      blueprint:blueprints(name, description),
      submitter:profiles!submitted_by(name, email),
      project:projects!converted_to_project_id(id, project_name)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function updateInquiryStatus(id: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({ status })
    .eq('id', id)

  if (error) throw error
}

export async function convertInquiryToProject(inquiryId: string, projectId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      status: 'converted',
      converted_to_project_id: projectId,
    })
    .eq('id', inquiryId)

  if (error) throw error
}

// Document content operations for Plate.js editor
export async function updateInquiryDocument(id: string, documentContent: unknown) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({ document_content: documentContent })
    .eq('id', id)

  if (error) throw error
}

export async function getInquiryDocument(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquiries')
    .select('id, document_content')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Archive/Unarchive/Delete operations
export async function archiveInquiry(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('inquiries')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: user?.id,
    })
    .eq('id', id)

  if (error) throw error
}

export async function unarchiveInquiry(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      archived_at: null,
      archived_by: null,
    })
    .eq('id', id)

  if (error) throw error
}

export async function deleteInquiry(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Soft delete
  const { error } = await supabase
    .from('inquiries')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user?.id,
    })
    .eq('id', id)

  if (error) throw error
}

export async function restoreInquiry(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      deleted_at: null,
      deleted_by: null,
    })
    .eq('id', id)

  if (error) throw error
}
