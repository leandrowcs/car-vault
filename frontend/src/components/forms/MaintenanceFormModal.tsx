import { useTranslation } from '../../hooks/useTranslation'
import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import {
  DEFAULT_MAINTENANCE_CATEGORIES,
  type MaintenanceRecord,
} from '../../types/maintenance'
import { useCarVault } from '../../context/CarVaultContext'

interface MaintenanceFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (record: Omit<MaintenanceRecord, 'id' | 'createdAt'>) => void
  initialData?: MaintenanceRecord | null
}

export const MaintenanceFormModal: React.FC<MaintenanceFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const t = useTranslation()
  const { activeVehicle } = useCarVault()

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [odometer, setOdometer] = useState('')
  const [category, setCategory] = useState<string>('Oil Change')
  const [customCategory, setCustomCategory] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [partsCost, setPartsCost] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [serviceProvider, setServiceProvider] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date.slice(0, 10))
      setOdometer(String(initialData.odometer))
      if (DEFAULT_MAINTENANCE_CATEGORIES.includes(initialData.category as any)) {
        setCategory(initialData.category)
        setCustomCategory('')
      } else {
        setCategory('Custom')
        setCustomCategory(initialData.category)
      }
      setDescription(initialData.description)
      setCost(String(initialData.cost))
      setPartsCost(initialData.partsCost !== undefined ? String(initialData.partsCost) : '')
      setLaborCost(initialData.laborCost !== undefined ? String(initialData.laborCost) : '')
      setServiceProvider(initialData.serviceProvider || '')
      setNotes(initialData.notes || '')
    } else {
      setDate(new Date().toISOString().slice(0, 10))
      setOdometer(activeVehicle ? String(activeVehicle.currentOdometer) : '')
      setCategory('Oil Change')
      setCustomCategory('')
      setDescription('')
      setCost('')
      setPartsCost('')
      setLaborCost('')
      setServiceProvider('')
      setNotes('')
    }
  }, [initialData, isOpen, activeVehicle])

  // Automatically update Total Cost if Parts and Labor are entered
  const handlePartsChange = (val: string) => {
    setPartsCost(val)
    const p = parseFloat(val) || 0
    const l = parseFloat(laborCost) || 0
    if (p > 0 || l > 0) {
      setCost((p + l).toFixed(2))
    }
  }

  const handleLaborChange = (val: string) => {
    setLaborCost(val)
    const p = parseFloat(partsCost) || 0
    const l = parseFloat(val) || 0
    if (p > 0 || l > 0) {
      setCost((p + l).toFixed(2))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeVehicle) return

    const odoNum = parseFloat(odometer)
    const costNum = parseFloat(cost)
    if (isNaN(odoNum) || isNaN(costNum) || costNum < 0 || !description) return

    const finalCategory = category === 'Custom' ? customCategory || 'Other' : category

    onSave({
      vehicleId: activeVehicle.id,
      date,
      odometer: odoNum,
      category: finalCategory,
      description,
      cost: costNum,
      partsCost: partsCost ? parseFloat(partsCost) : undefined,
      laborCost: laborCost ? parseFloat(laborCost) : undefined,
      serviceProvider: serviceProvider || undefined,
      notes: notes || undefined,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? t("Edit Service Record") : t("Log Maintenance / Service")}
      maxWidth="560px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t("Cancel")}
          </button>
          <button type="submit" form="maint-form" className="btn btn-primary">
            {initialData ? t("Update Record") : t("Save Service")}
          </button>
        </>
      }
    >
      <form id="maint-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
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
            <label className="form-label">{t("Odometer (km) *")}</label>
            <input
              type="number"
              required
              min="0"
              className="form-input font-mono"
              placeholder={t("e.g. 28500")}
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
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
              {DEFAULT_MAINTENANCE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(cat)}
                </option>
              ))}
              <option value="Custom">{t("+ Custom Category")}</option>
            </select>
          </div>

          {category === 'Custom' ? (
            <div className="form-group">
              <label className="form-label">{t("Custom Category")}</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder={t("e.g. Spark Plugs, Rustproofing")}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">{t("Service Provider / Shop")}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t("e.g. Dealership, Midas, DIY Garage")}
                value={serviceProvider}
                onChange={(e) => setServiceProvider(e.target.value)}
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
            placeholder={t("e.g. 0W-20 Full synthetic oil change & OEM filter")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="form-group">
            <label className="form-label">{t("Total Cost ($ CAD) *")}</label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              className="form-input font-mono"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("Parts Cost ($)")}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input font-mono"
              placeholder="0.00"
              value={partsCost}
              onChange={(e) => handlePartsChange(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("Labor Cost ($)")}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input font-mono"
              placeholder="0.00"
              value={laborCost}
              onChange={(e) => handleLaborChange(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t("Notes & Part Numbers")}</label>
          <textarea
            className="form-textarea"
            placeholder={t("Oil spec, tire tread depth, part codes, inspection notes...")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  )
}

