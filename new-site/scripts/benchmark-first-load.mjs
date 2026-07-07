/**
 * Cold first-load benchmark for station CDN path.
 * Run: node scripts/benchmark-first-load.mjs
 */

const BUCKET = 'rail-statistics.firebasestorage.app'
const MANIFEST_URL = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/station-exports%2Fmanifest.json?alt=media`

function ms(start, end) {
  return Math.round(end - start)
}

async function fetchManifest() {
  const t0 = performance.now()
  const res = await fetch(MANIFEST_URL, { cache: 'no-store' })
  const manifest = await res.json()
  const t1 = performance.now()
  return { manifest, fetchMs: ms(t0, t1) }
}

async function fetchAndDecodeBundle(path, encoding) {
  const encodedPath = encodeURIComponent(path)
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodedPath}?alt=media`

  const t0 = performance.now()
  const res = await fetch(url, { cache: 'no-store' })
  const tFetch = performance.now()

  const contentEncoding = res.headers.get('content-encoding') || ''
  const contentType = res.headers.get('content-type') || ''
  const buffer = Buffer.from(await res.arrayBuffer())
  const tBuffer = performance.now()

  let text
  let decodeMs = 0
  const looksLikeGzip = buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b
  if (encoding === 'gzip' && contentEncoding.toLowerCase() !== 'gzip' && !contentType.includes('application/json') && looksLikeGzip) {
    const { gunzipSync } = await import('node:zlib')
    const tDecode0 = performance.now()
    text = gunzipSync(buffer).toString('utf8')
    decodeMs = ms(tDecode0, performance.now())
  } else {
    text = buffer.toString('utf8')
    decodeMs = ms(tFetch, tBuffer)
  }

  const tParse0 = performance.now()
  const stations = JSON.parse(text)
  const parseMs = ms(tParse0, performance.now())

  return {
    stationCount: stations.length,
    fetchMs: ms(t0, tFetch),
    decodeMs,
    parseMs,
    totalMs: ms(t0, performance.now()),
    byteLength: buffer.length,
    contentEncoding: contentEncoding || 'none',
  }
}

async function run() {
  console.log('=== Station CDN cold first-load benchmark ===\n')

  const totalStart = performance.now()

  const { manifest, fetchMs: manifestMs } = await fetchManifest()
  console.log(`Manifest fetch: ${manifestMs}ms (version ${manifest.version})`)

  const listRef = manifest.bundles?.all?.list
  if (!listRef?.path) {
    console.error('No all.list bundle in manifest')
    process.exit(1)
  }

  const list = await fetchAndDecodeBundle(listRef.path, listRef.encoding)
  console.log(
    `all.list bundle: fetch ${list.fetchMs}ms + gzip ${list.decodeMs}ms + parse ${list.parseMs}ms = ${list.totalMs}ms (${list.stationCount} stations)`
  )

  const fullRef = manifest.bundles?.all?.full
  let full = null
  if (fullRef?.path) {
    full = await fetchAndDecodeBundle(fullRef.path, fullRef.encoding)
    console.log(
      `all.full bundle: fetch ${full.fetchMs}ms + gzip ${full.decodeMs}ms + parse ${full.parseMs}ms = ${full.totalMs}ms (${full.stationCount} stations)`
    )
  } else {
    console.log('all.full bundle: not in manifest (would fall back to 5 per-network fetches)')
  }

  const leanRef = manifest.bundles?.all?.lean
  if (leanRef?.path) {
    const lean = await fetchAndDecodeBundle(leanRef.path, leanRef.encoding)
    console.log(
      `all.lean bundle: fetch ${lean.fetchMs}ms + gzip ${lean.decodeMs}ms + parse ${lean.parseMs}ms = ${lean.totalMs}ms (${lean.stationCount} stations)`
    )
  }

  const totalMs = ms(totalStart, performance.now())
  console.log('\n--- First paint path (list tier only) ---')
  console.log(`Manifest + all.list: ${manifestMs + list.totalMs}ms`)
  console.log(`Total benchmark (incl. full): ${totalMs}ms`)

  if (full) {
    console.log('\n--- If full loaded immediately (old behaviour) ---')
    console.log(`Manifest + list + full: ${manifestMs + list.totalMs + full.totalMs}ms`)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
