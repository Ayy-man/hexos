'use client'

interface FinancesOverviewProps {
  invoices: unknown[]
  expenses: unknown[]
  milestones: unknown[]
  projects: unknown[]
}

export function FinancesOverview({
  invoices,
  expenses,
  milestones,
  projects,
}: FinancesOverviewProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Finances</h1>
      <p className="text-muted-foreground">
        Coming soon. Data loaded: {invoices.length} invoices, {expenses.length} expenses, {milestones.length} milestones, {projects.length} projects.
      </p>
    </div>
  )
}
