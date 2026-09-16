import type { FuelType } from './vehicle'

export interface FuelEntry {
  id: string
  vehicleId: string
  date: string
  odometer: number
  liters: number
  pricePerLiter: number
  totalCost: number
  fuelType?: FuelType | string
  station?: string
  fullTank: boolean
  missedPreviousFillUp?: boolean
  notes?: string
  createdAt: string
  /** Original Drivvo columns preserve time, driver, payment and other CSV-only fields. */
  drivvo?: { columns: string[] }
}

export type ChargingLocationType = 'home' | 'public'
export type ChargingSpeedType = 'Level 1' | 'Level 2' | 'DC Fast' | 'Other'

export interface ChargingEntry {
  id: string
  vehicleId: string
  date: string
  odometer: number
  kwh: number
  pricePerKwh: number
  totalCost: number
  chargingLocation?: string
  locationType?: ChargingLocationType
  chargingType?: ChargingSpeedType
  notes?: string
  createdAt: string
}

export interface FuelConsumptionStat {
  entryId: string
  distanceKm: number
  liters: number
  lPer100Km: number
  costPerKm: number
}

