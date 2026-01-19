// Utility functions for computing project financials
// This file is safe for both client and server components

export interface ProjectFinancials {
  price_dfy: number | null
  price_hexona: number | null
  price_dev: number | null
  profit_hexona: number | null   // price_hexona - price_dev
  profit_dfy: number | null      // price_dfy - price_hexona
  cycle_sales: number | null     // days: date_inquiry → date_closed
  cycle_delivery: number | null  // days: date_closed → date_delivered
}

interface ProjectWithFinancialFields {
  price_dfy?: number | null
  price_hexona?: number | null
  price_dev?: number | null
  date_inquiry?: string | null
  date_closed?: string | null
  date_delivered?: string | null
}

function daysBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffTime = endDate.getTime() - startDate.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function computeProjectFinancials(project: ProjectWithFinancialFields): ProjectFinancials {
  const profit_hexona = project.price_hexona != null && project.price_dev != null
    ? project.price_hexona - project.price_dev
    : null

  const profit_dfy = project.price_dfy != null && project.price_hexona != null
    ? project.price_dfy - project.price_hexona
    : null

  return {
    price_dfy: project.price_dfy ?? null,
    price_hexona: project.price_hexona ?? null,
    price_dev: project.price_dev ?? null,
    profit_hexona,
    profit_dfy,
    cycle_sales: daysBetween(project.date_inquiry ?? null, project.date_closed ?? null),
    cycle_delivery: daysBetween(project.date_closed ?? null, project.date_delivered ?? null),
  }
}
