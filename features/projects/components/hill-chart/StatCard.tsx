'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number
  colorClass: string
  icon?: React.ReactNode
}

export function StatCard({ label, value, colorClass, icon }: StatCardProps) {
  return (
    <Card className="border-border bg-card dark:border-border dark:bg-card">
      <CardContent className="p-3">
        <div className="mb-0.5 flex items-center justify-between">
          <span className="text-xs text-zinc-500">{label}</span>
          {icon && <span className="text-xs opacity-70">{icon}</span>}
        </div>
        <div className={cn('text-2xl font-bold', colorClass)}>{value}</div>
      </CardContent>
    </Card>
  )
}
