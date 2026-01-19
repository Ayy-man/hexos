declare module 'cal-heatmap' {
  interface DomainOptions {
    type: 'month' | 'week' | 'day' | 'hour'
    gutter?: number
    label?: {
      position?: 'top' | 'bottom' | 'left' | 'right'
      text?: string | ((timestamp: number, element: HTMLElement) => string)
    }
  }

  interface SubDomainOptions {
    type: 'month' | 'week' | 'day' | 'hour' | 'minute'
    radius?: number
    width?: number
    height?: number
    gutter?: number
    label?: string | ((timestamp: number, value: number) => string)
  }

  interface DateOptions {
    start?: Date
    min?: Date
    max?: Date
    locale?: {
      weekStart?: number
    }
  }

  interface DataOptions {
    source: Array<{ date: string; value: number }> | string
    x?: string | ((d: unknown) => string)
    y?: string | ((d: unknown) => number)
  }

  interface ScaleOptions {
    color?: {
      range: string[]
      domain: number[]
      type?: 'threshold' | 'quantize' | 'ordinal' | 'linear'
    }
  }

  interface CalHeatmapOptions {
    itemSelector?: HTMLElement | string
    range?: number
    domain?: DomainOptions
    subDomain?: SubDomainOptions
    date?: DateOptions
    data?: DataOptions
    scale?: ScaleOptions
  }

  type Plugin = [unknown, Record<string, unknown>]

  class CalHeatmap {
    paint(options: CalHeatmapOptions, plugins?: Plugin[]): Promise<void>
    destroy(): void
    previous(n?: number): void
    next(n?: number): void
    jumpTo(date: Date): void
  }

  export default CalHeatmap
}

declare module 'cal-heatmap/plugins/Tooltip' {
  interface TooltipOptions {
    text?: (
      timestamp: number,
      value: number,
      dayjsDate: { format: (fmt: string) => string }
    ) => string
  }

  const Tooltip: unknown
  export default Tooltip
}
