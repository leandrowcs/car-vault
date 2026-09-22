import { validCoordinates } from '../../utils/distance'
import { stationConfig, osmAttribution, providerLinks } from './config'
import { fetchStationJson, optionalText, record, StationServiceError } from './http'
import type { Coordinates } from './types'

export interface LocationMatch extends Coordinates {
  id: string
  label: string
  attribution: string
  sourceUrl: string
}
export interface LocationSearchProvider { search(query: string): Promise<LocationMatch[]> }

export function normalizeLocations(body: unknown): LocationMatch[] {
  const data = record(body)
  if (!Array.isArray(data.features)) throw new StationServiceError('invalid-response')
  const matches = data.features.flatMap((feature): LocationMatch[] => {
    const row = record(feature)
    const geometry = record(row.geometry)
    const props = record(row.properties)
    if (geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return []
    const point = { latitude: geometry.coordinates[1] as number, longitude: geometry.coordinates[0] as number }
    if (!validCoordinates(point)) return []
    const label = [...new Set(['name', 'postcode', 'city', 'state', 'country'].map(key => optionalText(props[key])).filter(Boolean))].join(', ')
    if (!label) return []
    return [{ ...point, id: `${point.latitude},${point.longitude}:${label}`, label,
      attribution: `Photon · ${osmAttribution}`, sourceUrl: providerLinks.osm }]
  })
  if (data.features.length && !matches.length) throw new StationServiceError('invalid-response')
  return [...new Map(matches.map(match => [match.id, match])).values()].slice(0, 5)
}

export class PhotonLocationProvider implements LocationSearchProvider {
  async search(query: string): Promise<LocationMatch[]> {
    return normalizeLocations(await fetchStationJson(`${stationConfig.locationSearchEndpoint}?${new URLSearchParams({ q: query })}`))
  }
}
export class LocationSearchService implements LocationSearchProvider {
  private cache = new Map<string, { matches: LocationMatch[]; timer: ReturnType<typeof setTimeout>; expires: number }>()
  private pending = new Map<string, Promise<LocationMatch[]>>()
  constructor(private provider: LocationSearchProvider = new PhotonLocationProvider()) {}
  async search(query: string): Promise<LocationMatch[]> {
    const normalized = query.trim().replace(/\s+/g, ' ')
    if (normalized.length < 2 || normalized.length > 120) throw new Error('Enter a city or postal code.')
    const key = normalized.toLocaleLowerCase('en-CA')
    const cached = this.cache.get(key)
    if (cached && cached.expires > Date.now()) return cached.matches
    const pending = this.pending.get(key)
    if (pending) return pending
    const request = this.provider.search(normalized).then(matches => {
      if (this.cache.size >= 12) this.evict(this.cache.keys().next().value!)
      this.evict(key)
      this.cache.set(key, { matches, expires: Date.now() + stationConfig.cacheMs,
        timer: setTimeout(() => this.evict(key), stationConfig.cacheMs) })
      return matches
    }).finally(() => this.pending.delete(key))
    this.pending.set(key, request)
    return request
  }
  private evict(key: string) {
    const entry = this.cache.get(key)
    if (entry) clearTimeout(entry.timer)
    this.cache.delete(key)
  }
}
export const locationSearchService = new LocationSearchService()
