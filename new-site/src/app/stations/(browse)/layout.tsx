/**
 * Public list at `/stations` — data boundary only (parent layout).
 * No PendingStationChangesProvider so Firestore sync stays out of the list bundle.
 */
export default function StationsBrowseLayout({ children }: { children: React.ReactNode }) {
  return children
}
