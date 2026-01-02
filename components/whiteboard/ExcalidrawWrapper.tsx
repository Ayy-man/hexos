'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import '@excalidraw/excalidraw/index.css'

interface ExcalidrawWrapperProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (elements: any, appState: any, files: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any
}

export default function ExcalidrawWrapper({ onChange, initialData }: ExcalidrawWrapperProps) {
  const { resolvedTheme } = useTheme()
  const [Comp, setComp] = useState<{
    Excalidraw: React.ComponentType<any>
    MainMenu: any
    WelcomeScreen: any
  } | null>(null)

  useEffect(() => {
    import('@excalidraw/excalidraw').then((mod) => {
      setComp({
        Excalidraw: mod.Excalidraw,
        MainMenu: mod.MainMenu,
        WelcomeScreen: mod.WelcomeScreen,
      })
    })
  }, [])

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
        onChange={onChange}
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
