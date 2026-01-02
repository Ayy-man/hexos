'use client'

import { Excalidraw, MainMenu, WelcomeScreen } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useTheme } from 'next-themes'

// POC: Minimal wrapper to validate Excalidraw integration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ExcalidrawWrapper({ onChange }: { onChange?: (elements: any, appState: any, files: any) => void }) {
  const { resolvedTheme } = useTheme()

  return (
    <div className="h-full w-full">
      <Excalidraw
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
