import { describe, expect, it } from 'vitest'
import { formatChargingDuration, parseChargingDetails } from './charging'

const blank = { startBatteryPercent: '', durationMinutes: '', powerKw: '', equipment: '', company: '', chargingAddress: '', chargingLocation: '' }

describe('charging details', () => {
  it('treats blank input as absent', () => {
    expect(parseChargingDetails(blank)).toEqual({ ok: true, details: {
      startBatteryPercent: undefined, durationMinutes: undefined, powerKw: undefined,
      equipment: undefined, company: undefined, chargingAddress: undefined } })
  })
  it('flags the first invalid field', () => {
    expect(parseChargingDetails({ ...blank, startBatteryPercent: '101' })).toEqual({ ok: false, field: 'startBatteryPercent' })
    expect(parseChargingDetails({ ...blank, durationMinutes: '0' })).toEqual({ ok: false, field: 'durationMinutes' })
    expect(parseChargingDetails({ ...blank, durationMinutes: '1000000000000' })).toEqual({ ok: false, field: 'durationMinutes' })
    expect(parseChargingDetails({ ...blank, powerKw: 'abc' })).toEqual({ ok: false, field: 'powerKw' })
    expect(parseChargingDetails({ ...blank, powerKw: '1000000000000' })).toEqual({ ok: false, field: 'powerKw' })
    expect(parseChargingDetails({ ...blank, company: 'a'.repeat(10001) })).toEqual({ ok: false, field: 'company' })
    expect(parseChargingDetails({ ...blank, chargingLocation: 'a'.repeat(10001) })).toEqual({ ok: false, field: 'chargingLocation' })
  })
  it('formats durations', () => {
    expect(formatChargingDuration(45)).toBe('45 min')
    expect(formatChargingDuration(60)).toBe('1 h')
    expect(formatChargingDuration(95)).toBe('1 h 35 min')
  })
})
