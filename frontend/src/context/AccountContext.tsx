import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { firebaseAuth, firebaseErrorMessage, loginWithGoogle, logout } from '../services/firebase'

interface AccountState {
  user: User | null
  loading: boolean
  busy: boolean
  error: string | null
  login: (trusted: boolean) => Promise<void>
  signOut: () => Promise<void>
}
const AccountContext = createContext<AccountState | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(firebaseAuth))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!firebaseAuth) return
    return onAuthStateChanged(firebaseAuth, next => { setUser(next); setLoading(false) }, reason => {
      setError(firebaseErrorMessage(reason)); setLoading(false)
    })
  }, [])
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(null)
    try { await action() } catch (reason) { setError(firebaseErrorMessage(reason)) }
    finally { setBusy(false) }
  }
  return <AccountContext.Provider value={{ user, loading, busy, error,
    login: trusted => run(() => loginWithGoogle(trusted)), signOut: () => run(logout),
  }}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountState {
  const context = useContext(AccountContext)
  if (!context) throw new Error('AccountProvider is missing.')
  return context
}
