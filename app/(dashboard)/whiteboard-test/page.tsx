'use client'

import dynamic from 'next/dynamic'

const ExcalidrawWrapper = dynamic(
  () => import('@/components/whiteboard/ExcalidrawWrapper'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-muted animate-pulse">
        <span className="text-muted-foreground">Loading whiteboard...</span>
      </div>
    ),
  }
)

export default function WhiteboardTestPage() {
  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <ExcalidrawWrapper
        onChange={(elements, appState, files) => {
          console.log('Whiteboard changed:', {
            elementCount: elements.length,
            appState: appState.theme,
            fileCount: Object.keys(files).length
          })
        }}
      />
    </div>
  )
}
