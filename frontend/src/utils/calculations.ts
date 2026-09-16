import type { FuelEntry, ChargingEntry, FuelConsumptionStat } from '../types/fuel'
import type { Expense } from '../types/expense'
import type { MaintenanceRecord } from '../types/maintenance'
import type { Reminder, ReminderStatus } from '../types/reminder'

export interface FuelStatsSummary {
  totalFuelCost: number
  totalFuelLiters: number
  averagePricePerLiter: number
  averageLPer100Km: number | null
  totalDistanceKm: number
  fuelCostPerKm: number | null
  entryStats: Map<string, FuelConsumptionStat>
}

/**
 * Calculates fuel consumption (L/100 km) and metrics across fill-up records.
 * Accurately tracks accumulated liters across partial fill-ups until a full tank is reached.
 * Gracefully handles missing odometers, out-of-order records, and zero distance.
 */
export function calculateFuelStats(entries: FuelEntry[]): FuelStatsSummary {
  if (!entries || entries.length === 0) {
    return {
      totalFuelCost: 0,
      totalFuelLiters: 0,
      averagePricePerLiter: 0,
      averageLPer100Km: null,
      totalDistanceKm: 0,
      fuelCostPerKm: null,
      entryStats: new Map(),
    }
  }

  // Sort ascending by odometer, or by date if odometer matches
  const sorted = [...entries].sort((a, b) => {
    if (a.odometer !== b.odometer) {
      return a.odometer - b.odometer
    }
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  let totalFuelCost = 0
  let totalFuelLiters = 0
  const entryStats = new Map<string, FuelConsumptionStat>()

  for (const entry of sorted) {
    totalFuelCost += entry.totalCost || 0
    totalFuelLiters += entry.liters || 0
  }

  const averagePricePerLiter =
    totalFuelLiters > 0 ? totalFuelCost / totalFuelLiters : 0

  let totalConsumptionLiters = 0
  let totalConsumptionDistanceKm = 0

  let accumulatedLiters = 0
  let accumulatedCost = 0
  let lastFullTankOdometer: number | null = null

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]

    if (current.missedPreviousFillUp) {
      // Reset tracking because missing intermediate records breaks calculation
      accumulatedLiters = 0
      accumulatedCost = 0
      lastFullTankOdometer = current.fullTank ? current.odometer : null
      continue
    }

    if (lastFullTankOdometer === null) {
      if (current.fullTank) {
        lastFullTankOdometer = current.odometer
      }
      continue
    }

    const intervalDistance = current.odometer - lastFullTankOdometer
    accumulatedLiters += current.liters
    accumulatedCost += current.totalCost

    if (current.fullTank) {
      if (intervalDistance > 0 && accumulatedLiters > 0) {
        const lPer100Km = (accumulatedLiters / intervalDistance) * 100
        const costPerKm = accumulatedCost / intervalDistance

        entryStats.set(current.id, {
          entryId: current.id,
          distanceKm: intervalDistance,
          liters: accumulatedLiters,
          lPer100Km: Number(lPer100Km.toFixed(2)),
          costPerKm: Number(costPerKm.toFixed(3)),
        })

        totalConsumptionLiters += accumulatedLiters
        totalConsumptionDistanceKm += intervalDistance
      }

      // Reset accumulator for next interval
      accumulatedLiters = 0
      accumulatedCost = 0
      lastFullTankOdometer = current.odometer
    }
  }

  const overallMinOdo = sorted[0].odometer
  const overallMaxOdo = sorted[sorted.length - 1].odometer
  const totalDistanceKm = Math.max(0, overallMaxOdo - overallMinOdo)

  const averageLPer100Km =
    totalConsumptionDistanceKm > 0
      ? Number(((totalConsumptionLiters / totalConsumptionDistanceKm) * 100).toFixed(2))
      : null

  const fuelCostPerKm =
    totalDistanceKm > 0
      ? Number((totalFuelCost / totalDistanceKm).toFixed(3))
      : null

  return {
    totalFuelCost: Number(totalFuelCost.toFixed(2)),
    totalFuelLiters: Number(totalFuelLiters.toFixed(2)),
    averagePricePerLiter: Number(averagePricePerLiter.toFixed(3)),
    averageLPer100Km,
    totalDistanceKm,
    fuelCostPerKm,
    entryStats,
  }
}

