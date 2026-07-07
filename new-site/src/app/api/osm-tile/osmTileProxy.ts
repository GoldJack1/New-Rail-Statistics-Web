const ALLOW_S = new Set(['a', 'b', 'c'])
const MAX_Z = 19

export function parseOsmTileParams(s: string, z: string, x: string, y: string) {
  if (!ALLOW_S.has(s)) {
    return { error: 'Invalid tile server' as const, status: 400 as const }
  }

  const zi = Number.parseInt(z, 10)
  const xi = Number.parseInt(x, 10)
  const yi = Number.parseInt(y.replace(/\.png$/i, ''), 10)
  if (
    !Number.isFinite(zi) ||
    zi < 0 ||
    zi > MAX_Z ||
    !Number.isFinite(xi) ||
    xi < 0 ||
    !Number.isFinite(yi) ||
    yi < 0
  ) {
    return { error: 'Invalid coordinates' as const, status: 400 as const }
  }

  return { s, zi, xi, yi }
}

export async function fetchOsmTile(s: string, zi: number, xi: number, yi: number) {
  const upstream = `https://${s}.tile.openstreetmap.org/${zi}/${xi}/${yi}.png`
  const upstreamRes = await fetch(upstream, {
    headers: {
      Accept: 'image/png,*/*',
      'User-Agent': 'RailStatisticsWebsite/1.0 (+https://railstatistics.co.uk); OSM tile proxy',
    },
  })

  if (!upstreamRes.ok) {
    return { error: upstreamRes.statusText, status: upstreamRes.status as number }
  }

  const headers = new Headers()
  headers.set('Content-Type', 'image/png')
  headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400')

  return { body: upstreamRes.body, headers, status: 200 as const }
}
