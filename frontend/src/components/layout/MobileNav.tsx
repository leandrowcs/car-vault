import { useTranslation } from '../../hooks/useTranslation'
import React, { useEffect, useRef, useState } from 'react'
import { LayoutDashboard, Warehouse, Fuel, Receipt, Menu, X, Wrench, Bell, FileText, BarChart3, Settings, Plus } from 'lucide-react'
import { useCarVault } from '../../context/CarVaultContext'
import type { NavView } from './Sidebar'
import { ThemeSwitcher } from './ThemeSwitcher'
import { LanguageSwitcher } from './LanguageSwitcher'

interface MobileNavProps {
  currentView: NavView
  onNavigate: (view: NavView) => void
  onQuickAddFuel: () => void
}
const items = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'garage', label: 'Garage', icon: Warehouse },
  { id: 'fuel', label: 'Fuel', icon: Fuel },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'maintenance', label: 'Maintenance Log', icon: Wrench },
  { id: 'reminders', label: 'Service Reminders', icon: Bell },
  { id: 'documents', label: 'Vehicle Documents', icon: FileText },
  { id: 'statistics', label: 'Statistics & Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings & Data', icon: Settings },
] as const

export const MobileNav: React.FC<MobileNavProps> = ({ currentView, onNavigate, onQuickAddFuel }) => {
  const t = useTranslation()
  const { vehicles, activeVehicle, setActiveVehicleId } = useCarVault()
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!open) return
    const element = dialog.current!
    const previous = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    const breakpoint = window.matchMedia('(min-width: 901px)')
    const closeOnDesktop = () => { if (breakpoint.matches) setOpen(false) }
    breakpoint.addEventListener('change', closeOnDesktop)
    return () => {
      element.close()
      document.body.style.overflow = previous
      breakpoint.removeEventListener('change', closeOnDesktop)
    }
  }, [open])
  const navigate = (view: NavView) => { setOpen(false); onNavigate(view) }
  return <>
    <div className="mobile-topbar">
      <button type="button" className="btn btn-secondary btn-icon" aria-label={t("Open navigation menu")} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)}><Menu size={22} /></button>
      <div className="mobile-vehicle-picker">
        <img src="/favicon.svg" alt={t("Car Vault")} className="mobile-brand-icon" />
        {vehicles.length > 0 ? <select className="vehicle-select" aria-label={t("Active vehicle")} value={activeVehicle?.id || ''} onChange={e => setActiveVehicleId(e.target.value)}>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}
        </select> : <span className="mobile-brand-name">{t("Car Vault")}</span>}
      </div>
    </div>
    <nav className="mobile-bottom-nav" aria-label={t("Main navigation")}>
      {items.slice(0, 4).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`mobile-nav-item ${currentView === id ? 'active' : ''}`} aria-current={currentView === id ? 'page' : undefined} onClick={() => navigate(id)}>
        <Icon size={20} /><span>{id === 'dashboard' ? t("Dash") : t(label)}</span>
      </button>)}
      <button type="button" className="mobile-nav-item mobile-add-fuel" onClick={onQuickAddFuel}><Plus size={24} /><span>{t("Fuel")}</span></button>
    </nav>
    <dialog ref={dialog} id="mobile-menu" className="mobile-drawer" aria-labelledby="mobile-menu-title" onCancel={() => setOpen(false)} onClick={e => { if (e.target === e.currentTarget && e.clientX > e.currentTarget.getBoundingClientRect().right) setOpen(false) }}>
      <div className="drawer-heading"><strong id="mobile-menu-title">{t("Car Vault")}</strong><button type="button" className="btn btn-secondary btn-icon" aria-label={t("Close navigation menu")} onClick={() => setOpen(false)}><X size={20} /></button></div>
      <p className="card-subtitle">{t("Your digital garage")}</p>
      <nav aria-label={t("All sections")}>{items.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`drawer-link ${currentView === id ? 'active' : ''}`} aria-current={currentView === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={20} />{t(label)}</button>)}</nav>
      <ThemeSwitcher />
      <LanguageSwitcher />
    </dialog>
  </>
}