export interface EvStatsSummary {
  totalKwh: number
  totalCost: number
  averagePricePerKwh: number
  kwhPer100Km: number | null
  evCostPerKm: number | null
  totalDistanceKm: number
}

/**
 * Calculates EV / PHEV charging statistics (kWh/100 km, cost per km, averages).
 */
export function calculateEvStats(entries: ChargingEntry[]): EvStatsSummary {
  if (!entries || entries.length === 0) {
    return {
      totalKwh: 0,
      totalCost: 0,
      averagePricePerKwh: 0,
      kwhPer100Km: null,
      evCostPerKm: null,
      totalDistanceKm: 0,
    }
  }

  const sorted = [...entries].sort((a, b) => a.odometer - b.odometer)
  let totalKwh = 0
  let totalCost = 0

  for (const item of sorted) {
    totalKwh += item.kwh || 0
    totalCost += item.totalCost || 0
  }

  const averagePricePerKwh = totalKwh > 0 ? totalCost / totalKwh : 0
  const totalDistanceKm =
    sorted.length > 1
      ? Math.max(0, sorted[sorted.length - 1].odometer - sorted[0].odometer)
      : 0

  const kwhPer100Km =
    totalDistanceKm > 0
      ? Number(((totalKwh / totalDistanceKm) * 100).toFixed(2))
      : null

  const evCostPerKm =
    totalDistanceKm > 0
      ? Number((totalCost / totalDistanceKm).toFixed(3))
      : null

  return {
    totalKwh: Number(totalKwh.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    averagePricePerKwh: Number(averagePricePerKwh.toFixed(3)),
    kwhPer100Km,
    evCostPerKm,
    totalDistanceKm,
  }
}

/**
 * Safely calculates cost per kilometer.
 */
export function calculateCostPerKm(totalCost: number, distanceKm: number): number | null {
  if (!distanceKm || distanceKm <= 0 || !totalCost || totalCost <= 0) {
    return null
  }
  return Number((totalCost / distanceKm).toFixed(3))
}

export interface VehicleExpenseSummary {
  totalFuel: number
  totalMaintenance: number
  totalOther: number
  grandTotal: number
  costPerKm: number | null
  totalDistanceKm: number
}

/**
 * Calculates total costs across all streams (fuel, charging, maintenance, and expenses).
 */
export function calculateTotalVehicleCosts(
  fuelEntries: FuelEntry[],
  chargingEntries: ChargingEntry[],
  maintenanceRecords: MaintenanceRecord[],
  expenses: Expense[],
  initialOdometer = 0,
  currentOdometer = 0
): VehicleExpenseSummary {
  const fuelTotal =
    (fuelEntries || []).reduce((acc, f) => acc + (f.totalCost || 0), 0) +
    (chargingEntries || []).reduce((acc, c) => acc + (c.totalCost || 0), 0)

  const maintenanceTotal = (maintenanceRecords || []).reduce(
    (acc, m) => acc + (m.cost || 0),
    0
  )

  const otherTotal = (expenses || []).reduce((acc, e) => acc + (e.amount || 0), 0)
  const grandTotal = fuelTotal + maintenanceTotal + otherTotal

  const totalDistanceKm = Math.max(0, currentOdometer - initialOdometer)
  const costPerKm = calculateCostPerKm(grandTotal, totalDistanceKm)

  return {
    totalFuel: Number(fuelTotal.toFixed(2)),
    totalMaintenance: Number(maintenanceTotal.toFixed(2)),
    totalOther: Number(otherTotal.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
    costPerKm,
    totalDistanceKm,
  }
}

export interface MonthlySpending {
  monthKey: string // YYYY-MM
  label: string // e.g. "Jan 2026"
  fuel: number
  maintenance: number
  expenses: number
  total: number
}

/**
 * Aggregates all spending into monthly buckets for charts and financial reviews.
 */
export function calculateMonthlySpending(
  fuelEntries: FuelEntry[],
  chargingEntries: ChargingEntry[],
  maintenanceRecords: MaintenanceRecord[],
  expenses: Expense[]
): MonthlySpending[] {
  const monthMap = new Map<string, { fuel: number; maintenance: number; expenses: number }>()

  const addAmount = (
    dateStr: string,
    amount: number,
    type: 'fuel' | 'maintenance' | 'expenses'
  ) => {
    if (!dateStr || !amount) return
    const key = dateStr.slice(0, 7) // 'YYYY-MM'
    if (!monthMap.has(key)) {
      monthMap.set(key, { fuel: 0, maintenance: 0, expenses: 0 })
    }
    const current = monthMap.get(key)!
    current[type] += amount
  }

  for (const f of fuelEntries || []) addAmount(f.date, f.totalCost, 'fuel')
  for (const c of chargingEntries || []) addAmount(c.date, c.totalCost, 'fuel')
  for (const m of maintenanceRecords || []) addAmount(m.date, m.cost, 'maintenance')
  for (const e of expenses || []) addAmount(e.date, e.amount, 'expenses')

  const keys = Array.from(monthMap.keys()).sort()
  return keys.map((key) => {
    const data = monthMap.get(key)!
    const [year, month] = key.split('-')
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1)
    const label = dateObj.toLocaleString('en-CA', { month: 'short', year: 'numeric' })
    const total = data.fuel + data.maintenance + data.expenses

    return {
      monthKey: key,
      label,
      fuel: Number(data.fuel.toFixed(2)),
      maintenance: Number(data.maintenance.toFixed(2)),
      expenses: Number(data.expenses.toFixed(2)),
      total: Number(total.toFixed(2)),
    }
  })
}

/**
 * Evaluates the status of a reminder based on mileage and calendar date.
 */
export function evaluateReminderStatus(
  reminder: Reminder,
  currentOdometer?: number,
  referenceDate = new Date()
): ReminderStatus {
  if (reminder.isCompleted) {
    return 'completed'
  }

  let dateStatus: ReminderStatus = 'upcoming'
  let mileageStatus: ReminderStatus = 'upcoming'

  // Date check
  if (reminder.dueDate && (reminder.type === 'date' || reminder.type === 'both')) {
    const dueTime = new Date(reminder.dueDate).getTime()
    const nowTime = referenceDate.getTime()
    const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      dateStatus = 'overdue'
    } else if (diffDays <= 14) {
      dateStatus = 'due-soon'
    } else {
      dateStatus = 'upcoming'
    }
  }

  // Mileage check
  const targetOdo =
    reminder.targetOdometer !== undefined
      ? reminder.targetOdometer
      : reminder.dueMileage

  if (
    targetOdo !== undefined &&
    currentOdometer !== undefined &&
    (reminder.type === 'mileage' || reminder.type === 'both')
  ) {
    const remainingKm = targetOdo - currentOdometer

    if (remainingKm <= 0) {
      mileageStatus = 'overdue'
    } else if (remainingKm <= 500) {
      mileageStatus = 'due-soon'
    } else {
      mileageStatus = 'upcoming'
    }
  }

  // If either criteria is overdue, the reminder is overdue
  if (dateStatus === 'overdue' || mileageStatus === 'overdue') {
    return 'overdue'
  }

  // If either criteria is due soon, the reminder is due soon
  if (dateStatus === 'due-soon' || mileageStatus === 'due-soon') {
    return 'due-soon'
  }

  return 'upcoming'
}


