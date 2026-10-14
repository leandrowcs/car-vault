import type { ChargingEntry } from '../types/fuel'

export type ChargingDetails = Pick<
  ChargingEntry,
  'startBatteryPercent' | 'durationMinutes' | 'powerKw' | 'equipment' | 'company' | 'chargingAddress'
>

export interface ChargingDetailsInput {
  startBatteryPercent: string
  durationMinutes: string
  powerKw: string
  equipment: string
  company: string
  chargingAddress: string
  chargingLocation: string
}

export type ChargingDetailsError = 'startBatteryPercent' | 'durationMinutes' | 'powerKw' | 'equipment' | 'company' | 'chargingAddress' | 'chargingLocation'

const maxFirestoreNumber = 1_000_000_000_000
const maxFirestoreTextLength = 10_000

export type ChargingDetailsResult =
  | { ok: true; details: ChargingDetails }
  | { ok: false; field: ChargingDetailsError }

function optionalNumber(raw: string, valid: (value: number) => boolean): number | undefined | null {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const value = Number(trimmed)
  return Number.isFinite(value) && valid(value) ? value : null
}

function optionalText(raw: string): string | undefined {
  const trimmed = raw.trim()
  return trimmed || undefined
}

export function parseChargingDetails(input: ChargingDetailsInput): ChargingDetailsResult {
  const startBatteryPercent = optionalNumber(input.startBatteryPercent, value => value >= 0 && value <= 100)
  if (startBatteryPercent === null) return { ok: false, field: 'startBatteryPercent' }
  const durationMinutes = optionalNumber(input.durationMinutes, value => value > 0 && value < maxFirestoreNumber)
  if (durationMinutes === null) return { ok: false, field: 'durationMinutes' }
  const powerKw = optionalNumber(input.powerKw, value => value >= 0 && value < maxFirestoreNumber)
  if (powerKw === null) return { ok: false, field: 'powerKw' }
  for (const field of ['equipment', 'company', 'chargingAddress', 'chargingLocation'] as const) {
    if (input[field].length > maxFirestoreTextLength) return { ok: false, field }
  }
  return {
    ok: true,
    details: {
      startBatteryPercent,
      durationMinutes,
      powerKw,
      equipment: optionalText(input.equipment),
      company: optionalText(input.company),
      chargingAddress: optionalText(input.chargingAddress),
    },
  }
}

export function formatChargingDuration(minutes: number): string {
  const total = Math.round(minutes)
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (hours === 0) return `${total} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
