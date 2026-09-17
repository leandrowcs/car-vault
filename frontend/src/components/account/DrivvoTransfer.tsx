import { useTranslation } from '../../hooks/useTranslation'
import { useEffect, useRef, useState } from 'react'
import { useCarVault } from '../../context/CarVaultContext'
import { useAccount } from '../../context/AccountContext'
import { exportDrivvoCsv, parseDrivvoCsv, prepareDrivvoImport, type DrivvoPreview, type VehicleMapping } from '../../services/drivvoCsv'
import { Card } from '../common/Card'

export function DrivvoTransfer() {
  const t = useTranslation()
  const { data, sync, importDrivvoData } = useCarVault()
  const { user } = useAccount()
  const [preview, setPreview] = useState<DrivvoPreview | null>(null)
  const [mappings, setMappings] = useState<VehicleMapping[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const request = useRef(0)
  useEffect(() => () => { request.current++ }, [])
  const blocked = !sync.ready || Boolean(sync.error) || Boolean(user && (sync.pending || sync.fromCache))

  async function readFile(file?: File) {
    if (!file) return
    const version = ++request.current
    setBusy(true); setPreview(null); setConfirmed(false); setError(''); setMessage('')
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Choose a CSV smaller than 5 MB.')
      const text = await file.text()
      if (version !== request.current) return
      if (text.includes('\uFFFD')) throw new Error('Save the CSV as UTF-8 before importing.')
      const parsed = parseDrivvoCsv(text)
      setPreview(parsed)
      setMappings(parsed.vehicles.map(source => {
        const existing = data.vehicles.find(vehicle => vehicle.name.trim().toLowerCase() === source.toLowerCase())
        const year = /\b(19\d{2}|20\d{2})$/.exec(source)?.[1]
        const label = source.replace(/\s+\d{4}$/, '').split(/\s+/)
        return { source, existingId: existing?.id ?? '', make: label[0] ?? '', model: label.slice(1).join(' '), year: Number(year ?? 0),
          fuelType: /hybrid|h[ií]brid/i.test(source) ? 'hybrid' : 'gasoline' }
      }))
    } catch (reason) {
      if (version === request.current) setError(reason instanceof Error ? reason.message : 'Could not read CSV.')
    } finally { if (version === request.current) setBusy(false) }
  }

  async function applyImport() {
    if (!preview || !confirmed || blocked) return
    const version = ++request.current
    setBusy(true); setError(''); setMessage('')
    try {
      const incoming = await prepareDrivvoImport(preview, mappings, data)
      if (version !== request.current) return
      const added = importDrivvoData(incoming, mappings.map(mapping => mapping.existingId).filter(Boolean))
      setMessage(t('{0} records added; {1} duplicates skipped.{2}', { 0: added, 1: preview.rows.length + preview.services.length - added, 2: user ? t(' Check the cloud sync status above.') : '' }))
      setPreview(null)
    } catch (reason) {
      if (version === request.current) setError(reason instanceof Error ? reason.message : 'Import failed.')
    } finally { if (version === request.current) setBusy(false) }
  }

  const update = (index: number, patch: Partial<VehicleMapping>) => {
    setMappings(previous => previous.map((mapping, i) => i === index ? { ...mapping, ...patch } : mapping))
    setConfirmed(false)
  }

  return <Card>
    <div className="card-header"><h3 className="card-title">{t("Drivvo CSV")}</h3></div>
    <p className="card-subtitle">{t("Import refuelling and services using the Portuguese Drivvo format (km / liters). CSV export includes refuelling only; use JSON backup for the complete garage.")}</p>
    <div className="account-actions">
      <label className="form-group">{t("Choose Drivvo CSV")}
        <input type="file" accept=".csv,text/csv" disabled={busy || blocked} onChange={event => {
          void readFile(event.target.files?.[0]); event.target.value = ''
        }} />
      </label>
      <button type="button" className="btn btn-secondary" disabled={busy || !data.fuelEntries.length} onClick={() => {
        try { exportDrivvoCsv(data); setMessage('Refuelling CSV exported.'); setError('') }
        catch (reason) { setError(reason instanceof Error ? reason.message : 'Export failed.') }
      }}>{t("Export refuelling CSV")}</button>
    </div>
    {busy && (<p role="status">{t("Processing CSV…")}</p>)}
    {error && (<p role="alert" className="account-error">{t(error)}</p>)}
    {message && (<p role="status">{t(message)}</p>)}
    {preview && (<div style={{ display: 'grid', gap: 16, marginTop: 20 }}>
      <p><strong>{preview.rows.length} {t("refuelling records")} · {preview.services.length} {t("service records")}</strong> · {preview.totalLiters.toFixed(3)} {t("L ·")} {preview.totalCost.toFixed(3)} {t("total in the file’s currency")}</p>
      <p className="card-subtitle">{t("Dates:")} {[...preview.rows, ...preview.services].map(row => row.entry.date).sort()[0]} — {[...preview.rows, ...preview.services].map(row => row.entry.date).sort().at(-1)}{t(". Odometer range:")} {Math.min(...[...preview.rows, ...preview.services].map(row => row.entry.odometer))} — {Math.max(...[...preview.rows, ...preview.services].map(row => row.entry.odometer))} {t("km.")}</p>
      <p className="card-subtitle">{t("Review the destination vehicles. Existing records are preserved and duplicate refuelling and services are skipped. Odometers only increase.")}</p>
      {mappings.map((mapping, index) => <fieldset key={mapping.source} style={{ border: '1px solid var(--vault-border)', borderRadius: 10, padding: 12, minWidth: 0 }} disabled={busy}>
        <legend>{mapping.source}</legend>
        <label className="form-group">{t("Destination vehicle")}
          <select className="form-select" value={mapping.existingId} onChange={event => update(index, { existingId: event.target.value })}>
            <option value="">{t("Create vehicle — review details below")}</option>
            {data.vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id} disabled={vehicle.isSold}>{vehicle.name} ({vehicle.year}){vehicle.isSold ? ` — ${t('Sold')}` : ''}</option>)}
          </select>
        </label>
        {!mapping.existingId && <div className="form-row" style={{ marginTop: 12 }}>
          <label className="form-group">{t("Make")}<input className="form-input" value={mapping.make} onChange={event => update(index, { make: event.target.value })} /></label>
          <label className="form-group">{t("Model / trim")}<input className="form-input" value={mapping.model} onChange={event => update(index, { model: event.target.value })} /></label>
          <label className="form-group">{t("Year")}<input className="form-input" type="number" min="1886" max="2200" value={mapping.year || ''} onChange={event => update(index, { year: Number(event.target.value) })} /></label>
          <label className="form-group">{t("Vehicle fuel type")}<select className="form-select" value={mapping.fuelType} onChange={event => update(index, { fuelType: event.target.value as VehicleMapping['fuelType'] })}>
            <option value="gasoline">{t("Gasoline")}</option><option value="diesel">{t("Diesel")}</option><option value="hybrid">{t("Hybrid")}</option><option value="plug-in-hybrid">{t("Plug-in hybrid")}</option><option value="other">{t("Other")}</option>
          </select></label>
        </div>}
      </fieldset>)}
      <label className="form-checkbox-label"><input type="checkbox" className="form-checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />
        {t("I reviewed the vehicles. Amounts are in")} {data.settings.currency}{t("; the file uses km and liters. No currency conversion will be applied.")}
      </label>
      <div className="account-actions">
        <button type="button" className="btn btn-primary" disabled={busy || blocked || !confirmed} onClick={() => void applyImport()}>{t("Import records")}</button>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setPreview(null)}>{t("Cancel")}</button>
      </div>
    </div>)}
  </Card>
}
