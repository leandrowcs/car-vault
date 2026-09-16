import React from 'react'
import { ThemeSwitcher } from './ThemeSwitcher'
import {
  LayoutDashboard,
  Warehouse,
  Fuel,
  Receipt,
  Wrench,
  Bell,
  FileText,
  BarChart3,
  Settings,
  Car,
} from 'lucide-react'
import { useCarVault } from '../../context/CarVaultContext'
import { formatDistance } from '../../utils/formatters'

export type NavView =
  | 'dashboard'
  | 'garage'
  | 'fuel'
  | 'expenses'
  | 'maintenance'
  | 'reminders'
  | 'documents'
  | 'statistics'
  | 'settings'

interface SidebarProps {
  currentView: NavView
  onNavigate: (view: NavView) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { activeVehicle, settings } = useCarVault()

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'garage', label: 'Garage', icon: Warehouse },
    { id: 'fuel', label: 'Fuel & EV', icon: Fuel },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const

  return (
    <aside className="sidebar">
      <div className="brand-wrapper">
        <img
          src="/logo.svg"
          alt="Car Vault"
          className="brand-logo-img"
          onError={(e) => {
            // If image fails, hide image and fallback displays cleanly
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>

      <nav className="nav-section">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon className="nav-icon" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <ThemeSwitcher />

      {activeVehicle && (
        <div className="sidebar-vehicle-card">
          <div className="sidebar-vehicle-header">
            <span>Active Vehicle</span>
            <Car size={14} color="var(--vault-primary)" />
          </div>
          <div className="sidebar-vehicle-name" title={activeVehicle.name}>
            {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
          </div>
          <div className="sidebar-vehicle-odo">
            {formatDistance(activeVehicle.currentOdometer, settings.distanceUnit)}
          </div>
        </div>
      )}
    </aside>
  )
}