export interface SuggestedReminder extends Reminder {
  reason: string
  action: 'fuel' | 'maintenance'
  daysRemaining?: number
}

const dayMilliseconds = 86_400_000
const calendarDay = (date: string) => Date.parse(date.slice(0, 10) + 'T00:00:00Z')
const isoDay = (date: number) => new Date(date).toISOString().slice(0, 10)

/** Recent positive, consecutive intervals; missing fill-ups break the series. */
export function calculateRefillInterval(entries: FuelEntry[], today = '9999-12-31') {
  const sorted = entries.filter(e => e.date.slice(0, 10) <= today).sort((a, b) => a.date.localeCompare(b.date) || a.odometer - b.odometer).slice(-9)
  const intervals: { days: number; km: number }[] = []
  for (let i = 1; i < sorted.length; i++) {
    const days = (calendarDay(sorted[i].date) - calendarDay(sorted[i - 1].date)) / dayMilliseconds
    const km = sorted[i].odometer - sorted[i - 1].odometer
    if (!sorted[i].missedPreviousFillUp && days > 0 && km > 0) intervals.push({ days, km })
  }
  if (!intervals.length) return null
  return {
    days: Math.max(1, Math.round(intervals.reduce((sum, x) => sum + x.days, 0) / intervals.length)),
    km: Math.round(intervals.reduce((sum, x) => sum + x.km, 0) / intervals.length),
    samples: intervals.length,
    latest: sorted[sorted.length - 1],
  }
}

