import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VaultStore, type CloudSnapshot, type VaultAdapter } from './vaultStore'
import { initialVaultData } from './storage'
import { encodeVault, mergeLocalVault, type RecordChange } from './vaultRecords'
import type { CarVaultData, Vehicle } from '../types'

const car = (id: string, name = id): Vehicle => ({ id, name, make: 'Honda', model: 'Civic', year: 2023,
  fuelType: 'gasoline', currentOdometer: 100, createdAt: '2026-09-16', updatedAt: '2026-09-16' })
const vault = (...vehicles: Vehicle[]): CarVaultData => ({ ...structuredClone(initialVaultData), vehicles })
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }

function cloud() {
  let emit: (snapshot: CloudSnapshot) => void = () => undefined
  let fail: (message: string) => void = () => undefined
  const commits: { changes: RecordChange[]; resolve: () => void; reject: () => void }[] = []
  const adapter: VaultAdapter = {
    listen: vi.fn((next, error) => { emit = next; fail = error; return vi.fn() }),
    commit: vi.fn(changes => new Promise<void>((resolve, reject) => {
      commits.push({ changes, resolve, reject: () => reject(new Error('denied')) })
    })),
  }
  const store = new VaultStore(adapter)
  const stop = store.start()
  return { store, adapter, commits, stop, fail: (message: string) => fail(message),
    emit: (data: CarVaultData, fromCache = false, pending = false) => emit({ records: encodeVault(data), fromCache, pending }),
    emptyCache: () => emit({ records: new Map(), fromCache: true, pending: false }),
  }
}

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) })
})

describe('cloud vault synchronization', () => {
  it('waits for server rather than treating an empty offline cache as an empty account', () => {
    const c = cloud(); c.emptyCache()
    expect(c.store.getSnapshot().ready).toBe(false)
    c.store.update(vault(car('ignored')))
    expect(c.adapter.commit).not.toHaveBeenCalled()
    c.emit(vault())
    expect(c.store.getSnapshot().ready).toBe(true)
    expect(c.adapter.commit).not.toHaveBeenCalled()
  })

  it('does not write received cloud records back to the server or local garage', () => {
    const c = cloud(); c.emit(vault(car('cloud')))
    expect(c.adapter.commit).not.toHaveBeenCalled()
    expect(localStorage.getItem('car_vault_data_v1')).toBeNull()
  })

  it('writes only the changed record and preserves a concurrent change to another vehicle', async () => {
    const c = cloud(); c.emit(vault(car('a'), car('b')))
    c.store.update(vault(car('a', 'local edit'), car('b')))
    await tick()
    expect(c.commits[0].changes.map(change => change.id)).toEqual(['vehicles~a'])
    c.emit(vault(car('a'), car('b', 'remote edit')))
    expect(c.store.getSnapshot().data.vehicles.map(v => v.name)).toEqual(['local edit', 'remote edit'])
    c.emit(vault(car('a', 'local edit'), car('b', 'remote edit')))
    c.commits[0].resolve(); await tick()
    expect(c.store.getSnapshot().pending).toBe(false)
  })

  it('retains rejected writes for export and retries without losing the edit', async () => {
    const c = cloud(); c.emit(vault(car('a')))
    c.store.update(vault(car('a', 'unsaved'))); await tick()
    c.commits[0].reject(); await tick()
    c.emit(vault(car('a')))
    expect(c.store.getSnapshot().data.vehicles[0].name).toBe('unsaved')
    expect(c.store.getSnapshot().error).toContain('not accepted')
    c.store.retry(); await tick()
    expect(c.commits).toHaveLength(2)
    c.emit(vault(car('a', 'unsaved')))
    c.commits[1].resolve(); await tick()
    expect(c.store.getSnapshot().error).toBeNull()
    expect(c.store.getSnapshot().pending).toBe(false)
  })

  it('does not overwrite a newer optimistic edit with an earlier snapshot', async () => {
    const c = cloud(); c.emit(vault(car('a')))
    c.store.update(vault(car('a', 'first')))
    c.store.update(vault(car('a', 'second'))); await tick()
    c.emit(vault(car('a', 'first')), false, true)
    c.commits[0].resolve(); await tick()
    expect(c.store.getSnapshot().data.vehicles[0].name).toBe('second')
    c.emit(vault(car('a', 'second')))
    c.commits[1].resolve(); await tick()
    expect(c.store.getSnapshot().pending).toBe(false)
  })

  it('deletes only the removed record', async () => {
    const c = cloud(); c.emit(vault(car('a'), car('b')))
    c.store.update(vault(car('b'))); await tick()
    expect(c.commits[0].changes).toEqual([{ id: 'vehicles~a', record: null }])
  })

  it('isolates accounts and ignores callbacks and mutations after unmount', async () => {
    const a = cloud(); a.emit(vault(car('private'))); a.stop()
    const b = cloud()
    a.emit(vault(car('late'))); a.store.update(vault(car('should-not-save'))); await tick()
    expect(a.store.getSnapshot().data.vehicles[0].id).toBe('private')
    expect(a.adapter.commit).not.toHaveBeenCalled()
    expect(b.store.getSnapshot().data.vehicles).toEqual([])
  })

  it('fails oversized operations before writing any records', async () => {
    const c = cloud(); c.emit(vault())
    c.store.update(vault(...Array.from({ length: 401 }, (_, i) => car(String(i))))); await tick()
    expect(c.adapter.commit).not.toHaveBeenCalled()
    expect(c.store.getSnapshot().data.vehicles).toEqual([])
    expect(c.store.getSnapshot().error).toContain('400')
  })

  it('reconnects the listener after a permission error', () => {
    const c = cloud(); c.fail('permission denied'); c.store.retry()
    expect(c.adapter.listen).toHaveBeenCalledTimes(2)
  })
})

