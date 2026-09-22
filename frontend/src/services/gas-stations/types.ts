export type StationFuelType = 'regular' | 'midGrade' | 'premium' | 'diesel'
export type StationSort = 'distance' | 'price'
export interface Coordinates { latitude: number; longitude: number }
export interface FuelPrice {
  pricePerLiter: number
  currency: string
  updatedAt?: string
}
export interface GasStation extends Coordinates {
  id: string
  name: string
  brand?: string
  address?: string
  openingHours?: string
  distanceKm?: number
  prices: Partial<Record<StationFuelType, FuelPrice>>
  source: string
  sourceUrl: string
  attribution: string
  lastUpdated?: string
}
export interface StationQuery extends Coordinates {
  radiusKm: number
  fuelType: StationFuelType
  sort: StationSort
}
export interface StationResults {
  stations: GasStation[]
  fetchedAt: number
  notice?: string
}
export interface StationSelection {
  station: GasStation
  fuelType: StationFuelType
  fetchedAt: number
}
export const fuelTypes: Record<StationFuelType, string> = {
  regular: 'Regular', midGrade: 'Mid-grade', premium: 'Premium', diesel: 'Diesel',
}
