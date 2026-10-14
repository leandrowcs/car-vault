import { describe, expect, it } from 'vitest'
import { isVaultRecord } from './vaultValidation'

const base = {
  id: 'c1', vehicleId: 'v1', date: '2026-01-01', odometer: 100, kwh: 20, pricePerKwh: 0.2, totalCost: 4, createdAt: '2026-01-01',
}
const charge = (extra: Record<string, unknown> = {}) => ({ kind: 'chargingEntries', value: { ...base, ...extra } })

describe('charging record validation', () => {
  it('accepts legacy charging records without the new fields', () => {
    expect(isVaultRecord('chargingEntries~c1', charge({ chargingLocation: 'Home', locationType: 'home', chargingType: 'Level 2' }))).toBe(true)
  })

  it('accepts structured charging details including boundary values', () => {
    const details = { company: 'Op', equipment: 'CCS', chargingAddress: '1 Main St', startBatteryPercent: 0, durationMinutes: 30, powerKw: 0 }
    expect(isVaultRecord('chargingEntries~c1', charge(details))).toBe(true)
    expect(isVaultRecord('chargingEntries~c1', charge({ startBatteryPercent: 100 }))).toBe(true)
  })

  it.each([
    { startBatteryPercent: -1 }, { startBatteryPercent: 101 }, { startBatteryPercent: '50' }, { startBatteryPercent: NaN },
    { durationMinutes: 0 }, { durationMinutes: -5 }, { durationMinutes: '30' },
    { durationMinutes: 1_000_000_000_000 }, { powerKw: 1_000_000_000_000 },
    { powerKw: -1 }, { powerKw: Infinity }, { powerKw: '7' },
    { company: 1 }, { equipment: null }, { chargingAddress: {} },
    { company: 'a'.repeat(10_001) }, { equipment: 'a'.repeat(10_001) }, { chargingAddress: 'a'.repeat(10_001) },
    { chargingLocation: 'a'.repeat(10_001) },
  ])('rejects invalid details %j', extra => {
    expect(isVaultRecord('chargingEntries~c1', charge(extra))).toBe(false)
  })
})
