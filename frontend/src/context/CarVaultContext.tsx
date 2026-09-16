import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react'
import type {
  CarVaultData,
  Vehicle,
  FuelEntry,
  ChargingEntry,
  Expense,
  MaintenanceRecord,
  Reminder,
  VehicleDocument,
  UserSettings,
} from '../types'
import { CarVaultStorage } from '../services/storage'
import { DEMO_VAULT_DATA } from '../services/demoData'
import { VaultStore, type VaultState } from '../services/vaultStore'
import { createFirestoreAdapter } from '../services/firestoreVault'
import { mergeLocalVault } from '../services/vaultRecords'

interface CarVaultContextType {
  data: CarVaultData
  sync: VaultState
  retrySync: () => void
  importLocalData: () => void
  vehicles: Vehicle[]
  activeVehicle: Vehicle | null
  activeVehicleId: string | null
  setActiveVehicleId: (id: string | null) => void

  // Filtered by active vehicle
  activeFuelEntries: FuelEntry[]
  activeChargingEntries: ChargingEntry[]
  activeExpenses: Expense[]
  activeMaintenanceRecords: MaintenanceRecord[]
  activeReminders: Reminder[]
  activeDocuments: VehicleDocument[]

  // All entries
  allFuelEntries: FuelEntry[]
  allChargingEntries: ChargingEntry[]
  allExpenses: Expense[]
  allMaintenanceRecords: MaintenanceRecord[]
  allReminders: Reminder[]
  allDocuments: VehicleDocument[]

  settings: UserSettings

  // Vehicle operations
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => Vehicle
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void
  deleteVehicle: (id: string) => void

  // Fuel & Charging operations
  addFuelEntry: (entry: Omit<FuelEntry, 'id' | 'createdAt'>) => void
  updateFuelEntry: (id: string, updates: Partial<FuelEntry>) => void
  deleteFuelEntry: (id: string) => void

  addChargingEntry: (entry: Omit<ChargingEntry, 'id' | 'createdAt'>) => void
  updateChargingEntry: (id: string, updates: Partial<ChargingEntry>) => void
  deleteChargingEntry: (id: string) => void

  // Expense operations
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void
  updateExpense: (id: string, updates: Partial<Expense>) => void
  deleteExpense: (id: string) => void

  // Maintenance operations
  addMaintenanceRecord: (record: Omit<MaintenanceRecord, 'id' | 'createdAt'>) => void
  updateMaintenanceRecord: (id: string, updates: Partial<MaintenanceRecord>) => void
  deleteMaintenanceRecord: (id: string) => void

  // Reminder operations
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => void
  updateReminder: (id: string, updates: Partial<Reminder>) => void
  toggleReminderComplete: (id: string) => void
  deleteReminder: (id: string) => void

  // Document operations
  addDocument: (doc: Omit<VehicleDocument, 'id' | 'createdAt'>) => void
  updateDocument: (id: string, updates: Partial<VehicleDocument>) => void
  deleteDocument: (id: string) => void

  // Settings & System
  updateSettings: (updates: Partial<UserSettings>) => void
  loadDemoData: () => void
  restoreData: (newData: CarVaultData) => void
  resetAllData: () => void
}

const CarVaultContext = createContext<CarVaultContextType | undefined>(undefined)

