import { distanceKm, validCoordinates } from '../../utils/distance'
import type { GasStationProvider } from './GasStationProvider'
import { GasQuebecProvider } from './GasQuebecProvider'
import { OpenStreetMapProvider } from './OpenStreetMapProvider'
import { stationConfig } from './config'
import type { GasStation, StationQuery, StationResults } from './types'

export function sortStations(stations: GasStation[], query: StationQuery): GasStation[] {
  return [...new Map(stations.map(station => [station.id, station])).values()]
    .map(station => ({ ...station, distanceKm: distanceKm(query, station) }))
    .filter(station => station.distanceKm <= query.radiusKm)
    .sort((a, b) => {
      if (query.sort === 'price') {
        const aPrice = a.prices[query.fuelType]?.pricePerLiter ?? Infinity
        const bPrice = b.prices[query.fuelType]?.pricePerLiter ?? Infinity
        if (aPrice !== bPrice) return aPrice - bPrice
      }
      return a.distanceKm - b.distanceKm || a.id.localeCompare(b.id)
    })
}

export class GasStationService {
  private cache = new Map<string, { value: StationResults; timer: ReturnType<typeof setTimeout> }>()
  private pending = new Map<string, Promise<StationResults>>()
  constructor(private providers: GasStationProvider[] = [new GasQuebecProvider(), new OpenStreetMapProvider()]) {}

  async nearby(query: StationQuery): Promise<StationResults> {
    if (!validCoordinates(query) || ![1, 5, 10, 20, 30].includes(query.radiusKm)) throw new Error('Invalid search location or radius')
    const key = JSON.stringify(query)
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.value.fetchedAt < stationConfig.cacheMs) return cached.value
    const pending = this.pending.get(key)
    if (pending) return pending
    const request = this.load(query).then(value => {
      if (this.cache.size >= 12) this.evict(this.cache.keys().next().value!)
      this.evict(key)
      const timer = setTimeout(() => this.evict(key), stationConfig.cacheMs)
      this.cache.set(key, { value, timer })
      return value
    }).finally(() => this.pending.delete(key))
    this.pending.set(key, request)
    return request
  }
  private evict(key: string) {
    const entry = this.cache.get(key)
    if (entry) clearTimeout(entry.timer)
    this.cache.delete(key)
  }
  private async load(query: StationQuery): Promise<StationResults> {
    let lastError: unknown
    let hadFailure = false
    for (const provider of this.providers) {
      if (!provider.supports(query)) continue
      try {
        const stations = sortStations(await provider.nearby(query), query)
        if (stations.length || provider === this.providers.at(-1)) {
          return { stations, fetchedAt: Date.now(), notice: hadFailure
            ? 'Price service unavailable. Showing station locations where available.'
            : provider.name === 'OpenStreetMap' ? 'Fuel availability is not confirmed. Prices are unavailable from this source.'
            : 'Showing up to 10 stations. Prices are suggestions; verify at the pump.' }
        }
      } catch (error) { lastError = error; hadFailure = true }
    }
    throw lastError ?? new Error('No station provider available')
  }
}
export const gasStationService = new GasStationService()
