import type { Coordinates } from '../services/gas-stations/types'

export function validCoordinates(point: Coordinates): boolean {
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 &&
    Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180
}

/** Great-circle distance in km; deliberately not a driving-distance estimate. */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  if (!validCoordinates(a) || !validCoordinates(b)) throw new Error('Invalid coordinates')
  const radians = Math.PI / 180
  const deltaLat = (b.latitude - a.latitude) * radians
  const deltaLon = (b.longitude - a.longitude) * radians
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(a.latitude * radians) *
    Math.cos(b.latitude * radians) * Math.sin(deltaLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))))
}
