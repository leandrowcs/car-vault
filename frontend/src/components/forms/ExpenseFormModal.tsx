import { useTranslation } from '../../hooks/useTranslation'
import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { DEFAULT_EXPENSE_CATEGORIES, type Expense } from '../../types/expense'
import { useCarVault } from '../../context/CarVaultContext'

interface ExpenseFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (expense: Omit<Expense, 'id' | 'createdAt'>) => void
  initialData?: Expense | null
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const t = useTranslation()
  const { activeVehicle } = useCarVault()

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState<string>('Insurance')
  const [customCategory, setCustomCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [odometer, setOdometer] = useState('')
  const [description, setDescription] = useState('')
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date.slice(0, 10))
      if (DEFAULT_EXPENSE_CATEGORIES.includes(initialData.category as any)) {
        setCategory(initialData.category)
        setCustomCategory('')
      } else {
        setCategory('Custom')
        setCustomCategory(initialData.category)
      }
      setAmount(String(initialData.amount))
      setOdometer(initialData.odometer ? String(initialData.odometer) : '')
      setDescription(initialData.description)
      setVendor(initialData.vendor || '')
      setNotes(initialData.notes || '')
    } else {
      setDate(new Date().toISOString().slice(0, 10))
      setCategory('Insurance')
      setCustomCategory('')
      setAmount('')
      setOdometer(activeVehicle ? String(activeVehicle.currentOdometer) : '')
      setDescription('')
      setVendor('')
      setNotes('')
    }
  }, [initialData, isOpen, activeVehicle])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeVehicle) return

    const amtNum = parseFloat(amount)
    if (isNaN(amtNum) || amtNum <= 0 || !description) return

    const finalCategory = category === 'Custom' ? customCategory || 'Other' : category

    onSave({
      vehicleId: activeVehicle.id,
      date,
      category: finalCategory,
      amount: amtNum,
      odometer: odometer ? parseFloat(odometer) : undefined,
      description,
      vendor: vendor || undefined,
      notes: notes || undefined,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? t("Edit Expense") : t("Add Vehicle Expense")}
      maxWidth="520px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t("Cancel")}
          </button>
          <button type="submit" form="expense-form" className="btn btn-primary">
            {initialData ? t("Update Expense") : t("Save Expense")}
          </button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t("Date *")}</label>
            <input
              type="date"
              required
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("Amount ($ CAD) *")}</label>
            <input
              type="number"
              required
              step="0.01"
              min="0.01"
              className="form-input font-mono"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t("Category *")}</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(cat)}
                </option>
              ))}
              <option value="Custom">{t("+ Custom Category")}</option>
            </select>
          </div>

          {category === 'Custom' ? (
            <div className="form-group">
              <label className="form-label">{t("Custom Category Name")}</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder={t("e.g. Parking Permit, Detailing")}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">{t("Odometer (km, Optional)")}</label>
              <input
                type="number"
                min="0"
                className="form-input font-mono"
                placeholder={t("Current odometer")}
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">{t("Description *")}</label>
          <input
            type="text"
            required
            className="form-input"
            placeholder={t("e.g. Monthly insurance premium, Highway 407 toll")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t("Vendor / Payee")}</label>
          <input
            type="text"
            className="form-input"
            placeholder={t("e.g. Intact Insurance, City Parking Authority")}
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t("Notes")}</label>
          <input
            type="text"
            className="form-input"
            placeholder={t("Policy number, receipt reference...")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  )
}

