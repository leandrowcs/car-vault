import { getLanguage } from '../services/language'
import { useTranslation } from '../hooks/useTranslation'
import React, { useState, useMemo } from 'react'
import {
  Fuel,
  Zap,
  Plus,
  TrendingDown,
  Gauge,
  DollarSign,
} from 'lucide-react'
import { useCarVault } from '../context/CarVaultContext'
import { calculateFuelStats, calculateEvStats } from '../utils/calculations'
import {
  formatCurrency,
  formatConsumption,
  formatDate,
} from '../utils/formatters'
import { RecordCard } from '../components/common/RecordCard'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import type { FuelEntry, ChargingEntry } from '../types/fuel'
import { fuelTypes, type StationFuelType } from '../services/gas-stations/types'

interface FuelViewProps {
  onAddFuel: () => void
  onAddCharge: () => void
  onEditFuel: (entry: FuelEntry) => void
  onEditCharge: (entry: ChargingEntry) => void
}

export const FuelView: React.FC<FuelViewProps> = ({
  onAddFuel,
  onAddCharge,
  onEditFuel,
  onEditCharge,
}) => {
  const t = useTranslation()
  const {
    activeVehicle,
    activeFuelEntries,
    activeChargingEntries,
    deleteFuelEntry,
    deleteChargingEntry,
    settings,
  } = useCarVault()

  const [fuelToDelete, setFuelToDelete] = useState<FuelEntry | null>(null)
  const [chargeToDelete, setChargeToDelete] = useState<ChargingEntry | null>(null)
  const [tab, setTab] = useState<'fuel' | 'charging'>('fuel')
  const [sortBy, setSortBy] = useState<'date' | 'cost' | 'volume'>('date')
  const [sortAscending, setSortAscending] = useState(false)
  const sortedFuelEntries = useMemo(() => [...activeFuelEntries].sort((a, b) => {
    const difference = sortBy === 'cost' ? a.totalCost - b.totalCost
      : sortBy === 'volume' ? a.liters - b.liters
      : a.date.localeCompare(b.date) || a.odometer - b.odometer
    return (sortAscending ? difference : -difference) || b.date.localeCompare(a.date) || a.id.localeCompare(b.id)
  }), [activeFuelEntries, sortBy, sortAscending])

  const isEvOrPhev =
    activeVehicle?.fuelType === 'electric' ||
    activeVehicle?.fuelType === 'plug-in-hybrid'

  // Calculations
  const fuelStats = useMemo(
    () => calculateFuelStats(activeFuelEntries),
    [activeFuelEntries]
  )

  const evStats = useMemo(
    () => calculateEvStats(activeChargingEntries),
    [activeChargingEntries]
  )

  if (!activeVehicle) {
    return (
      <div className="empty-state">
        <Fuel className="empty-state-icon" />
        <h3 className="empty-state-title">{t("Select or Add a Vehicle First")}</h3>
        <p className="empty-state-desc">
          {t("You must have an active vehicle in your garage to log fuel and EV charging.")}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {/* Header & Quick Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{t("Fuel & Energy Tracking")}</h2>
          <p className="card-subtitle">
            {t("Tracking")} {activeVehicle.year} {activeVehicle.make} {activeVehicle.model} ({t(activeVehicle.fuelType)})
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {isEvOrPhev && (
            <button type="button" className="btn btn-secondary" onClick={onAddCharge}>
              <Zap size={15} color="var(--vault-info)" /> {t("Log EV Charge")}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onAddFuel}>
            <Plus size={15} /> {t("Log Fuel Fill-Up")}
          </button>
        </div>
      </div>

      {/* Tabs if vehicle supports both or user tracks both */}
      {isEvOrPhev && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--vault-border)', paddingBottom: '12px' }}>
          <button
            type="button"
            className={`btn btn-sm ${tab === 'fuel' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('fuel')}
          >
            <Fuel size={14} /> {t("Fuel Records (")}{activeFuelEntries.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tab === 'charging' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('charging')}
          >
            <Zap size={14} /> {t("EV Charging Records (")}{activeChargingEntries.length})
          </button>
        </div>
      )}

      {/* Fuel Stats Cards */}
      {tab === 'fuel' ? (
        <>
          <div className="grid-metrics">
            <div className="metric-card" style={{ borderLeft: '3px solid var(--vault-primary)' }}>
              <div className="metric-card-top">
                <span>{t("Average Economy")}</span>
                <Gauge className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono" style={{ color: 'var(--vault-primary)' }}>
                {formatConsumption(fuelStats.averageLPer100Km, settings.fuelEconomyUnit)}
              </div>
              <div className="metric-subtext">{t("Calculated between full tanks")}</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>{t("Total Fuel Cost")}</span>
                <DollarSign className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {formatCurrency(fuelStats.totalFuelCost, settings.currency)}
              </div>
              <div className="metric-subtext">{t("Across")} {activeFuelEntries.length} {t("fill-ups")}</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>{t("Total Liters")}</span>
                <Fuel className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {fuelStats.totalFuelLiters.toFixed(1)} {t("L")}
              </div>
              <div className="metric-subtext">{t("Volume pumped into vehicle")}</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>{t("Avg Fuel Price")}</span>
                <TrendingDown className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {fuelStats.averagePricePerLiter > 0 ? t("${0}/L", { "0": fuelStats.averagePricePerLiter.toFixed(3) ?? '' }) : '—'}
              </div>
              <div className="metric-subtext">{t("Weighted average CAD/L")}</div>
            </div>
          </div>

          <section aria-label={t("Fill-up history")}>
            <div className="record-history-heading">
              <h3 className="card-title">{t("Fill-Up History")}</h3>
              <span className="badge badge-slate">{activeFuelEntries.length} {t("fill-ups")}</span>
            </div>
            <div className="record-sort" role="group" aria-label={t("Sort fill-ups")}>
              <span>{t("Sort by")}</span>
              {(['date', 'cost', 'volume'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`btn btn-sm ${sortBy === key ? 'btn-primary' : 'btn-secondary'}`}
                  aria-pressed={sortBy === key}
                  onClick={() => setSortBy(key)}
                >
                  {key === 'date' ? t("Date") : key === 'cost' ? t("Cost") : t("Volume")}
                </button>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSortAscending(value => !value)} aria-label={t("Reverse sort order")}>
                {sortBy === 'date' ? (sortAscending ? t("Oldest first ↑") : t("Newest first ↓")) : (sortAscending ? t("Lowest first ↑") : t("Highest first ↓"))}
              </button>
            </div>
            {activeFuelEntries.length === 0 ? (
              <div className="record-empty">{t("No fuel fill-ups logged yet for this vehicle.")}</div>
            ) : (
              <div className="record-grid record-grid-compact">
                {sortedFuelEntries.map((entry) => {
                  const stat = fuelStats.entryStats.get(entry.id)
                  return (
                    <RecordCard
                      key={entry.id}
                      icon={<Fuel size={20} />}
                      title={entry.station || (t("Fuel fill-up"))}
                      date={formatDate(entry.date, settings.dateFormat)}
                      amount={formatCurrency(entry.totalCost, settings.currency)}
                      badge={<span className="badge badge-amber">{entry.fullTank ? t("Full tank") : t("Partial fill")}</span>}
                      metrics={[
                        { label: 'Odometer', value: `${entry.odometer.toLocaleString(getLanguage())} km` },
                        { label: 'Distance', value: stat?.distanceKm ? `+${stat.distanceKm.toLocaleString(getLanguage())} km` : '—' },
                        { label: 'Volume', value: `${entry.liters.toFixed(2)} L` },
                        { label: 'Price / L', value: `$${entry.pricePerLiter.toFixed(3)}` },
                        { label: 'Fuel type', value: t(entry.fuelType && Object.hasOwn(fuelTypes, entry.fuelType) ? fuelTypes[entry.fuelType as StationFuelType] : entry.fuelType ?? '—') },
                        { label: 'Economy', value: stat?.lPer100Km ? formatConsumption(stat.lPer100Km, settings.fuelEconomyUnit) : '—' },
                      ]}
                      actionLabel={t("fill-up on {0}", { "0": formatDate(entry.date, settings.dateFormat) ?? '' })}
                      actionsInHeader
                      onEdit={() => onEditFuel(entry)}
                      onDelete={() => setFuelToDelete(entry)}
                    />
                  )
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        /* EV Charging Log */
        <>
          <div className="grid-metrics">
            <div className="metric-card" style={{ borderLeft: '3px solid var(--vault-info)' }}>
              <div className="metric-card-top">
                <span>{t("EV Efficiency")}</span>
                <Gauge className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono" style={{ color: 'var(--vault-info)' }}>
                {evStats.kwhPer100Km !== null ? t("{0} kWh/100km", { "0": evStats.kwhPer100Km ?? '' }) : '—'}
              </div>
              <div className="metric-subtext">{t("Energy economy")}</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>{t("Total Energy Cost")}</span>
                <DollarSign className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {formatCurrency(evStats.totalCost, settings.currency)}
              </div>
              <div className="metric-subtext">{t("Across")} {activeChargingEntries.length} {t("sessions")}</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>{t("Total kWh")}</span>
                <Zap className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {evStats.totalKwh.toFixed(1)} {t("kWh")}
              </div>
              <div className="metric-subtext">{t("Total electricity consumed")}</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>{t("Avg Energy Rate")}</span>
                <TrendingDown className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {evStats.averagePricePerKwh > 0 ? t("${0}/kWh", { "0": evStats.averagePricePerKwh.toFixed(3) ?? '' }) : '—'}
              </div>
              <div className="metric-subtext">{t("Blended home & public charging")}</div>
            </div>
          </div>

          <section aria-label={t("EV charging history")}>
            <div className="record-history-heading">
              <h3 className="card-title">{t("EV Charging History")}</h3>
              <span className="badge badge-slate">{activeChargingEntries.length} {t("sessions")}</span>
            </div>
            {activeChargingEntries.length === 0 ? (
              <div className="record-empty">{t("No EV charging sessions logged yet for this vehicle.")}</div>
            ) : (
              <div className="record-grid">
                {activeChargingEntries.map((entry) => (
                  <RecordCard
                    key={entry.id}
                    icon={<Zap size={20} />}
                    title={entry.chargingLocation || (entry.locationType === 'home' ? t("Home") : t("Public"))}
                    date={formatDate(entry.date, settings.dateFormat)}
                    amount={formatCurrency(entry.totalCost, settings.currency)}
                    badge={<span className="badge badge-blue">{entry.chargingType || (t("Level 2"))}</span>}
                    metrics={[
                      { label: 'Odometer', value: `${entry.odometer.toLocaleString(getLanguage())} km` },
                      { label: 'Energy', value: `${entry.kwh.toFixed(1)} kWh` },
                      { label: 'Rate / kWh', value: `$${entry.pricePerKwh.toFixed(3)}` },
                    ]}
                    actionLabel={t("charge on {0}", { "0": formatDate(entry.date, settings.dateFormat) ?? '' })}
                    onEdit={() => onEditCharge(entry)}
                    onDelete={() => setChargeToDelete(entry)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Delete Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={Boolean(fuelToDelete)}
        title={t("Delete Fuel Fill-Up")}
        message={t("Are you sure you want to delete this fuel record? Calculations will recalculate automatically.")}
        confirmLabel={t("Delete Fill-up")}
        onConfirm={() => {
          if (fuelToDelete) {
            deleteFuelEntry(fuelToDelete.id)
            setFuelToDelete(null)
          }
        }}
        onCancel={() => setFuelToDelete(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(chargeToDelete)}
        title={t("Delete EV Charging Session")}
        message={t("Are you sure you want to delete this charging record?")}
        confirmLabel={t("Delete Charge")}
        onConfirm={() => {
          if (chargeToDelete) {
            deleteChargingEntry(chargeToDelete.id)
            setChargeToDelete(null)
          }
        }}
        onCancel={() => setChargeToDelete(null)}
      />
    </div>
  )
}
