import type { CarVaultData } from '../types'
import { DEFAULT_SETTINGS } from '../types/settings'

const STORAGE_KEY = 'car_vault_data_v1'
const CURRENT_SCHEMA_VERSION = 1

export const initialVaultData: CarVaultData = {
  version: CURRENT_SCHEMA_VERSION,
  vehicles: [],
  fuelEntries: [],
  chargingEntries: [],
  expenses: [],
  maintenanceRecords: [],
  reminders: [],
  documents: [],
  settings: DEFAULT_SETTINGS,
}

export class CarVaultStorage {
  static load(): CarVaultData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return initialVaultData
      }
      const parsed = JSON.parse(raw) as Partial<CarVaultData>

      return {
        version: parsed.version || CURRENT_SCHEMA_VERSION,
        vehicles: parsed.vehicles || [],
        fuelEntries: parsed.fuelEntries || [],
        chargingEntries: parsed.chargingEntries || [],
        expenses: parsed.expenses || [],
        maintenanceRecords: parsed.maintenanceRecords || [],
        reminders: parsed.reminders || [],
        documents: parsed.documents || [],
        settings: {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings || {}),
        },
      }
    } catch (err) {
      console.error('CarVaultStorage.load failed, returning initial state:', err)
      return initialVaultData
    }
  }

  static save(data: CarVaultData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  static clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      console.error('CarVaultStorage.clear failed:', err)
    }
  }
}

