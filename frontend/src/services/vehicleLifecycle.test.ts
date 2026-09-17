import { describe, expect, it } from 'vitest'
import { initialVaultData } from './storage'
import { validateVehicleRecordAdditions } from './vehicleLifecycle'
import { encodeVault, decodeVault } from './vaultRecords'

describe('sold vehicle record policy', () => {
  const base = () => ({ ...structuredClone(initialVaultData), vehicles: [{ id: 'sold', name: 'Car', make: 'Example', model: 'Car', year: 2020, fuelType: 'gasoline' as const, currentOdometer: 1000, isSold: true, createdAt: '', updatedAt: '' }] })

  it.each(['fuelEntries', 'chargingEntries', 'expenses', 'maintenanceRecords', 'reminders', 'documents'] as const)('blocks new %s records and transfers into a sold vehicle', kind => {
    const before = base()
    const after = structuredClone(before)
    // The policy checks identity and ownership; field validation belongs to encodeVault.
    Object.assign(after, { [kind]: [{ id: 'entry', vehicleId: 'sold' }] })
    expect(() => validateVehicleRecordAdditions(before, after)).toThrow('sold')
    Object.assign(before, { [kind]: [{ id: 'entry', vehicleId: 'another' }] })
    expect(() => validateVehicleRecordAdditions(before, after)).toThrow('sold')
    Object.assign(before, { [kind]: [{ id: 'entry', vehicleId: 'sold' }] })
    expect(() => validateVehicleRecordAdditions(before, after)).not.toThrow()
  })

  it('round-trips sold status and rejects malformed status', () => {
    const data = base()
    expect(decodeVault(encodeVault(data)).vehicles[0].isSold).toBe(true)
    Object.assign(data.vehicles[0], { isSold: 'yes' })
    expect(() => encodeVault(data)).toThrow()
  })

  it('can restore a sold vehicle and its historic records into an empty garage', () => {
    const backup = base()
    backup.documents.push({ id: 'd', vehicleId: 'sold', title: 'Registration', category: 'other', createdAt: '' })
    expect(() => validateVehicleRecordAdditions(structuredClone(initialVaultData), backup)).not.toThrow()
  })
})
