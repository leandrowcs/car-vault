import type { VaultRecord } from './vaultRecords'

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isVaultRecord(id: string, record: unknown): record is VaultRecord {
  if (!object(record) || !object(record.value)) return false
  const value = record.value
  if ('drivvo' in value && (!object(value.drivvo) || !Array.isArray(value.drivvo.columns) ||
      value.drivvo.columns.length !== 30 || value.drivvo.columns.some(cell => typeof cell !== 'string' || cell.length > 10000))) return false
  const optionalStrings = ['notes', 'trim', 'vin', 'licensePlate', 'transmission', 'purchaseDate', 'photoUrl', 'station', 'fuelType', 'chargingLocation', 'locationType', 'chargingType', 'vendor', 'receiptUrl', 'serviceProvider', 'dueDate', 'completedAt', 'category', 'documentNumber', 'issueDate', 'expiryDate', 'fileReference']
  const optionalNumbers = ['odometer', 'purchasePrice', 'partsCost', 'laborCost', 'dueMileage', 'targetOdometer']
  if (optionalStrings.some(key => key in value && typeof value[key] !== 'string') ||
      optionalNumbers.some(key => key in value && (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || Number(value[key]) < 0)) ||
      ['isPrimary', 'isSold', 'missedPreviousFillUp'].some(key => key in value && typeof value[key] !== 'boolean')) return false
  const strings = (...keys: string[]) => keys.every(key => typeof value[key] === 'string')
  const numbers = (...keys: string[]) => keys.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]) && Number(value[key]) >= 0)
  if (record.kind === 'settings') {
    return id === 'settings' && strings('currency') && /^[A-Z]{3}$/.test(String(value.currency)) &&
      ['km', 'mi'].includes(String(value.distanceUnit)) &&
      ['L', 'gal'].includes(String(value.volumeUnit)) &&
      ['L/100km', 'mpg-us', 'mpg-uk', 'km/L'].includes(String(value.fuelEconomyUnit)) &&
      ['kWh/100km', 'mi/kWh', 'km/kWh'].includes(String(value.evEconomyUnit)) &&
      ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'].includes(String(value.dateFormat)) &&
      (value.activeVehicleId === null || typeof value.activeVehicleId === 'string')
  }
  if (!strings('id', 'createdAt') || id !== `${record.kind}~${value.id}`) return false
  if (record.kind === 'vehicles') return strings('name', 'make', 'model', 'updatedAt') && numbers('year', 'currentOdometer') &&
    ['gasoline', 'diesel', 'hybrid', 'plug-in-hybrid', 'electric', 'other'].includes(String(value.fuelType))
  if (!strings('vehicleId')) return false
  switch (record.kind) {
    case 'fuelEntries': return strings('date') && numbers('odometer', 'liters', 'pricePerLiter', 'totalCost') && typeof value.fullTank === 'boolean'
    case 'chargingEntries': return strings('date') && numbers('odometer', 'kwh', 'pricePerKwh', 'totalCost')
    case 'expenses': return strings('date', 'category', 'description') && numbers('amount')
    case 'maintenanceRecords': return strings('date', 'category', 'description') && numbers('odometer', 'cost')
    case 'reminders': return strings('title') && ['date', 'mileage', 'both'].includes(String(value.type)) && typeof value.isCompleted === 'boolean'
    case 'documents': return strings('title', 'category')
    default: return false
  }
}
