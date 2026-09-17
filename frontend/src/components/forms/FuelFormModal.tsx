import { useTranslation } from '../../hooks/useTranslation'
import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import type { FuelEntry } from '../../types/fuel'
import { useCarVault } from '../../context/CarVaultContext'

interface FuelFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<FuelEntry, 'id' | 'createdAt'>) => void
  initialData?: FuelEntry | null
}

export const FuelFormModal: React.FC<FuelFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const t = useTranslation()
  const { activeVehicle } = useCarVault()

  const todayStr = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(todayStr)
  const [odometer, setOdometer] = useState<string>('')
  const [liters, setLiters] = useState<string>('')
  const [pricePerLiter, setPricePerLiter] = useState<string>('')
  const [totalCost, setTotalCost] = useState<string>('')
  const [station, setStation] = useState('')
  const [fullTank, setFullTank] = useState(true)
  const [missedPrevious, setMissedPrevious] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date.slice(0, 10))
      setOdometer(String(initialData.odometer))
      setLiters(String(initialData.liters))
      setPricePerLiter(String(initialData.pricePerLiter))
      setTotalCost(String(initialData.totalCost))
      setStation(initialData.station || '')
      setFullTank(initialData.fullTank)
      setMissedPrevious(Boolean(initialData.missedPreviousFillUp))
      setNotes(initialData.notes || '')
    } else {
      setDate(new Date().toISOString().slice(0, 10))
      setOdometer(activeVehicle ? String(activeVehicle.currentOdometer) : '')
      setLiters('')
      setPricePerLiter('')
      setTotalCost('')
      setStation('')
      setFullTank(true)
      setMissedPrevious(false)
      setNotes('')
    }
  }, [initialData, isOpen, activeVehicle])

  // Automatic calculation helpers
  const handleLitersChange = (val: string) => {
    setLiters(val)
    const l = parseFloat(val)
    const p = parseFloat(pricePerLiter)
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      setTotalCost((l * p).toFixed(2))
    }
  }

  const handlePriceChange = (val: string) => {
    setPricePerLiter(val)
    const l = parseFloat(liters)
    const p = parseFloat(val)
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      setTotalCost((l * p).toFixed(2))
    }
  }

  const handleTotalCostChange = (val: string) => {
    setTotalCost(val)
    const t = parseFloat(val)
    const l = parseFloat(liters)
    if (!isNaN(t) && !isNaN(l) && t > 0 && l > 0) {
      setPricePerLiter((t / l).toFixed(3))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeVehicle) return

    const odoNum = parseFloat(odometer)
    const litersNum = parseFloat(liters)
    const priceNum = parseFloat(pricePerLiter)
    const totalNum = parseFloat(totalCost) || litersNum * priceNum

    if (isNaN(odoNum) || isNaN(litersNum) || litersNum <= 0) return

    onSave({
      vehicleId: activeVehicle.id,
      date,
      odometer: odoNum,
      liters: litersNum,
      pricePerLiter: !isNaN(priceNum) && priceNum > 0 ? priceNum : totalNum / litersNum,
      totalCost: totalNum,
      station: station || undefined,
      fullTank,
      missedPreviousFillUp: missedPrevious,
      notes: notes || undefined,
      fuelType: activeVehicle.fuelType,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? t("Edit Fill-Up") : t("Log Fuel Fill-Up")}
      maxWidth="520px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t("Cancel")}
          </button>
          <button type="submit" form="fuel-form" className="btn btn-primary">
            {initialData ? t("Update Record") : t("Save Fill-Up")}
          </button>
        </>
      }
    >
      <form id="fuel-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
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
              step="1"
              className="form-input font-mono"
              placeholder={t("e.g. 28450")}
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t("Fuel Volume (Liters) *")}</label>
            <input
              type="number"
              required
              step="0.01"
              min="0.1"
              className="form-input font-mono"
              placeholder={t("e.g. 42.50")}
              value={liters}
              onChange={(e) => handleLitersChange(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t("Price per Liter ($ CAD/L)")}</label>
            <input
              type="number"
              step="0.001"
              min="0.01"
              className="form-input font-mono"
              placeholder={t("e.g. 1.589")}
              value={pricePerLiter}
              onChange={(e) => handlePriceChange(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t("Total Cost ($ CAD) *")}</label>
            <input
              type="number"
              required
              step="0.01"
              min="0.01"
              className="form-input font-mono"
              placeholder={t("Auto-calculated or type total")}
              value={totalCost}
              onChange={(e) => handleTotalCostChange(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t("Gas Station")}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t("e.g. Petro-Canada, Shell, Costco")}
              value={station}
              onChange={(e) => setStation(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '6px 0' }}>
          <label className="form-checkbox-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={fullTank}
              onChange={(e) => setFullTank(e.target.checked)}
            />
            <span>{t("Full Tank Fill-up")}</span>
          </label>

          <label className="form-checkbox-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={missedPrevious}
              onChange={(e) => setMissedPrevious(e.target.checked)}
            />
            <span style={{ color: 'var(--vault-text-secondary)', fontSize: '13px' }}>
              {t("Missed previous fill-up")}
            </span>
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">{t("Notes")}</label>
          <input
            type="text"
            className="form-input"
            placeholder={t("Trip notes, fuel grade (87/91)...")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  )
}

