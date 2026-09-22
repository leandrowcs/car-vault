import { useEffect, useState } from 'react'
import { gasStationService } from '../services/gas-stations/gasStationService'
import { stationConfig } from '../services/gas-stations/config'
import { StationServiceError } from '../services/gas-stations/http'
import type { Coordinates, StationResults, StationFuelType, StationSort } from '../services/gas-stations/types'

export function useNearbyGasStations(point: Coordinates | null, radiusKm: number, fuelType: StationFuelType, sort: StationSort) {
  const [results, setResults] = useState<StationResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const latitude = point?.latitude
  const longitude = point?.longitude
  useEffect(() => {
    let active = true
    let expiry: ReturnType<typeof setTimeout> | undefined
    setResults(null); setError(null)
    if (latitude === undefined || longitude === undefined) { setLoading(false); return }
    setLoading(true)
    void gasStationService.nearby({ latitude, longitude, radiusKm, fuelType, sort }).then(value => {
      if (!active) return
      setResults(value)
      expiry = setTimeout(() => {
        setResults(null)
        setError('Search results have expired. Search again for recent prices.')
      }, Math.max(0, value.fetchedAt + stationConfig.cacheMs - Date.now()))
    }).catch(reason => {
      if (active) setError(reason instanceof StationServiceError && reason.code === 'rate-limit'
        ? 'The station service is busy. Please wait before retrying, or enter the station manually.'
        : 'Unable to load nearby stations. You can retry or enter the station manually.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; if (expiry) clearTimeout(expiry) }
  }, [latitude, longitude, radiusKm, fuelType, sort, retry])
  return { results, loading, error, retry: () => setRetry(value => value + 1) }
}
