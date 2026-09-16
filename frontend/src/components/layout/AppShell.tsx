import React from 'react'
import { Sidebar, type NavView } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { SyncNotice } from '../account/AccountPanel'

interface AppShellProps {
  currentView: NavView
  onNavigate: (view: NavView) => void
  children: React.ReactNode
  onQuickAddFuel: () => void
  onQuickAddExpense: () => void
  onQuickAddMaintenance: () => void
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  children,
  onQuickAddFuel,
  onQuickAddExpense,
  onQuickAddMaintenance,
}) => {
  return (
    <div className="app-shell">
      {/* Desktop Sidebar Navigation */}
      <Sidebar currentView={currentView} onNavigate={onNavigate} />

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Mobile Top & Bottom Navigation */}
        <MobileNav
          currentView={currentView}
          onNavigate={onNavigate}
          onQuickAddFuel={onQuickAddFuel}
        />

        {/* Desktop Sticky Header */}
        <Header
          currentView={currentView}
          onQuickAddFuel={onQuickAddFuel}
          onQuickAddExpense={onQuickAddExpense}
          onQuickAddMaintenance={onQuickAddMaintenance}
        />

        {/* Dynamic Page View Content */}
        <main className="content-container"><SyncNotice />{children}</main>
      </div>
    </div>
  )
}

