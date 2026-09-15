import { describe, it, expect } from 'vitest'
import {
  calculateFuelStats,
  calculateEvStats,
  calculateCostPerKm,
  calculateTotalVehicleCosts,
  calculateMonthlySpending,
  evaluateReminderStatus,
} from './calculations'
import type { FuelEntry, ChargingEntry } from '../types/fuel'
import type { Expense } from '../types/expense'
import type { MaintenanceRecord } from '../types/maintenance'
import type { Reminder } from '../types/reminder'

describe('calculateFuelStats', () => {
  it('handles empty entries gracefully', () => {
    const stats = calculateFuelStats([])
    expect(stats.totalFuelCost).toBe(0)
    expect(stats.totalFuelLiters).toBe(0)
    expect(stats.averagePricePerLiter).toBe(0)
    expect(stats.averageLPer100Km).toBeNull()
    expect(stats.totalDistanceKm).toBe(0)
    expect(stats.fuelCostPerKm).toBeNull()
  })

  it('handles single entry (first fill-up does not have consumption yet)', () => {
    const entries: FuelEntry[] = [
      {
        id: '1',
        vehicleId: 'v1',
        date: '2026-01-01',
        odometer: 10000,
        liters: 45,
        pricePerLiter: 1.5,
        totalCost: 67.5,
        fullTank: true,
        createdAt: '2026-01-01',
      },
    ]

    const stats = calculateFuelStats(entries)
    expect(stats.totalFuelCost).toBe(67.5)
    expect(stats.totalFuelLiters).toBe(45)
    expect(stats.averagePricePerLiter).toBe(1.5)
    expect(stats.averageLPer100Km).toBeNull()
    expect(stats.totalDistanceKm).toBe(0)
  })

  it('calculates accurate L/100 km between two full tanks', () => {
    // 500 km driven, 35 liters used = (35 / 500) * 100 = 7.0 L/100 km
    const entries: FuelEntry[] = [
      {
        id: '1',
        vehicleId: 'v1',
        date: '2026-01-01',
        odometer: 10000,
        liters: 40,
        pricePerLiter: 1.5,
        totalCost: 60.0,
        fullTank: true,
        createdAt: '2026-01-01',
      },
      {
        id: '2',
        vehicleId: 'v1',
        date: '2026-01-10',
        odometer: 10500,
        liters: 35,
        pricePerLiter: 1.6,
        totalCost: 56.0,
        fullTank: true,
        createdAt: '2026-01-10',
      },
    ]

    const stats = calculateFuelStats(entries)
    expect(stats.totalFuelCost).toBe(116.0)
    expect(stats.totalFuelLiters).toBe(75)
    expect(stats.totalDistanceKm).toBe(500)
    expect(stats.averageLPer100Km).toBe(7.0)

    const entry2Stat = stats.entryStats.get('2')
    expect(entry2Stat).toBeDefined()
    expect(entry2Stat?.distanceKm).toBe(500)
    expect(entry2Stat?.lPer100Km).toBe(7.0)
  })

  it('accurately calculates consumption across partial tank fill-ups', () => {
    // Tank 1 (Full) @ 10000 km
    // Tank 2 (Partial, 15L) @ 10250 km (no calculation yet)
    // Tank 3 (Full, 20L) @ 10500 km -> Total 35L used across 500 km = 7.0 L/100 km
    const entries: FuelEntry[] = [
      {
        id: '1',
        vehicleId: 'v1',
        date: '2026-01-01',
        odometer: 10000,
        liters: 40,
        pricePerLiter: 1.5,
        totalCost: 60,
        fullTank: true,
        createdAt: '2026-01-01',
      },
      {
        id: '2',
        vehicleId: 'v1',
        date: '2026-01-05',
        odometer: 10250,
        liters: 15,
        pricePerLiter: 1.5,
        totalCost: 22.5,
        fullTank: false,
        createdAt: '2026-01-05',
      },
      {
        id: '3',
        vehicleId: 'v1',
        date: '2026-01-10',
        odometer: 10500,
        liters: 20,
        pricePerLiter: 1.5,
        totalCost: 30,
        fullTank: true,
        createdAt: '2026-01-10',
      },
    ]

    const stats = calculateFuelStats(entries)
    expect(stats.entryStats.get('2')).toBeUndefined()
    const entry3Stat = stats.entryStats.get('3')
    expect(entry3Stat).toBeDefined()
    expect(entry3Stat?.distanceKm).toBe(500)
    expect(entry3Stat?.liters).toBe(35)
    expect(entry3Stat?.lPer100Km).toBe(7.0)
    expect(stats.averageLPer100Km).toBe(7.0)
  })

  it('handles missed previous fill-up without producing corrupted consumption', () => {
    const entries: FuelEntry[] = [
      {
        id: '1',
        vehicleId: 'v1',
        date: '2026-01-01',
        odometer: 10000,
        liters: 40,
        pricePerLiter: 1.5,
        totalCost: 60,
        fullTank: true,
        createdAt: '2026-01-01',
      },
      {
        id: '2',
        vehicleId: 'v1',
        date: '2026-01-20',
        odometer: 11500,
        liters: 40,
        pricePerLiter: 1.5,
        totalCost: 60,
        fullTank: true,
        missedPreviousFillUp: true,
        createdAt: '2026-01-20',
      },
    ]

    const stats = calculateFuelStats(entries)
    expect(stats.entryStats.get('2')).toBeUndefined()
    expect(stats.averageLPer100Km).toBeNull()
    expect(stats.totalDistanceKm).toBe(1500)
  })
})

