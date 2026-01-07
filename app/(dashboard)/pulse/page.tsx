import { redirect } from 'next/navigation'
import { requireAuth, getProfile } from '@/lib/auth/guards'
import { getPulseStats, getHeatmapData, getLifetimePoints } from '@/lib/api/pulse'
import { getTasksForDateRange } from '@/lib/api/pulse-tasks'
import { getTargetsForQuarter, getCurrentQuarter } from '@/lib/api/pulse-targets'
import { getCurrentYearGoal } from '@/lib/api/pulse-goals'
import { getWeekRange, getTodayDate } from '@/lib/utils/pulseCalculations'
import { PulsePageClient } from './PulsePageClient'
import type { PulseTab } from '@/lib/types/pulse'

interface Props {
  searchParams: Promise<{ tab?: string }>
}

export default async function PulsePage({ searchParams }: Props) {
  await requireAuth()
  const profile = await getProfile()
  const params = await searchParams

  if (!profile) {
    redirect('/login')
  }

  if (!['admin', 'internal'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const activeTab = (['today', 'week', 'goals', 'insights'].includes(params.tab || '')
    ? params.tab
    : 'today') as PulseTab
  const isAdmin = profile.role === 'admin'
  const currentYear = new Date().getFullYear()
  const currentQuarter = getCurrentQuarter()
  const week = getWeekRange()
  const today = getTodayDate()

  const [stats, heatmapData, tasks, targets, goal, lifetimePoints] = await Promise.all([
    getPulseStats(profile.id),
    getHeatmapData(profile.id, 12),
    getTasksForDateRange(profile.id, week.start, week.end),
    getTargetsForQuarter(null, currentQuarter),
    getCurrentYearGoal(),
    getLifetimePoints(profile.id),
  ])

  return (
    <PulsePageClient
      activeTab={activeTab}
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
      lifetimePoints={lifetimePoints}
      today={today}
    />
  )
}
