'use server';

import { revalidatePath } from 'next/cache';
import {
  upsertDevSkill,
  updateSkillProficiency,
  deleteDevSkill,
  verifyDevSkill,
  endorseSkill,
  removeEndorsement,
  awardBadge,
  awardXP,
  type SkillCategory,
} from '@/lib/api/dev-skills';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// SKILL MANAGEMENT
// ============================================================================

/**
 * Update or create a developer skill
 */
export async function upsertSkillAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const category = formData.get('category') as SkillCategory;
  const skill_name = formData.get('skill_name') as string;
  const display_name = formData.get('display_name') as string;
  const proficiency_level = parseInt(formData.get('proficiency_level') as string);
  const notes = formData.get('notes') as string | null;
  const portfolio_examples_str = formData.get('portfolio_examples') as string | null;

  const portfolio_examples = portfolio_examples_str
    ? portfolio_examples_str.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const result = await upsertDevSkill(user.id, {
    category,
    skill_name,
    display_name,
    proficiency_level,
    notes: notes || undefined,
    portfolio_examples,
  });

  if (result.success) {
    revalidatePath('/settings/developer');
    revalidatePath(`/team/${user.id}`);
  }

  return result;
}

/**
 * Update skill proficiency level
 */
export async function updateProficiencyAction(
  skillName: string,
  proficiencyLevel: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const result = await updateSkillProficiency(user.id, skillName, proficiencyLevel);

  if (result.success) {
    revalidatePath('/settings/developer');
    revalidatePath(`/team/${user.id}`);
  }

  return result;
}

/**
 * Delete a skill
 */
export async function deleteSkillAction(skillName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const result = await deleteDevSkill(user.id, skillName);

  if (result.success) {
    revalidatePath('/settings/developer');
    revalidatePath(`/team/${user.id}`);
  }

  return result;
}

/**
 * Admin: Verify a developer's skill
 */
export async function verifySkillAction(devId: string, skillName: string, adjustedLevel?: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'internal') {
    return { success: false, error: 'Unauthorized' };
  }

  const result = await verifyDevSkill(devId, skillName, adjustedLevel);

  if (result.success) {
    revalidatePath(`/team/${devId}`);
    revalidatePath('/dashboard/admin/team-skills');
  }

  return result;
}

// ============================================================================
// ENDORSEMENTS
// ============================================================================

/**
 * Endorse a developer's skill
 */
export async function endorseSkillAction(
  devId: string,
  skillName: string,
  comment?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Can't endorse yourself
  if (user.id === devId) {
    return { success: false, error: 'Cannot endorse your own skills' };
  }

  const result = await endorseSkill(devId, skillName, user.id, comment);

  if (result.success) {
    revalidatePath(`/team/${devId}`);
    // Award XP to the endorsed developer
    await awardXP(devId, 15);
  }

  return result;
}

/**
 * Remove endorsement
 */
export async function removeEndorsementAction(devId: string, skillName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const result = await removeEndorsement(devId, skillName, user.id);

  if (result.success) {
    revalidatePath(`/team/${devId}`);
  }

  return result;
}

// ============================================================================
// BADGES
// ============================================================================

/**
 * Admin: Award a badge to a developer
 */
export async function awardBadgeAction(
  devId: string,
  badgeData: {
    badge_type: string;
    badge_name: string;
    badge_description?: string;
    badge_icon?: string;
    criteria?: Record<string, any>;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'internal') {
    return { success: false, error: 'Unauthorized' };
  }

  const result = await awardBadge(devId, badgeData);

  if (result.success) {
    revalidatePath(`/team/${devId}`);
    // Award XP for earning a badge
    await awardXP(devId, 100);
  }

  return result;
}

// ============================================================================
// XP AWARDS
// ============================================================================

/**
 * Award XP to a developer (admin only or system)
 */
export async function awardXPAction(devId: string, xpAmount: number, reason?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if user is admin (or could be system action)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'internal') {
    return { success: false, error: 'Unauthorized' };
  }

  const result = await awardXP(devId, xpAmount);

  if (result.success) {
    revalidatePath(`/team/${devId}`);
    revalidatePath('/dashboard/dev');
  }

  return result;
}
