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
        <h3 className="empty-state-title">Select or Add a Vehicle First</h3>
        <p className="empty-state-desc">
          You must have an active vehicle in your garage to log fuel and EV charging.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
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
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Fuel & Energy Tracking</h2>
          <p className="card-subtitle">
            Tracking {activeVehicle.year} {activeVehicle.make} {activeVehicle.model} ({activeVehicle.fuelType})
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {isEvOrPhev && (
            <button type="button" className="btn btn-secondary" onClick={onAddCharge}>
              <Zap size={15} color="var(--vault-info)" /> Log EV Charge
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onAddFuel}>
            <Plus size={15} /> Log Fuel Fill-Up
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
            <Fuel size={14} /> Fuel Records ({activeFuelEntries.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tab === 'charging' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('charging')}
          >
            <Zap size={14} /> EV Charging Records ({activeChargingEntries.length})
          </button>
        </div>
      )}

      {/* Fuel Stats Cards */}
      {tab === 'fuel' ? (
        <>
          <div className="grid-metrics">
            <div className="metric-card" style={{ borderLeft: '3px solid var(--vault-primary)' }}>
              <div className="metric-card-top">
                <span>Average Economy</span>
                <Gauge className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono" style={{ color: 'var(--vault-primary)' }}>
                {formatConsumption(fuelStats.averageLPer100Km, settings.fuelEconomyUnit)}
              </div>
              <div className="metric-subtext">Calculated between full tanks</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>Total Fuel Cost</span>
                <DollarSign className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {formatCurrency(fuelStats.totalFuelCost, settings.currency)}
              </div>
              <div className="metric-subtext">Across {activeFuelEntries.length} fill-ups</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>Total Liters</span>
                <Fuel className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {fuelStats.totalFuelLiters.toFixed(1)} L
              </div>
              <div className="metric-subtext">Volume pumped into vehicle</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>Avg Fuel Price</span>
                <TrendingDown className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {fuelStats.averagePricePerLiter > 0
                  ? `$${fuelStats.averagePricePerLiter.toFixed(3)}/L`
                  : '—'}
              </div>
              <div className="metric-subtext">Weighted average CAD/L</div>
            </div>
          </div>

          <section aria-label="Fill-up history">
            <div className="record-history-heading">
              <h3 className="card-title">Fill-Up History</h3>
              <span className="badge badge-slate">{activeFuelEntries.length} fill-ups</span>
            </div>
            <div className="record-sort" role="group" aria-label="Sort fill-ups">
              <span>Sort by</span>
              {(['date', 'cost', 'volume'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`btn btn-sm ${sortBy === key ? 'btn-primary' : 'btn-secondary'}`}
                  aria-pressed={sortBy === key}
                  onClick={() => setSortBy(key)}
                >
                  {key === 'date' ? 'Date' : key === 'cost' ? 'Cost' : 'Volume'}
                </button>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSortAscending(value => !value)} aria-label="Reverse sort order">
                {sortBy === 'date' ? (sortAscending ? 'Oldest first ↑' : 'Newest first ↓') : (sortAscending ? 'Lowest first ↑' : 'Highest first ↓')}
              </button>
            </div>
            {activeFuelEntries.length === 0 ? (
              <div className="record-empty">No fuel fill-ups logged yet for this vehicle.</div>
            ) : (
              <div className="record-grid record-grid-compact">
                {sortedFuelEntries.map((entry) => {
                  const stat = fuelStats.entryStats.get(entry.id)
                  return (
                    <RecordCard
                      key={entry.id}
                      icon={<Fuel size={20} />}
                      title={entry.station || 'Fuel fill-up'}
                      date={formatDate(entry.date, settings.dateFormat)}
                      amount={formatCurrency(entry.totalCost, settings.currency)}
                      badge={<span className="badge badge-amber">{entry.fullTank ? 'Full tank' : 'Partial fill'}</span>}
                      metrics={[
                        { label: 'Odometer', value: `${entry.odometer.toLocaleString()} km` },
                        { label: 'Distance', value: stat?.distanceKm ? `+${stat.distanceKm.toLocaleString()} km` : '—' },
                        { label: 'Volume', value: `${entry.liters.toFixed(2)} L` },
                        { label: 'Price / L', value: `$${entry.pricePerLiter.toFixed(3)}` },
                        { label: 'Economy', value: stat?.lPer100Km ? formatConsumption(stat.lPer100Km, settings.fuelEconomyUnit) : '—' },
                      ]}
                      actionLabel={`fill-up on ${formatDate(entry.date, settings.dateFormat)}`}
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
                <span>EV Efficiency</span>
                <Gauge className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono" style={{ color: 'var(--vault-info)' }}>
                {evStats.kwhPer100Km !== null ? `${evStats.kwhPer100Km} kWh/100km` : '—'}
              </div>
              <div className="metric-subtext">Energy economy</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>Total Energy Cost</span>
                <DollarSign className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {formatCurrency(evStats.totalCost, settings.currency)}
              </div>
              <div className="metric-subtext">Across {activeChargingEntries.length} sessions</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>Total kWh</span>
                <Zap className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {evStats.totalKwh.toFixed(1)} kWh
              </div>
              <div className="metric-subtext">Total electricity consumed</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>Avg Energy Rate</span>
                <TrendingDown className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {evStats.averagePricePerKwh > 0 ? `$${evStats.averagePricePerKwh.toFixed(3)}/kWh` : '—'}
              </div>
              <div className="metric-subtext">Blended home & public charging</div>
            </div>
          </div>

          <section aria-label="EV charging history">
            <div className="record-history-heading">
              <h3 className="card-title">EV Charging History</h3>
              <span className="badge badge-slate">{activeChargingEntries.length} sessions</span>
            </div>
            {activeChargingEntries.length === 0 ? (
              <div className="record-empty">No EV charging sessions logged yet for this vehicle.</div>
            ) : (
              <div className="record-grid">
                {activeChargingEntries.map((entry) => (
                  <RecordCard
                    key={entry.id}
                    icon={<Zap size={20} />}
                    title={entry.chargingLocation || (entry.locationType === 'home' ? 'Home' : 'Public')}
                    date={formatDate(entry.date, settings.dateFormat)}
                    amount={formatCurrency(entry.totalCost, settings.currency)}
                    badge={<span className="badge badge-blue">{entry.chargingType || 'Level 2'}</span>}
                    metrics={[
                      { label: 'Odometer', value: `${entry.odometer.toLocaleString()} km` },
                      { label: 'Energy', value: `${entry.kwh.toFixed(1)} kWh` },
                      { label: 'Rate / kWh', value: `$${entry.pricePerKwh.toFixed(3)}` },
                    ]}
                    actionLabel={`charge on ${formatDate(entry.date, settings.dateFormat)}`}
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
        title="Delete Fuel Fill-Up"
        message="Are you sure you want to delete this fuel record? Calculations will recalculate automatically."
        confirmLabel="Delete Fill-up"
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
        title="Delete EV Charging Session"
        message="Are you sure you want to delete this charging record?"
        confirmLabel="Delete Charge"
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
