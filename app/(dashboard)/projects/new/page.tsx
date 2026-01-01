import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createProject } from '@/lib/api/projects'
import { getDevs, getDfyPartners } from '@/lib/api/profiles'
import { SubmitButton } from './submit-button'

async function handleCreate(formData: FormData): Promise<void> {
  'use server'

  const project = await createProject({
    project_name: formData.get('project_name') as string,
    client_name: formData.get('client_name') as string,
    client_email: (formData.get('client_email') as string) || undefined,
    client_business: (formData.get('client_business') as string) || undefined,
    project_type: (formData.get('project_type') as 'blueprint' | 'blueprint_custom' | 'full_custom') || undefined,
    operational_mode: (formData.get('operational_mode') as 'internal' | 'hexona_devs' | 'hexona_devs_dfy') || undefined,
    price_dfy: formData.get('price_dfy') ? Number(formData.get('price_dfy')) : undefined,
    target_delivery_date: (formData.get('target_delivery_date') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
    assigned_dev_id: (formData.get('assigned_dev_id') as string) || undefined,
    dfy_partner_id: (formData.get('dfy_partner_id') as string) || undefined,
  })

  redirect(`/projects/${project.id}`)
}

export default async function NewProjectPage() {
  await requireRole(['admin', 'internal'])

  let devs: Awaited<ReturnType<typeof getDevs>> = []
  let dfyPartners: Awaited<ReturnType<typeof getDfyPartners>> = []

  try {
    devs = await getDevs()
    dfyPartners = await getDfyPartners()
  } catch {
    // RLS may block if not admin
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
        New Project
      </h1>

      <form action={handleCreate} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 font-medium text-stone-900 dark:text-stone-100">
            Basic Info
          </h2>
          <div className="grid gap-4">
            <div>
              <label htmlFor="project_name" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Project Name *
              </label>
              <input
                type="text"
                id="project_name"
                name="project_name"
                required
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="client_name" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Client Name *
                </label>
                <input
                  type="text"
                  id="client_name"
                  name="client_name"
                  required
                  className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
              <div>
                <label htmlFor="client_email" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Client Email
                </label>
                <input
                  type="email"
                  id="client_email"
                  name="client_email"
                  className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="client_business" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Client Business
              </label>
              <input
                type="text"
                id="client_business"
                name="client_business"
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
          </div>
        </div>

        {/* Classification */}
        <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 font-medium text-stone-900 dark:text-stone-100">
            Classification
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="project_type" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Project Type
              </label>
              <select
                id="project_type"
                name="project_type"
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="">Select type</option>
                <option value="blueprint">Blueprint</option>
                <option value="blueprint_custom">Blueprint + Custom</option>
                <option value="full_custom">Full Custom</option>
              </select>
            </div>
            <div>
              <label htmlFor="operational_mode" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Operational Mode
              </label>
              <select
                id="operational_mode"
                name="operational_mode"
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="internal">Internal</option>
                <option value="hexona_devs">Hexona Devs</option>
                <option value="hexona_devs_dfy">Hexona Devs + DFY</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assignment */}
        <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 font-medium text-stone-900 dark:text-stone-100">
            Assignment
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="assigned_dev_id" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Assigned Dev
              </label>
              <select
                id="assigned_dev_id"
                name="assigned_dev_id"
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="">Unassigned</option>
                {devs.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dfy_partner_id" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                DFY Partner
              </label>
              <select
                id="dfy_partner_id"
                name="dfy_partner_id"
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="">None</option>
                {dfyPartners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Timeline & Pricing */}
        <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 font-medium text-stone-900 dark:text-stone-100">
            Timeline & Pricing
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="target_delivery_date" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Target Delivery Date
              </label>
              <input
                type="date"
                id="target_delivery_date"
                name="target_delivery_date"
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
            <div>
              <label htmlFor="price_dfy" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Client Price ($)
              </label>
              <input
                type="number"
                id="price_dfy"
                name="price_dfy"
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <label htmlFor="notes" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <a
            href="/projects"
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Cancel
          </a>
          <SubmitButton />
        </div>
      </form>
    </div>
  )
}
