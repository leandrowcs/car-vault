import { useTranslation } from '../../hooks/useTranslation'
import React from 'react'
import type { ReminderStatus } from '../../types/reminder'
import type { FuelType } from '../../types/vehicle'

export const ReminderBadge: React.FC<{ status: ReminderStatus }> = ({ status }) => {
  const t = useTranslation()
  switch (status) {
    case 'overdue':
      return <span className="badge badge-rose">{t("Overdue")}</span>
    case 'due-soon':
      return <span className="badge badge-amber">{t("Due Soon")}</span>
    case 'completed':
      return <span className="badge badge-emerald">{t("Completed")}</span>
    case 'upcoming':
    default:
      return <span className="badge badge-slate">{t("Upcoming")}</span>
  }
}

export const FuelTypeBadge: React.FC<{ fuelType: FuelType }> = ({ fuelType }) => {
  const t = useTranslation()
  switch (fuelType) {
    case 'electric':
      return <span className="badge badge-blue">{t("⚡ Electric")}</span>
    case 'hybrid':
    case 'plug-in-hybrid':
      return <span className="badge badge-emerald">🌿 {t(fuelType)}</span>
    case 'diesel':
      return <span className="badge badge-slate">{t("⛽ Diesel")}</span>
    case 'gasoline':
    default:
      return <span className="badge badge-amber">{t("⛽ Gasoline")}</span>
  }
}

