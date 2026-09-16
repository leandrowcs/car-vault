import { collection, doc, onSnapshot, writeBatch, type Firestore } from 'firebase/firestore'
import { firebaseErrorMessage, getVaultDatabase } from './firebase'
import { isVaultRecord } from './vaultValidation'
import type { VaultRecord } from './vaultRecords'
import type { VaultAdapter } from './vaultStore'

export function createFirestoreAdapter(uid: string, db: Firestore = getVaultDatabase()): VaultAdapter {
  const records = collection(db, 'users', uid, 'records')
  return {
    listen(next, error) {
      return onSnapshot(records, { includeMetadataChanges: true }, snapshot => {
        const values = new Map<string, VaultRecord>()
        for (const item of snapshot.docs) {
          const value: unknown = item.data()
          if (!isVaultRecord(item.id, value)) {
            error('An unsupported cloud record was found. Update the app before editing this vault.')
            return
          }
          values.set(item.id, value)
        }
        next({ records: values, fromCache: snapshot.metadata.fromCache, pending: snapshot.metadata.hasPendingWrites })
      }, reason => error(firebaseErrorMessage(reason)))
    },
    commit(changes) {
      const batch = writeBatch(db)
      for (const change of changes) {
        const reference = doc(records, change.id)
        if (change.record) batch.set(reference, change.record)
        else batch.delete(reference)
      }
      return batch.commit()
    },
  }
}
