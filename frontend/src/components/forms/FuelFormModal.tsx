import { useTranslation } from '../../hooks/useTranslation'
import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '../common/Modal'
import type { FuelEntry } from '../../types/fuel'
import { useCarVault } from '../../context/CarVaultContext'
import { StationPicker } from '../gas-stations/StationPicker'
import { fuelTypes, type StationSelection, type StationFuelType } from '../../services/gas-stations/types'
import { applyStationSelection, calculateFuelTotal } from '../../services/gas-stations/fuelDraft'
import { getLanguage } from '../../services/language'

interface FuelFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<FuelEntry, 'id' | 'createdAt'>) => void
  initialData?: FuelEntry | null
  selectedStation?: StationSelection | null
}

export const FuelFormModal: React.FC<FuelFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  selectedStation,
}) => {
  const t = useTranslation()
  const { activeVehicle, settings } = useCarVault()

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
  const [fuelType, setFuelType] = useState('regular')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [suggestion, setSuggestion] = useState<StationSelection | null>(null)
  const [formError, setFormError] = useState('')
  const manualPrice = useRef(false)

  const selectStation = (selection: StationSelection) => {
    const draft = applyStationSelection({ liters, pricePerLiter, totalCost }, selection, manualPrice.current, settings.currency)
    setStation(draft.station)
    setFuelType(draft.fuelType)
    setPricePerLiter(draft.pricePerLiter)
    setTotalCost(draft.totalCost)
    setSuggestion(selection)
    setPickerOpen(false)
  }

  useEffect(() => {
    manualPrice.current = Boolean(initialData)
    setPickerOpen(false)
    setSuggestion(null)
    setFormError('')
    if (initialData) {
      setFuelType(initialData.fuelType || (activeVehicle?.fuelType === 'diesel' ? 'diesel' : 'regular'))
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
      setFuelType(activeVehicle?.fuelType === 'diesel' ? 'diesel' : 'regular')
      if (selectedStation) {
        const draft = applyStationSelection({ liters: '', pricePerLiter: '', totalCost: '' }, selectedStation, false, settings.currency)
        setStation(draft.station)
        setFuelType(draft.fuelType)
        setPricePerLiter(draft.pricePerLiter)
        setSuggestion(selectedStation)
      }
    }
  }, [initialData, isOpen, activeVehicle?.id, selectedStation])

  // Automatic calculation helpers
  const handleLitersChange = (val: string) => {
    setLiters(val)
    setTotalCost(calculateFuelTotal(val, pricePerLiter))
  }

  const handlePriceChange = (val: string) => {
    manualPrice.current = true
    setPricePerLiter(val)
    setTotalCost(calculateFuelTotal(liters, val))
  }

  const handleTotalCostChange = (val: string) => {
    manualPrice.current = true
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

    if (!Number.isFinite(odoNum) || odoNum < 0 || !Number.isFinite(litersNum) || litersNum <= 0 || !Number.isFinite(totalNum) || totalNum <= 0) {
      setFormError('Enter a valid odometer, volume, and total cost.')
      return
    }

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
      fuelType,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? t("Edit Fill-Up") : t("Log Fuel Fill-Up")}
      maxWidth={pickerOpen ? '760px' : '520px'}
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
        {formError && <p role="alert">{t(formError)}</p>}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="fuel-date">{t("Date *")}</label>
            <input
              id="fuel-date"
              type="date"
              required
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="fuel-odometer">{t("Odometer (km) *")}</label>
            <input
              id="fuel-odometer"
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
            <label className="form-label" htmlFor="fuel-liters">{t("Fuel Volume (Liters) *")}</label>
            <input
              id="fuel-liters"
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
            <label className="form-label" htmlFor="fuel-price">{t('Price per liter')} ({settings.currency}/L)</label>
            <input
              id="fuel-price"
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
            <label className="form-label" htmlFor="fuel-total">{t('Total Cost')} ({settings.currency}) *</label>
            <input
              id="fuel-total"
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
            <label className="form-label" htmlFor="fuel-station">{t("Gas Station")}</label>
            <input
              id="fuel-station"
              type="text"
              className="form-input"
              placeholder={t("e.g. Petro-Canada, Shell, Costco")}
              value={station}
              onChange={(e) => {
                setStation(e.target.value)
                setSuggestion(null)
                if (!manualPrice.current) { setPricePerLiter(''); setTotalCost('') }
              }}
            />
          </div>
        </div>

        <label className="form-group" htmlFor="fuel-grade"><span className="form-label">{t('Fuel type')}</span>
          <select id="fuel-grade" className="form-input" value={fuelType} onChange={e => {
            setFuelType(e.target.value)
            setSuggestion(null)
            if (!manualPrice.current) { setPricePerLiter(''); setTotalCost('') }
          }}>
            {!Object.hasOwn(fuelTypes, fuelType) && <option value={fuelType}>{t(fuelType)}</option>}
            {Object.entries(fuelTypes).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-secondary" aria-expanded={pickerOpen} onClick={() => setPickerOpen(value => !value)}>{t(pickerOpen ? 'Close nearby stations' : 'Select nearby station')}</button>
        {suggestion && <div className="station-notice" role="status">
          <p>{t('Suggested price')}: {suggestion.station.prices[suggestion.fuelType]
            ? `${suggestion.station.prices[suggestion.fuelType]!.pricePerLiter.toFixed(3)} ${suggestion.station.prices[suggestion.fuelType]!.currency}/L`
            : t('Price unavailable')}</p>
          <p>{t('Updated')}: {suggestion.station.prices[suggestion.fuelType]?.updatedAt
            ? new Date(suggestion.station.prices[suggestion.fuelType]!.updatedAt!).toLocaleString(getLanguage()) : t('Update time unavailable')}</p>
          <p>{t('Retrieved')}: {new Date(suggestion.fetchedAt).toLocaleString(getLanguage())}</p>
          <p className="station-attribution">{t('Source')}: <a href={suggestion.station.sourceUrl} target="_blank" rel="noopener noreferrer">{suggestion.station.source}</a><br />{suggestion.station.attribution}</p>
          <p>{t('Verify at the pump. You can always edit the price; a manually entered price is kept when selecting another station.')}</p>
          {suggestion.station.prices[suggestion.fuelType]?.currency && suggestion.station.prices[suggestion.fuelType]!.currency !== settings.currency && <p>{t('The suggested price uses a different currency. Enter the amount paid in your selected currency.')}</p>}
        </div>}
        {isOpen && pickerOpen && <div className="station-form-picker"><StationPicker
          initialFuelType={Object.hasOwn(fuelTypes, fuelType) ? fuelType as StationFuelType : 'regular'}
          onSelect={selectStation}
        /></div>}

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
          <label className="form-label" htmlFor="fuel-notes">{t("Notes")}</label>
          <input
            id="fuel-notes"
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

