import { stationConfig } from './config'

const blockedUntil = new Map<string, number>()
export class StationServiceError extends Error {
  constructor(public readonly code: 'unavailable' | 'rate-limit' | 'invalid-response') {
    super(code)
  }
}
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {}
}
export function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
export function timestamp(value: unknown): string | undefined {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : undefined
}
export async function fetchStationJson(url: string, init?: RequestInit): Promise<unknown> {
  const provider = url.split('?')[0]
  if ((blockedUntil.get(provider) ?? 0) > Date.now()) throw new StationServiceError('rate-limit')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), stationConfig.requestTimeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, credentials: 'omit', cache: 'no-store' })
    if (response.status === 429) {
      const retry = response.headers.get('Retry-After')
      const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : NaN
      const until = Number.isFinite(seconds) ? Date.now() + seconds * 1000 : Date.parse(retry ?? '')
      blockedUntil.set(provider, Math.max(Date.now() + 60_000, Number.isFinite(until) ? until : 0))
      throw new StationServiceError('rate-limit')
    }
    if (!response.ok) throw new StationServiceError('unavailable')
    try { return await response.json() }
    catch { throw new StationServiceError('invalid-response') }
  } finally { clearTimeout(timer) }
}
