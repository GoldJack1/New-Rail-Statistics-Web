import { NextRequest, NextResponse } from 'next/server'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

function boolEnv(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

function detectCountryCode(request: NextRequest): string | null {
  const candidates = [
    request.headers.get('x-country'),
    request.headers.get('cf-ipcountry'),
    request.headers.get('vercel-ip-country'),
    request.headers.get('x-nf-geo-country'),
  ]
  for (const raw of candidates) {
    const code = String(raw || '').trim().toUpperCase()
    if (code) return code
  }
  return null
}

async function proxyDarwin(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const origin = process.env.DARWIN_API_ORIGIN || 'https://api-darwin.railstatistics.co.uk'
  const apiKey = process.env.DARWIN_API_KEY || ''
  const ukOnly = boolEnv(process.env.DARWIN_UK_ONLY)
  const ukAllowedCountries = new Set(['GB', 'UK'])

  if (!apiKey) {
    return json(500, { error: 'DARWIN_API_KEY is not configured' })
  }

  if (ukOnly) {
    const country = detectCountryCode(request)
    if (!country || !ukAllowedCountries.has(country)) {
      return json(451, {
        error: 'regional_restriction',
        message: 'Darwin realtime API is only available in the UK.',
        country: country || 'unknown',
      })
    }
  }

  const splat = pathSegments.length > 0 ? pathSegments.join('/') : 'health'
  const upstream = new URL(`${origin.replace(/\/$/, '')}/api/${splat}${request.nextUrl.search}`)

  const headers = new Headers(request.headers)
  headers.set('X-API-Key', apiKey)
  headers.set('Host', upstream.host)
  headers.delete('content-length')

  const upstreamRes = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    // @ts-expect-error duplex required for streaming bodies in Node 18+
    duplex: 'half',
  })

  const responseHeaders = new Headers(upstreamRes.headers)
  responseHeaders.delete('content-length')

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders,
  })
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyDarwin(request, path ?? [])
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyDarwin(request, path ?? [])
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyDarwin(request, path ?? [])
}
