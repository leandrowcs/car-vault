import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it, expect, vi } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, disableNetwork, enableNetwork, type Firestore } from 'firebase/firestore'
import { DEMO_VAULT_DATA } from '../src/services/demoData'
import { encodeVault } from '../src/services/vaultRecords'
import { VaultStore } from '../src/services/vaultStore'
import { createFirestoreAdapter } from '../src/services/firestoreVault'

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Firestore owner isolation and validation', () => {
  let env: RulesTestEnvironment
  const records = encodeVault(DEMO_VAULT_DATA)
  const vehicle = [...records.entries()].find(([, value]) => value.kind === 'vehicles')!
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-car-vault',
      firestore: { rules: readFileSync('../firestore.rules', 'utf8') } })
  })
  beforeEach(async () => { await env.clearFirestore() })
  afterAll(async () => { await env?.cleanup() })

  it('permits every valid domain record for its owner', async () => {
    const db = env.authenticatedContext('alice').firestore()
    for (const [id, value] of records) await assertSucceeds(setDoc(doc(db, 'users/alice/records', id), value))
    await assertSucceeds(getDocs(collection(db, 'users/alice/records')))
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/records', vehicle[0])))
  })

  it('denies anonymous reads and writes', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDocs(collection(db, 'users/alice/records')))
    await assertFails(setDoc(doc(db, 'users/alice/records', vehicle[0]), vehicle[1]))
  })

  it('denies reading, querying, writing and deleting another account', async () => {
    const db = env.authenticatedContext('bob').firestore()
    const ref = doc(db, 'users/alice/records', vehicle[0])
    await assertFails(getDoc(ref))
    await assertFails(getDocs(collection(db, 'users/alice/records')))
    await assertFails(setDoc(ref, vehicle[1]))
    await assertFails(deleteDoc(ref))
  })

  it('rejects forged IDs, unknown kinds, negative amounts and malformed settings', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(db, 'users/alice/records/vehicles~forged'), vehicle[1]))
    await assertFails(setDoc(doc(db, 'users/alice/records/unknown~x'), { kind: 'unknown', value: { id: 'x', createdAt: 'today', vehicleId: 'v' } }))
    await assertFails(setDoc(doc(db, 'users/alice/records', vehicle[0]), { ...vehicle[1], value: { ...vehicle[1].value, currentOdometer: -1 } }))
    await assertFails(setDoc(doc(db, 'users/alice/records/settings'), { kind: 'settings', value: { currency: 123 } }))
    await assertFails(setDoc(doc(db, 'users/alice/records', vehicle[0]), { ...vehicle[1], value: { ...vehicle[1].value, notes: { unexpected: true } } }))
  })

  it('denies access outside the explicit records path', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(db, 'users/alice'), { admin: true }))
    await assertFails(setDoc(doc(db, 'unrelated/private'), { value: true }))
  })

  it('syncs edits between clients and queues offline changes until reconnection', async () => {
    const dbA = env.authenticatedContext('alice', { device: 'a' }).firestore() as unknown as Firestore
    const dbB = env.authenticatedContext('alice', { device: 'b' }).firestore() as unknown as Firestore
    const a = new VaultStore(createFirestoreAdapter('alice', dbA))
    const b = new VaultStore(createFirestoreAdapter('alice', dbB))
    const stopA = a.start(); const stopB = b.start()
    try {
      await vi.waitFor(() => { expect(a.getSnapshot().ready).toBe(true); expect(b.getSnapshot().ready).toBe(true) })
      const car = DEMO_VAULT_DATA.vehicles[0]
      a.update(previous => ({ ...previous, vehicles: [car] }))
      await vi.waitFor(() => {
        expect(a.getSnapshot().pending).toBe(false)
        expect(b.getSnapshot().data.vehicles[0]?.id).toBe(car.id)
      })
      await disableNetwork(dbA)
      a.update(previous => ({ ...previous, vehicles: [{ ...car, name: 'Offline edit' }] }))
      await vi.waitFor(() => expect(a.getSnapshot().fromCache).toBe(true))
      expect(a.getSnapshot().pending).toBe(true)
      expect(b.getSnapshot().data.vehicles[0].name).toBe(car.name)
      await enableNetwork(dbA)
      await vi.waitFor(() => {
        expect(a.getSnapshot().pending).toBe(false)
        expect(b.getSnapshot().data.vehicles[0]?.name).toBe('Offline edit')
      })
    } finally { stopA(); stopB(); await enableNetwork(dbA) }
  })
})
