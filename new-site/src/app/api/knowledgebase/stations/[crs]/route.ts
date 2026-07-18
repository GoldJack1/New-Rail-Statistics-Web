import { NextRequest, NextResponse } from 'next/server'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

function normalizeCrs(raw: string): string | null {
  const crs = String(raw || '')
    .trim()
    .toUpperCase()
  if (!/^[A-Z0-9]{3}$/.test(crs)) return null
  return crs
}

/**
 * Proxy NRE Knowledgebase Stations XML (v4) by CRS.
 * Keeps the RDM API key server-side. Does not touch Firebase.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ crs: string }> }
) {
  const { crs: crsParam } = await context.params
  const crs = normalizeCrs(crsParam)
  if (!crs) {
    return json(400, { error: 'invalid_crs', message: 'CRS must be a 3-character station code.' })
  }

  const apiKey =
    process.env.KB_STATIONS_API_KEY || process.env.KB_STATIONS_CONSUMER_KEY || ''
  if (!apiKey) {
    return json(500, {
      error: 'not_configured',
      message: 'KB_STATIONS_API_KEY (or KB_STATIONS_CONSUMER_KEY) is not configured',
    })
  }

  const origin = (process.env.KB_STATIONS_API_ORIGIN || '').replace(/\/$/, '')
  if (!origin) {
    return json(500, {
      error: 'not_configured',
      message: 'KB_STATIONS_API_ORIGIN is not configured',
    })
  }
  const upstreamUrl = `${origin}/station-${crs}.xml`

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey,
        Accept: 'application/xml, text/xml, */*',
        'Accept-Encoding': 'gzip',
      },
      // KB updates overnight — allow short edge/browser caching via our response headers.
      next: { revalidate: 3600 },
    })

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '')
      return json(upstream.status, {
        error: 'upstream_error',
        message: `Knowledgebase upstream returned ${upstream.status}`,
        detail: detail.slice(0, 500),
        crs,
      })
    }

    const xml = await upstream.text()
    if (!xml.trim().startsWith('<')) {
      return json(502, {
        error: 'invalid_upstream_body',
        message: 'Upstream response was not XML',
        crs,
      })
    }

    return NextResponse.json(
      {
        crs,
        source: 'nre-knowledgebase-stations-xml-4.0',
        fetchedAt: new Date().toISOString(),
        xml,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return json(502, { error: 'fetch_failed', message, crs })
  }
}
