import React, { useState, useMemo } from 'react'
import {
  Fuel,
  Zap,
  Plus,
  Edit2,
  Trash2,
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
import { Card } from '../components/common/Card'
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

          {/* Fill-ups table */}
          <Card>
            <div className="card-header">
              <h3 className="card-title">Fill-Up History</h3>
            </div>

            {activeFuelEntries.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--vault-text-muted)' }}>
                No fuel fill-ups logged yet for this vehicle.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Odometer</th>
                      <th>Distance</th>
                      <th>Liters</th>
                      <th>Price/L</th>
                      <th>Total Cost</th>
                      <th>Economy</th>
                      <th>Station</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeFuelEntries.map((entry) => {
                      const stat = fuelStats.entryStats.get(entry.id)

                      return (
                        <tr key={entry.id}>
                          <td className="font-mono" style={{ whiteSpace: 'nowrap' }}>
                            {formatDate(entry.date, settings.dateFormat)}
                          </td>
                          <td className="font-mono" style={{ fontWeight: 600 }}>
                            {entry.odometer.toLocaleString()} km
                          </td>
                          <td className="font-mono" style={{ color: 'var(--vault-text-secondary)' }}>
                            {stat?.distanceKm ? `+${stat.distanceKm} km` : '—'}
                          </td>
                          <td className="font-mono">{entry.liters.toFixed(2)} L</td>
                          <td className="font-mono" style={{ color: 'var(--vault-text-secondary)' }}>
                            ${entry.pricePerLiter.toFixed(3)}
                          </td>
                          <td className="font-mono" style={{ fontWeight: 700 }}>
                            {formatCurrency(entry.totalCost, settings.currency)}
                          </td>
                          <td>
                            {stat?.lPer100Km ? (
                              <span className="badge badge-amber font-mono">
                                {stat.lPer100Km.toFixed(1)} L/100km
                              </span>
                            ) : (
                              <span style={{ color: 'var(--vault-text-muted)', fontSize: '12px' }}>
                                {entry.fullTank ? '1st full tank' : 'Partial fill'}
                              </span>
                            )}
                          </td>
                          <td style={{ color: 'var(--vault-text-secondary)' }}>
                            {entry.station || '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-icon btn-sm"
                                onClick={() => onEditFuel(entry)}
                                title="Edit fill-up"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-icon btn-sm"
                                onClick={() => setFuelToDelete(entry)}
                                title="Delete fill-up"
                              >
                                <Trash2 size={13} color="var(--vault-danger)" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
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

          <Card>
            <div className="card-header">
              <h3 className="card-title">EV Charging History</h3>
            </div>

            {activeChargingEntries.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--vault-text-muted)' }}>
                No EV charging sessions logged yet for this vehicle.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Odometer</th>
                      <th>Energy (kWh)</th>
                      <th>Rate ($/kWh)</th>
                      <th>Total Cost</th>
                      <th>Type</th>
                      <th>Location</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeChargingEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="font-mono">{formatDate(entry.date, settings.dateFormat)}</td>
                        <td className="font-mono">{entry.odometer.toLocaleString()} km</td>
                        <td className="font-mono" style={{ fontWeight: 600 }}>{entry.kwh.toFixed(1)} kWh</td>
                        <td className="font-mono" style={{ color: 'var(--vault-text-secondary)' }}>
                          ${entry.pricePerKwh.toFixed(3)}
                        </td>
                        <td className="font-mono" style={{ fontWeight: 700 }}>
                          {formatCurrency(entry.totalCost, settings.currency)}
                        </td>
                        <td>
                          <span className="badge badge-blue">{entry.chargingType || 'Level 2'}</span>
                        </td>
                        <td style={{ color: 'var(--vault-text-secondary)' }}>
                          {entry.chargingLocation || (entry.locationType === 'home' ? 'Home' : 'Public')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon btn-sm"
                              onClick={() => onEditCharge(entry)}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon btn-sm"
                              onClick={() => setChargeToDelete(entry)}
                            >
                              <Trash2 size={13} color="var(--vault-danger)" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
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
