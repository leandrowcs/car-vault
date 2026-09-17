import { useTranslation } from '../../hooks/useTranslation'
import React from 'react'
import { Car, Plus } from 'lucide-react'
import { useCarVault } from '../../context/CarVaultContext'
import type { NavView } from './Sidebar'

interface HeaderProps {
  currentView: NavView
  onQuickAddFuel: () => void
  onQuickAddExpense: () => void
  onQuickAddMaintenance: () => void
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onQuickAddFuel,
  onQuickAddExpense,
  onQuickAddMaintenance,
}) => {
  const t = useTranslation()
  const { vehicles, activeVehicle, setActiveVehicleId } = useCarVault()

  const viewTitles: Record<NavView, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Digital Garage Dashboard',
      subtitle: 'Overview of vehicle health, costs, and reminders',
    },
    garage: {
      title: 'Garage',
      subtitle: 'Manage all vehicles registered in your vault',
    },
    fuel: {
      title: 'Fuel & EV Charging',
      subtitle: 'Track fill-ups, charging sessions, and consumption metrics',
    },
    expenses: {
      title: 'Vehicle Expenses',
      subtitle: 'Track insurance, registration, tolls, and daily costs',
    },
    maintenance: {
      title: 'Maintenance Log',
      subtitle: 'Record services, parts, repairs, and scheduled checkups',
    },
    reminders: {
      title: 'Service Reminders',
      subtitle: 'Keep your vehicle road-ready with mileage and date alerts',
    },
    documents: {
      title: 'Vehicle Documents',
      subtitle: 'Manage ownership, insurance, warranty, and inspection records',
    },
    statistics: {
      title: 'Vault Statistics',
      subtitle: 'Detailed historical analytics, cost per km, and fuel economy',
    },
    settings: {
      title: 'Settings & Data',
      subtitle: 'Customize units, export JSON backups, or load demo garage',
    },
  }

  const { title, subtitle } = viewTitles[currentView]

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div>
          <h1 className="topbar-title">{t(title)}</h1>
          <p className="card-subtitle">{t(subtitle)}</p>
        </div>
      </div>

      <div className="topbar-actions">
        {vehicles.length > 0 && (
          <div className="vehicle-selector-wrapper">
            <Car size={16} color="var(--vault-primary)" />
            <select
              className="vehicle-select"
              value={activeVehicle?.id || ''}
              onChange={(e) => setActiveVehicleId(e.target.value)}
              aria-label={t("Select active vehicle")}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model} ({v.name})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick action buttons on header for swift daily entry */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onQuickAddFuel}
          title={t("Add Fuel Fill-up")}
        >
          <Plus size={14} /> {t("Fuel")}
        </button>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onQuickAddExpense}
          title={t("Add General Expense")}
        >
          <Plus size={14} /> {t("Expense")}
        </button>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onQuickAddMaintenance}
          title={t("Add Maintenance Record")}
        >
          <Plus size={14} /> {t("Service")}
        </button>
      </div>
    </header>
  )
}

