/**
 * Public detail / edit redirect routes under `/stations/:network/*`.
 * No PendingStationChangesProvider — keeps Firestore sync out of the public detail bundle.
 * Admin edit lives under `/admin/stations/...` with its own providers.
 */
export default function StationsNetworkLayout({ children }: { children: React.ReactNode }) {
  return children
}
