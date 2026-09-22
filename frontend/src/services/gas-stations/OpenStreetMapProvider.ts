import type { GasStationProvider } from './GasStationProvider'
import { stationConfig, osmAttribution, providerLinks } from './config'
import { fetchStationJson, optionalText, record, StationServiceError } from './http'
import type { GasStation, StationQuery } from './types'
import { validCoordinates } from '../../utils/distance'

export function normalizeOpenStreetMap(body: unknown, query: StationQuery): GasStation[] {
  const data = record(body)
  if (!Array.isArray(data.elements) || data.remark) throw new StationServiceError('invalid-response')
  return data.elements.flatMap((item): GasStation[] => {
    const row = record(item)
    const center = record(row.center)
    const tags = record(row.tags)
    const point = { latitude: (row.lat ?? center.lat) as number, longitude: (row.lon ?? center.lon) as number }
    if (!validCoordinates(point) || typeof row.id !== 'number') return []
    // Unknown availability is retained; explicit unsupported fuels are excluded.
    const tag = { regular: 'fuel:octane_87', midGrade: 'fuel:octane_89', premium: 'fuel:octane_91', diesel: 'fuel:diesel' }[query.fuelType]
    if (tags[tag] === 'no') return []
    return [{
      id: `osm:${row.type}:${row.id}`, ...point,
      name: optionalText(tags.name) ?? optionalText(tags.brand) ?? 'Gas station',
      brand: optionalText(tags.brand),
      address: optionalText(tags['addr:full']) ?? (['addr:housenumber', 'addr:street', 'addr:city'].map(key => optionalText(tags[key])).filter(Boolean).join(' ') || undefined),
      openingHours: optionalText(tags.opening_hours), prices: {},
      source: 'OpenStreetMap', sourceUrl: providerLinks.osm, attribution: osmAttribution,
    }]
  })
}
export class OpenStreetMapProvider implements GasStationProvider {
  readonly name = 'OpenStreetMap'
  supports(): boolean { return true }
  async nearby(query: StationQuery): Promise<GasStation[]> {
    const data = `[out:json][timeout:20];nwr["amenity"="fuel"](around:${query.radiusKm * 1000},${query.latitude},${query.longitude});out center tags;`
    return normalizeOpenStreetMap(await fetchStationJson(stationConfig.overpassEndpoint, {
      method: 'POST', body: new URLSearchParams({ data }),
    }), query)
  }
}
