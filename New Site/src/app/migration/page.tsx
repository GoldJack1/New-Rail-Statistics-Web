import { PageTopHeader } from '@/components/misc'

/**
 * `/migration` stays public and unprefixed (MIGRATION_PLAN.md §4), but the full
 * CSV upload/parsing/matching wizard (`MigrationPage.tsx`, ~2700 lines) is
 * explicitly out of scope for Phase 1 (§5.11). This bare placeholder exists so
 * Header/Footer/homepage links to `/migration` don't 404 during Phase 1 review.
 */
export default function MigrationPage() {
  return (
    <div className="container container--station-details">
      <PageTopHeader
        title="Migration"
        subtitle="Bring your existing station list into Rail Statistics."
      />
      <div className="container">
        <p style={{ padding: '2rem 0' }}>
          The full migration tool (CSV upload, column mapping, and station matching) is a Phase 2
          feature and is not yet wired up in this Phase 1 preview.
        </p>
      </div>
    </div>
  )
}
