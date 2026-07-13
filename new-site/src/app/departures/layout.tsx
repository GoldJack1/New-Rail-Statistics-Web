import StationsDataBoundary from '@/contexts/StationsDataBoundary'

export default function DeparturesLayout({ children }: { children: React.ReactNode }) {
  return <StationsDataBoundary>{children}</StationsDataBoundary>
}
