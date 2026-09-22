import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { distanceKm, validCoordinates } from '../../utils/distance'
import { normalizeGasQuebec, GasQuebecProvider } from './GasQuebecProvider'
import { normalizeOpenStreetMap } from './OpenStreetMapProvider'
import { GasStationService, sortStations } from './gasStationService'
import { currentLocation, manualLocation } from './location'
import { fetchStationJson, StationServiceError } from './http'
import { applyStationSelection, calculateFuelTotal } from './fuelDraft'
import { stationConfig } from './config'
import type { StationQuery, StationSelection } from './types'

const point = { latitude: 45.5, longitude: -73.56 }
const query: StationQuery = { ...point, radiusKm: 5, fuelType: 'regular', sort: 'distance' }
const row = { stationId: 'rq2-test', name: 'Example station', lat: point.latitude, lng: point.longitude, prixOrdinaire: 164.9, prixSuper: 184.9, prixDiesel: 179.9 }
const response = { stations: [row] }
const station = () => normalizeGasQuebec(response)[0]
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-22T12:00:00Z')) })
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('station distances', () => {
  it('handles identical, close, and distant coordinates', () => {
    expect(distanceKm(point, point)).toBe(0)
    expect(distanceKm(point, { ...point, latitude: point.latitude + 0.00001 })).toBeCloseTo(0.001112, 5)
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.195, 2)
    expect(distanceKm({ latitude: 0, longitude: 179.99 }, { latitude: 0, longitude: -179.99 })).toBeLessThan(3)
  })
  it.each([NaN, Infinity, 91, -91])('rejects invalid latitude %s', latitude => {
    expect(validCoordinates({ ...point, latitude })).toBe(false)
    expect(() => distanceKm(point, { ...point, latitude })).toThrow()
  })
  it('rejects invalid longitude and non-numeric provider fields', () => {
    expect(validCoordinates({ ...point, longitude: 181 })).toBe(false)
    expect(validCoordinates({ ...point, latitude: '45' as unknown as number })).toBe(false)
  })
})

describe('Gas Québec normalization', () => {
  it('converts CAD cents/L to dollars/L without confusing fuel grades', () => {
    const result = station()
    expect(result.prices.regular?.pricePerLiter).toBeCloseTo(1.649)
    expect(result.prices.premium?.pricePerLiter).toBeCloseTo(1.849)
    expect(result.prices.diesel?.pricePerLiter).toBeCloseTo(1.799)
    expect(result.prices.midGrade).toBeUndefined()
    expect(result.prices.regular?.currency).toBe('CAD')
    expect(result.lastUpdated).toBeUndefined()
    expect(result.attribution).toContain('Régie')
    expect(result.attribution).toContain('Gas Quebec')
  })
  it.each([undefined, null, 0, -1, NaN, Infinity, '164.9', 'invalid'])('never invents prices from %s', value => {
    expect(normalizeGasQuebec({ stations: [{ ...row, prixOrdinaire: value }] })[0].prices.regular).toBeUndefined()
  })
  it('preserves valid timestamps and suppresses stale/disputed prices', () => {
    const recent = '2026-09-22T10:00:00Z'
    expect(normalizeGasQuebec({ stations: [{ ...row, updatedAt: recent }] })[0].prices.regular?.updatedAt).toBe(recent)
    for (const extra of [{ stale: true }, { updatedAt: '2020-01-01' }]) {
      expect(normalizeGasQuebec({ stations: [{ ...row, ...extra }] })[0].prices.regular).toBeUndefined()
    }
  })
  it('handles missing names, malformed bodies and invalid station coordinates', () => {
    expect(normalizeGasQuebec({ stations: [{ ...row, name: null }] })[0].name).toBe('Gas station')
    expect(normalizeGasQuebec({ stations: [] })).toEqual([])
    expect(() => normalizeGasQuebec({ stations: [{ ...row, lat: null }] })).toThrow('invalid-response')
    expect(() => normalizeGasQuebec({ nope: [] })).toThrow('invalid-response')
    expect(normalizeGasQuebec({ stations: [{ ...row, lat: NaN }, row] })).toHaveLength(1)
  })
  it('maps documented request parameters and avoids unsupported grades/regions', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)))
    vi.stubGlobal('fetch', fetch)
    const provider = new GasQuebecProvider()
    await provider.nearby({ ...query, fuelType: 'premium', sort: 'price' })
    const url = new URL(fetch.mock.calls[0][0], 'http://localhost')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ lat: '45.5', lng: '-73.56', radius: '5', fuelType: 'super', sort: 'price', limit: '10' })
    expect(provider.supports({ ...query, fuelType: 'midGrade' })).toBe(false)
    expect(provider.supports({ ...query, latitude: 0 })).toBe(false)
  })
})

