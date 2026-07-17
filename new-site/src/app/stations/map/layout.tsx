import StationsMapPendingBoundary from './StationsMapPendingBoundary'

/** Leaflet map requires browser APIs — skip static prerender. */
export const dynamic = 'force-dynamic'

export default function StationsMapLayout({ children }: { children: React.ReactNode }) {
  return <StationsMapPendingBoundary>{children}</StationsMapPendingBoundary>
}
