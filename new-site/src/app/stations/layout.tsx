import StationsDataBoundary from '@/contexts/StationsDataBoundary'

/** Shared station CDN/cache for all `/stations/*` routes. Pending edits live in nested layouts. */
export default function StationsLayout({ children }: { children: React.ReactNode }) {
  return <StationsDataBoundary>{children}</StationsDataBoundary>
}
