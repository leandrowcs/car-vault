import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import type { Vehicle, FuelType, Transmission } from '../../types/vehicle'

interface VehicleFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => void
  initialData?: Vehicle | null
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [trim, setTrim] = useState('')
  const [vin, setVin] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [fuelType, setFuelType] = useState<FuelType>('gasoline')
  const [transmission, setTransmission] = useState<Transmission>('automatic')
  const [currentOdometer, setCurrentOdometer] = useState<number>(0)
  const [purchaseDate, setPurchaseDate] = useState('')
  const [purchasePrice, setPurchasePrice] = useState<string>('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setMake(initialData.make || '')
      setModel(initialData.model || '')
      setYear(initialData.year || new Date().getFullYear())
      setTrim(initialData.trim || '')
      setVin(initialData.vin || '')
      setLicensePlate(initialData.licensePlate || '')
      setFuelType(initialData.fuelType || 'gasoline')
      setTransmission(initialData.transmission || 'automatic')
      setCurrentOdometer(initialData.currentOdometer || 0)
      setPurchaseDate(initialData.purchaseDate || '')
      setPurchasePrice(
        initialData.purchasePrice !== undefined ? String(initialData.purchasePrice) : ''
      )
      setNotes(initialData.notes || '')
    } else {
      setName('')
      setMake('')
      setModel('')
      setYear(new Date().getFullYear())
      setTrim('')
      setVin('')
      setLicensePlate('')
      setFuelType('gasoline')
      setTransmission('automatic')
      setCurrentOdometer(0)
      setPurchaseDate('')
      setPurchasePrice('')
      setNotes('')
    }
  }, [initialData, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!make || !model) return

    onSave({
      name: name || `${year} ${make} ${model}`,
      make,
      model,
      year: Number(year),
      trim: trim || undefined,
      vin: vin || undefined,
      licensePlate: licensePlate || undefined,
      fuelType,
      transmission,
      currentOdometer: Number(currentOdometer) || 0,
      purchaseDate: purchaseDate || undefined,
      purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
      notes: notes || undefined,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Vehicle' : 'Add Vehicle to Garage'}
      maxWidth="600px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="vehicle-form" className="btn btn-primary">
            {initialData ? 'Save Changes' : 'Add Vehicle'}
          </button>
        </>
      }
    >
      <form id="vehicle-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Make *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Honda, Tesla, Toyota"
              value={make}
              onChange={(e) => setMake(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Model *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Civic, Model 3, RAV4"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Year *</label>
            <input
              type="number"
              required
              min="1900"
              max="2099"
              className="form-input"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Trim / Version</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Touring, Sport, Long Range"
              value={trim}
              onChange={(e) => setTrim(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Vehicle Nickname</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Daily Commuter, Red Rocket"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Current Odometer (km) *</label>
            <input
              type="number"
              required
              min="0"
              className="form-input font-mono"
              value={currentOdometer}
              onChange={(e) => setCurrentOdometer(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fuel Type</label>
            <select
              className="form-select"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as FuelType)}
            >
              <option value="gasoline">Gasoline</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="plug-in-hybrid">Plug-in Hybrid (PHEV)</option>
              <option value="electric">Electric (EV)</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Transmission</label>
            <select
              className="form-select"
              value={transmission}
              onChange={(e) => setTransmission(e.target.value as Transmission)}
            >
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
              <option value="cvt">CVT</option>
              <option value="dual-clutch">Dual-Clutch</option>
              <option value="single-speed">Single-Speed (EV)</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">License Plate</label>
            <input
              type="text"
              className="form-input font-mono"
              placeholder="e.g. ABCD-123"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
            />
          </div>
          <div className="form-group">
            <label className="form-label">VIN</label>
            <input
              type="text"
              className="form-input font-mono"
              placeholder="17-character VIN"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Purchase Date</label>
            <input
              type="date"
              className="form-input"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Purchase Price ($ CAD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input font-mono"
              placeholder="0.00"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea"
            placeholder="Vehicle history, warranty details, options..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  )
}

