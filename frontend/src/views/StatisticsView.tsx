import React, { useState, useMemo } from 'react'
import {
  BarChart3,
  DollarSign,
  Fuel,
  Wrench,
  Gauge,
} from 'lucide-react'
import { useCarVault } from '../context/CarVaultContext'
import {
  calculateFuelStats,
  calculateEvStats,
  calculateTotalVehicleCosts,
  calculateMonthlySpending,
  calculateCostPerKm,
} from '../utils/calculations'
import {
  formatCurrency,
  formatConsumption,
  formatCostPerKm,
} from '../utils/formatters'
import { Card } from '../components/common/Card'
import { SimpleBarChart } from '../components/charts/SimpleBarChart'

export const StatisticsView: React.FC = () => {
  const {
    activeVehicle,
    activeFuelEntries,
    activeChargingEntries,
    activeExpenses,
    activeMaintenanceRecords,
    settings,
  } = useCarVault()

  const [periodFilter, setPeriodFilter] = useState<'all' | 'year' | 'month'>('all')

  const currentYear = new Date().getFullYear().toString()
  const currentMonthKey = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

  // Filter records by selected period
  const filteredFuel = useMemo(() => {
    if (periodFilter === 'year') {
      return activeFuelEntries.filter((f) => f.date.startsWith(currentYear))
    }
    if (periodFilter === 'month') {
      return activeFuelEntries.filter((f) => f.date.startsWith(currentMonthKey))
    }
    return activeFuelEntries
  }, [activeFuelEntries, periodFilter, currentYear, currentMonthKey])

  const filteredCharging = useMemo(() => {
    if (periodFilter === 'year') {
      return activeChargingEntries.filter((c) => c.date.startsWith(currentYear))
    }
    if (periodFilter === 'month') {
      return activeChargingEntries.filter((c) => c.date.startsWith(currentMonthKey))
    }
    return activeChargingEntries
  }, [activeChargingEntries, periodFilter, currentYear, currentMonthKey])

  const filteredExpenses = useMemo(() => {
    if (periodFilter === 'year') {
      return activeExpenses.filter((e) => e.date.startsWith(currentYear))
    }
    if (periodFilter === 'month') {
      return activeExpenses.filter((e) => e.date.startsWith(currentMonthKey))
    }
    return activeExpenses
  }, [activeExpenses, periodFilter, currentYear, currentMonthKey])

  const filteredMaintenance = useMemo(() => {
    if (periodFilter === 'year') {
      return activeMaintenanceRecords.filter((m) => m.date.startsWith(currentYear))
    }
    if (periodFilter === 'month') {
      return activeMaintenanceRecords.filter((m) => m.date.startsWith(currentMonthKey))
    }
    return activeMaintenanceRecords
  }, [activeMaintenanceRecords, periodFilter, currentYear, currentMonthKey])

  // Aggregate stats
  const fuelStats = useMemo(() => calculateFuelStats(filteredFuel), [filteredFuel])
  const evStats = useMemo(() => calculateEvStats(filteredCharging), [filteredCharging])

  const totalCosts = useMemo(
    () =>
      calculateTotalVehicleCosts(
        filteredFuel,
        filteredCharging,
        filteredMaintenance,
        filteredExpenses,
        0,
        fuelStats.totalDistanceKm || (activeVehicle ? activeVehicle.currentOdometer : 0)
      ),
    [
      filteredFuel,
      filteredCharging,
      filteredMaintenance,
      filteredExpenses,
      fuelStats.totalDistanceKm,
      activeVehicle,
    ]
  )

  const monthlySpending = useMemo(
    () =>
      calculateMonthlySpending(
        activeFuelEntries,
        activeChargingEntries,
        activeMaintenanceRecords,
        activeExpenses
      ),
    [
      activeFuelEntries,
      activeChargingEntries,
      activeMaintenanceRecords,
      activeExpenses,
    ]
  )

  // Category breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    filteredExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount)
    })
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredExpenses])

  // Maintenance category breakdown
  const maintenanceCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    filteredMaintenance.forEach((m) => {
      map.set(m.category, (map.get(m.category) || 0) + m.cost)
    })
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredMaintenance])

  const maintCostPerKm = calculateCostPerKm(
    totalCosts.totalMaintenance,
    totalCosts.totalDistanceKm
  )
  const fuelCostPerKm = calculateCostPerKm(
    totalCosts.totalFuel,
    totalCosts.totalDistanceKm
  )

  if (!activeVehicle) {
    return (
      <div className="empty-state">
        <BarChart3 className="empty-state-icon" />
        <h3 className="empty-state-title">Select or Add a Vehicle First</h3>
        <p className="empty-state-desc">
          Statistics require an active vehicle in your garage.
        </p>
      </div>
    )
  }

  const isEv = activeVehicle.fuelType === 'electric'

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* Top Header & Period Filter */}
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
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Vehicle Analytics & Reports</h2>
          <p className="card-subtitle">
            Comprehensive financial and fuel efficiency breakdown for {activeVehicle.name}
          </p>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`btn btn-sm ${periodFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriodFilter('all')}
          >
            All Time
          </button>
          <button
            type="button"
            className={`btn btn-sm ${periodFilter === 'year' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriodFilter('year')}
          >
            Year {currentYear}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${periodFilter === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriodFilter('month')}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid-metrics">
        <div className="metric-card" style={{ borderLeft: '3px solid var(--vault-primary)' }}>
          <div className="metric-card-top">
            <span>Overall Cost / KM</span>
            <DollarSign className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono" style={{ color: 'var(--vault-primary)' }}>
            {formatCostPerKm(totalCosts.costPerKm, settings.currency)}
          </div>
          <div className="metric-subtext">All expenses / total distance</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Fuel Cost / KM</span>
            <Fuel className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCostPerKm(fuelCostPerKm, settings.currency)}
          </div>
          <div className="metric-subtext">Fuel / distance</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Maintenance / KM</span>
            <Wrench className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCostPerKm(maintCostPerKm, settings.currency)}
          </div>
          <div className="metric-subtext">Service & repairs / distance</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Average Economy</span>
            <Gauge className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {isEv
              ? evStats.kwhPer100Km !== null
                ? `${evStats.kwhPer100Km} kWh/100km`
                : '—'
              : formatConsumption(fuelStats.averageLPer100Km, settings.fuelEconomyUnit)}
          </div>
          <div className="metric-subtext">Vehicle fuel efficiency</div>
        </div>
      </div>

      {/* Monthly spending breakdown chart */}
      <Card>
        <div className="card-header">
          <div>
            <h3 className="card-title">Monthly Expenditure Trend</h3>
            <p className="card-subtitle">Historical month-by-month spending across fuel, service, and general expenses</p>
          </div>
        </div>
        <SimpleBarChart data={monthlySpending} currency={settings.currency} />
      </Card>

      {/* 2-Column Category Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '20px' }}>
        {/* Expenses by Category */}
        <Card>
          <div className="card-header">
            <h3 className="card-title">Expenses by Category</h3>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--vault-text-muted)' }}>
              No general expenses recorded in this period.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {categoryBreakdown.map((item) => {
                const percent =
                  totalCosts.totalOther > 0
                    ? ((item.amount / totalCosts.totalOther) * 100).toFixed(0)
                    : 0

                return (
                  <div key={item.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600 }}>{item.category}</span>
                      <span className="font-mono">
                        {formatCurrency(item.amount, settings.currency)} ({percent}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        background: 'var(--vault-surface-2)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${percent}%`,
                          background: 'var(--vault-primary)',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Maintenance by Category */}
        <Card>
          <div className="card-header">
            <h3 className="card-title">Maintenance by Service Type</h3>
          </div>

          {maintenanceCategoryBreakdown.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--vault-text-muted)' }}>
              No maintenance records in this period.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {maintenanceCategoryBreakdown.map((item) => {
                const percent =
                  totalCosts.totalMaintenance > 0
                    ? ((item.amount / totalCosts.totalMaintenance) * 100).toFixed(0)
                    : 0

                return (
                  <div key={item.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600 }}>{item.category}</span>
                      <span className="font-mono">
                        {formatCurrency(item.amount, settings.currency)} ({percent}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        background: 'var(--vault-surface-2)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${percent}%`,
                          background: 'var(--vault-info)',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

