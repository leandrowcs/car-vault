import { getLanguage } from '../services/language'
import { useTranslation } from '../hooks/useTranslation'
import React, { useMemo, useState } from 'react'
import { getDashboardMetricsExpanded, saveDashboardMetricsExpanded } from '../services/dashboardPreferences'
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
  ChevronDown,
  ChartColumn,
  History,
} from 'lucide-react'
import { useCarVault } from '../context/CarVaultContext'
import {
  calculateFuelStats,
  calculateEvStats,
  calculateTotalVehicleCosts,
  calculateMonthlySpending,
  evaluateReminderStatus,
  calculateSuggestedReminders,
} from '../utils/calculations'
import {
  formatCurrency,
  formatDistance,
  formatConsumption,
  formatCostPerKm,
  formatDate,
} from '../utils/formatters'
import { ActivityTimeline } from '../components/ActivityTimeline'
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
  const t = useTranslation()
  const [metricsExpanded, setMetricsExpanded] = useState(getDashboardMetricsExpanded)
  const [spendingExpanded, setSpendingExpanded] = useState(true)
  const [remindersExpanded, setRemindersExpanded] = useState(true)
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

  const upcomingReminders = evaluatedReminders.filter((r) => !r.isCompleted)

  const suggestions = activeVehicle && !activeVehicle.isSold ? calculateSuggestedReminders(activeVehicle, activeFuelEntries, activeMaintenanceRecords, activeReminders) : []

  if (!activeVehicle) {
    return (
      <div className="empty-state">
        <Car className="empty-state-icon" />
        <h3 className="empty-state-title">{t("No Vehicle in Your Garage")}</h3>
        <p className="empty-state-desc">
          {t("Add your first vehicle to start tracking fuel economy, maintenance intervals, and expenses.")}
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onNavigate('garage')}
        >
          <Plus size={16} /> {t("Add Vehicle")}
        </button>
      </div>
    )
  }

  const isEv = activeVehicle.fuelType === 'electric'

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {/* Vehicle Hero Banner */}
      <Card style={{ padding: '12px', borderLeft: '4px solid var(--vault-primary)' }}>
        <div className="garage-hero-layout">
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--vault-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Car size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{t("Active Digital Garage •")} {new Date().getFullYear()}</span>
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
                flexWrap: 'wrap',
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
                {t(activeVehicle.fuelType)}
              </span>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="garage-hero-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onAddFuel}
            >
              <Plus size={14} /> {isEv ? t("Log Charge") : t("Add Fuel")}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onAddExpense}
            >
              <Plus size={14} /> {t("Add Expense")}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onAddMaintenance}
            >
              <Plus size={14} /> {t("Add Service")}
            </button>
            {/* <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onAddReminder}
            >
              <Plus size={14} /> {t("Add Reminder")}
            </button> */}
          </div>
        </div>
      </Card>

      <details
        className="dashboard-metrics"
        open={metricsExpanded}
        onToggle={(event) => {
          const expanded = event.currentTarget.open
          setMetricsExpanded(expanded)
          saveDashboardMetricsExpanded(expanded)
        }}
      >
        <summary>
          <Gauge size={18} aria-hidden="true" />
          <span>{t('Costs & consumption summary')}</span>
          <ChevronDown size={18} className="dashboard-metrics-chevron" aria-hidden="true" />
        </summary>
        <div className="dashboard-metrics-content">
          {/* Primary Automotive Cost & Consumption Metrics Grid */}
          <div className="grid-metrics">
            <div className="metric-card">
              <div className="metric-card-top">
                <span>{t("Total Vehicle Cost")}</span>
                <DollarSign className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {formatCurrency(totalCosts.grandTotal, settings.currency)}
              </div>
              <div className="metric-subtext">{t("All historical spend")}</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>{t("Fuel / Energy")}</span>
                <Fuel className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {formatCurrency(totalCosts.totalFuel, settings.currency)}
              </div>
              <div className="metric-subtext">
                {activeFuelEntries.length + activeChargingEntries.length} {t("entries recorded")}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>{t("Maintenance")}</span>
                <Wrench className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {formatCurrency(totalCosts.totalMaintenance, settings.currency)}
              </div>
              <div className="metric-subtext">
                {activeMaintenanceRecords.length} {t("service records")}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>{t("Other Expenses")}</span>
                <Receipt className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {formatCurrency(totalCosts.totalOther, settings.currency)}
              </div>
              <div className="metric-subtext">{t("Insurance, tolls, parking...")}</div>
            </div>
          </div>

          {/* Automotive Efficiency Strip */}
          <div className="grid-metrics">
            <div className="metric-card" style={{ borderLeft: '3px solid var(--vault-primary)' }}>
              <div className="metric-card-top">
                <span>{t("Average Consumption")}</span>
                <Gauge className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono" style={{ color: 'var(--vault-primary)' }}>
                {isEv ? evStats.kwhPer100Km !== null ? t("{0} kWh/100 km", { "0": evStats.kwhPer100Km ?? '' }) : '—' : formatConsumption(fuelStats.averageLPer100Km, settings.fuelEconomyUnit)}
              </div>
              <div className="metric-subtext">{t("Calculated over full tank intervals")}</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>{t("Average Price")}</span>
                <TrendingDown className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {isEv ? evStats.averagePricePerKwh > 0 ? t("${0}/kWh", { "0": evStats.averagePricePerKwh.toFixed(3) ?? '' }) : '—' : fuelStats.averagePricePerLiter > 0 ? t("${0}/L", { "0": fuelStats.averagePricePerLiter.toFixed(3) ?? '' }) : '—'}
              </div>
              <div className="metric-subtext">{t("Weighted average fuel/energy price")}</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>{t("Cost Per KM")}</span>
                <DollarSign className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {formatCostPerKm(totalCosts.costPerKm, settings.currency)}
              </div>
              <div className="metric-subtext">{t("Total cost / recorded km")}</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span>{t("Total Logged KM")}</span>
                <Car className="metric-card-icon" />
              </div>
              <div className="metric-value font-mono">
                {formatDistance(fuelStats.totalDistanceKm || activeVehicle.currentOdometer, settings.distanceUnit)}
              </div>
              <div className="metric-subtext">{t("Distance tracked in vault")}</div>
            </div>
          </div>

          <button type="button" className="btn btn-secondary btn-sm dashboard-metrics-link" onClick={() => onNavigate('statistics')}>
            {t('View statistics')}
          </button>
        </div>
      </details>

      {/* Main 2-Column Section: Spending Trends + Reminders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '12px', alignItems: 'start' }}>
        {/* Monthly Spending Trend Chart */}
        <Card>
          <div className={`card-header dashboard-card-header ${spendingExpanded ? '' : 'is-collapsed'}`}>
            <div>
              <h3 className="card-title">
                <button type="button" className="dashboard-card-toggle" aria-expanded={spendingExpanded} aria-controls="dashboard-spending-content" onClick={() => setSpendingExpanded(!spendingExpanded)}>
                  <ChartColumn size={18} color="var(--vault-primary)" aria-hidden="true" />
                  {t("Spending History")}
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
              </h3>
              {spendingExpanded && <p className="card-subtitle">{t("Monthly breakdown across categories")}</p>}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('statistics')}
            >
              {t("Full Stats")}
            </button>
          </div>
          <div id="dashboard-spending-content" hidden={!spendingExpanded}>
            {spendingExpanded && <SimpleBarChart data={monthlySpending} currency={settings.currency} />}
          </div>
        </Card>

        {/* Upcoming Reminders Card */}
        <Card>
          <div className="card-header dashboard-card-header">
            <div>
              <h3 className="card-title">
                <button type="button" className="dashboard-card-toggle" aria-expanded={remindersExpanded} aria-controls="dashboard-reminders-content" onClick={() => setRemindersExpanded(!remindersExpanded)}>
                  <Bell size={18} color="var(--vault-primary)" aria-hidden="true" />
                  {t("Upcoming Reminders")}
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
              </h3>
              {remindersExpanded && <p className="card-subtitle">{t("Predictions, services and seasonal tire changes")}</p>}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('reminders')}
            >
              {t("All Reminders (")}{activeReminders.length})
            </button>
          </div>

          {!remindersExpanded && (
            <div className="dashboard-reminder-summaries">
              {[
                ...suggestions.map(r => ({ ...r, title: t(r.title), status: evaluateReminderStatus(r, activeVehicle.currentOdometer), optional: r.id.endsWith('-summer') })),
                ...upcomingReminders.map(r => ({ ...r, optional: false })),
              ].map(r => (
                <button type="button" key={r.id} className="dashboard-reminder-summary" onClick={() => setRemindersExpanded(true)} aria-expanded={false} aria-controls="dashboard-reminders-content">
                  <span className="dashboard-reminder-summary-heading"><strong>{r.title}</strong>{r.optional ? <span className="badge badge-slate">{t("Optional")}</span> : <ReminderBadge status={r.status} />}</span>
                  {(r.dueDate || r.targetOdometer !== undefined) && (
                    <span className="dashboard-reminder-summary-target">
                      {r.dueDate && formatDate(r.dueDate, settings.dateFormat)}
                      {r.dueDate && r.targetOdometer !== undefined && ' · '}
                      {r.targetOdometer !== undefined && formatDistance(r.targetOdometer, settings.distanceUnit)}
                    </span>
                  )}
                </button>
              ))}
              {suggestions.length === 0 && upcomingReminders.length === 0 && <p className="card-subtitle">{t("No manually scheduled reminders.")}</p>}
            </div>
          )}
          <div id="dashboard-reminders-content" hidden={!remindersExpanded}>
          <div className="smart-reminders">
            {suggestions.map(r => <div className="smart-reminder" key={r.id}>
              <div className="smart-reminder-content">
              <div className="smart-reminder-heading"><strong>{t(r.title)}</strong>{r.id.endsWith('-summer') ? <span className="badge badge-slate">{t("Optional")}</span> : <ReminderBadge status={evaluateReminderStatus(r, activeVehicle.currentOdometer)} />}</div>
              <p className="smart-reminder-target">{r.dueDate && (formatDate(r.dueDate, settings.dateFormat))}{r.daysRemaining !== undefined && (` (${r.daysRemaining > 0 ? t('in {0} days', { 0: r.daysRemaining }) : r.daysRemaining === 0 ? t('today') : t('{0} days ago', { 0: Math.abs(r.daysRemaining) })})`)}{r.targetOdometer !== undefined && (t(" · {0} km ({1} km left)", { "0": r.targetOdometer.toLocaleString(getLanguage()) ?? '', "1": Math.max(0, r.targetOdometer - activeVehicle.currentOdometer).toLocaleString(getLanguage()) ?? '' }))}</p>
              <details className="reminder-details"><summary>{t("Details")}</summary><p>{t(r.reason, r.reasonValues)}</p></details>
              </div>
              <button type="button" className="btn btn-secondary btn-icon reminder-log" aria-label={`${t(r.action === 'fuel' ? 'Log fill-up' : 'Log service')}: ${t(r.title)}`} title={r.action === 'fuel' ? t("Log fill-up") : t("Log service")} onClick={r.action === 'fuel' ? onAddFuel : onAddMaintenance}>{r.action === 'fuel' ? <Fuel size={18} /> : <Wrench size={18} />}</button>
            </div>)}
            <button type="button" className="btn btn-secondary btn-sm" onClick={onAddReminder}>{t("Set oil / service mileage target")}</button>
            <details className="reminder-details reminder-help"><summary>{t("How reminders work")}</summary><p className="card-subtitle">{t("Service predictions need two matching records. Otherwise, set a mileage target from your maintenance schedule. Record seasonal tires using Winter / Summer Tire Installation.")}</p></details>
          </div>
          {upcomingReminders.length === 0 ? (
            <div style={{ padding: '8px 0', textAlign: 'center', color: 'var(--vault-text-muted)' }}>
              <p>{t("No manually scheduled reminders.")}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {upcomingReminders.map((r) => (
                <div
                  key={r.id}
                  className="manual-reminder"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
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
                      {r.dueDate && (t("Due {0} ", { "0": formatDate(r.dueDate, settings.dateFormat) ?? '' }))}
                      {r.targetOdometer && (t("• at {0} km ({1} km left)", { "0": r.targetOdometer.toLocaleString(getLanguage()) ?? '', "1": Math.max(
                          0,
                          r.targetOdometer - activeVehicle.currentOdometer
                        ).toLocaleString(getLanguage()) ?? '' }))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ReminderBadge status={r.status} />
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      title={t("Mark complete")}
                      onClick={() => toggleReminderComplete(r.id)}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card>
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <History size={18} color="var(--vault-primary)" aria-hidden="true" style={{ flexShrink: 0 }} />
              {t("Recent Transactions & Services")}
            </h3>
            <p className="card-subtitle">{t("Latest fill-ups, maintenance, and vehicle expenses")}</p>
          </div>
        </div>

        <ActivityTimeline key={activeVehicle.id} />
      </Card>
    </div>
  )
}
