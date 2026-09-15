export type FuelType =
  | 'gasoline'
  | 'diesel'
  | 'hybrid'
  | 'plug-in-hybrid'
  | 'electric'
  | 'other'

export type Transmission =
  | 'automatic'
  | 'manual'
  | 'cvt'
  | 'dual-clutch'
  | 'single-speed'
  | 'other'

export interface Vehicle {
  id: string
  name: string
  make: string
  model: string
  year: number
  trim?: string
  vin?: string
  licensePlate?: string
  fuelType: FuelType
  transmission?: Transmission
  currentOdometer: number
  purchaseDate?: string
  purchasePrice?: number
  notes?: string
  photoUrl?: string
  isPrimary?: boolean
  createdAt: string
  updatedAt: string
}

