'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Check, Users } from 'lucide-react';
import { toast } from 'sonner';
import { updateProficiencyAction } from '../actions/skillActions';
import type { DevSkill, SkillTemplate } from '@/lib/api/dev-skills';

interface SkillsMatrixProps {
  devSkills: DevSkill[];
  skillTemplates: SkillTemplate[];
  isOwnProfile: boolean;
  isAdmin: boolean;
}

const CATEGORY_NAMES: Record<string, string> = {
  ai_chatbots: '🤖 AI & Chatbots',
  automation_platforms: '⚡ Automation Platforms',
  crm_platforms: '🏢 CRM & Business Platforms',
  marketing_sales: '📧 Marketing & Sales',
  cloud_apis: '☁️ Cloud & APIs',
  development: '💻 Development',
  data_analytics: '📊 Data & Analytics',
  modern_tools: '✨ Modern Tools',
};

const LEVEL_COLORS: Record<string, string> = {
  '0-2': 'bg-red-500',
  '3-4': 'bg-orange-500',
  '5-6': 'bg-yellow-500',
  '7-8': 'bg-green-500',
  '9-10': 'bg-cyan-500',
};

const LEVEL_LABELS: Record<string, string> = {
  '0': 'No experience',
  '1': 'Aware',
  '2': 'Tutorial level',
  '3': 'Basic',
  '4': 'Can build simple projects',
  '5': 'Comfortable',
  '6': 'Proficient',
  '7': 'Advanced',
  '8': 'Expert',
  '9': 'Master',
  '10': 'World-class',
};

function getLevelColor(level: number): string {
  if (level <= 2) return LEVEL_COLORS['0-2'];
  if (level <= 4) return LEVEL_COLORS['3-4'];
  if (level <= 6) return LEVEL_COLORS['5-6'];
  if (level <= 8) return LEVEL_COLORS['7-8'];
  return LEVEL_COLORS['9-10'];
}

export function SkillsMatrix({
  devSkills,
  skillTemplates,
  isOwnProfile,
  isAdmin,
}: SkillsMatrixProps) {
  const [updatingSkills, setUpdatingSkills] = useState<Set<string>>(new Set());

  // Group skills by category
  const skillsByCategory: Record<string, DevSkill[]> = {};
  const templatesByCategory: Record<string, SkillTemplate[]> = {};

  devSkills.forEach((skill) => {
    if (!skillsByCategory[skill.category]) {
      skillsByCategory[skill.category] = [];
    }
    skillsByCategory[skill.category].push(skill);
  });

  skillTemplates.forEach((template) => {
    if (!templatesByCategory[template.category]) {
      templatesByCategory[template.category] = [];
    }
    templatesByCategory[template.category].push(template);
  });

  const categories = Object.keys(CATEGORY_NAMES);

  const handleProficiencyChange = async (skillName: string, newLevel: number) => {
    if (!isOwnProfile || updatingSkills.has(skillName)) return;

    setUpdatingSkills(new Set(updatingSkills).add(skillName));

    try {
      const result = await updateProficiencyAction(skillName, newLevel);

      if (result.success) {
        toast.success('Skill updated', {
          description: `${skillName} proficiency set to ${newLevel}/10`,
        });
      } else {
        toast.error('Failed to update skill', {
          description: result.error,
        });
      }
    } finally {
      setUpdatingSkills((prev) => {
        const next = new Set(prev);
        next.delete(skillName);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const categorySkills = skillsByCategory[category] || [];
        const categoryTemplates = templatesByCategory[category] || [];

        if (categorySkills.length === 0 && categoryTemplates.length === 0) {
          return null;
        }

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{CATEGORY_NAMES[category]}</CardTitle>
              <CardDescription>
                {categorySkills.length} {categorySkills.length === 1 ? 'skill' : 'skills'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categorySkills.map((skill) => {
                const isUpdating = updatingSkills.has(skill.skill_name);
                const levelColor = getLevelColor(skill.proficiency_level);

                return (
                  <div key={skill.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{skill.display_name}</span>
                        {skill.admin_verified && (
                          <Check className="h-4 w-4 text-green-500" aria-label="Admin verified" />
                        )}
                        {skill.endorsement_count > 0 && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {skill.endorsement_count}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{skill.proficiency_level}/10</span>
                        {skill.admin_adjusted_level !== null &&
                          skill.admin_adjusted_level !== skill.proficiency_level && (
                            <Badge variant="outline" className="text-xs">
                              Admin: {skill.admin_adjusted_level}/10
                            </Badge>
                          )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full ${levelColor} transition-all`}
                            style={{ width: `${skill.proficiency_level * 10}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Slider for editing (own profile only) */}
                    {isOwnProfile && (
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[skill.proficiency_level]}
                          onValueChange={([value]) => handleProficiencyChange(skill.skill_name, value)}
                          min={0}
                          max={10}
                          step={1}
                          className="flex-1"
                          disabled={isUpdating}
                        />
                        <span className="text-xs text-muted-foreground min-w-[120px]">
                          {LEVEL_LABELS[skill.proficiency_level.toString()]}
                        </span>
                      </div>
                    )}

                    {/* Projects count & last used */}
                    {skill.projects_count > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Used in {skill.projects_count} {skill.projects_count === 1 ? 'project' : 'projects'}
                        {skill.last_used_at && (
                          <span> • Last used {new Date(skill.last_used_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {skill.notes && (
                      <div className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
                        {skill.notes}
                      </div>
                    )}

                    {/* Portfolio examples */}
                    {skill.portfolio_examples.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {skill.portfolio_examples.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            Portfolio Example {idx + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Show message if no skills in category yet */}
              {categorySkills.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No skills added in this category yet
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
