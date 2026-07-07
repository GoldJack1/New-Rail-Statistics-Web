import { NextResponse } from 'next/server'
import { fetchOsmTile, parseOsmTileParams } from '../../../../osmTileProxy'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ s: string; z: string; x: string; y: string }>
}

/**
 * Path-based OSM tile proxy for Leaflet. Each tile gets a unique URL so Netlify's
 * CDN caches tiles individually (query-string URLs were collapsing to one cached tile).
 */
export async function GET(_request: Request, context: RouteContext) {
  const { s, z, x, y } = await context.params
  const parsed = parseOsmTileParams(s, z, x, y)
  if ('error' in parsed) {
    return new NextResponse(parsed.error, { status: parsed.status })
  }

  const result = await fetchOsmTile(parsed.s, parsed.zi, parsed.xi, parsed.yi)
  if ('error' in result) {
    return new NextResponse(result.error, { status: result.status })
  }

  return new NextResponse(result.body, { status: result.status, headers: result.headers })
}
