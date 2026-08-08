/**
 * Bootstrap Firestore `networkmessages` collection (inactive placeholder doc).
 *
 * Usage:
 *   node scripts/bootstrap-network-messages.mjs \
 *     --credentials ../ignore/rail-statistics-firebase-adminsdk-fbsvc-3a33025fa6.json
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')
const COLLECTION = 'networkmessages'
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
  const ref = db.collection(COLLECTION).doc('_bootstrap')
  await ref.set(
    {
      network: 'stations_gbnr',
      priority: 1,
      title: '',
      body: '',
      active: false,
      note: 'Placeholder so the networkmessages collection exists. Replace/delete when real messages are added.',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
  const snap = await db.collection(COLLECTION).get()
  console.log(`${COLLECTION} docs: ${snap.size}`)
  snap.forEach((d) => console.log('-', d.id, JSON.stringify(d.data())))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
