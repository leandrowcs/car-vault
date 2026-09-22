import type { ProxyRequest, ProxyResponse } from './gasQuebecProxy.js'

const endpoint = 'https://photon.komoot.io/api/'
let blockedUntil = 0

export function locationParameters(url: string): URLSearchParams | null {
  const query = new URL(url, 'http://localhost').searchParams.get('q')?.trim().replace(/\s+/g, ' ') ?? ''
  if (query.length < 2 || query.length > 120 || /[\u0000-\u001f]/.test(query)) return null
  // Normalize Canadian postal codes without restricting city searches to Canada.
  const q = /^[a-z]\d[a-z]\s?\d[a-z]\d$/i.test(query)
    ? query.replace(/\s/g, '').toUpperCase().replace(/^(.{3})/, '$1 ') : query
  return new URLSearchParams({ q, limit: '5', lang: 'en' })
}

/** Explicit, user-triggered search only. No autocomplete or browser credentials. */
export default async function locationSearchProxy(req: ProxyRequest, res: ProxyResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.statusCode = 405; res.end('{"error":"Method not allowed"}'); return
  }
  const parameters = locationParameters(req.url ?? '')
  if (!parameters) { res.statusCode = 400; res.end('{"error":"Invalid location search"}'); return }
  if (blockedUntil > Date.now()) {
    res.setHeader('Retry-After', String(Math.ceil((blockedUntil - Date.now()) / 1000)))
    res.statusCode = 429; res.end('{"error":"Please retry later"}'); return
  }
  try {
    const response = await fetch(`${endpoint}?${parameters}`, {
      signal: AbortSignal.timeout(15_000), redirect: 'error',
      headers: { Accept: 'application/json', 'User-Agent': 'CarVault/1.0 (personal fuel tracker)' },
    })
    if (response.status === 429) {
      const retry = response.headers.get('Retry-After') ?? '60'
      const until = /^\d+$/.test(retry) ? Date.now() + Number(retry) * 1000 : Date.parse(retry)
      blockedUntil = Math.max(Date.now() + 60_000, Number.isFinite(until) ? until : 0)
      res.setHeader('Retry-After', String(Math.ceil((blockedUntil - Date.now()) / 1000)))
      res.statusCode = 429; res.end('{"error":"Please retry later"}'); return
    }
    if (!response.ok) throw new Error('Unavailable')
    const body: unknown = await response.json()
    if (!body || typeof body !== 'object' || !('features' in body) || !Array.isArray(body.features)) throw new Error('Invalid response')
    res.statusCode = 200; res.end(JSON.stringify(body))
  } catch {
    res.statusCode = 502; res.end('{"error":"Location search unavailable"}')
  }
}
