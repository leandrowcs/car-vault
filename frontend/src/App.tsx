import { useTranslation } from './hooks/useTranslation'
import React, { useState } from 'react'
import { AccountProvider, useAccount } from './context/AccountContext'
import { AccountPanel, SyncNotice } from './components/account/AccountPanel'
import { CarVaultProvider, useCarVault } from './context/CarVaultContext'
import { AppShell } from './components/layout/AppShell'
import type { NavView } from './components/layout/Sidebar'

// Views
import { DashboardView } from './views/DashboardView'
import { GarageView } from './views/GarageView'
import { FuelView } from './views/FuelView'
import { ExpensesView } from './views/ExpensesView'
import { MaintenanceView } from './views/MaintenanceView'
import { RemindersView } from './views/RemindersView'
import { DocumentsView } from './views/DocumentsView'
import { StatisticsView } from './views/StatisticsView'
import { SettingsView } from './views/SettingsView'
import { Modal } from './components/common/Modal'
import { soldVehicleMessage } from './services/vehicleLifecycle'

// Form Modals
import { VehicleFormModal } from './components/forms/VehicleFormModal'
import { FuelFormModal } from './components/forms/FuelFormModal'
import { ChargingFormModal } from './components/forms/ChargingFormModal'
import { ExpenseFormModal } from './components/forms/ExpenseFormModal'
import { MaintenanceFormModal } from './components/forms/MaintenanceFormModal'
import { ReminderFormModal } from './components/forms/ReminderFormModal'
import { DocumentFormModal } from './components/forms/DocumentFormModal'

// Domain types
import type { Vehicle } from './types/vehicle'
import type { FuelEntry, ChargingEntry } from './types/fuel'
import type { Expense } from './types/expense'
import type { MaintenanceRecord } from './types/maintenance'
import type { Reminder } from './types/reminder'
import type { VehicleDocument } from './types/document'

