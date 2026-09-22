import { useCallback, useEffect, useRef, useState } from 'react'
import { currentLocation, LocationError, type LocationFailure } from '../services/gas-stations/location'
import type { Coordinates } from '../services/gas-stations/types'

// Deduplicate StrictMode mounts and simultaneous consumers; discard coordinates on settlement.
let pendingLocation: Promise<Coordinates> | undefined
export function useGeolocation() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<LocationFailure | null>(null)
  const sequence = useRef(0)
  useEffect(() => () => { sequence.current++ }, [])
  const request = useCallback(async () => {
    const id = ++sequence.current
    setLoading(true); setError(null); setCoordinates(null)
    try {
      pendingLocation ??= currentLocation(typeof navigator === 'undefined' ? undefined : navigator.geolocation)
        .finally(() => { pendingLocation = undefined })
      const point = await pendingLocation
      if (sequence.current === id) setCoordinates(point)
    } catch (reason) {
      if (sequence.current === id) setError(reason instanceof LocationError ? reason.reason : 'unavailable')
    } finally { if (sequence.current === id) setLoading(false) }
  }, [])
  const setManualCoordinates = useCallback((point: Coordinates) => {
    sequence.current++; setLoading(false); setError(null); setCoordinates(point)
  }, [])
  return { coordinates, loading, error, request, setManualCoordinates }
}
