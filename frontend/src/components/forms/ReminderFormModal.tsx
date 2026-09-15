import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
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
  const { activeVehicle } = useCarVault()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<ReminderType>('both')
  const [dueDate, setDueDate] = useState('')
  const [targetOdometer, setTargetOdometer] = useState('')
  const [category, setCategory] = useState('Oil Change')
  const [notes, setNotes] = useState('')

  useEffect(() => {
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
      // Default target odometer to current + 8,000 km (typical synthetic oil interval)
      const cur = activeVehicle ? activeVehicle.currentOdometer : 0
      setTargetOdometer(cur ? String(cur + 8000) : '')
      setCategory('Oil Change')
      setNotes('')
    }
  }, [initialData, isOpen, activeVehicle])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeVehicle || !title) return

    const odoNum = targetOdometer ? parseFloat(targetOdometer) : undefined

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
      title={initialData ? 'Edit Reminder' : 'Set Service Reminder'}
      maxWidth="520px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="reminder-form" className="btn btn-primary">
            {initialData ? 'Update Reminder' : 'Set Reminder'}
          </button>
        </>
      }
    >
      <form id="reminder-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label">Reminder Title *</label>
          <input
            type="text"
            required
            className="form-input"
            placeholder="e.g. Synthetic Oil & Filter, Winter Tire Changeover"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Reminder Trigger Type *</label>
            <select
              className="form-select"
              value={type}
              onChange={(e) => setType(e.target.value as ReminderType)}
            >
              <option value="both">By Date OR Mileage (Whichever comes first)</option>
              <option value="date">By Date Only</option>
              <option value="mileage">By Mileage Only</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Maintenance, Tires, Registration"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
        </div>

        {(type === 'date' || type === 'both') && (
          <div className="form-group">
            <label className="form-label">Due Date *</label>
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
            <label className="form-label">Due at Odometer (km) *</label>
            <input
              type="number"
              required={type === 'mileage'}
              min="0"
              className="form-input font-mono"
              placeholder="Target vehicle odometer (e.g. 32000)"
              value={targetOdometer}
              onChange={(e) => setTargetOdometer(e.target.value)}
            />
            {activeVehicle && (
              <span style={{ fontSize: '12px', color: 'var(--vault-text-muted)' }}>
                Current vehicle odometer: {activeVehicle.currentOdometer.toLocaleString()} km
              </span>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Notes</label>
          <input
            type="text"
            className="form-input"
            placeholder="Service code, dealership coupon, oil viscosity..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  )
}

