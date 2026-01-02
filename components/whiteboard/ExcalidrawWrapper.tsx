'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from 'next-themes'
import '@excalidraw/excalidraw/index.css'

interface ExcalidrawWrapperProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (elements: any, appState: any, files: any, sceneVersion: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any
}

export default function ExcalidrawWrapper({ onChange, initialData }: ExcalidrawWrapperProps) {
  const { resolvedTheme } = useTheme()
  const [Comp, setComp] = useState<{
    Excalidraw: React.ComponentType<any>
    MainMenu: any
    WelcomeScreen: any
    getSceneVersion: (elements: any[]) => number
  } | null>(null)

  // Store onChange in ref to avoid recreating handleChange
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    import('@excalidraw/excalidraw').then((mod) => {
      setComp({
        Excalidraw: mod.Excalidraw,
        MainMenu: mod.MainMenu,
        WelcomeScreen: mod.WelcomeScreen,
        getSceneVersion: mod.getSceneVersion,
      })
    })
  }, [])

  // Memoized onChange handler that calculates scene version
  const handleChange = useCallback(
    (elements: any, appState: any, files: any) => {
      if (!onChangeRef.current || !Comp?.getSceneVersion) return
      const sceneVersion = Comp.getSceneVersion(elements)
      onChangeRef.current(elements, appState, files, sceneVersion)
    },
    [Comp]
  )

  if (!Comp) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/50 rounded-lg">
        <span className="text-muted-foreground">Loading whiteboard...</span>
      </div>
    )
  }

  const { Excalidraw, MainMenu, WelcomeScreen } = Comp

  return (
    <div className="h-full w-full">
      <Excalidraw
        initialData={initialData}
        onChange={handleChange}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      >
        <MainMenu>
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
        <WelcomeScreen>
          <WelcomeScreen.Hints.ToolbarHint />
          <WelcomeScreen.Hints.MenuHint />
          <WelcomeScreen.Hints.HelpHint />
        </WelcomeScreen>
      </Excalidraw>
    </div>
  )
}
