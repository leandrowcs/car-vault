import { getLanguage } from '../../services/language'
import { useTranslation } from '../../hooks/useTranslation'
import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { DEFAULT_MAINTENANCE_CATEGORIES } from '../../types/maintenance'
import type { Reminder, ReminderType } from '../../types/reminder'
import { useCarVault } from '../../context/CarVaultContext'

interface ReminderFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => void
  initialData?: Reminder | null
}

export const ReminderFormModal: React.FC<ReminderFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const t = useTranslation()
  const { activeVehicle, activeMaintenanceRecords } = useCarVault()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<ReminderType>('both')
  const [dueDate, setDueDate] = useState('')
  const [targetOdometer, setTargetOdometer] = useState('')
  const [category, setCategory] = useState('Oil Change')
  const [notes, setNotes] = useState('')
  const [intervalKm, setIntervalKm] = useState('')
  const [error, setError] = useState('')
  const lastService = [...activeMaintenanceRecords].filter(r => r.category === category && r.date.slice(0, 10) <= new Date().toLocaleDateString('en-CA')).sort((a, b) => b.date.localeCompare(a.date))[0]
  const intervalBase = lastService?.odometer ?? activeVehicle?.currentOdometer ?? 0

  useEffect(() => {
    setIntervalKm('')
    setError('')
    if (initialData) {
      setTitle(initialData.title)
      setType(initialData.type)
      setDueDate(initialData.dueDate ? initialData.dueDate.slice(0, 10) : '')
      setTargetOdometer(
        initialData.targetOdometer !== undefined ? String(initialData.targetOdometer) : ''
      )
      setCategory(initialData.category || 'Oil Change')
      setNotes(initialData.notes || '')
    } else {
      setTitle('')
      setType('both')
      setDueDate('')
      setTargetOdometer('')
      setCategory('Oil Change')
      setNotes('')
    }
  }, [initialData, isOpen, activeVehicle])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeVehicle || !title) return

    const odoNum = targetOdometer ? parseFloat(targetOdometer) : undefined

    if (type === 'both' && !dueDate && odoNum === undefined) {
      setError('Enter a due date or an odometer target.')
      return
    }
    if (odoNum !== undefined && (!Number.isFinite(odoNum) || odoNum < 0)) {
      setError('Enter a valid odometer target.')
      return
    }
    setError('')
    onSave({
      vehicleId: activeVehicle.id,
      title,
      type,
      dueDate: type === 'mileage' ? undefined : dueDate || undefined,
      targetOdometer: type === 'date' ? undefined : odoNum,
      category: category || undefined,
      notes: notes || undefined,
      isCompleted: initialData ? initialData.isCompleted : false,
      completedAt: initialData?.completedAt,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? t("Edit Reminder") : t("Set Service Reminder")}
      maxWidth="520px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t("Cancel")}
          </button>
          <button type="submit" form="reminder-form" className="btn btn-primary">
            {initialData ? t("Update Reminder") : t("Set Reminder")}
          </button>
        </>
      }
    >
      <form id="reminder-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
        {error && (<p role="alert" className="account-error">{t(error)}</p>)}
        <div className="form-group">
          <label className="form-label">{t("Reminder Title *")}</label>
          <input
            type="text"
            required
            className="form-input"
            placeholder={t("e.g. Synthetic Oil & Filter, Winter Tire Changeover")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t("Reminder Trigger Type *")}</label>
            <select
              className="form-select"
              value={type}
              onChange={(e) => setType(e.target.value as ReminderType)}
            >
              <option value="both">{t("By Date OR Mileage (Whichever comes first)")}</option>
              <option value="date">{t("By Date Only")}</option>
              <option value="mileage">{t("By Mileage Only")}</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t("Category")}</label>
            <input
              type="text"
              className="form-input"
              list="reminder-categories"
              placeholder={t("e.g. Scheduled Maintenance, Tires, Registration")}
              value={category}
              onChange={(e) => { setCategory(e.target.value); setIntervalKm('') }}
            />
            <datalist id="reminder-categories">{DEFAULT_MAINTENANCE_CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
          </div>
        </div>

        {(type === 'date' || type === 'both') && (
          <div className="form-group">
            <label className="form-label">{t("Due Date *")}</label>
            <input
              type="date"
              required={type === 'date'}
              className="form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        )}

        {(type === 'mileage' || type === 'both') && (
          <div className="form-group">
            <label className="form-label" htmlFor="service-interval">{t("Service interval (km, optional)")}</label>
            <input id="service-interval" type="number" min="1" step="1" className="form-input" value={intervalKm} placeholder={t("Use the interval in your owner's manual")} onChange={e => {
              setIntervalKm(e.target.value)
              const interval = Number(e.target.value)
              if (Number.isFinite(interval) && interval > 0) setTargetOdometer(String(intervalBase + interval))
            }} />
            <span className="card-subtitle">{t("Adds the interval to")} {lastService ? t("the last matching service") : t("the current odometer")}: {intervalBase.toLocaleString(getLanguage())} {t("km. You can also enter the target directly.")}</span>
            <label className="form-label">{t("Due at Odometer (km) *")}</label>
            <input
              type="number"
              required={type === 'mileage'}
              min="0"
              className="form-input font-mono"
              placeholder={t("Target vehicle odometer (e.g. 32000)")}
              value={targetOdometer}
              onChange={(e) => { setTargetOdometer(e.target.value); setIntervalKm('') }}
            />
            {activeVehicle && (
              <span style={{ fontSize: '12px', color: 'var(--vault-text-muted)' }}>
                {t("Current vehicle odometer:")} {activeVehicle.currentOdometer.toLocaleString(getLanguage())} {t("km")}
              </span>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">{t("Notes")}</label>
          <input
            type="text"
            className="form-input"
            placeholder={t("Service code, dealership coupon, oil viscosity...")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  )
}

