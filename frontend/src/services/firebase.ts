import { getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth'
import { initializeFirestore, memoryLocalCache, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
const app = firebaseConfigured ? (getApps()[0] ?? initializeApp(config)) : null
export const firebaseAuth = app ? getAuth(app) : null
let database: Firestore | undefined

export function isTrustedDevice(): boolean {
  try { return localStorage.getItem('car_vault_trusted_device') === 'true' }
  catch { return false }
}

export function getVaultDatabase(): Firestore {
  if (!app) throw new Error('Firebase is not configured.')
  database ??= initializeFirestore(app, {
    localCache: isTrustedDevice()
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      : memoryLocalCache(),
  })
  return database
}

export async function loginWithGoogle(trusted: boolean): Promise<void> {
  if (!firebaseAuth) throw new Error('Firebase is not configured.')
  // Cache mode is chosen once per page load. Keep it fixed when switching accounts.
  if (!database) localStorage.setItem('car_vault_trusted_device', String(trusted))
  await setPersistence(firebaseAuth, trusted ? browserLocalPersistence : browserSessionPersistence)
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  await signInWithPopup(firebaseAuth, provider)
}

export async function logout(): Promise<void> {
  if (firebaseAuth) {
    await signOut(firebaseAuth)
    // Recreate the SDK on next sign-in so a different cache preference is honored.
    window.location.reload()
  }
}

export function firebaseErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    'auth/popup-closed-by-user': 'Sign-in was cancelled. Your local data is unchanged.',
    'auth/popup-blocked': 'Allow pop-ups for this site and try signing in again.',
    'auth/unauthorized-domain': 'This domain must be added to Firebase Authentication → Authorized domains.',
    'auth/operation-not-allowed': 'Enable Google sign-in in the Firebase console.',
    'auth/network-request-failed': 'Connect to the internet to sign in.',
    'permission-denied': 'Access denied. Check your account and the published Firestore rules.',
    'unavailable': 'Cloud service unavailable. Reconnect and retry.',
  }
  return messages[code] ?? 'Could not connect to your account. Please retry.'
}
