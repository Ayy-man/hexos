import { ThemeToggle } from '@/components/theme-toggle'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-bg-void relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex items-center justify-center min-h-screen p-4">
        {children}
      </div>
    </div>
  )
}