describe('OpenStreetMap fallback', () => {
  it('supports nodes, ways, missing names, missing metadata and explicit fuel exclusions', () => {
    const results = normalizeOpenStreetMap({ elements: [
      { id: 1, type: 'node', lat: 45.5, lon: -73.56 },
      { id: 2, type: 'way', center: { lat: 45.5, lon: -73.56 }, tags: { brand: 'Brand', opening_hours: '24/7' } },
      { id: 3, type: 'node', lat: 45.5, lon: -73.56, tags: { 'fuel:octane_87': 'no' } },
      { id: 4, type: 'node', lat: 95, lon: -73.56 },
    ] }, query)
    expect(results).toHaveLength(2)
    expect(results[0].name).toBe('Gas station')
    expect(results[1].openingHours).toBe('24/7')
    expect(results[1].prices).toEqual({})
    expect(results[0].attribution).toContain('OpenStreetMap')
    expect(() => normalizeOpenStreetMap({ elements: [], remark: 'timeout' }, query)).toThrow()
  })
})

describe('search, caching and errors', () => {
  it('sorts unknown prices last, filters radius, keeps distinct nearby stations and deduplicates IDs', () => {
    const results = sortStations([
      { ...station(), id: 'no-price', prices: {} },
      { ...station(), id: 'cheap', latitude: 45.51, prices: { regular: { pricePerLiter: 1.5, currency: 'CAD' } } },
      { ...station(), id: 'outside', latitude: 48 }, station(), station(),
    ], { ...query, sort: 'price' })
    expect(results.map(item => item.id)).toEqual(['cheap', station().id, 'no-price'])
  })
  it('deduplicates in-flight requests, caches for five minutes and includes filters in cache keys', async () => {
    const nearby = vi.fn().mockResolvedValue([station()])
    const service = new GasStationService([{ name: 'test', supports: () => true, nearby }])
    await Promise.all([service.nearby(query), service.nearby(query)])
    await service.nearby(query)
    expect(nearby).toHaveBeenCalledTimes(1)
    await service.nearby({ ...query, fuelType: 'diesel' })
    expect(nearby).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(stationConfig.cacheMs)
    await service.nearby(query)
    expect(nearby).toHaveBeenCalledTimes(3)
  })
  it('falls back on primary failure, never caches errors, and rejects invalid searches', async () => {
    const fallback = vi.fn().mockResolvedValue([{ ...station(), prices: {}, source: 'OpenStreetMap' }])
    const service = new GasStationService([
      { name: 'primary', supports: () => true, nearby: vi.fn().mockRejectedValue(new Error()) },
      { name: 'OpenStreetMap', supports: () => true, nearby: fallback },
    ])
    expect((await service.nearby(query)).notice).toContain('Price service unavailable')
    const fail = vi.fn().mockRejectedValue(new Error('offline'))
    const failed = new GasStationService([{ name: 'fail', supports: () => true, nearby: fail }])
    await expect(failed.nearby(query)).rejects.toThrow('offline')
    await expect(failed.nearby(query)).rejects.toThrow('offline')
    expect(fail).toHaveBeenCalledTimes(2)
    await expect(service.nearby({ ...query, latitude: 91 })).rejects.toThrow()
  })
  it('honors Retry-After across different queries without retrying upstream', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '120' } }))
    vi.stubGlobal('fetch', fetch)
    await expect(fetchStationJson('/test-rate-limit?a=1')).rejects.toBeInstanceOf(StationServiceError)
    await expect(fetchStationJson('/test-rate-limit?a=2')).rejects.toThrow('rate-limit')
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(121_000)
    await expect(fetchStationJson('/test-rate-limit?a=2')).rejects.toThrow('rate-limit')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('handles invalid JSON, HTTP errors and network failures', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('not json')).mockResolvedValueOnce(new Response('', { status: 503 })).mockRejectedValueOnce(new TypeError('offline'))
    vi.stubGlobal('fetch', fetch)
    await expect(fetchStationJson('/test-errors')).rejects.toThrow('invalid-response')
    await expect(fetchStationJson('/test-errors')).rejects.toThrow('unavailable')
    await expect(fetchStationJson('/test-errors')).rejects.toThrow('offline')
  })
})

