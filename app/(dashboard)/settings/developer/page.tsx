import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDevSkills, getSkillTemplates, getDevStats } from '@/lib/api/dev-skills';
import { getDevAvailability } from '@/lib/api/profiles';
import { SkillsMatrix } from '@/features/developer/components/SkillsMatrix';
import { AvailabilityControl } from '@/features/settings/components/AvailabilityControl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code2, Clock } from 'lucide-react';

export default async function DeveloperSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is a developer
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, availability_status, availability_message')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'dev') {
    redirect('/settings');
  }

  // Fetch developer skills, templates, stats, and availability
  const [devSkills, skillTemplates, stats, devAvailability] = await Promise.all([
    getDevSkills(user.id),
    getSkillTemplates(),
    getDevStats(user.id),
    getDevAvailability().catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Developer</h1>
        <p className="text-muted-foreground">
          Manage your skills, availability, and showcase your expertise
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="availability" className="space-y-6">
        <TabsList>
          <TabsTrigger value="availability" className="gap-2">
            <Clock className="h-4 w-4" />
            Availability
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-2">
            <Code2 className="h-4 w-4" />
            Skills
          </TabsTrigger>
        </TabsList>

        {/* Availability Tab */}
        <TabsContent value="availability" className="space-y-6">
          <AvailabilityControl
            currentStatus={(profile?.availability_status as 'available' | 'busy' | 'unavailable' | 'away') || 'available'}
            currentMessage={profile?.availability_message || null}
            devAvailability={devAvailability ? {
              is_available: devAvailability.is_available ?? true,
              available_hours_per_week: devAvailability.available_hours_per_week ?? 40,
              max_concurrent_projects: devAvailability.max_concurrent_projects ?? 5,
              available_from: devAvailability.available_from ?? null,
              available_until: devAvailability.available_until ?? null,
              status_message: devAvailability.status_message ?? null,
              auto_assign: devAvailability.auto_assign ?? true,
            } : null}
          />
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Level</CardDescription>
                <CardTitle className="text-3xl">{stats.level}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>{stats.xp_points} XP</span>
                    <span>{stats.next_level_xp} XP</span>
                  </div>
                  <Progress value={stats.progress_to_next_level * 100} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Skills</CardDescription>
                <CardTitle className="text-3xl">{stats.skills_count}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Skills added</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Projects</CardDescription>
                <CardTitle className="text-3xl">{stats.total_projects}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Badges</CardDescription>
                <CardTitle className="text-3xl">{stats.badges_count}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Earned</p>
              </CardContent>
            </Card>
          </div>

          {/* Skills Matrix */}
          <div>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Skills Matrix</h2>
                <p className="text-sm text-muted-foreground">
                  Use the sliders to update your proficiency levels (0-10)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-red-500/20 text-red-700 dark:text-red-300">
                  0-2
                </Badge>
                <Badge variant="secondary" className="bg-orange-500/20 text-orange-700 dark:text-orange-300">
                  3-4
                </Badge>
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                  5-6
                </Badge>
                <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300">
                  7-8
                </Badge>
                <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
                  9-10
                </Badge>
              </div>
            </div>

            <SkillsMatrix
              devSkills={devSkills}
              skillTemplates={skillTemplates}
              isOwnProfile={true}
              isAdmin={false}
            />
          </div>

          {/* Help Text */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Proficiency Guide:</strong> Be honest about your skill levels. Admin can verify
                and adjust if needed.
              </p>
              <p>
                <strong>Project Tracking:</strong> Skills are automatically tracked when you work on projects.
              </p>
              <p>
                <strong>Badges:</strong> Earn badges by reaching skill milestones and completing projects.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
