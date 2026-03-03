'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export function useOnboardingSheet() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const activeSection = searchParams.get('section')

  const openSheet = useCallback(
    (slug: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('section', slug)
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  const closeSheet = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('section')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  return { activeSection, openSheet, closeSheet }
}
