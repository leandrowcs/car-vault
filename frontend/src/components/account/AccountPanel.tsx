import { useTranslation } from '../../hooks/useTranslation'
import { useEffect, useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import { useCarVault } from '../../context/CarVaultContext'
import { firebaseConfigured, isTrustedDevice } from '../../services/firebase'
import { exportVaultToJson } from '../../services/exportImport'
import { Card } from '../common/Card'
import { ConfirmDialog } from '../common/ConfirmDialog'

export function SyncNotice() {
  const t = useTranslation()
  const { user } = useAccount()
  const { sync, retrySync } = useCarVault()
  const [hidden, setHidden] = useState(false)
  const settled = Boolean(user && sync.ready && !sync.error && !sync.pending && !sync.fromCache)
  useEffect(() => {
    setHidden(false)
    if (!settled) return
    const timeout = window.setTimeout(() => setHidden(true), 5000)
    return () => window.clearTimeout(timeout)
  }, [settled, user?.uid])
  if ((!user && !sync.error) || (settled && hidden)) return null
  return <div className={`sync-notice ${sync.error ? 'sync-error' : ''}`} role={sync.error ? 'alert' : 'status'}>
    <span>{t(sync.error ?? (sync.pending ? 'Changes pending — keep this device until sync completes.' : sync.fromCache ? 'Offline / connecting — showing cached data.' : 'Synced to your account.'))}</span>
    {sync.error && (<div className="account-actions">
      <button className="btn btn-secondary" onClick={retrySync}>{t("Retry")}</button>
      <button className="btn btn-secondary" onClick={() => exportVaultToJson(sync.data)}>{t("Export recovery backup")}</button>
    </div>)}
  </div>
}

export function AccountPanel() {
  const t = useTranslation()
  const { user, busy, error, login, signOut } = useAccount()
  const { sync, importLocalData } = useCarVault()
  const [trusted, setTrusted] = useState(isTrustedDevice)
  const [confirmImport, setConfirmImport] = useState(false)
  return <Card>
    <div className="card-header"><h3 className="card-title">{t("Account & Sync")}</h3></div>
    {!firebaseConfigured ? <p>{t("Cloud sync is not configured. Your garage is stored on this device.")}</p> : user ? <>
      <p className="account-email">{user.email ?? user.displayName ?? (t("Google account"))}</p>
      <p className="card-subtitle">{t("Your account garage is separate from the local garage. Import adds missing records; existing account records are preserved.")}</p>
      <div className="account-actions">
        <button className="btn btn-secondary" disabled={busy || sync.pending} onClick={() => void signOut()}>{t("Sign out")}</button>
        <button className="btn btn-primary" disabled={!sync.ready || sync.pending || sync.fromCache || Boolean(sync.error)} onClick={() => setConfirmImport(true)}>{t("Import local garage")}</button>
      </div>
      {sync.pending && (<p className="card-subtitle">{t("Sign out becomes available when pending changes are saved.")}</p>)}
    </> : <>
      <p className="card-subtitle">{t("Sign in to access the same garage on your phone and computer. Local records are never uploaded automatically.")}</p>
      <label className="form-checkbox-label account-consent">
        <input className="form-checkbox" type="checkbox" checked={trusted} onChange={event => setTrusted(event.target.checked)} />
        {t("This is my trusted device. Keep account data here for offline use.")}
      </label>
      <button className="btn btn-primary" disabled={busy || sync.pending || Boolean(sync.error)} onClick={() => void login(trusted)}>
        {busy ? t("Connecting…") : t("Continue with Google")}
      </button>
    </>}
    {error && (<p role="alert" className="account-error">{t(error)}</p>)}
    <ConfirmDialog isOpen={confirmImport} title={t("Import local garage")} danger={false}
      message={t("Add this device's local records to {0}? This includes any demo records in the local garage. Existing account records will not be replaced.", { "0": user?.email ?? (t("your account")) ?? '' })}
      confirmLabel={t("Import records")} onCancel={() => setConfirmImport(false)}
      onConfirm={() => { importLocalData(); setConfirmImport(false) }} />
  </Card>
}