export const CarVaultProvider: React.FC<{ children: React.ReactNode; uid?: string }> = ({
  children, uid,
}) => {
  const [store] = useState(() => new VaultStore(uid ? createFirestoreAdapter(uid) : undefined))
  const sync = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const data = sync.data
  const setData = store.update
  useEffect(store.start, [store])

  const activeVehicleId = data.settings.activeVehicleId

  const setActiveVehicleId = useCallback((id: string | null) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        activeVehicleId: id,
      },
    }))
  }, [])

  const activeVehicle = useMemo(() => {
    if (!data.vehicles || data.vehicles.length === 0) return null
    if (!activeVehicleId) return data.vehicles[0]
    return data.vehicles.find((v) => v.id === activeVehicleId) || data.vehicles[0]
  }, [data.vehicles, activeVehicleId])

  // Helper to bump odometer if new entry has higher odometer
  const maybeBumpOdometer = useCallback(
    (vehicleId: string, odo?: number) => {
      if (!odo) return
      setData((prev) => {
        const target = prev.vehicles.find((v) => v.id === vehicleId)
        if (target && odo > target.currentOdometer) {
          return {
            ...prev,
            vehicles: prev.vehicles.map((v) =>
              v.id === vehicleId
                ? { ...v, currentOdometer: odo, updatedAt: new Date().toISOString() }
                : v
            ),
          }
        }
        return prev
      })
    },
    []
  )

  // Vehicles
  const addVehicle = useCallback(
    (vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Vehicle => {
      const now = new Date().toISOString()
      const newVehicle: Vehicle = {
        ...vehicleData,
        id: `veh-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: now,
        updatedAt: now,
      }

      setData((prev) => {
        const nextVehicles = [...prev.vehicles, newVehicle]
        return {
          ...prev,
          vehicles: nextVehicles,
          settings: {
            ...prev.settings,
            activeVehicleId: prev.settings.activeVehicleId || newVehicle.id,
          },
        }
      })

      return newVehicle
    },
    []
  )

  const updateVehicle = useCallback((id: string, updates: Partial<Vehicle>) => {
    setData((prev) => ({
      ...prev,
      vehicles: prev.vehicles.map((v) =>
        v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
      ),
    }))
  }, [])

  const deleteVehicle = useCallback(
    (id: string) => {
      setData((prev) => {
        const remaining = prev.vehicles.filter((v) => v.id !== id)
        const nextActive =
          prev.settings.activeVehicleId === id
            ? remaining[0]?.id || null
            : prev.settings.activeVehicleId

        return {
          ...prev,
          vehicles: remaining,
          fuelEntries: prev.fuelEntries.filter((f) => f.vehicleId !== id),
          chargingEntries: prev.chargingEntries.filter((c) => c.vehicleId !== id),
          expenses: prev.expenses.filter((e) => e.vehicleId !== id),
          maintenanceRecords: prev.maintenanceRecords.filter((m) => m.vehicleId !== id),
          reminders: prev.reminders.filter((r) => r.vehicleId !== id),
          documents: prev.documents.filter((d) => d.vehicleId !== id),
          settings: {
            ...prev.settings,
            activeVehicleId: nextActive,
          },
        }
      })
    },
    []
  )

  // Fuel Entries
  const addFuelEntry = useCallback(
    (entryData: Omit<FuelEntry, 'id' | 'createdAt'>) => {
      const newEntry: FuelEntry = {
        ...entryData,
        id: `fuel-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: new Date().toISOString(),
      }
      setData((prev) => ({
        ...prev,
        fuelEntries: [newEntry, ...prev.fuelEntries],
      }))
      maybeBumpOdometer(entryData.vehicleId, entryData.odometer)
    },
    [maybeBumpOdometer]
  )

  const updateFuelEntry = useCallback((id: string, updates: Partial<FuelEntry>) => {
    setData((prev) => ({
      ...prev,
      fuelEntries: prev.fuelEntries.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }))
  }, [])

  const deleteFuelEntry = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      fuelEntries: prev.fuelEntries.filter((f) => f.id !== id),
    }))
  }, [])

  // Charging Entries
  const addChargingEntry = useCallback(
    (entryData: Omit<ChargingEntry, 'id' | 'createdAt'>) => {
      const newEntry: ChargingEntry = {
        ...entryData,
        id: `chg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: new Date().toISOString(),
      }
      setData((prev) => ({
        ...prev,
        chargingEntries: [newEntry, ...prev.chargingEntries],
      }))
      maybeBumpOdometer(entryData.vehicleId, entryData.odometer)
    },
    [maybeBumpOdometer]
  )

  const updateChargingEntry = useCallback(
    (id: string, updates: Partial<ChargingEntry>) => {
      setData((prev) => ({
        ...prev,
        chargingEntries: prev.chargingEntries.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      }))
    },
    []
  )

  const deleteChargingEntry = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      chargingEntries: prev.chargingEntries.filter((c) => c.id !== id),
    }))
  }, [])

  // Expenses
  const addExpense = useCallback(
    (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
      const newExpense: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: new Date().toISOString(),
      }
      setData((prev) => ({
        ...prev,
        expenses: [newExpense, ...prev.expenses],
      }))
      if (expenseData.odometer) {
        maybeBumpOdometer(expenseData.vehicleId, expenseData.odometer)
      }
    },
    [maybeBumpOdometer]
  )

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }))
  }, [])

  const deleteExpense = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }))
  }, [])

  // Maintenance Records
  const addMaintenanceRecord = useCallback(
    (recordData: Omit<MaintenanceRecord, 'id' | 'createdAt'>) => {
      const newRecord: MaintenanceRecord = {
        ...recordData,
        id: `maint-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: new Date().toISOString(),
      }
      setData((prev) => ({
        ...prev,
        maintenanceRecords: [newRecord, ...prev.maintenanceRecords],
      }))
      maybeBumpOdometer(recordData.vehicleId, recordData.odometer)
    },
    [maybeBumpOdometer]
  )

  const updateMaintenanceRecord = useCallback(
    (id: string, updates: Partial<MaintenanceRecord>) => {
      setData((prev) => ({
        ...prev,
        maintenanceRecords: prev.maintenanceRecords.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      }))
    },
    []
  )

  const deleteMaintenanceRecord = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      maintenanceRecords: prev.maintenanceRecords.filter((m) => m.id !== id),
    }))
  }, [])

  // Reminders
  const addReminder = useCallback((reminderData: Omit<Reminder, 'id' | 'createdAt'>) => {
    const newReminder: Reminder = {
      ...reminderData,
      id: `rem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    }
    setData((prev) => ({
      ...prev,
      reminders: [newReminder, ...prev.reminders],
    }))
  }, [])

  const updateReminder = useCallback((id: string, updates: Partial<Reminder>) => {
    setData((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }))
  }, [])

  const toggleReminderComplete = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) => {
        if (r.id === id) {
          const nextState = !r.isCompleted
          return {
            ...r,
            isCompleted: nextState,
            completedAt: nextState ? new Date().toISOString() : undefined,
          }
        }
        return r
      }),
    }))
  }, [])

  const deleteReminder = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== id),
    }))
  }, [])

  // Documents
  const addDocument = useCallback((docData: Omit<VehicleDocument, 'id' | 'createdAt'>) => {
    const newDoc: VehicleDocument = {
      ...docData,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    }
    setData((prev) => ({
      ...prev,
      documents: [newDoc, ...prev.documents],
    }))
  }, [])

  const updateDocument = useCallback((id: string, updates: Partial<VehicleDocument>) => {
    setData((prev) => ({
      ...prev,
      documents: prev.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }))
  }, [])

  const deleteDocument = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== id),
    }))
  }, [])

  // Settings & System
  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...updates,
      },
    }))
  }, [])

  const loadDemoData = useCallback(() => {
    if (!uid) setData(DEMO_VAULT_DATA)
  }, [])

  const restoreData = useCallback((newData: CarVaultData) => {
    setData(previous => uid ? mergeLocalVault(previous, newData) : newData)
  }, [])

  const resetAllData = useCallback(() => {
    const empty: CarVaultData = {
      version: 1,
      vehicles: [],
      fuelEntries: [],
      chargingEntries: [],
      expenses: [],
      maintenanceRecords: [],
      reminders: [],
      documents: [],
      settings: {
        currency: 'CAD',
        distanceUnit: 'km',
        volumeUnit: 'L',
        fuelEconomyUnit: 'L/100km',
        evEconomyUnit: 'kWh/100km',
        dateFormat: 'YYYY-MM-DD',
        activeVehicleId: null,
      },
    }
    setData(empty)
  }, [])

  // Filtered lists for the currently active vehicle
  const currentVehId = activeVehicle?.id

  const activeFuelEntries = useMemo(
    () => (currentVehId ? data.fuelEntries.filter((f) => f.vehicleId === currentVehId) : []),
    [data.fuelEntries, currentVehId]
  )

  const activeChargingEntries = useMemo(
    () =>
      currentVehId ? data.chargingEntries.filter((c) => c.vehicleId === currentVehId) : [],
    [data.chargingEntries, currentVehId]
  )

  const activeExpenses = useMemo(
    () => (currentVehId ? data.expenses.filter((e) => e.vehicleId === currentVehId) : []),
    [data.expenses, currentVehId]
  )

  const activeMaintenanceRecords = useMemo(
    () =>
      currentVehId
        ? data.maintenanceRecords.filter((m) => m.vehicleId === currentVehId)
        : [],
    [data.maintenanceRecords, currentVehId]
  )

  const activeReminders = useMemo(
    () => (currentVehId ? data.reminders.filter((r) => r.vehicleId === currentVehId) : []),
    [data.reminders, currentVehId]
  )

  const activeDocuments = useMemo(
    () => (currentVehId ? data.documents.filter((d) => d.vehicleId === currentVehId) : []),
    [data.documents, currentVehId]
  )

  const value: CarVaultContextType = {
    data,
    sync,
    retrySync: store.retry,
    importLocalData: () => {
      if (uid && !sync.fromCache && !sync.pending) setData(previous => mergeLocalVault(previous, CarVaultStorage.load()))
    },
    vehicles: data.vehicles,
    activeVehicle,
    activeVehicleId,
    setActiveVehicleId,

    activeFuelEntries,
    activeChargingEntries,
    activeExpenses,
    activeMaintenanceRecords,
    activeReminders,
    activeDocuments,

    allFuelEntries: data.fuelEntries,
    allChargingEntries: data.chargingEntries,
    allExpenses: data.expenses,
    allMaintenanceRecords: data.maintenanceRecords,
    allReminders: data.reminders,
    allDocuments: data.documents,

    settings: data.settings,

    addVehicle,
    updateVehicle,
    deleteVehicle,

    addFuelEntry,
    updateFuelEntry,
    deleteFuelEntry,

    addChargingEntry,
    updateChargingEntry,
    deleteChargingEntry,

    addExpense,
    updateExpense,
    deleteExpense,

    addMaintenanceRecord,
    updateMaintenanceRecord,
    deleteMaintenanceRecord,

    addReminder,
    updateReminder,
    toggleReminderComplete,
    deleteReminder,

    addDocument,
    updateDocument,
    deleteDocument,

    updateSettings,
    loadDemoData,
    restoreData,
    resetAllData,
  }

  return <CarVaultContext.Provider value={value}>{children}</CarVaultContext.Provider>
}

export function useCarVault() {
  const ctx = useContext(CarVaultContext)
  if (!ctx) {
    throw new Error('useCarVault must be used within a CarVaultProvider')
  }
  return ctx
}

