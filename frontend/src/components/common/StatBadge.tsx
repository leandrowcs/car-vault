import React from 'react'
import type { ReminderStatus } from '../../types/reminder'
import type { FuelType } from '../../types/vehicle'

export const ReminderBadge: React.FC<{ status: ReminderStatus }> = ({ status }) => {
  switch (status) {
    case 'overdue':
      return <span className="badge badge-rose">Overdue</span>
    case 'due-soon':
      return <span className="badge badge-amber">Due Soon</span>
    case 'completed':
      return <span className="badge badge-emerald">Completed</span>
    case 'upcoming':
    default:
      return <span className="badge badge-slate">Upcoming</span>
  }
}

export const FuelTypeBadge: React.FC<{ fuelType: FuelType }> = ({ fuelType }) => {
  switch (fuelType) {
    case 'electric':
      return <span className="badge badge-blue">⚡ Electric</span>
    case 'hybrid':
    case 'plug-in-hybrid':
      return <span className="badge badge-emerald">🌿 {fuelType}</span>
    case 'diesel':
      return <span className="badge badge-slate">⛽ Diesel</span>
    case 'gasoline':
    default:
      return <span className="badge badge-amber">⛽ Gasoline</span>
  }
}

