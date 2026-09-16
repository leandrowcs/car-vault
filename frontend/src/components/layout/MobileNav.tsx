import React, { useState } from 'react'
import {
  LayoutDashboard,
  Warehouse,
  Fuel,
  Receipt,
  MoreHorizontal,
  Wrench,
  Bell,
  FileText,
  BarChart3,
  Settings,
  Plus,
} from 'lucide-react'
import { useCarVault } from '../../context/CarVaultContext'
import type { NavView } from './Sidebar'
import { Modal } from '../common/Modal'

interface MobileNavProps {
  currentView: NavView
  onNavigate: (view: NavView) => void
  onQuickAddFuel: () => void
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentView,
  onNavigate,
  onQuickAddFuel,
}) => {
  const { vehicles, activeVehicle, setActiveVehicleId } = useCarVault()
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  const handleSelectNav = (view: NavView) => {
    onNavigate(view)
    setShowMoreMenu(false)
  }

  const moreItems: { id: NavView; label: string; icon: React.ComponentType<{ size: number }> }[] = [
    { id: 'maintenance', label: 'Maintenance Log', icon: Wrench },
    { id: 'reminders', label: 'Service Reminders', icon: Bell },
    { id: 'documents', label: 'Vehicle Documents', icon: FileText },
    { id: 'statistics', label: 'Statistics & Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Data', icon: Settings },
  ]

  return (
    <>
      {/* Mobile Top App Bar */}
      <div className="mobile-topbar">
        <div className="mobile-vehicle-picker">
          <img src="/favicon.svg" alt="Car Vault" className="mobile-brand-icon" />
          {vehicles.length > 0 && (
            <select
              className="vehicle-select"
              aria-label="Active vehicle"
              value={activeVehicle?.id || ''}
              onChange={(e) => setActiveVehicleId(e.target.value)}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model}
                </option>
              ))}
            </select>
          )}
          {vehicles.length === 0 && <span className="mobile-brand-name">Car Vault</span>}
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onQuickAddFuel}
        >
          <Plus size={14} /> Fuel
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        <button
          type="button"
          className={`mobile-nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleSelectNav('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Dash</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${currentView === 'garage' ? 'active' : ''}`}
          onClick={() => handleSelectNav('garage')}
        >
          <Warehouse size={20} />
          <span>Garage</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${currentView === 'fuel' ? 'active' : ''}`}
          onClick={() => handleSelectNav('fuel')}
        >
          <Fuel size={20} />
          <span>Fuel</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${currentView === 'expenses' ? 'active' : ''}`}
          onClick={() => handleSelectNav('expenses')}
        >
          <Receipt size={20} />
          <span>Expenses</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${
            ['maintenance', 'reminders', 'documents', 'statistics', 'settings'].includes(
              currentView
            )
              ? 'active'
              : ''
          }`}
          onClick={() => setShowMoreMenu(true)}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More Sheet / Modal */}
      <Modal
        isOpen={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        title="More Sections"
        maxWidth="380px"
      >
        <div style={{ display: 'grid', gap: '8px' }}>
          {moreItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`btn btn-secondary ${isActive ? 'btn-primary' : ''}`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '12px 16px',
                  fontSize: '14px',
                }}
                onClick={() => handleSelectNav(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </Modal>
    </>
  )
}

