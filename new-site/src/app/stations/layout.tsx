import StationEditingBoundary from '@/contexts/StationEditingBoundary'

export default function StationsLayout({ children }: { children: React.ReactNode }) {
  return <StationEditingBoundary>{children}</StationEditingBoundary>
}
