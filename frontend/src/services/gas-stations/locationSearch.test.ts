import { afterEach, expect, it, vi } from 'vitest'
import { LocationSearchService, normalizeLocations } from './locationSearch'
import proxy, { locationParameters } from '../../../server/locationSearchProxy'

const response = { features: [{ geometry: { type: 'Point', coordinates: [-71.889, 45.403] },
  properties: { name: 'Sherbrooke', city: 'Sherbrooke', state: 'Québec', country: 'Canada' } }] }
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals() })
it('normalizes city results with an unambiguous label and longitude/latitude order', () => {
  expect(normalizeLocations(response)[0]).toMatchObject({ latitude: 45.403, longitude: -71.889, label: 'Sherbrooke, Québec, Canada' })
  expect(normalizeLocations(response)[0].attribution).toContain('OpenStreetMap')
  expect(normalizeLocations({ features: [...response.features, ...response.features] })).toHaveLength(1)
})
it('supports postcode results without OSM identifiers and rejects invalid locations', () => {
  expect(normalizeLocations({ features: [{ ...response.features[0], properties: { name: 'J1H 5N4', city: 'Sherbrooke', postcode: 'J1H 5N4' } }] })[0].label).toBe('J1H 5N4, Sherbrooke')
  expect(normalizeLocations({ features: [] })).toEqual([])
  expect(() => normalizeLocations({ error: 'bad' })).toThrow('invalid-response')
  expect(() => normalizeLocations({ features: [{ ...response.features[0], geometry: { type: 'Point', coordinates: [0, 200] } }] })).toThrow('invalid-response')
})
it('deduplicates explicit searches, caches temporarily and retries failures', async () => {
  vi.useFakeTimers()
  const provider = { search: vi.fn().mockResolvedValue(normalizeLocations(response)) }
  const service = new LocationSearchService(provider)
  await Promise.all([service.search('Sherbrooke'), service.search(' Sherbrooke ')])
  await service.search('sherbrooke')
  expect(provider.search).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(300_000)
  await service.search('Sherbrooke')
  expect(provider.search).toHaveBeenCalledTimes(2)
  provider.search.mockRejectedValue(new Error('offline'))
  await expect(service.search('Montréal')).rejects.toThrow('offline')
  await expect(service.search('Montréal')).rejects.toThrow('offline')
  expect(provider.search).toHaveBeenCalledTimes(4)
  await expect(service.search(' ')).rejects.toThrow()
})
it('normalizes Canadian postal codes, encodes queries and never accepts upstream URLs', () => {
  expect(locationParameters('/?q=j1h5n4')?.get('q')).toBe('J1H 5N4')
  expect(locationParameters('/?q=Sherbrooke%20QC&url=https://example.com')?.has('url')).toBe(false)
  expect(locationParameters('/?q=Montr%C3%A9al')?.get('q')).toBe('Montréal')
  expect(locationParameters('/?q=')).toBeNull()
  expect(locationParameters('/?q=' + 'a'.repeat(121))).toBeNull()
})
it('serves the fixed geocoding endpoint without browser credentials or persistent caching', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)))
  vi.stubGlobal('fetch', fetch)
  const res = { statusCode: 0, setHeader: vi.fn(), end: vi.fn() }
  await proxy({ method: 'GET', url: '/?q=j1h5n4' }, res)
  expect(fetch.mock.calls[0][0]).toBe('https://photon.komoot.io/api/?q=J1H+5N4&limit=5&lang=en')
  expect(res.statusCode).toBe(200)
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
  await proxy({ method: 'POST', url: '/?q=city' }, res)
  expect(res.statusCode).toBe(405)
  expect(fetch).toHaveBeenCalledTimes(1)
})
