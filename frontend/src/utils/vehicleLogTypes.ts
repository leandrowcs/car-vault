import type { FuelType } from '../types/vehicle'

export type VehicleLogType = 'fuel' | 'charging'

export const getVehicleLogTypes = (fuelType: FuelType): VehicleLogType[] => {
  if (fuelType === 'electric') return ['charging']
  if (fuelType === 'plug-in-hybrid') return ['fuel', 'charging']
  return ['fuel']
}
