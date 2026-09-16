import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DRIVVO_HEADERS, mergeDrivvoImport, parseCsv, parseDrivvoCsv, prepareDrivvoImport, serializeDrivvoCsv, type VehicleMapping } from './drivvoCsv'
import { initialVaultData } from './storage'
import { encodeVault } from './vaultRecords'

const empty = () => structuredClone(initialVaultData)
const vehicleName = 'Example Hybrid 2026'
const mapping: VehicleMapping = { source: vehicleName, existingId: '', make: 'Example', model: 'Hybrid', year: 2026, fuelType: 'hybrid' }
const cell = (value: string) => /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
function row(patch: Partial<Record<number, string>> = {}): string[] {
  const columns = Array<string>(30).fill('')
  Object.assign(columns, { 0: '1234', 1: '2026-09-15 9:05', 2: 'Gas. Comum', 3: '1.969', 4: '89.643', 5: '45.527', 6: 'Sim',
    8: '0', 9: '0', 10: '0', 11: 'Não', 13: '0', 14: '0', 15: '0', 16: 'Não', 23: 'Example station', 24: 'Example driver', 26: 'Credit', 28: '0', 29: vehicleName }, patch)
  return columns
}
const file = (...rows: string[][]) => '\uFEFF' + [['##Refuelling', ...Array<string>(29).fill('')], DRIVVO_HEADERS, ...rows].map(values => values.map(cell).join(',')).join('\r\n')

describe('Drivvo refuelling CSV', () => {
  it('parses accents, quoted commas, newlines, quotes, BOM and precise decimals', () => {
    const preview = parseDrivvoCsv(file(row({ 23: 'Station, East', 27: 'First line\nSecond "quoted" line', 6: 'Não' })))
    expect(preview.rows[0].entry).toMatchObject({ date: '2026-09-15', odometer: 1234, liters: 45.527, totalCost: 89.643,
      fullTank: false, station: 'Station, East', notes: 'First line\nSecond "quoted" line' })
  })

  it('supports semicolon CSV and comma decimal values', () => {
    const text = [['##Refuelling', ...Array<string>(29).fill('')], DRIVVO_HEADERS, row({ 3: '1,969', 4: '89,643', 5: '45,527' })].map(values => values.join(';')).join('\n')
    expect(parseDrivvoCsv(text).totalCost).toBe(89.643)
  })

  it.each([{ 1: '2026-02-30 10:00' }, { 1: '2026-09-15 24:00' }, { 0: '-5' }, { 5: '0' }, { 3: 'NaN' }, { 6: 'Maybe' }, { 29: '' }])('rejects invalid data atomically: %j', patch => {
    expect(() => parseDrivvoCsv(file(row(), row(patch)))).toThrow()
  })

  it('rejects malformed quoting and unknown sections instead of silently discarding data', () => {
    expect(() => parseCsv('"unclosed')).toThrow('Unclosed')
    expect(() => parseCsv('"closed"trailing')).toThrow('Invalid')
    expect(() => parseDrivvoCsv(file(row(), ['##Expenses']))).toThrow('other sections')
    expect(() => parseDrivvoCsv(file(row({ 7: 'Ethanol', 10: '5' })))).toThrow('multiple fuels')
    expect(() => parseDrivvoCsv(file(row({ 19: 'Level 2' })))).toThrow('EV charging')
  })

  it('does not deduplicate distinct fill-ups and reimport never duplicates or lowers the odometer', async () => {
    const preview = parseDrivvoCsv(file(row(), row(), row({ 0: '1800', 1: '2026-09-16 10:00' })))
    const incoming = await prepareDrivvoImport(preview, [mapping], empty())
    expect(incoming.fuelEntries).toHaveLength(2)
    const merged = mergeDrivvoImport(empty(), incoming)
    expect(merged.vehicles[0].currentOdometer).toBe(1800)
    merged.vehicles[0].currentOdometer = 9000
    merged.fuelEntries[0].notes = 'My newer note'
    const repeated = mergeDrivvoImport(merged, await prepareDrivvoImport(preview, [{ ...mapping, existingId: merged.vehicles[0].id }], merged))
    expect(repeated.fuelEntries).toHaveLength(2)
    expect(repeated.fuelEntries[0].notes).toBe('My newer note')
    expect(repeated.vehicles[0].currentOdometer).toBe(9000)
  })

  it('matches manually entered records by business values, even with different IDs', async () => {
    const incoming = await prepareDrivvoImport(parseDrivvoCsv(file(row())), [mapping], empty())
    const existing = structuredClone(incoming)
    existing.fuelEntries[0].id = 'manual-id'
    expect(mergeDrivvoImport(existing, incoming).fuelEntries.map(entry => entry.id)).toEqual(['manual-id'])
  })

  it('preserves original time, driver, payment, notes and precision across export/import', async () => {
    const preview = parseDrivvoCsv(file(row({ 27: 'A note, with "quotes"' })))
    const data = await prepareDrivvoImport(preview, [mapping], empty())
    const csv = serializeDrivvoCsv(data)
    const restored = parseDrivvoCsv(csv)
    expect(restored.rows[0].entry.drivvo?.columns[1]).toBe('2026-09-15 9:05')
    expect(restored.rows[0].entry.drivvo?.columns[24]).toBe('Example driver')
    expect(restored.rows[0].entry.drivvo?.columns[26]).toBe('Credit')
    expect(restored.totalCost).toBe(preview.totalCost)
    expect(restored.totalLiters).toBe(preview.totalLiters)
    expect(restored.rows[0].entry.notes).toBe(preview.rows[0].entry.notes)
    expect(encodeVault(data).size).toBe(3)
  })

  it('exports current edited fields and does not reuse stale averages', async () => {
    const data = await prepareDrivvoImport(parseDrivvoCsv(file(row({ 17: '12 km/L' }))), [mapping], empty())
    Object.assign(data.fuelEntries[0], { date: '2026-09-16', liters: 40, totalCost: 80, station: 'New station' })
    const output = parseDrivvoCsv(serializeDrivvoCsv(data)).rows[0].entry
    expect(output).toMatchObject({ date: '2026-09-16', liters: 40, totalCost: 80, station: 'New station' })
    expect(output.drivvo?.columns[17]).toBe('')
  })

  it('neutralizes spreadsheet formulas when exporting untrusted text', async () => {
    const data = await prepareDrivvoImport(parseDrivvoCsv(file(row({ 23: '=HYPERLINK("example")', 27: '+SUM(1,2)' }))), [mapping], empty())
    const cells = parseCsv(serializeDrivvoCsv(data))[2]
    expect(cells[23]).toBe('\'=HYPERLINK("example")')
    expect(cells[27]).toBe("'+SUM(1,2)")
  })

  it('requires complete vehicle details and never replaces unrelated data', async () => {
    const preview = parseDrivvoCsv(file(row()))
    await expect(prepareDrivvoImport(preview, [{ ...mapping, year: 0 }], empty())).rejects.toThrow('year')
    const current = empty()
    current.settings.currency = 'EUR'
    const incoming = await prepareDrivvoImport(preview, [mapping], current)
    expect(mergeDrivvoImport(current, incoming).settings.currency).toBe('EUR')
  })
})

