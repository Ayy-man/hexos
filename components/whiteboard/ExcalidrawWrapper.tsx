'use client'

import { Excalidraw, MainMenu, WelcomeScreen } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useTheme } from 'next-themes'

interface ExcalidrawWrapperProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (elements: any, appState: any, files: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any
}

export default function ExcalidrawWrapper({ onChange, initialData }: ExcalidrawWrapperProps) {
  const { resolvedTheme } = useTheme()

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
