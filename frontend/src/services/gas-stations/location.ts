import type { Coordinates } from './types'
import { validCoordinates } from '../../utils/distance'

export type LocationFailure = 'denied' | 'timeout' | 'unavailable'
export class LocationError extends Error {
  constructor(public readonly reason: LocationFailure) { super(reason) }
}
export function currentLocation(geolocation?: Geolocation): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!geolocation) { reject(new LocationError('unavailable')); return }
    geolocation.getCurrentPosition(position => {
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude }
      if (validCoordinates(point)) resolve(point)
      else reject(new LocationError('unavailable'))
    }, error => reject(new LocationError(error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable')),
    { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 })
  })
}
