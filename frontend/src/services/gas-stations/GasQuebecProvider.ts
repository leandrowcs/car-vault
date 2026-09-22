import type { GasStationProvider } from './GasStationProvider'
import { stationConfig, gasQuebecAttribution, providerLinks } from './config'
import { fetchStationJson, optionalText, record, StationServiceError, timestamp } from './http'
import type { FuelPrice, GasStation, StationQuery } from './types'
import { validCoordinates } from '../../utils/distance'

export function normalizeGasQuebec(body: unknown): GasStation[] {
  const data = record(body)
  if (!Array.isArray(data.stations)) throw new StationServiceError('invalid-response')
  const stations = data.stations.flatMap((item): GasStation[] => {
    const row = record(item)
    const point = { latitude: row.lat as number, longitude: row.lng as number }
    const id = optionalText(row.stationId)
    if (!id || !validCoordinates(point)) return []
    const updatedAt = timestamp(row.updatedAt)
    const stale = row.stale === true || (updatedAt !== undefined && Date.now() - Date.parse(updatedAt) > 7 * 86400_000)
    const price = (value: unknown): FuelPrice | undefined => !stale && typeof value === 'number' && Number.isFinite(value) && value > 0
      ? { pricePerLiter: value / 100, currency: 'CAD', updatedAt } : undefined
    return [{
      id: `gasquebec:${id}`, ...point,
      name: optionalText(row.name) ?? optionalText(row.brand) ?? 'Gas station',
      brand: optionalText(row.brand), address: optionalText(row.address),
      prices: { regular: price(row.prixOrdinaire), premium: price(row.prixSuper), diesel: price(row.prixDiesel) },
      source: 'Gas Québec', sourceUrl: providerLinks.gasQuebec,
      attribution: optionalText(data.attribution) ?? gasQuebecAttribution,
      lastUpdated: updatedAt,
    }]
  })
  if (data.stations.length && !stations.length) throw new StationServiceError('invalid-response')
  return stations
}

export class GasQuebecProvider implements GasStationProvider {
  readonly name = 'Gas Québec'
  supports(query: StationQuery): boolean {
    return query.fuelType !== 'midGrade' && query.latitude >= 44 && query.latitude <= 63 && query.longitude >= -80 && query.longitude <= -57
  }
  async nearby(query: StationQuery): Promise<GasStation[]> {
    const params = new URLSearchParams({
      lat: String(query.latitude), lng: String(query.longitude), radius: String(query.radiusKm),
      fuelType: query.fuelType === 'premium' ? 'super' : query.fuelType === 'diesel' ? 'diesel' : 'ordinaire',
      sort: query.sort, limit: '10',
    })
    return normalizeGasQuebec(await fetchStationJson(`${stationConfig.gasQuebecEndpoint}?${params}`))
  }
}
