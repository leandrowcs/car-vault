export const DEFAULT_MAINTENANCE_CATEGORIES = [
  'Oil Change',
  'Tires',
  'Winter Tire Installation',
  'Summer Tire Installation',
  'Brakes',
  'Battery',
  'Filters',
  'Alignment',
  'Inspection',
  'Repair',
  'Scheduled Maintenance',
  'Other'
] as const

export type MaintenanceCategory = (typeof DEFAULT_MAINTENANCE_CATEGORIES)[number] | string

export interface MaintenanceRecord {
  id: string
  vehicleId: string
  date: string
  odometer: number
  category: MaintenanceCategory
  description: string
  cost: number
  serviceProvider?: string
  partsCost?: number
  laborCost?: number
  receiptUrl?: string
  notes?: string
  createdAt: string
}

