import type { CarVaultData } from '../types'

export const soldVehicleMessage = 'This vehicle is sold. New records and imports are disabled. Its history remains available.'

export function assertVehicleAcceptsRecords(data: CarVaultData, vehicleId: string): void {
  if (data.vehicles.find(vehicle => vehicle.id === vehicleId)?.isSold) {
    throw new Error(soldVehicleMessage)
  }
}

/** Existing history can be corrected; new records and transfers into sold cars cannot. */
export function validateVehicleRecordAdditions(before: CarVaultData, after: CarVaultData): void {
  const kinds = ['fuelEntries', 'chargingEntries', 'expenses', 'maintenanceRecords', 'reminders', 'documents'] as const
  for (const kind of kinds) {
    const previous = new Map(before[kind].map(record => [record.id, record.vehicleId]))
    for (const record of after[kind]) {
      if (previous.get(record.id) !== record.vehicleId) {
        assertVehicleAcceptsRecords(before, record.vehicleId)
      }
    }
  }
}
