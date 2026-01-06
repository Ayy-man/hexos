import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDevSkills, getSkillTemplates, getDevStats } from '@/lib/api/dev-skills';
import { SkillsMatrix } from '@/features/developer/components/SkillsMatrix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'dev') {
    redirect('/settings');
  }

  // Fetch developer skills and templates
  const [devSkills, skillTemplates, stats] = await Promise.all([
    getDevSkills(user.id),
    getSkillTemplates(),
    getDevStats(user.id),
  ]);

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Developer Profile</h1>
        <p className="text-muted-foreground">
          Manage your skills, track your progress, and showcase your expertise
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Skills Matrix</h2>
            <p className="text-sm text-muted-foreground">
              Use the sliders to update your proficiency levels (0-10)
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-red-500/20 text-red-700 dark:text-red-300">
              0-2: Beginner
            </Badge>
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-700 dark:text-orange-300">
              3-4: Junior
            </Badge>
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
              5-6: Intermediate
            </Badge>
            <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300">
              7-8: Advanced
            </Badge>
            <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
              9-10: Master
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
            Your proficiency count and last used date will update automatically.
          </p>
          <p>
            <strong>Endorsements:</strong> Ask teammates to endorse your skills to build credibility.
          </p>
          <p>
            <strong>Badges:</strong> Earn badges by reaching skill milestones and completing projects.
            Check your profile to see which badges you've unlocked!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
