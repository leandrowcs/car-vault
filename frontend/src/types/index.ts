export * from './vehicle'
export * from './fuel'
export * from './expense'
export * from './maintenance'
export * from './reminder'
export * from './document'
export * from './settings'

export interface CarVaultData {
  version: number
  exportedAt?: string
  vehicles: import('./vehicle').Vehicle[]
  fuelEntries: import('./fuel').FuelEntry[]
  chargingEntries: import('./fuel').ChargingEntry[]
  expenses: import('./expense').Expense[]
  maintenanceRecords: import('./maintenance').MaintenanceRecord[]
  reminders: import('./reminder').Reminder[]
  documents: import('./document').VehicleDocument[]
  settings: import('./settings').UserSettings
}

