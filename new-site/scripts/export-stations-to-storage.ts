import { initializeApp, getApps } from 'firebase-admin/app'
import { exportStationSnapshotsToStorage } from '../src/server/exportStationSnapshots'

async function main(): Promise<void> {
  if (getApps().length === 0) {
    const storageBucket =
      process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim()
    initializeApp(storageBucket ? { storageBucket } : undefined)
  }

  const manifest = await exportStationSnapshotsToStorage()
  console.log(`Exported station CDN manifest version ${manifest.version}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
