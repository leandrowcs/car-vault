import React, { useMemo } from 'react'
import {
  Car,
  Fuel,
  Wrench,
  Receipt,
  Gauge,
  DollarSign,
  TrendingDown,
  Bell,
  Plus,
  CheckCircle2,
} from 'lucide-react'
import { useCarVault } from '../context/CarVaultContext'
import {
  calculateFuelStats,
  calculateEvStats,
  calculateTotalVehicleCosts,
  calculateMonthlySpending,
  evaluateReminderStatus,
} from '../utils/calculations'
import {
  formatCurrency,
  formatDistance,
  formatConsumption,
  formatCostPerKm,
  formatDate,
} from '../utils/formatters'
import { Card } from '../components/common/Card'
import { ReminderBadge } from '../components/common/StatBadge'
import { SimpleBarChart } from '../components/charts/SimpleBarChart'
import type { NavView } from '../components/layout/Sidebar'

interface DashboardViewProps {
  onNavigate: (view: NavView) => void
  onAddFuel: () => void
  onAddExpense: () => void
  onAddMaintenance: () => void
  onAddReminder: () => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onAddFuel,
  onAddExpense,
  onAddMaintenance,
  onAddReminder,
}) => {
  const {
    activeVehicle,
    activeFuelEntries,
    activeChargingEntries,
    activeExpenses,
    activeMaintenanceRecords,
    activeReminders,
    settings,
    toggleReminderComplete,
  } = useCarVault()

  // Calculations for active vehicle
  const fuelStats = useMemo(
    () => calculateFuelStats(activeFuelEntries),
    [activeFuelEntries]
  )

  const evStats = useMemo(
    () => calculateEvStats(activeChargingEntries),
    [activeChargingEntries]
  )

  const totalCosts = useMemo(
    () =>
      calculateTotalVehicleCosts(
        activeFuelEntries,
        activeChargingEntries,
        activeMaintenanceRecords,
        activeExpenses,
        activeVehicle ? 0 : 0,
        activeVehicle ? activeVehicle.currentOdometer : 0
      ),
    [
      activeFuelEntries,
      activeChargingEntries,
      activeMaintenanceRecords,
      activeExpenses,
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

  // Reminders evaluated
  const evaluatedReminders = useMemo(() => {
    return activeReminders
      .map((r) => ({
        ...r,
        status: evaluateReminderStatus(r, activeVehicle?.currentOdometer),
      }))
      .sort((a, b) => {
        // Sort priority: overdue -> due-soon -> upcoming -> completed
        const score = { overdue: 0, 'due-soon': 1, upcoming: 2, completed: 3 }
        return score[a.status] - score[b.status]
      })
  }, [activeReminders, activeVehicle?.currentOdometer])

  const upcomingReminders = evaluatedReminders.filter((r) => !r.isCompleted).slice(0, 4)

  // Recent transactions timeline
  interface ActivityItem {
    id: string
    type: 'fuel' | 'charge' | 'expense' | 'maintenance'
    date: string
    title: string
    subtitle: string
    amount: number
  }

  const recentActivities: ActivityItem[] = useMemo(() => {
    const list: ActivityItem[] = []

    for (const f of activeFuelEntries) {
      list.push({
        id: f.id,
        type: 'fuel',
        date: f.date,
        title: `Fuel Fill-Up (${f.liters.toFixed(1)} L)`,
        subtitle: f.station || 'Fill-up',
        amount: f.totalCost,
      })
    }

    for (const c of activeChargingEntries) {
      list.push({
        id: c.id,
        type: 'charge',
        date: c.date,
        title: `EV Charge (${c.kwh.toFixed(1)} kWh)`,
        subtitle: c.chargingLocation || 'Charging session',
        amount: c.totalCost,
      })
    }

    for (const m of activeMaintenanceRecords) {
      list.push({
        id: m.id,
        type: 'maintenance',
        date: m.date,
        title: m.category,
        subtitle: m.description,
        amount: m.cost,
      })
    }

    for (const e of activeExpenses) {
      list.push({
        id: e.id,
        type: 'expense',
        date: e.date,
        title: e.category,
        subtitle: e.description,
        amount: e.amount,
      })
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6)
  }, [
    activeFuelEntries,
    activeChargingEntries,
    activeMaintenanceRecords,
    activeExpenses,
  ])

  if (!activeVehicle) {
    return (
      <div className="empty-state">
        <Car className="empty-state-icon" />
        <h3 className="empty-state-title">No Vehicle in Your Garage</h3>
        <p className="empty-state-desc">
          Add your first vehicle to start tracking fuel economy, maintenance intervals, and expenses.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onNavigate('garage')}
        >
          <Plus size={16} /> Add Vehicle
        </button>
      </div>
    )
  }

  const isEv = activeVehicle.fuelType === 'electric'

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* Vehicle Hero Banner */}
      <Card style={{ padding: '24px', borderLeft: '4px solid var(--vault-primary)' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--vault-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '4px',
              }}
            >
              Active Digital Garage • {new Date().getFullYear()}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--vault-text)' }}>
              {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}{' '}
              {activeVehicle.trim && (
                <span style={{ fontWeight: 400, color: 'var(--vault-text-secondary)', fontSize: '18px' }}>
                  {activeVehicle.trim}
                </span>
              )}
            </h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginTop: '8px',
                fontSize: '13.5px',
                color: 'var(--vault-text-secondary)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gauge size={16} color="var(--vault-primary)" />
                <b className="font-mono" style={{ color: 'var(--vault-text)' }}>
                  {formatDistance(activeVehicle.currentOdometer, settings.distanceUnit)}
                </b>
              </span>
              {activeVehicle.licensePlate && (
                <span className="badge badge-slate font-mono">
                  {activeVehicle.licensePlate}
                </span>
              )}
              <span style={{ textTransform: 'capitalize' }}>
                {activeVehicle.fuelType}
              </span>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onAddFuel}
            >
              <Plus size={14} /> {isEv ? 'Log Charge' : 'Log Fuel'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onAddExpense}
            >
              <Plus size={14} /> Add Expense
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onAddMaintenance}
            >
              <Plus size={14} /> Add Service
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onAddReminder}
            >
              <Plus size={14} /> Add Reminder
            </button>
          </div>
        </div>
      </Card>

      {/* Primary Automotive Cost & Consumption Metrics Grid */}
      <div className="grid-metrics">
        <div className="metric-card">
          <div className="metric-card-top">
            <span>Total Vehicle Cost</span>
            <DollarSign className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(totalCosts.grandTotal, settings.currency)}
          </div>
          <div className="metric-subtext">All historical spend</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Fuel / Energy</span>
            <Fuel className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(totalCosts.totalFuel, settings.currency)}
          </div>
          <div className="metric-subtext">
            {activeFuelEntries.length + activeChargingEntries.length} entries recorded
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Maintenance</span>
            <Wrench className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(totalCosts.totalMaintenance, settings.currency)}
          </div>
          <div className="metric-subtext">
            {activeMaintenanceRecords.length} service records
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Other Expenses</span>
            <Receipt className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(totalCosts.totalOther, settings.currency)}
          </div>
          <div className="metric-subtext">Insurance, tolls, parking...</div>
        </div>
      </div>

      {/* Automotive Efficiency Strip */}
      <div className="grid-metrics">
        <div className="metric-card" style={{ borderLeft: '3px solid var(--vault-primary)' }}>
          <div className="metric-card-top">
            <span>Average Consumption</span>
            <Gauge className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono" style={{ color: 'var(--vault-primary)' }}>
            {isEv
              ? evStats.kwhPer100Km !== null
                ? `${evStats.kwhPer100Km} kWh/100 km`
                : '—'
              : formatConsumption(fuelStats.averageLPer100Km, settings.fuelEconomyUnit)}
          </div>
          <div className="metric-subtext">Calculated over full tank intervals</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Average Price</span>
            <TrendingDown className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {isEv
              ? evStats.averagePricePerKwh > 0
                ? `$${evStats.averagePricePerKwh.toFixed(3)}/kWh`
                : '—'
              : fuelStats.averagePricePerLiter > 0
              ? `$${fuelStats.averagePricePerLiter.toFixed(3)}/L`
              : '—'}
          </div>
          <div className="metric-subtext">Weighted average fuel/energy price</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Cost Per KM</span>
            <DollarSign className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCostPerKm(totalCosts.costPerKm, settings.currency)}
          </div>
          <div className="metric-subtext">Total cost / recorded km</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Total Logged KM</span>
            <Car className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatDistance(fuelStats.totalDistanceKm || activeVehicle.currentOdometer, settings.distanceUnit)}
          </div>
          <div className="metric-subtext">Distance tracked in vault</div>
        </div>
      </div>

      {/* Main 2-Column Section: Spending Trends + Reminders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px' }}>
        {/* Monthly Spending Trend Chart */}
        <Card>
          <div className="card-header">
            <div>
              <h3 className="card-title">Spending History</h3>
              <p className="card-subtitle">Monthly breakdown across categories</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('statistics')}
            >
              Full Stats
            </button>
          </div>
          <SimpleBarChart data={monthlySpending} currency={settings.currency} />
        </Card>

        {/* Upcoming Reminders Card */}
        <Card>
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Bell size={18} color="var(--vault-primary)" />
                Upcoming Reminders
              </h3>
              <p className="card-subtitle">Upcoming services and renewals</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('reminders')}
            >
              View All ({activeReminders.length})
            </button>
          </div>

          {upcomingReminders.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--vault-text-muted)' }}>
              <CheckCircle2 size={32} color="var(--vault-success)" style={{ marginBottom: '8px' }} />
              <p>No active reminders! Your vehicle is up to date.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {upcomingReminders.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--vault-surface-2)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--vault-border)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--vault-text)' }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--vault-text-muted)' }}>
                      {r.dueDate && `Due ${formatDate(r.dueDate, settings.dateFormat)} `}
                      {r.targetOdometer &&
                        `• at ${r.targetOdometer.toLocaleString()} km (${Math.max(
                          0,
                          r.targetOdometer - activeVehicle.currentOdometer
                        ).toLocaleString()} km left)`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ReminderBadge status={r.status} />
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      title="Mark complete"
                      onClick={() => toggleReminderComplete(r.id)}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card>
        <div className="card-header">
          <div>
            <h3 className="card-title">Recent Transactions & Services</h3>
            <p className="card-subtitle">Latest fill-ups, maintenance, and vehicle expenses</p>
          </div>
        </div>

        {recentActivities.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--vault-text-muted)' }}>
            No transactions recorded yet. Use the buttons above to log your first fill-up or service!
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Activity</th>
                  <th>Details</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.map((act) => (
                  <tr key={act.id}>
                    <td className="font-mono" style={{ color: 'var(--vault-text-secondary)', fontSize: '12.5px' }}>
                      {formatDate(act.date, settings.dateFormat)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          act.type === 'fuel' || act.type === 'charge'
                            ? 'badge-amber'
                            : act.type === 'maintenance'
                            ? 'badge-blue'
                            : 'badge-slate'
                        }`}
                      >
                        {act.title}
                      </span>
                    </td>
                    <td style={{ color: 'var(--vault-text-secondary)' }}>{act.subtitle}</td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                      {formatCurrency(act.amount, settings.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