// Optional private acceptance sample: the user's CSV is never copied into the repository.
it.skipIf(!process.env.DRIVVO_SAMPLE_FILE)('imports the supplied Drivvo sample without precision loss', async () => {
  const text = readFileSync(process.env.DRIVVO_SAMPLE_FILE!, 'utf8')
  const source = parseCsv(text).slice(2)
  const preview = parseDrivvoCsv(text)
  expect(preview.rows).toHaveLength(source.length)
  expect(preview.totalLiters).toBeCloseTo(source.reduce((sum, row) => sum + Number(row[5].replace(',', '.')), 0), 6)
  expect(preview.totalCost).toBeCloseTo(source.reduce((sum, row) => sum + Number(row[4].replace(',', '.')), 0), 6)
  expect(preview.rows.filter(row => !row.entry.fullTank)).toHaveLength(source.filter(row => row[6] === 'Não').length)
  const incoming = await prepareDrivvoImport(preview, preview.vehicles.map(source => ({ ...mapping, source })), empty())
  expect(Math.max(...incoming.vehicles.map(vehicle => vehicle.currentOdometer))).toBe(Math.max(...source.map(row => Number(row[0]))))
  const roundTrip = parseDrivvoCsv(serializeDrivvoCsv(incoming))
  expect(roundTrip.totalCost).toBeCloseTo(preview.totalCost, 6)
  expect(roundTrip.rows).toHaveLength(incoming.fuelEntries.length)
})
