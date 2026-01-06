import { redirect } from 'next/navigation'
import { requireAuth, getProfile } from '@/lib/auth/guards'
import { getPulseStats, getHeatmapData } from '@/lib/api/pulse'
import { getTasksForDateRange } from '@/lib/api/pulse-tasks'
import { getTargetsForQuarter, getCurrentQuarter } from '@/lib/api/pulse-targets'
import { getCurrentYearGoal } from '@/lib/api/pulse-goals'
import { getWeekRange } from '@/lib/utils/pulseCalculations'
import { PulsePageClient } from './PulsePageClient'

export default async function PulsePage() {
  await requireAuth()
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  // Only admin and internal can access Pulse
  if (!['admin', 'internal'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const isAdmin = profile.role === 'admin'
  const currentYear = new Date().getFullYear()
  const currentQuarter = getCurrentQuarter()
  const week = getWeekRange()

  // Fetch all data in parallel
  const [stats, heatmapData, tasks, targets, goal] = await Promise.all([
    getPulseStats(profile.id),
    getHeatmapData(profile.id, 12),
    getTasksForDateRange(profile.id, week.start, week.end),
    getTargetsForQuarter(null, currentQuarter),
    getCurrentYearGoal(),
  ])

  return (
    <PulsePageClient
      initialStats={stats}
      initialHeatmapData={heatmapData}
      initialTasks={tasks}
      initialTargets={targets}
      initialGoal={goal}
      initialWeekStart={week.start}
      currentQuarter={currentQuarter}
      currentYear={currentYear}
      isAdmin={isAdmin}
      userId={profile.id}
    />
  )
}
