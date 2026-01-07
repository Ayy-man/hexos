import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ThemeToggle } from '@/components/theme-toggle'
import { createDevApplication, hasExistingInvitation } from '@/lib/api/invitations'
import { sendApplicationReceivedEmail } from '@/lib/api/email'

const SKILL_OPTIONS = [
  'React',
  'Next.js',
  'TypeScript',
  'Node.js',
  'Python',
  'PostgreSQL',
  'Supabase',
  'Tailwind CSS',
  'GraphQL',
  'REST APIs',
  'AWS',
  'Docker',
  'Mobile (React Native)',
  'Mobile (Flutter)',
  'AI/ML',
  'DevOps',
]

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams

  async function handleSubmit(formData: FormData) {
    'use server'

    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const portfolio = formData.get('portfolio') as string
    const skills = formData.getAll('skills') as string[]
    const availability = formData.get('availability') as 'full-time' | 'part-time' | 'contract'
    const bio = formData.get('bio') as string

    // Validate required fields
    if (!name || !email || skills.length === 0 || !availability) {
      redirect('/apply?error=' + encodeURIComponent('Please fill in all required fields'))
    }

    // Check if application already exists
    const exists = await hasExistingInvitation(email)
    if (exists) {
      redirect('/apply?error=' + encodeURIComponent('An application already exists for this email'))
    }

    // Create the application
    const invitation = await createDevApplication({
      name,
      email,
      portfolio: portfolio || undefined,
      skills,
      availability,
      bio: bio || undefined,
    })

    if (!invitation) {
      redirect('/apply?error=' + encodeURIComponent('Failed to submit application. Please try again.'))
    }

    // Send confirmation email
    await sendApplicationReceivedEmail(email, name)

    revalidatePath('/dashboard/admin/applications')
    redirect('/apply?success=1')
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md space-y-6 text-center px-4">
          <div className="rounded-full w-16 h-16 bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
              Application Submitted
            </h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              Thanks for applying to join hexOS as a developer. We&apos;ll review your application and get back to you soon.
            </p>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-500">
            Check your email for a confirmation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 relative py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
            Apply to Join hexOS
          </h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Join our network of developers and work on exciting projects
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder-stone-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              placeholder="John Smith"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder-stone-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              placeholder="john@example.com"
            />
          </div>

          {/* Portfolio */}
          <div>
            <label
              htmlFor="portfolio"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Portfolio / GitHub URL
            </label>
            <input
              id="portfolio"
              name="portfolio"
              type="url"
              className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder-stone-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              placeholder="https://github.com/username"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              Skills <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SKILL_OPTIONS.map((skill) => (
                <label
                  key={skill}
                  className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300"
                >
                  <input
                    type="checkbox"
                    name="skills"
                    value={skill}
                    className="rounded border-stone-300 text-cyan-600 focus:ring-cyan-500 dark:border-stone-600 dark:bg-stone-800"
                  />
                  {skill}
                </label>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <label
              htmlFor="availability"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Availability <span className="text-red-500">*</span>
            </label>
            <select
              id="availability"
              name="availability"
              required
              className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            >
              <option value="">Select availability</option>
              <option value="full-time">Full-time (40+ hrs/week)</option>
              <option value="part-time">Part-time (20-40 hrs/week)</option>
              <option value="contract">Contract (project-based)</option>
            </select>
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Tell us about yourself
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder-stone-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              placeholder="Share your experience, what kind of projects you enjoy, and why you want to join..."
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            Submit Application
          </button>
        </form>

        <p className="text-center text-xs text-stone-500 dark:text-stone-500">
          Already have an account?{' '}
          <a href="/login" className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
