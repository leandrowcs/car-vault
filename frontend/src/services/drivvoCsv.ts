import type { CarVaultData, FuelEntry, Vehicle } from '../types'
import { initialVaultData } from './storage'
import { encodeVault } from './vaultRecords'
import { downloadFile } from './exportImport'
import { assertVehicleAcceptsRecords } from './vehicleLifecycle'

export const DRIVVO_HEADERS = ['Odômetro (km)', 'Data', 'Combustível', 'Preço / L', 'Valor total', 'Volume', 'Completou o tanque', 'Segundo combustível', 'Preço / L', 'Valor total', 'Volume', 'Completou o tanque 2', 'Terceiro combustível', 'Preço / L', 'Valor total', 'Volume', 'Completou o tanque 3', 'Média', 'Distância', 'Tipo de recarga', 'Bateria inicial (%)', 'Bateria final (%)', 'Duração (min)', 'Posto de combustível', 'Motorista', 'Motivo', 'Forma de pagamento', 'Observação', 'Desconto', 'Veiculo']
const normalize = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Quoted separators, escaped quotes, CRLF and multiline fields. No evaluation of cell content. */
export function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, '')
  const delimiter = text.slice(0, text.indexOf('\n') < 0 ? undefined : text.indexOf('\n')).includes(';') ? ';' : ','
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false, closed = false
  const push = () => { row.push(cell); cell = ''; closed = false }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ }
        else { quoted = false; closed = true }
      } else cell += c
    } else if (c === delimiter) push()
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++
      push(); rows.push(row); row = []
    } else if (c === '"' && cell === '' && !closed) quoted = true
    else {
      if (closed || c === '"') throw new Error('Invalid CSV quoting.')
      cell += c
    }
  }
  if (quoted) throw new Error('Unclosed quoted field in CSV.')
  if (row.length || cell || closed) { push(); rows.push(row) }
  return rows.filter(values => values.some(value => value.trim()))
}

function numeric(value: string, field: string, line: number): number {
  if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) throw new Error(`Record ${line}: invalid ${field}.`)
  const result = Number(value.trim().replace(',', '.'))
  if (!Number.isFinite(result) || result >= 1e12) throw new Error(`Record ${line}: invalid ${field}.`)
  return result
}

