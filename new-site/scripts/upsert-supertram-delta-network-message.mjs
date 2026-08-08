/**
 * Upsert the SuperTram Delta Junction engineering-works network message.
 *
 * Usage:
 *   node scripts/upsert-supertram-delta-network-message.mjs \
 *     --credentials ../ignore/rail-statistics-firebase-adminsdk-fbsvc-3a33025fa6.json
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')
const COLLECTION = 'networkmessages'
const DOC_ID = 'supertram-delta-junction-aug-2026'
const DEFAULT_CREDENTIALS = resolve(
  REPO_ROOT,
  'ignore/rail-statistics-firebase-adminsdk-fbsvc-3a33025fa6.json'
)

function parseArgs(argv) {
  const out = { credentials: DEFAULT_CREDENTIALS }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--credentials' || a === '-c') out.credentials = resolve(argv[++i])
  }
  return out
}

async function main() {
  const { credentials } = parseArgs(process.argv.slice(2))
  if (!existsSync(credentials)) {
    throw new Error(`Credentials not found: ${credentials}`)
  }
  const serviceAccount = JSON.parse(readFileSync(credentials, 'utf8'))
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) })
  }
  const db = getFirestore()

  // 00:00 BST 8 Aug 2026 → 23:59 BST 31 Aug 2026
  const startsAt = Timestamp.fromDate(new Date('2026-08-08T00:00:00+01:00'))
  const endsAt = Timestamp.fromDate(new Date('2026-08-31T23:59:59+01:00'))

  const payload = {
    network: 'lightrail_GBSHEFFSUPERTRAM',
    priority: 1,
    title:
      'SuperTram Engineering Works at Delta Junction: Saturday 8 to Monday 31 August 2026',
    preview:
      'Major works are being carried out at Delta Junction, which is affecting all tram services in Sheffield. All tram services are operating as a split service.',
    paragraphs: [
      {
        text: 'Major works are being carried out at Delta Junction, which is affecting all tram services in Sheffield. During this time, we will be renewing the main tram junction – known as the Delta Junction, above Park Square roundabout in Sheffield city centre. Works will include replacing worn track, points, signalling equipment and pedestrian crossings.',
        bullets: [],
      },
      {
        text: 'Trams on all routes will be operating as two separate services, running as follows:',
        bullets: [
          {
            lineChip: 'Blue',
            text: 'Malin Bridge to Cathedral & Halfway to Sheffield Station.',
          },
          {
            lineChip: 'Purple',
            text: 'Herdings Park to Sheffield Station.',
          },
          {
            lineChip: 'Yellow',
            text: 'Middlewood to Cathedral & Meadowhall to Woodbourn Road.',
          },
          {
            lineChip: 'Tram-Train',
            text: 'Woodbourn Road to Parkgate.',
          },
        ],
      },
      {
        text: 'All services will operate every 15 minutes in the daytime and every 30 minutes in the evenings. Purple route services run every hour, and Tram-Trains run up to every 30 minutes.',
        bullets: [],
      },
      {
        text: 'For more information, visit www.supertram.com',
        bullets: [],
      },
    ],
    body: '',
    collapsible: true,
    startsAt,
    endsAt,
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  }

  const ref = db.collection(COLLECTION).doc(DOC_ID)
  const existing = await ref.get()
  if (existing.exists) {
    const { createdAt: _createdAt, ...update } = payload
    await ref.set({ ...update, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  } else {
    await ref.set(payload)
  }

  // Keep bootstrap placeholder inactive / ignoreable.
  await db.collection(COLLECTION).doc('_bootstrap').set(
    { active: false, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  )

  const snap = await ref.get()
  console.log('Upserted', snap.id)
  console.log(JSON.stringify(snap.data(), null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
