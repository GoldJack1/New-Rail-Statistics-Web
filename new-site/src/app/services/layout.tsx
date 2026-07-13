import StationsDataBoundary from '@/contexts/StationsDataBoundary'

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <StationsDataBoundary>{children}</StationsDataBoundary>
}
