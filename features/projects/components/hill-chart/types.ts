// ============================================
// Hill Chart Types
// ============================================

import type { TestingStage, TestStatus, TestingInfo } from '@/lib/api/testing'

export type { TestingStage, TestStatus, TestingInfo }

export interface HillChartItem {
  id: string
  name: string
  x: number // Position 0-100
  color: string
  deadline: string | null
  history: Array<{ x: number; timestamp: string }>
  testing?: TestingInfo  // Testing status if in testing zone
}

export interface ParentHillChartItem extends HillChartItem {
  subCount: number
  children: HillChartItem[]
}

export interface HistoryEntry {
  x: number
  timestamp: string
}

export type HillZone = 'figuring_out' | 'making_it' | 'done'

export interface ZoneInfo {
  zone: HillZone
  label: string
  colorClass: string
  bgClass: string
}

// Props types for components
export interface HillChartProps {
  items: HillChartItem[]
  onItemUpdate?: (id: string, x: number) => void
  width?: number
  height?: number
  readOnly?: boolean
  isEditMode?: boolean
}

export interface SparklineProps {
  history: HistoryEntry[]
  currentX: number
  color: string
  width?: number
  height?: number
}

export interface SubDeliverableCardProps {
  item: HillChartItem
  testing?: TestingInfo
  onQuickUpdate: (id: string, newX: number) => void
  isLoading?: boolean
  disabled?: boolean
}

export interface ParentCardProps {
  item: ParentHillChartItem
  onClick: () => void
}
