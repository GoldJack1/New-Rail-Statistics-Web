import { initializeApp } from 'firebase-admin/app'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https'
import { exportStationSnapshotsToStorage } from '../../src/server/exportStationSnapshots'

initializeApp()

const DEFAULT_MASTER_PUBLISH_EMAIL = 'wingatejack2021@gmail.com'

function resolveMasterPublishEmail(): string {
  return (process.env.MASTER_PUBLISH_EMAIL ?? DEFAULT_MASTER_PUBLISH_EMAIL).trim().toLowerCase()
}

function assertMasterPublishCaller(email: string | undefined | null): void {
  const expected = resolveMasterPublishEmail()
  const actual = email?.trim().toLowerCase() ?? ''
  if (!actual || actual !== expected) {
    throw new HttpsError('permission-denied', 'Only the site owner can trigger station CDN exports.')
  }
}

async function runStationCdnExport(source: string): Promise<{ version: string }> {
  const manifest = await exportStationSnapshotsToStorage()
  console.log(`Station CDN export complete (${source}): ${manifest.version}`)
  return { version: manifest.version }
}

/** Called from the admin UI after an immediate publish. */
export const exportStationSnapshotsAfterPublish = onCall(
  {
    memory: '1GiB',
    timeoutSeconds: 540,
    region: 'us-central1',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to export station snapshots.')
    }
    assertMasterPublishCaller(request.auth.token.email)
    return runStationCdnExport('publish')
  }
)

/** Runs when a server-side scheduled publish job completes. */
export const exportStationSnapshotsOnScheduledPublish = onDocumentUpdated(
  {
    document: 'scheduledStationPublishJobs/{jobId}',
    memory: '1GiB',
    timeoutSeconds: 540,
    region: 'us-central1',
  },
  async (event) => {
    const before = event.data?.before.data() as { status?: string } | undefined
    const after = event.data?.after.data() as { status?: string } | undefined
    if (!before || !after) return
    if (before.status === 'completed' || after.status !== 'completed') return
    await runStationCdnExport(`scheduled-job:${event.params.jobId}`)
  }
)

/** Manual ops export — requires `x-station-cdn-export-secret` header. */
export const exportStationSnapshotsManual = onRequest(
  {
    memory: '1GiB',
    timeoutSeconds: 540,
    region: 'us-central1',
  },
  async (req, res) => {
    const secret = process.env.STATION_CDN_EXPORT_SECRET?.trim()
    const provided = req.get('x-station-cdn-export-secret')?.trim()
    if (!secret || provided !== secret) {
      res.status(403).json({ ok: false, error: 'Forbidden' })
      return
    }

    try {
      const result = await runStationCdnExport('manual')
      res.status(200).json({ ok: true, version: result.version })
    } catch (error) {
      console.error('Manual station export failed:', error)
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Export failed',
      })
    }
  }
)