function dateValue(value: string, line: number): string {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(value.trim())
  if (!match || Number(match[2] ?? 0) > 23 || Number(match[3] ?? 0) > 59 || Number(match[4] ?? 0) > 59) throw new Error(`Record ${line}: invalid date/time.`)
  const parsed = new Date(`${match[1]}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== match[1]) throw new Error(`Record ${line}: invalid date.`)
  return match[1]
}

export interface DrivvoRow {
  vehicle: string
  entry: Omit<FuelEntry, 'id' | 'vehicleId' | 'createdAt'>
}
export interface DrivvoPreview { rows: DrivvoRow[]; vehicles: string[]; totalCost: number; totalLiters: number }
export interface VehicleMapping { source: string; existingId: string; make: string; model: string; year: number; fuelType: Vehicle['fuelType'] }

export function parseDrivvoCsv(text: string): DrivvoPreview {
  const csv = parseCsv(text)
  if (csv[0]?.[0] !== '##Refuelling') throw new Error('Expected the Drivvo ##Refuelling section.')
  if (csv[1]?.length !== 30 || csv[1].some((value, i) => normalize(value) !== normalize(DRIVVO_HEADERS[i]))) {
    throw new Error('Unsupported Drivvo columns. Use the Portuguese refuelling export in km and liters.')
  }
  const rows = csv.slice(2).map((columns, index): DrivvoRow => {
    const line = index + 3
    if (columns[0].startsWith('##')) throw new Error('This CSV contains other sections. Import a refuelling-only file; no records were imported.')
    if (columns.length !== 30) throw new Error(`Record ${line}: expected 30 columns.`)
    if (columns.some(value => value.length > 10000)) throw new Error(`Record ${line}: a field exceeds 10,000 characters.`)
    if ([7, 12, 19, 20, 21, 22].some(i => columns[i].trim()) || [8, 9, 10, 13, 14, 15].some(i => columns[i].trim() && numeric(columns[i], 'secondary fuel', line) !== 0)) {
      throw new Error(`Record ${line}: multiple fuels or EV charging are not supported by this CSV importer.`)
    }
    const full = normalize(columns[6])
    if (!['sim', 'nao', 'yes', 'no'].includes(full)) throw new Error(`Record ${line}: invalid full-tank value.`)
    const liters = numeric(columns[5], 'volume', line)
    if (!liters || !columns[29].trim() || !columns[2].trim()) throw new Error(`Record ${line}: vehicle, fuel and positive volume are required.`)
    return { vehicle: columns[29].trim(), entry: {
      date: dateValue(columns[1], line), odometer: numeric(columns[0], 'odometer', line),
      liters, pricePerLiter: numeric(columns[3], 'unit price', line), totalCost: numeric(columns[4], 'total cost', line),
      fuelType: columns[2], fullTank: ['sim', 'yes'].includes(full), station: columns[23], notes: columns[27],
      drivvo: { columns },
    } }
  })
  if (!rows.length) throw new Error('No refuelling records found.')
  return { rows, vehicles: [...new Set(rows.map(row => row.vehicle))],
    totalCost: rows.reduce((sum, row) => sum + row.entry.totalCost, 0), totalLiters: rows.reduce((sum, row) => sum + row.entry.liters, 0) }
}

async function stableId(prefix: string, value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return `${prefix}-${Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')}`
}

// A source file has no IDs; use business values rather than row order or notes.
function signature(entry: Pick<FuelEntry, 'vehicleId' | 'date' | 'odometer' | 'liters' | 'pricePerLiter' | 'totalCost'>): string {
  return JSON.stringify([entry.vehicleId, entry.date.slice(0, 10), entry.odometer, entry.liters, entry.pricePerLiter, entry.totalCost])
}

export async function prepareDrivvoImport(preview: DrivvoPreview, mappings: VehicleMapping[], current: CarVaultData): Promise<CarVaultData> {
  const incoming = structuredClone(initialVaultData)
  const now = new Date().toISOString()
  for (const source of preview.vehicles) {
    const mapping = mappings.find(item => item.source === source)
    if (!mapping) throw new Error(`Choose a vehicle for ${source}.`)
    let vehicle: Vehicle
    if (mapping.existingId) {
      const existing = current.vehicles.find(item => item.id === mapping.existingId)
      if (!existing) throw new Error('The selected vehicle no longer exists. Choose another vehicle.')
      vehicle = { ...existing }
    } else {
      if (!mapping.make.trim() || !mapping.model.trim() || !Number.isInteger(mapping.year) || mapping.year < 1886 || mapping.year > 2200) throw new Error(`Check make, model and year for ${source}.`)
      vehicle = { id: await stableId('drivvo-vehicle', source), name: source, make: mapping.make.trim(), model: mapping.model.trim(),
        year: mapping.year, fuelType: mapping.fuelType, currentOdometer: 0, createdAt: now, updatedAt: now }
    }
    assertVehicleAcceptsRecords(current, vehicle.id)
    for (const row of preview.rows.filter(item => item.vehicle === source)) {
      const entry = { ...row.entry, vehicleId: vehicle.id, createdAt: now }
      incoming.fuelEntries.push({ ...entry, id: await stableId('drivvo-fuel', signature(entry)) })
      vehicle.currentOdometer = Math.max(vehicle.currentOdometer, entry.odometer)
    }
    const previous = incoming.vehicles.find(item => item.id === vehicle.id)
    if (previous) previous.currentOdometer = Math.max(previous.currentOdometer, vehicle.currentOdometer)
    else incoming.vehicles.push(vehicle)
  }
  // Deduplicate identical rows before validation; preserve the first copy.
  const seen = new Set<string>()
  incoming.fuelEntries = incoming.fuelEntries.filter(entry => {
    if (seen.has(entry.id)) return false
    seen.add(entry.id)
    return true
  })
  encodeVault(incoming)
  return incoming
}

export function mergeDrivvoImport(current: CarVaultData, incoming: CarVaultData): CarVaultData {
  for (const vehicle of incoming.vehicles) assertVehicleAcceptsRecords(current, vehicle.id)
  for (const entry of incoming.fuelEntries) assertVehicleAcceptsRecords(current, entry.vehicleId)
  const next = { ...current, vehicles: [...current.vehicles], fuelEntries: [...current.fuelEntries] }
  const known = new Set(current.fuelEntries.map(signature))
  const ids = new Set(current.fuelEntries.map(entry => entry.id))
  for (const vehicle of incoming.vehicles) {
    const index = next.vehicles.findIndex(item => item.id === vehicle.id)
    if (index < 0) next.vehicles.push(vehicle)
    else if (vehicle.currentOdometer > next.vehicles[index].currentOdometer) {
      next.vehicles[index] = { ...next.vehicles[index], currentOdometer: vehicle.currentOdometer, updatedAt: new Date().toISOString() }
    }
  }
  for (const entry of incoming.fuelEntries) {
    if (ids.has(entry.id) || known.has(signature(entry))) continue
    next.fuelEntries.push(entry); ids.add(entry.id); known.add(signature(entry))
  }
  next.settings = { ...current.settings, activeVehicleId: current.settings.activeVehicleId ?? next.vehicles[0]?.id ?? null }
  encodeVault(next)
  return next
}

function csvCell(value: string): string {
  // Quoting alone does not prevent spreadsheet formulas from running on open.
  const safe = /^[\s]*[=+@-]|^[\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function serializeDrivvoCsv(data: CarVaultData): string {
  const lines: string[][] = [['##Refuelling', ...Array<string>(29).fill('')], DRIVVO_HEADERS]
  const vehicles = new Map(data.vehicles.map(vehicle => [vehicle.id, vehicle]))
  for (const entry of [...data.fuelEntries].sort((a, b) => b.date.localeCompare(a.date) || b.odometer - a.odometer)) {
    const vehicle = vehicles.get(entry.vehicleId)
    if (!vehicle) throw new Error('Cannot export a refuelling record without its vehicle.')
    const row = entry.drivvo ? [...entry.drivvo.columns] : Array<string>(30).fill('')
    row[0] = String(entry.odometer)
    row[1] = row[1]?.slice(0, 10) === entry.date.slice(0, 10) ? row[1] : `${entry.date.slice(0, 10)} 00:00`
    row[2] = entry.fuelType ?? vehicle.fuelType
    row[3] = String(entry.pricePerLiter); row[4] = String(entry.totalCost); row[5] = String(entry.liters)
    row[6] = entry.fullTank ? 'Sim' : 'Não'
    row[23] = entry.station ?? ''; row[27] = entry.notes ?? ''; row[29] = vehicle.name || `${vehicle.make} ${vehicle.model} ${vehicle.year}`
    if (!entry.drivvo) {
      for (const i of [8, 9, 10, 13, 14, 15, 28]) row[i] = '0'
      row[11] = 'Não'; row[16] = 'Não'
    }
    // Derived values may be stale after editing a record. Recalculate in the destination app.
    row[17] = ''; row[18] = ''
    lines.push(row)
  }
  return '\uFEFF' + lines.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export function exportDrivvoCsv(data: CarVaultData): void {
  downloadFile(serializeDrivvoCsv(data), `car-vault-${new Date().toISOString().slice(0, 10)}-DRIVVO.csv`, 'text/csv;charset=utf-8')
}
