import { getLanguage } from '../services/language'
import { useTranslation } from '../hooks/useTranslation'
import { useMemo, useState } from 'react'
import { Fuel, Zap, Wrench, Receipt } from 'lucide-react'
import { useCarVault } from '../context/CarVaultContext'
import { calculateActivityTimeline } from '../utils/calculations'
import { formatCurrency, formatDate } from '../utils/formatters'

const icons = { fuel: Fuel, charge: Zap, expense: Receipt, maintenance: Wrench }
const distanceLabel = (km: number, unit: 'km' | 'mi') => `${Math.round(unit === 'mi' ? km / 1.609344 : km).toLocaleString(getLanguage())} ${unit}`
const economyLabel = (value: number, unit: string) => {
  if (value <= 0) return '—'
  if (unit === 'km/L') return `${(100 / value).toFixed(1)} km/L`
  if (unit === 'mpg-us') return `${(235.214583 / value).toFixed(1)} mpg (US)`
  if (unit === 'mpg-uk') return `${(282.480936 / value).toFixed(1)} mpg (UK)`
  return `${value.toFixed(1)} L/100 km`
}
export function ActivityTimeline() {
  const t = useTranslation()
  const { activeFuelEntries, activeChargingEntries, activeMaintenanceRecords, activeExpenses, settings } = useCarVault()
  const [monthLimit, setMonthLimit] = useState(3)
  const months = useMemo(() => calculateActivityTimeline(activeFuelEntries, activeChargingEntries, activeMaintenanceRecords, activeExpenses), [activeFuelEntries, activeChargingEntries, activeMaintenanceRecords, activeExpenses])
  if (!months.length) return <p className="timeline-empty">{t("No transactions yet. Add your first fill-up, expense or service.")}</p>
  return <>
    <div className="activity-timeline">{months.slice(0, monthLimit).map(month => <section key={month.month} aria-label={month.month}>
      <div className="timeline-month">
        <h4>{new Date(`${month.month}-01T12:00:00`).toLocaleDateString(getLanguage(), { month: 'long', year: 'numeric' })}</h4>
        <div><strong>{formatCurrency(month.total, settings.currency)}</strong><span> · {month.entries.length} {t("transactions")}</span></div>
        {month.consumption !== null && (<p>{distanceLabel(month.distance, settings.distanceUnit)} · {economyLabel(month.consumption, settings.fuelEconomyUnit)} <small>{t("(full-tank intervals)")}</small></p>)}
        {month.refillInterval && (<p>{t("Fill-ups every")} {month.refillInterval.days} {t("days · about")} {distanceLabel(month.refillInterval.km, settings.distanceUnit)}</p>)}
      </div>
      <ol className="timeline-list">{month.entries.map(entry => {
        const Icon = icons[entry.type]
        return <li key={entry.id} className="timeline-entry">
          <span className={`timeline-icon timeline-icon-${entry.type}`}><Icon size={18} /></span>
          <div className="timeline-description"><h4>{t(entry.title)}</h4><p>{entry.detail}</p><div className="timeline-metrics">
            {entry.odometer !== undefined && (<span>{distanceLabel(entry.odometer, settings.distanceUnit)}</span>)}
            {entry.consumption !== undefined && (<span>{economyLabel(entry.consumption, settings.fuelEconomyUnit)}</span>)}
            {entry.liters !== undefined && (<span>{(settings.volumeUnit === 'gal' ? entry.liters / 3.785411784 : entry.liters).toFixed(2)} {settings.volumeUnit}</span>)}
          </div></div>
          <div className="timeline-amount"><strong>{formatCurrency(entry.amount, settings.currency)}</strong><time dateTime={entry.date}>{formatDate(entry.date, settings.dateFormat)}</time></div>
        </li>
      })}</ol>
    </section>)}</div>
    {months.length > monthLimit && (<button className="btn btn-secondary timeline-more" type="button" onClick={() => setMonthLimit(n => n + 3)}>{t("Show earlier months")}</button>)}
  </>
}
