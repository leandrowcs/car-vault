import type { CarVaultData } from '../types'

export function exportVaultToJson(data: CarVaultData): void {
  const exportPayload: CarVaultData = {
    ...data,
    exportedAt: new Date().toISOString(),
  }

  const jsonStr = JSON.stringify(exportPayload, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const today = new Date().toISOString().slice(0, 10)
  const link = document.createElement('a')
  link.href = url
  link.download = `car-vault-backup-${today}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function parseAndValidateVaultJson(jsonString: string): {
  success: boolean
  data?: CarVaultData
  error?: string
} {
  try {
    const parsed = JSON.parse(jsonString) as Partial<CarVaultData>

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON file structure.' }
    }

    if (!Array.isArray(parsed.vehicles)) {
      return {
        success: false,
        error: 'Invalid Car Vault backup: "vehicles" array is missing.',
      }
    }

    const validatedData: CarVaultData = {
      version: parsed.version || 1,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
      fuelEntries: Array.isArray(parsed.fuelEntries) ? parsed.fuelEntries : [],
      chargingEntries: Array.isArray(parsed.chargingEntries)
        ? parsed.chargingEntries
        : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      maintenanceRecords: Array.isArray(parsed.maintenanceRecords)
        ? parsed.maintenanceRecords
        : [],
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      settings: parsed.settings || {
        currency: 'CAD',
        distanceUnit: 'km',
        volumeUnit: 'L',
        fuelEconomyUnit: 'L/100km',
        evEconomyUnit: 'kWh/100km',
        dateFormat: 'YYYY-MM-DD',
        activeVehicleId: parsed.vehicles[0]?.id || null,
      },
    }

    return { success: true, data: validatedData }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to parse JSON file.',
    }
  }
}

