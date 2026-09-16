import type { CarVaultData } from '../types'
import { initialVaultData } from './storage'
import { isVaultRecord } from './vaultValidation'

export const recordKinds = ['vehicles', 'fuelEntries', 'chargingEntries', 'expenses', 'maintenanceRecords', 'reminders', 'documents'] as const
export type RecordKind = typeof recordKinds[number]
export interface VaultRecord { kind: RecordKind | 'settings'; value: Record<string, unknown> }
export interface RecordChange { id: string; record: VaultRecord | null }

export function encodeVault(data: CarVaultData): Map<string, VaultRecord> {
  const records = new Map<string, VaultRecord>()
  for (const kind of recordKinds) {
    for (const item of data[kind]) {
      if (!item.id || item.id.includes('/') || item.id.length > 200) throw new Error('Invalid record ID in backup.')
      const id = `${kind}~${item.id}`
      if (records.has(id)) throw new Error('Duplicate record ID in backup.')
      records.set(id, { kind, value: JSON.parse(JSON.stringify(item)) as Record<string, unknown> })
    }
  }
  records.set('settings', { kind: 'settings', value: { ...data.settings } })
  for (const [id, record] of records) {
    if (!isVaultRecord(id, record)) throw new Error('Invalid record fields in backup. No changes were saved.')
  }
  return records
}

export function decodeVault(records: Map<string, VaultRecord>): CarVaultData {
  const data = structuredClone(initialVaultData)
  for (const record of records.values()) {
    if (record.kind === 'settings') {
      data.settings = { ...data.settings, ...record.value }
    } else if (recordKinds.includes(record.kind)) {
      // Stored records are validated at the adapter boundary and by Firestore rules.
      (data[record.kind] as unknown[]).push(record.value)
    }
  }
  return data
}

export function diffVault(before: CarVaultData, after: CarVaultData): RecordChange[] {
  const previous = encodeVault(before)
  const next = encodeVault(after)
  const changes: RecordChange[] = []
  for (const [id, record] of next) {
    if (JSON.stringify(previous.get(id)) !== JSON.stringify(record)) changes.push({ id, record })
  }
  for (const id of previous.keys()) if (!next.has(id)) changes.push({ id, record: null })
  return changes
}

/** Add missing IDs only: repeated migration never replaces newer cloud records. */
export function mergeLocalVault(cloud: CarVaultData, local: CarVaultData): CarVaultData {
  const records = encodeVault(cloud)
  for (const [id, record] of encodeVault(local)) {
    if (record.kind !== 'settings' && !records.has(id)) records.set(id, record)
  }
  return decodeVault(records)
}
