'use client'

import { usePathname } from 'next/navigation'

/**
 * Mirrors the old `App.tsx` logic that added `app-main--stations-layout` for
 * `/stations`, `/stations/edit` and `/stations/map` so those pages can manage
 * their own scroll container instead of the default 100dvh main column.
 */
export default function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isStationsLayout = pathname === '/stations' || pathname === '/stations/edit' || pathname === '/stations/map'

  return (
    <main className={`main-content app-main${isStationsLayout ? ' app-main--stations-layout' : ''}`}>
      {children}
    </main>
  )
}