/** Derived suggestions are never persisted or marked completed without a real record. */
export function calculateSuggestedReminders(
  vehicle: { id: string; fuelType: string },
  fuel: FuelEntry[],
  maintenance: MaintenanceRecord[],
  reminders: Reminder[],
  referenceDate = new Date(),
): SuggestedReminder[] {
  const today = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}-${String(referenceDate.getDate()).padStart(2, '0')}`
  const now = calendarDay(today)
  const result: SuggestedReminder[] = []
  const add = (id: string, title: string, reason: string, action: SuggestedReminder['action'], dueDate?: string, targetOdometer?: number) => result.push({
    id: `suggested-${vehicle.id}-${id}`, vehicleId: vehicle.id, title, reason, action,
    daysRemaining: dueDate ? Math.round((calendarDay(dueDate) - now) / dayMilliseconds) : undefined,
    dueDate, targetOdometer, type: dueDate && targetOdometer !== undefined ? 'both' : dueDate ? 'date' : 'mileage',
    isCompleted: false, createdAt: today,
  })
  const interval = calculateRefillInterval(fuel.filter(f => f.vehicleId === vehicle.id), today)
  if (vehicle.fuelType !== 'electric' && interval) {
    add('fuel', 'Expected next fill-up', `Estimate from ${interval.samples} recent intervals: every ${interval.days} days.`, 'fuel', isoDay(calendarDay(interval.latest.date) + interval.days * dayMilliseconds), interval.latest.odometer + interval.km)
  }
  const records = maintenance.filter(m => m.vehicleId === vehicle.id && m.date.slice(0, 10) <= today).sort((a, b) => a.date.localeCompare(b.date) || a.odometer - b.odometer)
  for (const [category, title] of [['Oil Change', 'Expected oil change'], ['Scheduled Maintenance', 'Expected scheduled service']]) {
    if (category === 'Oil Change' && vehicle.fuelType === 'electric') continue
    if (reminders.some(r => r.vehicleId === vehicle.id && !r.isCompleted && r.category === category)) continue
    const history = records.filter(m => m.category === category).slice(-4)
    const gaps = history.slice(1).map((m, i) => m.odometer - history[i].odometer).filter(km => km > 0)
    if (gaps.length) {
      const km = Math.round(gaps.reduce((sum, x) => sum + x, 0) / gaps.length)
      add(category, title, 'Estimated from recorded service intervals. Follow your manufacturer’s schedule.', 'maintenance', undefined, history[history.length - 1].odometer + km)
    }
  }
  // Québec: winter tires Dec 1–Mar 15 inclusive. Summer change is optional.
  const year = referenceDate.getFullYear()
  // Switch to winter planning once its date is closer than this year's summer date.
  const winterPlanningStart = isoDay(Math.ceil(
    (calendarDay(`${year}-03-16`) + calendarDay(`${year}-12-01`)) / (2 * dayMilliseconds),
  ) * dayMilliseconds)
  for (const season of ['winter', 'summer'] as const) {
    const targetYear = season === 'winter' && referenceDate.getMonth() < 3 ? year - 1 : year
    const target = `${targetYear}-${season === 'winter' ? '12-01' : '03-16'}`
    const starts = `${targetYear}-${season === 'winter' ? '10-01' : '01-16'}`
    const ends = season === 'winter' ? `${targetYear + 1}-03-15` : `${targetYear}-09-30`
    const planningStart = season === 'winter' && targetYear === year ? winterPlanningStart : starts
    if (today < planningStart || today > ends || (season === 'summer' && today >= winterPlanningStart)) continue
    const category = season === 'winter' ? 'Winter Tire Installation' : 'Summer Tire Installation'
    const tireRecords = records.filter(m => m.category === 'Winter Tire Installation' || m.category === 'Summer Tire Installation')
    const latest = tireRecords.at(-1)
    // A confirmed set remains installed until the opposite set is recorded.
    if (latest?.category === category) continue
    const pastSeasons = records.filter(m => m.category === category && m.date.slice(0, 4) < String(targetYear))
    let due = target
    const previous = pastSeasons.at(-1)
    if (previous) {
      const anniversary = `${targetYear}-${previous.date.slice(5, 10)}`
      if (Number.isFinite(calendarDay(anniversary))) {
        // History may suggest an earlier winter appointment or a later spring appointment.
        due = season === 'winter' ? (anniversary < target && anniversary >= starts ? anniversary : target) : (anniversary > target && anniversary < ends ? anniversary : target)
      }
    }
    add(season, season === 'winter' ? 'Install winter tires' : 'Plan summer tire change', season === 'winter'
      ? 'Québec requirement: December 1–March 15. Confirm installation in the service log.'
      : 'Optional seasonal change, March 16 at the earliest. Choose a date appropriate for the weather.', 'maintenance', due)
  }
  return result.filter(r => !r.dueDate || Number.isFinite(calendarDay(r.dueDate)) && Number.isFinite(now))
}

export interface TimelineActivity {
  id: string
  type: 'fuel' | 'charge' | 'expense' | 'maintenance'
  date: string
  title: string
  detail: string
  amount: number
  odometer?: number
  liters?: number
  consumption?: number
}

export function calculateActivityTimeline(fuel: FuelEntry[], charges: ChargingEntry[], maintenance: MaintenanceRecord[], expenses: Expense[]) {
  const stats = calculateFuelStats(fuel)
  const activities: TimelineActivity[] = [
    ...fuel.map(f => ({ id: `fuel-${f.id}`, type: 'fuel' as const, date: f.date, title: f.fuelType || 'Fuel fill-up', detail: f.station || (f.fullTank ? 'Full tank' : 'Partial fill'), amount: f.totalCost, odometer: f.odometer, liters: f.liters, consumption: stats.entryStats.get(f.id)?.lPer100Km })),
    ...charges.map(c => ({ id: `charge-${c.id}`, type: 'charge' as const, date: c.date, title: 'EV charge', detail: `${c.kwh.toFixed(1)} kWh${c.chargingLocation ? ' · ' + c.chargingLocation : ''}`, amount: c.totalCost, odometer: c.odometer })),
    ...maintenance.map(m => ({ id: `maintenance-${m.id}`, type: 'maintenance' as const, date: m.date, title: m.category, detail: m.description, amount: m.cost, odometer: m.odometer })),
    ...expenses.map(e => ({ id: `expense-${e.id}`, type: 'expense' as const, date: e.date, title: e.category, detail: e.description, amount: e.amount, odometer: e.odometer })),
  ]
  activities.sort((a, b) => b.date.localeCompare(a.date) || (b.odometer ?? 0) - (a.odometer ?? 0) || a.id.localeCompare(b.id))
  const months = new Map<string, TimelineActivity[]>()
  for (const activity of activities) {
    const key = activity.date.slice(0, 7)
    months.set(key, [...(months.get(key) || []), activity])
  }
  return [...months].map(([month, entries]) => {
    // Count full-tank intervals ending this month, including cross-month intervals.
    const intervalStats = fuel.filter(f => f.date.startsWith(month)).flatMap(f => {
      const value = stats.entryStats.get(f.id)
      return value ? [value] : []
    })
    const distance = intervalStats.reduce((sum, s) => sum + s.distanceKm, 0)
    const liters = intervalStats.reduce((sum, s) => sum + s.liters, 0)
    return { month, entries, total: entries.reduce((sum, e) => sum + e.amount, 0), distance,
      consumption: distance > 0 ? liters / distance * 100 : null,
      refillInterval: calculateRefillInterval(fuel.filter(f => f.date.startsWith(month))) }
  })
}
