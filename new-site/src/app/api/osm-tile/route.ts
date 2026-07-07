import { NextRequest, NextResponse } from 'next/server'
import { fetchOsmTile, parseOsmTileParams } from './osmTileProxy'

export const dynamic = 'force-dynamic'

/** Legacy query-string tile URLs — kept for bookmarks; prefer /api/osm-tile/{s}/{z}/{x}/{y}.png */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const parsed = parseOsmTileParams(
    url.searchParams.get('s') ?? '',
    url.searchParams.get('z') ?? '',
    url.searchParams.get('x') ?? '',
    url.searchParams.get('y') ?? ''
  )
  if ('error' in parsed) {
    return new NextResponse(parsed.error, { status: parsed.status })
  }

  const result = await fetchOsmTile(parsed.s, parsed.zi, parsed.xi, parsed.yi)
  if ('error' in result) {
    return new NextResponse(result.error, { status: result.status })
  }

  return new NextResponse(result.body, { status: result.status, headers: result.headers })
}
