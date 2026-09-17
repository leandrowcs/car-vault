import { useTranslation } from '../../hooks/useTranslation'
import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import type { ChargingEntry, ChargingLocationType, ChargingSpeedType } from '../../types/fuel'
import { useCarVault } from '../../context/CarVaultContext'

interface ChargingFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<ChargingEntry, 'id' | 'createdAt'>) => void
  initialData?: ChargingEntry | null
}

export const ChargingFormModal: React.FC<ChargingFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const t = useTranslation()
  const { activeVehicle } = useCarVault()

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [odometer, setOdometer] = useState('')
  const [kwh, setKwh] = useState('')
  const [pricePerKwh, setPricePerKwh] = useState('')
  const [totalCost, setTotalCost] = useState('')
  const [chargingLocation, setChargingLocation] = useState('')
  const [locationType, setLocationType] = useState<ChargingLocationType>('home')
  const [chargingType, setChargingType] = useState<ChargingSpeedType>('Level 2')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date.slice(0, 10))
      setOdometer(String(initialData.odometer))
      setKwh(String(initialData.kwh))
      setPricePerKwh(String(initialData.pricePerKwh))
      setTotalCost(String(initialData.totalCost))
      setChargingLocation(initialData.chargingLocation || '')
      setLocationType(initialData.locationType || 'home')
      setChargingType((initialData.chargingType as ChargingSpeedType) || 'Level 2')
      setNotes(initialData.notes || '')
    } else {
      setDate(new Date().toISOString().slice(0, 10))
      setOdometer(activeVehicle ? String(activeVehicle.currentOdometer) : '')
      setKwh('')
      setPricePerKwh('0.14') // Common Ontario off-peak rate
      setTotalCost('')
      setChargingLocation('Home Garage')
      setLocationType('home')
      setChargingType('Level 2')
      setNotes('')
    }
  }, [initialData, isOpen, activeVehicle])

  const handleKwhChange = (val: string) => {
    setKwh(val)
    const k = parseFloat(val)
    const p = parseFloat(pricePerKwh)
    if (!isNaN(k) && !isNaN(p) && k > 0 && p > 0) {
      setTotalCost((k * p).toFixed(2))
    }
  }

  const handlePriceChange = (val: string) => {
    setPricePerKwh(val)
    const k = parseFloat(kwh)
    const p = parseFloat(val)
    if (!isNaN(k) && !isNaN(p) && k > 0 && p > 0) {
      setTotalCost((k * p).toFixed(2))
    }
  }

  const handleTotalChange = (val: string) => {
    setTotalCost(val)
    const t = parseFloat(val)
    const k = parseFloat(kwh)
    if (!isNaN(t) && !isNaN(k) && t > 0 && k > 0) {
      setPricePerKwh((t / k).toFixed(3))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeVehicle) return

    const odoNum = parseFloat(odometer)
    const kwhNum = parseFloat(kwh)
    const priceNum = parseFloat(pricePerKwh)
    const totalNum = parseFloat(totalCost) || kwhNum * priceNum

    if (isNaN(odoNum) || isNaN(kwhNum) || kwhNum <= 0) return

    onSave({
      vehicleId: activeVehicle.id,
      date,
      odometer: odoNum,
      kwh: kwhNum,
      pricePerKwh: !isNaN(priceNum) && priceNum > 0 ? priceNum : totalNum / kwhNum,
      totalCost: totalNum,
      chargingLocation: chargingLocation || undefined,
      locationType,
      chargingType,
      notes: notes || undefined,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? t("Edit EV Charge") : t("Log EV Charging Session")}
      maxWidth="520px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t("Cancel")}
          </button>
          <button type="submit" form="charging-form" className="btn btn-primary">
            {initialData ? t("Update Record") : t("Save Charge")}
          </button>
        </>
      }
    >
      <form id="charging-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
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
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t("Energy (kWh) *")}</label>
            <input
              type="number"
              required
              step="0.01"
              min="0.1"
              className="form-input font-mono"
              placeholder={t("e.g. 52.0")}
              value={kwh}
              onChange={(e) => handleKwhChange(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("Price per kWh ($ CAD)")}</label>
            <input
              type="number"
              step="0.001"
              min="0"
              className="form-input font-mono"
              placeholder={t("e.g. 0.14")}
              value={pricePerKwh}
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
              min="0"
              className="form-input font-mono"
              value={totalCost}
              onChange={(e) => handleTotalChange(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("Charging Speed")}</label>
            <select
              className="form-select"
              value={chargingType}
              onChange={(e) => setChargingType(e.target.value as ChargingSpeedType)}
            >
              <option value="Level 1">{t("Level 1 (120V Home Outlet)")}</option>
              <option value="Level 2">{t("Level 2 (240V Wall Connector)")}</option>
              <option value="DC Fast">{t("DC Fast (CCS / NACS Supercharger)")}</option>
              <option value="Other">{t("Other")}</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t("Location Type")}</label>
            <select
              className="form-select"
              value={locationType}
              onChange={(e) => setLocationType(e.target.value as ChargingLocationType)}
            >
              <option value="home">{t("Home")}</option>
              <option value="public">{t("Public Station")}</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t("Station / Location Name")}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t("e.g. Electrify Canada, Tesla Supercharger")}
              value={chargingLocation}
              onChange={(e) => setChargingLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t("Notes")}</label>
          <input
            type="text"
            className="form-input"
            placeholder={t("Starting state of charge (SoC), charging curve...")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  )
}

