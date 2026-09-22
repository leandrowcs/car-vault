import { afterEach, expect, it, vi } from 'vitest'
import proxy, { nearbyParameters } from '../../../server/gasQuebecProxy'

const valid = '/api/gas-stations?lat=45.5&lng=-73.56&radius=5&fuelType=ordinaire&sort=distance'
afterEach(() => vi.unstubAllGlobals())
it('validates query bounds and never accepts an arbitrary upstream URL or result limit', () => {
  expect(nearbyParameters(valid + '&limit=500&url=https://example.com')?.get('limit')).toBe('10')
  expect(nearbyParameters(valid)?.has('url')).toBe(false)
  for (const url of [valid.replace('45.5', 'NaN'), valid.replace('radius=5', 'radius=200'), valid.replace('ordinaire', 'midGrade'), '/?lat=1', valid.replace('-73.56', '0')]) expect(nearbyParameters(url)).toBeNull()
})
it('uses only the fixed public endpoint and returns no-store responses', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"stations":[]}'))
  vi.stubGlobal('fetch', fetch)
  const response = { statusCode: 0, setHeader: vi.fn(), end: vi.fn() }
  await proxy({ method: 'GET', url: valid }, response)
  expect(fetch.mock.calls[0][0]).toMatch(/^https:\/\/www.gasquebec.ca\/api\/stations\/nearby\?/)
  expect(response.statusCode).toBe(200)
  expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
  expect(response.end).toHaveBeenCalledWith('{"stations":[]}')
})
it('rejects mutation requests and sanitizes upstream failures', async () => {
  const fetch = vi.fn().mockRejectedValue(new Error('private upstream error'))
  vi.stubGlobal('fetch', fetch)
  const response = { statusCode: 0, setHeader: vi.fn(), end: vi.fn() }
  await proxy({ method: 'POST', url: valid }, response)
  expect(response.statusCode).toBe(405)
  expect(fetch).not.toHaveBeenCalled()
  await proxy({ method: 'GET', url: valid }, response)
  expect(response.statusCode).toBe(502)
  expect(response.end).toHaveBeenLastCalledWith('{"error":"Price service unavailable"}')
})
