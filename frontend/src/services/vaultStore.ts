import type { CarVaultData } from '../types'
import { validateVehicleRecordAdditions } from './vehicleLifecycle'
import { CarVaultStorage, initialVaultData } from './storage'
import { decodeVault, diffVault, type RecordChange, type VaultRecord } from './vaultRecords'

export interface CloudSnapshot {
  records: Map<string, VaultRecord>
  fromCache: boolean
  pending: boolean
}
export interface VaultAdapter {
  listen: (next: (snapshot: CloudSnapshot) => void, error: (message: string) => void) => () => void
  commit: (changes: RecordChange[]) => Promise<void>
}
interface PendingBatch { changes: RecordChange[]; failed: boolean }
export interface VaultState {
  data: CarVaultData
  ready: boolean
  fromCache: boolean
  pending: boolean
  error: string | null
}

/** Owns optimistic changes outside React; incoming snapshots are never written back. */
export class VaultStore {
  private state: VaultState
  private listeners = new Set<() => void>()
  private remote = new Map<string, VaultRecord>()
  private batches = new Map<number, PendingBatch>()
  private sequence = 0
  private latestChange = new Map<string, number>()
  private remotePending = false
  private stopListening?: () => void
  private restart?: () => void
  private running = true

  constructor(private adapter?: VaultAdapter) {
    this.state = {
      data: adapter ? structuredClone(initialVaultData) : CarVaultStorage.load(),
      ready: !adapter, fromCache: false, pending: false, error: null,
    }
  }

  getSnapshot = (): VaultState => this.state
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  private publish(patch: Partial<VaultState>): void {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach(listener => listener())
  }
  start = (): (() => void) => {
    this.running = true
    if (!this.adapter) return () => { this.running = false }
    let active = true
    const connect = () => {
      this.stopListening?.()
      this.stopListening = this.adapter!.listen(snapshot => {
        if (!active) return
        this.remote = snapshot.records
        this.remotePending = snapshot.pending
        // An empty cache is not proof of an empty account. Wait for the server.
        const ready = this.state.ready || !snapshot.fromCache || snapshot.records.size > 0
        this.publish({ ready, fromCache: snapshot.fromCache })
        this.rebuild()
      }, message => { if (active) this.publish({ error: message }) })
    }
    this.restart = connect
    connect()
    return () => { active = false; this.running = false; this.restart = undefined; this.stopListening?.() }
  }
  private rebuild(): void {
    const records = new Map(this.remote)
    for (const [id, batch] of this.batches) {
      for (const change of batch.changes) {
        if (this.latestChange.get(change.id) !== id) continue
        if (change.record) records.set(change.id, change.record)
        else records.delete(change.id)
      }
    }
    this.publish({ data: decodeVault(records), pending: this.remotePending || this.batches.size > 0 })
  }
  update = (action: CarVaultData | ((previous: CarVaultData) => CarVaultData)): void => {
    if (!this.running || !this.state.ready || this.state.error) return
    let next: CarVaultData
    try {
      next = typeof action === 'function' ? action(this.state.data) : action
      validateVehicleRecordAdditions(this.state.data, next)
    }
    catch (error) {
      this.publish({ error: error instanceof Error ? error.message : 'Invalid data. No changes were saved.' })
      return
    }
    if (!this.adapter) {
      try { CarVaultStorage.save(next); this.publish({ data: next }) }
      catch { this.publish({ data: next, error: 'Device storage is full or unavailable. Export a backup before leaving.' }) }
      return
    }
    try {
      const changes = diffVault(this.state.data, next)
      if (!changes.length) return
      if (changes.length > 400) throw new Error('This operation exceeds 400 changed records. Import a smaller backup or delete one vehicle at a time.')
      const id = ++this.sequence
      for (const change of changes) this.latestChange.set(change.id, id)
      this.batches.set(id, { changes, failed: false })
      this.publish({ data: next, pending: true })
      this.submit(id)
    } catch (error) {
      this.publish({ error: error instanceof Error ? error.message : 'Unable to save changes.' })
    }
  }
  private submit(id: number): void {
    const batch = this.batches.get(id)
    if (!batch || !this.adapter) return
    batch.changes = batch.changes.filter(change => this.latestChange.get(change.id) === id)
    if (!batch.changes.length) {
      this.batches.delete(id)
      this.rebuild()
      return
    }
    batch.failed = false
    void Promise.resolve().then(() => this.adapter!.commit(batch.changes)).then(() => {
      this.batches.delete(id)
      this.rebuild()
    }).catch(() => {
      batch.failed = true
      this.publish({ error: 'Changes were not accepted by the cloud. Check Firestore permissions and retry. Export a backup before closing this page.' })
    })
  }
  retry = (): void => {
    this.publish({ error: null })
    if (!this.adapter) {
      this.update(this.state.data)
      return
    }
    for (const [id, batch] of this.batches) if (batch.failed) this.submit(id)
    this.restart?.()
  }
}
