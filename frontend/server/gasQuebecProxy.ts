/** Fixed-destination, read-only proxy: Gas Québec does not currently send browser CORS headers. */
export interface ProxyRequest { method?: string; url?: string }
export interface ProxyResponse {
  statusCode: number
  setHeader(name: string, value: string): unknown
  end(body?: string): unknown
}
const endpoint = 'https://www.gasquebec.ca/api/stations/nearby'
let blockedUntil = 0

export function nearbyParameters(url: string): URLSearchParams | null {
  const input = new URL(url, 'http://localhost').searchParams
  const lat = Number(input.get('lat'))
  const lng = Number(input.get('lng'))
  const radius = Number(input.get('radius'))
  const fuelType = input.get('fuelType') ?? ''
  const sort = input.get('sort') ?? ''
  if (!input.has('lat') || !input.has('lng') || !Number.isFinite(lat) || lat < 44 || lat > 63 ||
    !Number.isFinite(lng) || lng < -80 || lng > -57 || ![1, 5, 10, 20, 30].includes(radius) ||
    !['ordinaire', 'super', 'diesel'].includes(fuelType) || !['distance', 'price'].includes(sort)) return null
  return new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(radius), fuelType, sort, limit: '10' })
}

export default async function gasQuebecProxy(req: ProxyRequest, res: ProxyResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  // Never persist a visitor's coordinate query in a browser or CDN cache.
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.statusCode = 405; res.end('{"error":"Method not allowed"}'); return
  }
  const parameters = nearbyParameters(req.url ?? '')
  if (!parameters) { res.statusCode = 400; res.end('{"error":"Invalid search"}'); return }
  if (blockedUntil > Date.now()) {
    res.setHeader('Retry-After', String(Math.ceil((blockedUntil - Date.now()) / 1000)))
    res.statusCode = 429; res.end('{"error":"Please retry later"}'); return
  }
  try {
    const upstream = await fetch(`${endpoint}?${parameters}`, {
      signal: AbortSignal.timeout(15_000), redirect: 'error',
      headers: { Accept: 'application/json', 'User-Agent': 'CarVault/1.0 (personal fuel tracker)' },
    })
    if (upstream.status === 429) {
      const retry = upstream.headers.get('Retry-After') ?? '60'
      const until = /^\d+$/.test(retry) ? Date.now() + Number(retry) * 1000 : Date.parse(retry)
      blockedUntil = Math.max(Date.now() + 60_000, Number.isFinite(until) ? until : 0)
      res.setHeader('Retry-After', String(Math.ceil((blockedUntil - Date.now()) / 1000)))
      res.statusCode = 429; res.end('{"error":"Please retry later"}'); return
    }
    if (!upstream.ok) throw new Error('Upstream unavailable')
    const body: unknown = await upstream.json()
    if (!body || typeof body !== 'object' || !('stations' in body) || !Array.isArray(body.stations)) throw new Error('Invalid response')
    res.statusCode = 200
    res.end(JSON.stringify(body))
  } catch {
    res.statusCode = 502; res.end('{"error":"Price service unavailable"}')
  }
}