describe('geolocation and manual fallback', () => {
  it('reads a single position with a timeout and no continuous tracking', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback, _error?: PositionErrorCallback | null, _options?: PositionOptions) => success({ coords: point } as GeolocationPosition))
    expect(await currentLocation({ getCurrentPosition } as unknown as Geolocation)).toEqual(point)
    expect(getCurrentPosition.mock.calls[0][2]).toEqual({ enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 })
  })
  it.each([[1, 'denied'], [2, 'unavailable'], [3, 'timeout']])('handles geolocation error %s', async (code, reason) => {
    const geo = { getCurrentPosition: (_success: unknown, failure: (error: { code: number | string }) => void) => failure({ code }) }
    await expect(currentLocation(geo as Geolocation)).rejects.toMatchObject({ reason })
  })
  it('handles missing browser support and validates manual coordinates', async () => {
    await expect(currentLocation()).rejects.toMatchObject({ reason: 'unavailable' })
    expect(manualLocation('45.5', '-73.56')).toEqual(point)
    expect(manualLocation('', '0')).toBeNull()
    expect(manualLocation('0', '0')).toEqual({ latitude: 0, longitude: 0 })
    expect(manualLocation('91', '0')).toBeNull()
  })
})

describe('fuel draft integration', () => {
  const selection = (): StationSelection => ({ station: station(), fuelType: 'regular', fetchedAt: Date.now() })
  it('populates station/price, calculates total and protects manually entered prices', () => {
    const amounts = { liters: '40', pricePerLiter: '', totalCost: '' }
    expect(applyStationSelection(amounts, selection(), false, 'CAD')).toMatchObject({ station: row.name, pricePerLiter: '1.649', totalCost: '65.96', fuelType: 'regular' })
    expect(applyStationSelection({ ...amounts, pricePerLiter: '1.500', totalCost: '60.00' }, selection(), true, 'CAD')).toMatchObject({ pricePerLiter: '1.500', totalCost: '60.00' })
    expect(calculateFuelTotal('40', '1.500')).toBe('60.00')
    expect(calculateFuelTotal('', '1.500')).toBe('')
  })
  it('clears old suggestions for missing prices, expired results, or currency mismatches', () => {
    const amounts = { liters: '40', pricePerLiter: '1.649', totalCost: '65.96' }
    expect(applyStationSelection(amounts, { ...selection(), fuelType: 'midGrade' }, false, 'CAD').pricePerLiter).toBe('')
    expect(applyStationSelection(amounts, selection(), false, 'USD').pricePerLiter).toBe('')
    expect(applyStationSelection(amounts, { ...selection(), fetchedAt: Date.now() - stationConfig.cacheMs }, false, 'CAD').pricePerLiter).toBe('')
  })
})