const CarVaultApp: React.FC = () => {
  const t = useTranslation()
  const [currentView, setCurrentView] = useState<NavView>('dashboard')

  const {
    activeVehicle,
    addVehicle,
    updateVehicle,
    addFuelEntry,
    updateFuelEntry,
    addChargingEntry,
    updateChargingEntry,
    addExpense,
    updateExpense,
    addMaintenanceRecord,
    updateMaintenanceRecord,
    addReminder,
    updateReminder,
    addDocument,
    updateDocument,
  } = useCarVault()

  // Modal states
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)

  const [fuelModalOpen, setFuelModalOpen] = useState(false)
  const [editingFuel, setEditingFuel] = useState<FuelEntry | null>(null)

  const [chargingModalOpen, setChargingModalOpen] = useState(false)
  const [editingCharge, setEditingCharge] = useState<ChargingEntry | null>(null)

  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false)
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceRecord | null>(null)

  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)

  const [documentModalOpen, setDocumentModalOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState<VehicleDocument | null>(null)

  // Handlers for Opening Forms
  const handleOpenAddVehicle = () => {
    setEditingVehicle(null)
    setVehicleModalOpen(true)
  }

  const handleOpenEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setVehicleModalOpen(true)
  }

  const handleOpenAddFuel = () => {
    setEditingFuel(null)
    setFuelModalOpen(true)
  }

  const handleOpenEditFuel = (entry: FuelEntry) => {
    setEditingFuel(entry)
    setFuelModalOpen(true)
  }

  const handleOpenAddCharge = () => {
    setEditingCharge(null)
    setChargingModalOpen(true)
  }

  const handleOpenEditCharge = (entry: ChargingEntry) => {
    setEditingCharge(entry)
    setChargingModalOpen(true)
  }

  const handleOpenAddExpense = () => {
    setEditingExpense(null)
    setExpenseModalOpen(true)
  }

  const handleOpenEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setExpenseModalOpen(true)
  }

  const handleOpenAddMaintenance = () => {
    setEditingMaintenance(null)
    setMaintenanceModalOpen(true)
  }

  const handleOpenEditMaintenance = (record: MaintenanceRecord) => {
    setEditingMaintenance(record)
    setMaintenanceModalOpen(true)
  }

  const handleOpenAddReminder = () => {
    setEditingReminder(null)
    setReminderModalOpen(true)
  }

  const handleOpenEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setReminderModalOpen(true)
  }

  const handleOpenAddDocument = () => {
    setEditingDocument(null)
    setDocumentModalOpen(true)
  }

  const handleOpenEditDocument = (doc: VehicleDocument) => {
    setEditingDocument(doc)
    setDocumentModalOpen(true)
  }

  return (
    <AppShell
      currentView={currentView}
      onNavigate={setCurrentView}
      onQuickAddFuel={handleOpenAddFuel}
      onQuickAddExpense={handleOpenAddExpense}
      onQuickAddMaintenance={handleOpenAddMaintenance}
    >
      {/* View routing */}
      {activeVehicle?.isSold && <p role="status" className="card-subtitle" style={{ marginBottom: 12 }}>{t(soldVehicleMessage)}</p>}
      {currentView === 'dashboard' && (
        <DashboardView
          onNavigate={setCurrentView}
          onAddFuel={handleOpenAddFuel}
          onAddExpense={handleOpenAddExpense}
          onAddMaintenance={handleOpenAddMaintenance}
          onAddReminder={handleOpenAddReminder}
        />
      )}

      {currentView === 'garage' && (
        <GarageView
          onAddVehicle={handleOpenAddVehicle}
          onEditVehicle={handleOpenEditVehicle}
        />
      )}

      {currentView === 'fuel' && (
        <FuelView
          onAddFuel={handleOpenAddFuel}
          onAddCharge={handleOpenAddCharge}
          onEditFuel={handleOpenEditFuel}
          onEditCharge={handleOpenEditCharge}
        />
      )}

      {currentView === 'expenses' && (
        <ExpensesView
          onAddExpense={handleOpenAddExpense}
          onEditExpense={handleOpenEditExpense}
        />
      )}

      {currentView === 'maintenance' && (
        <MaintenanceView
          onAddMaintenance={handleOpenAddMaintenance}
          onEditMaintenance={handleOpenEditMaintenance}
        />
      )}

      {currentView === 'reminders' && (
        <RemindersView
          onAddReminder={handleOpenAddReminder}
          onEditReminder={handleOpenEditReminder}
        />
      )}

      {currentView === 'documents' && (
        <DocumentsView
          onAddDocument={handleOpenAddDocument}
          onEditDocument={handleOpenEditDocument}
        />
      )}

      {currentView === 'statistics' && (<StatisticsView />)}

      {currentView === 'settings' && (<SettingsView />)}

      <Modal
        isOpen={Boolean(activeVehicle?.isSold && ((fuelModalOpen && !editingFuel) || (chargingModalOpen && !editingCharge) || (expenseModalOpen && !editingExpense) || (maintenanceModalOpen && !editingMaintenance) || (reminderModalOpen && !editingReminder) || (documentModalOpen && !editingDocument)))}
        title={t('Sold')}
        onClose={() => { setFuelModalOpen(false); setChargingModalOpen(false); setExpenseModalOpen(false); setMaintenanceModalOpen(false); setReminderModalOpen(false); setDocumentModalOpen(false) }}
      >
        <p>{t(soldVehicleMessage)}</p>
      </Modal>
      {/* Modals */}
      <VehicleFormModal
        isOpen={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        initialData={editingVehicle}
        onSave={(vehData) => {
          if (editingVehicle) {
            updateVehicle(editingVehicle.id, vehData)
          } else {
            addVehicle(vehData)
          }
        }}
      />

      <FuelFormModal
        isOpen={fuelModalOpen && (!activeVehicle?.isSold || Boolean(editingFuel))}
        onClose={() => setFuelModalOpen(false)}
        initialData={editingFuel}
        onSave={(fuelData) => {
          if (editingFuel) {
            updateFuelEntry(editingFuel.id, fuelData)
          } else {
            addFuelEntry(fuelData)
          }
        }}
      />

      <ChargingFormModal
        isOpen={chargingModalOpen && (!activeVehicle?.isSold || Boolean(editingCharge))}
        onClose={() => setChargingModalOpen(false)}
        initialData={editingCharge}
        onSave={(chargeData) => {
          if (editingCharge) {
            updateChargingEntry(editingCharge.id, chargeData)
          } else {
            addChargingEntry(chargeData)
          }
        }}
      />

      <ExpenseFormModal
        isOpen={expenseModalOpen && (!activeVehicle?.isSold || Boolean(editingExpense))}
        onClose={() => setExpenseModalOpen(false)}
        initialData={editingExpense}
        onSave={(expData) => {
          if (editingExpense) {
            updateExpense(editingExpense.id, expData)
          } else {
            addExpense(expData)
          }
        }}
      />

      <MaintenanceFormModal
        isOpen={maintenanceModalOpen && (!activeVehicle?.isSold || Boolean(editingMaintenance))}
        onClose={() => setMaintenanceModalOpen(false)}
        initialData={editingMaintenance}
        onSave={(maintData) => {
          if (editingMaintenance) {
            updateMaintenanceRecord(editingMaintenance.id, maintData)
          } else {
            addMaintenanceRecord(maintData)
          }
        }}
      />

      <ReminderFormModal
        isOpen={reminderModalOpen && (!activeVehicle?.isSold || Boolean(editingReminder))}
        onClose={() => setReminderModalOpen(false)}
        initialData={editingReminder}
        onSave={(remData) => {
          if (editingReminder) {
            updateReminder(editingReminder.id, remData)
          } else {
            addReminder(remData)
          }
        }}
      />

      <DocumentFormModal
        isOpen={documentModalOpen && (!activeVehicle?.isSold || Boolean(editingDocument))}
        onClose={() => setDocumentModalOpen(false)}
        initialData={editingDocument}
        onSave={(docData) => {
          if (editingDocument) {
            updateDocument(editingDocument.id, docData)
          } else {
            addDocument(docData)
          }
        }}
      />
    </AppShell>
  )
}

function VaultGate() {
  const t = useTranslation()
  const { sync } = useCarVault()
  if (!sync.ready) return <main className="account-loading">
    <h1>{t("Car Vault")}</h1>
    <p role="status">{t("Connect to load your account for the first time on this device.")}</p>
    <SyncNotice />
    <AccountPanel />
  </main>
  return <CarVaultApp />
}

function AccountVault() {
  const t = useTranslation()
  const { user, loading } = useAccount()
  if (loading) return <main className="account-loading" role="status">{t("Opening Car Vault…")}</main>
  return <CarVaultProvider key={user?.uid ?? 'local'} uid={user?.uid}>
    <VaultGate />
  </CarVaultProvider>
}

export function App() {
  return <AccountProvider><AccountVault /></AccountProvider>
}

export default App
