import StationsDataBoundary from '@/contexts/StationsDataBoundary'

export default function MigrationLayout({ children }: { children: React.ReactNode }) {
  return <StationsDataBoundary>{children}</StationsDataBoundary>
}
