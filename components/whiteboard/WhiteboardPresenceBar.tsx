'use client'

import { Users } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { WhiteboardViewer } from '@/hooks/use-whiteboard-realtime'

interface WhiteboardPresenceBarProps {
  viewers: WhiteboardViewer[]
}

export function WhiteboardPresenceBar({ viewers }: WhiteboardPresenceBarProps) {
  if (viewers.length === 0) return null

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex -space-x-2">
          {viewers.slice(0, 5).map((viewer) => (
            <Tooltip key={viewer.userId}>
              <TooltipTrigger asChild>
                <div
                  className="h-6 w-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-medium text-white cursor-default"
                  style={{ backgroundColor: viewer.color }}
                >
                  {viewer.userName.charAt(0).toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{viewer.userName}</p>
                <p className="text-muted-foreground">{viewer.userEmail}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {viewers.length > 5 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground cursor-default">
                  +{viewers.length - 5}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>{viewers.length - 5} more viewing</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {viewers.length === 1 ? '1 viewer' : `${viewers.length} viewers`}
        </span>
      </div>
    </TooltipProvider>
  )
}