describe('calculateEvStats', () => {
  it('calculates EV kWh/100 km and cost per km', () => {
    // 50 kWh consumed across 250 km = 20 kWh / 100 km
    const charges: ChargingEntry[] = [
      {
        id: 'c1',
        vehicleId: 'v2',
        date: '2026-01-01',
        odometer: 5000,
        kwh: 20,
        pricePerKwh: 0.15,
        totalCost: 3.0,
        createdAt: '2026-01-01',
      },
      {
        id: 'c2',
        vehicleId: 'v2',
        date: '2026-01-05',
        odometer: 5250,
        kwh: 30,
        pricePerKwh: 0.2,
        totalCost: 6.0,
        createdAt: '2026-01-05',
      },
    ]

    const stats = calculateEvStats(charges)
    expect(stats.totalKwh).toBe(50)
    expect(stats.totalCost).toBe(9.0)
    expect(stats.averagePricePerKwh).toBe(0.18)
    expect(stats.kwhPer100Km).toBe(20.0)
    expect(stats.evCostPerKm).toBe(0.036)
  })
})

describe('calculateCostPerKm', () => {
  it('returns null for zero distance or invalid values', () => {
    expect(calculateCostPerKm(100, 0)).toBeNull()
    expect(calculateCostPerKm(0, 100)).toBeNull()
    expect(calculateCostPerKm(-10, 50)).toBeNull()
  })

  it('correctly computes cost per km', () => {
    expect(calculateCostPerKm(1000, 5000)).toBe(0.2)
  })
})

describe('calculateTotalVehicleCosts', () => {
  it('aggregates fuel, maintenance, and other expenses accurately', () => {
    const fuel: FuelEntry[] = [
      {
        id: 'f1',
        vehicleId: 'v1',
        date: '2026-01-01',
        odometer: 1000,
        liters: 40,
        pricePerLiter: 1.5,
        totalCost: 60,
        fullTank: true,
        createdAt: '2026-01-01',
      },
    ]
    const maint: MaintenanceRecord[] = [
      {
        id: 'm1',
        vehicleId: 'v1',
        date: '2026-01-02',
        odometer: 1050,
        category: 'Oil Change',
        description: 'Synthetic oil and filter',
        cost: 95,
        createdAt: '2026-01-02',
      },
    ]
    const exp: Expense[] = [
      {
        id: 'e1',
        vehicleId: 'v1',
        date: '2026-01-03',
        category: 'Insurance',
        amount: 150,
        description: 'Monthly premium',
        createdAt: '2026-01-03',
      },
    ]

    const totals = calculateTotalVehicleCosts(fuel, [], maint, exp, 0, 1050)
    expect(totals.totalFuel).toBe(60)
    expect(totals.totalMaintenance).toBe(95)
    expect(totals.totalOther).toBe(150)
    expect(totals.grandTotal).toBe(305)
    expect(totals.costPerKm).toBe(0.29)
  })
})

describe('calculateMonthlySpending', () => {
  it('groups spending correctly by month', () => {
    const fuel: FuelEntry[] = [
      {
        id: 'f1',
        vehicleId: 'v1',
        date: '2026-01-15',
        odometer: 1000,
        liters: 40,
        pricePerLiter: 1.5,
        totalCost: 60,
        fullTank: true,
        createdAt: '2026-01-15',
      },
    ]
    const maint: MaintenanceRecord[] = [
      {
        id: 'm1',
        vehicleId: 'v1',
        date: '2026-02-10',
        odometer: 1500,
        category: 'Tires',
        description: 'Tire rotation',
        cost: 50,
        createdAt: '2026-02-10',
      },
    ]

    const monthly = calculateMonthlySpending(fuel, [], maint, [])
    expect(monthly.length).toBe(2)
    expect(monthly[0].monthKey).toBe('2026-01')
    expect(monthly[0].fuel).toBe(60)
    expect(monthly[1].monthKey).toBe('2026-02')
    expect(monthly[1].maintenance).toBe(50)
  })
})

describe('evaluateReminderStatus', () => {
  const baseReminder: Reminder = {
    id: 'r1',
    vehicleId: 'v1',
    title: 'Oil Change',
    type: 'both',
    dueDate: '2026-03-01',
    targetOdometer: 10000,
    isCompleted: false,
    createdAt: '2026-01-01',
  }

  it('returns completed if reminder is completed', () => {
    const status = evaluateReminderStatus({ ...baseReminder, isCompleted: true })
    expect(status).toBe('completed')
  })

  it('identifies overdue reminders by date or mileage', () => {
    const refDate = new Date('2026-03-05') // past due date
    const status = evaluateReminderStatus(baseReminder, 9000, refDate)
    expect(status).toBe('overdue')

    const mileageOverdue = evaluateReminderStatus(
      baseReminder,
      10050,
      new Date('2026-02-01')
    )
    expect(mileageOverdue).toBe('overdue')
  })

  it('identifies due-soon reminders within 14 days or 500 km', () => {
    // 7 days before due date
    const dateDueSoon = evaluateReminderStatus(
      baseReminder,
      9000,
      new Date('2026-02-22')
    )
    expect(dateDueSoon).toBe('due-soon')

    // 200 km before target mileage
    const mileageDueSoon = evaluateReminderStatus(
      baseReminder,
      9800,
      new Date('2026-01-15')
    )
    expect(mileageDueSoon).toBe('due-soon')
  })

  it('identifies upcoming reminders when well ahead of date and mileage', () => {
    const status = evaluateReminderStatus(
      baseReminder,
      8000,
      new Date('2026-01-10')
    )
    expect(status).toBe('upcoming')
  })
})

