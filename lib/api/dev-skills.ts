/**
 * Developer Skills API
 *
 * Functions for managing developer skills, proficiency levels,
 * endorsements, and skill templates
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export type SkillCategory =
  | 'ai_chatbots'
  | 'automation_platforms'
  | 'crm_platforms'
  | 'marketing_sales'
  | 'cloud_apis'
  | 'development'
  | 'data_analytics'
  | 'modern_tools';

export interface SkillTemplate {
  id: string;
  category: SkillCategory;
  skill_name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface DevSkill {
  id: string;
  dev_id: string;
  category: SkillCategory;
  skill_name: string;
  display_name: string;
  proficiency_level: number;
  self_assessed: boolean;
  admin_verified: boolean;
  admin_adjusted_level: number | null;
  projects_count: number;
  last_used_at: string | null;
  total_hours: number;
  endorsed_by: string[];
  endorsement_count: number;
  notes: string | null;
  portfolio_examples: string[];
  created_at: string;
  updated_at: string;
}

export interface DevBadge {
  id: string;
  dev_id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string | null;
  badge_icon: string | null;
  earned_at: string;
  criteria: Record<string, any> | null;
}

export interface SkillEndorsement {
  id: string;
  dev_id: string;
  skill_name: string;
  endorsed_by: string;
  comment: string | null;
  created_at: string;
}

// ============================================================================
// SKILL TEMPLATES
// ============================================================================

/**
 * Get all active skill templates grouped by category
 */
export async function getSkillTemplates(): Promise<SkillTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('skill_templates')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('sort_order');

  if (error) {
    console.error('Error fetching skill templates:', error);
    return [];
  }

  return data as SkillTemplate[];
}

/**
 * Get skill templates by category
 */
export async function getSkillTemplatesByCategory(
  category: SkillCategory
): Promise<SkillTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('skill_templates')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching skill templates by category:', error);
    return [];
  }

  return data as SkillTemplate[];
}

// ============================================================================
// DEV SKILLS
// ============================================================================

/**
 * Get all skills for a developer
 */
export async function getDevSkills(devId: string): Promise<DevSkill[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dev_skills')
    .select('*')
    .eq('dev_id', devId)
    .order('category')
    .order('display_name');

  if (error) {
    console.error('Error fetching dev skills:', error);
    return [];
  }

  return data as DevSkill[];
}

/**
 * Get dev skills grouped by category
 */
export async function getDevSkillsByCategory(devId: string) {
  const skills = await getDevSkills(devId);

  const grouped: Record<SkillCategory, DevSkill[]> = {
    ai_chatbots: [],
    automation_platforms: [],
    crm_platforms: [],
    marketing_sales: [],
    cloud_apis: [],
    development: [],
    data_analytics: [],
    modern_tools: [],
  };

  skills.forEach((skill) => {
    grouped[skill.category].push(skill);
  });

  return grouped;
}

/**
 * Upsert a developer skill
 */
export async function upsertDevSkill(
  devId: string,
  skillData: {
    category: SkillCategory;
    skill_name: string;
    display_name: string;
    proficiency_level: number;
    notes?: string;
    portfolio_examples?: string[];
  }
): Promise<{ success: boolean; data?: DevSkill; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dev_skills')
    .upsert(
      {
        dev_id: devId,
        ...skillData,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'dev_id,skill_name',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting dev skill:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as DevSkill };
}

/**
 * Update skill proficiency level
 */
export async function updateSkillProficiency(
  devId: string,
  skillName: string,
  proficiencyLevel: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('dev_skills')
    .update({
      proficiency_level: proficiencyLevel,
      updated_at: new Date().toISOString(),
    })
    .eq('dev_id', devId)
    .eq('skill_name', skillName);

  if (error) {
    console.error('Error updating skill proficiency:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a developer skill
 */
export async function deleteDevSkill(
  devId: string,
  skillName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('dev_skills')
    .delete()
    .eq('dev_id', devId)
    .eq('skill_name', skillName);

  if (error) {
    console.error('Error deleting dev skill:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Admin: Verify a skill
 */
export async function verifyDevSkill(
  devId: string,
  skillName: string,
  adjustedLevel?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('dev_skills')
    .update({
      admin_verified: true,
      admin_adjusted_level: adjustedLevel || null,
      updated_at: new Date().toISOString(),
    })
    .eq('dev_id', devId)
    .eq('skill_name', skillName);

  if (error) {
    console.error('Error verifying dev skill:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// ENDORSEMENTS
// ============================================================================

/**
 * Endorse a developer's skill
 */
export async function endorseSkill(
  devId: string,
  skillName: string,
  endorsedBy: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('skill_endorsements').insert({
    dev_id: devId,
    skill_name: skillName,
    endorsed_by: endorsedBy,
    comment: comment || null,
  });

  if (error) {
    console.error('Error endorsing skill:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove endorsement
 */
export async function removeEndorsement(
  devId: string,
  skillName: string,
  endorsedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('skill_endorsements')
    .delete()
    .eq('dev_id', devId)
    .eq('skill_name', skillName)
    .eq('endorsed_by', endorsedBy);

  if (error) {
    console.error('Error removing endorsement:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get endorsements for a skill
 */
export async function getSkillEndorsements(
  devId: string,
  skillName: string
): Promise<SkillEndorsement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('skill_endorsements')
    .select('*')
    .eq('dev_id', devId)
    .eq('skill_name', skillName)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching skill endorsements:', error);
    return [];
  }

  return data as SkillEndorsement[];
}

// ============================================================================
// BADGES
// ============================================================================

/**
 * Get all badges for a developer
 */
export async function getDevBadges(devId: string): Promise<DevBadge[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dev_badges')
    .select('*')
    .eq('dev_id', devId)
    .order('earned_at', { ascending: false });

  if (error) {
    console.error('Error fetching dev badges:', error);
    return [];
  }

  return data as DevBadge[];
}

/**
 * Award a badge to a developer (admin only)
 */
export async function awardBadge(
  devId: string,
  badgeData: {
    badge_type: string;
    badge_name: string;
    badge_description?: string;
    badge_icon?: string;
    criteria?: Record<string, any>;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('dev_badges').insert({
    dev_id: devId,
    ...badgeData,
  });

  if (error) {
    console.error('Error awarding badge:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// XP & LEVELING
// ============================================================================

/**
 * Award XP to a user
 */
export async function awardXP(
  userId: string,
  xpAmount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('award_xp', {
    p_user_id: userId,
    p_xp_amount: xpAmount,
  });

  if (error) {
    console.error('Error awarding XP:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get developer stats (XP, level, badges count)
 */
export async function getDevStats(devId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('xp_points, level, total_projects_completed')
    .eq('id', devId)
    .single();

  const { count: badgesCount } = await supabase
    .from('dev_badges')
    .select('*', { count: 'exact', head: true })
    .eq('dev_id', devId);

  const { count: skillsCount } = await supabase
    .from('dev_skills')
    .select('*', { count: 'exact', head: true })
    .eq('dev_id', devId);

  return {
    xp_points: profile?.xp_points || 0,
    level: profile?.level || 1,
    total_projects: profile?.total_projects_completed || 0,
    badges_count: badgesCount || 0,
    skills_count: skillsCount || 0,
    next_level_xp: ((profile?.level || 1) + 1) * 500,
    progress_to_next_level:
      ((profile?.xp_points || 0) % 500) / 500,
  };
}