describe('local data and migration', () => {
  it('merges once without overwriting newer cloud data or preferences', () => {
    const server = vault(car('a', 'newer'))
    server.settings.currency = 'EUR'
    const local = vault(car('a', 'older'), car('b'))
    const merged = mergeLocalVault(server, local)
    expect(merged.vehicles.map(v => v.name)).toEqual(['newer', 'b'])
    expect(merged.settings.currency).toBe('EUR')
    expect(mergeLocalVault(merged, local)).toEqual(merged)
  })

  it('keeps an empty local garage empty after reload', () => {
    const store = new VaultStore(); store.update(vault())
    expect(new VaultStore().getSnapshot().data.vehicles).toEqual([])
  })

  it('retains recovery data and reports local storage failures', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota') })
    const store = new VaultStore(); store.update(vault(car('recover')))
    expect(store.getSnapshot().data.vehicles[0].id).toBe('recover')
    expect(store.getSnapshot().error).toContain('storage')
  })

  it('rejects malformed imports and duplicate IDs', () => {
    expect(() => encodeVault(vault(car('a'), car('a')))).toThrow('Duplicate')
    expect(() => encodeVault(vault({ ...car('a'), currentOdometer: -1 }))).toThrow('Invalid')
  })

  it('reports a malformed migration without throwing or writing partial data', () => {
    const c = cloud(); c.emit(vault(car('existing')))
    c.store.update(previous => mergeLocalVault(previous, vault(car('duplicate'), car('duplicate'))))
    expect(c.store.getSnapshot().error).toContain('Duplicate')
    expect(c.store.getSnapshot().data.vehicles[0].id).toBe('existing')
    expect(c.adapter.commit).not.toHaveBeenCalled()
  })

  it('does not retry a rejected older edit over a newer accepted edit', async () => {
    const c = cloud(); c.emit(vault(car('a')))
    c.store.update(vault(car('a', 'first')))
    c.store.update(vault(car('a', 'second'))); await tick()
    c.commits[0].reject(); await tick()
    c.emit(vault(car('a', 'second')))
    c.commits[1].resolve(); await tick()
    c.store.retry(); await tick()
    expect(c.commits).toHaveLength(2)
    expect(c.store.getSnapshot().data.vehicles[0].name).toBe('second')
    expect(c.store.getSnapshot().pending).toBe(false)
  })
})
