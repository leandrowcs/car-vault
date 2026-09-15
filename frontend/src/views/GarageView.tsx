import React, { useState } from 'react'
import {
  Car,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { useCarVault } from '../context/CarVaultContext'
import { formatCurrency, formatDistance } from '../utils/formatters'
import { FuelTypeBadge } from '../components/common/StatBadge'
import { Card } from '../components/common/Card'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import type { Vehicle } from '../types/vehicle'

interface GarageViewProps {
  onAddVehicle: () => void
  onEditVehicle: (vehicle: Vehicle) => void
}

export const GarageView: React.FC<GarageViewProps> = ({
  onAddVehicle,
  onEditVehicle,
}) => {
  const { vehicles, activeVehicleId, setActiveVehicleId, deleteVehicle, settings } =
    useCarVault()

  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Top Banner & Add Vehicle CTA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Digital Garage</h2>
          <p className="card-subtitle">
            {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'} registered in your vault
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={onAddVehicle}>
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="empty-state">
          <Car className="empty-state-icon" />
          <h3 className="empty-state-title">Your Garage is Empty</h3>
          <p className="empty-state-desc">
            Register your car, truck, or electric vehicle to start tracking mileage, fuel, and service records.
          </p>
          <button type="button" className="btn btn-primary" onClick={onAddVehicle}>
            <Plus size={16} /> Add First Vehicle
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {vehicles.map((vehicle) => {
            const isActive = vehicle.id === activeVehicleId

            return (
              <Card
                key={vehicle.id}
                style={{
                  border: isActive
                    ? '1.5px solid var(--vault-primary)'
                    : '1px solid var(--vault-border)',
                  boxShadow: isActive ? 'var(--shadow-amber)' : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Header with Make, Model, Year, Badges */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <FuelTypeBadge fuelType={vehicle.fuelType} />
                      {isActive && <span className="badge badge-amber">Active Vehicle</span>}
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--vault-text)' }}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    {vehicle.name && vehicle.name !== `${vehicle.year} ${vehicle.make} ${vehicle.model}` && (
                      <div style={{ fontSize: '13px', color: 'var(--vault-text-secondary)' }}>
                        "{vehicle.name}" {vehicle.trim ? `• ${vehicle.trim}` : ''}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      title="Edit vehicle details"
                      onClick={() => onEditVehicle(vehicle)}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      title="Delete vehicle"
                      onClick={() => setVehicleToDelete(vehicle)}
                    >
                      <Trash2 size={15} color="var(--vault-danger)" />
                    </button>
                  </div>
                </div>

                {/* Specs Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '10px',
                    background: 'var(--vault-surface-2)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12.5px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--vault-text-muted)', display: 'block' }}>Odometer</span>
                    <strong className="font-mono" style={{ color: 'var(--vault-primary)' }}>
                      {formatDistance(vehicle.currentOdometer, settings.distanceUnit)}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: 'var(--vault-text-muted)', display: 'block' }}>License Plate</span>
                    <strong className="font-mono">{vehicle.licensePlate || '—'}</strong>
                  </div>

                  <div>
                    <span style={{ color: 'var(--vault-text-muted)', display: 'block' }}>Transmission</span>
                    <span style={{ textTransform: 'capitalize' }}>{vehicle.transmission || '—'}</span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--vault-text-muted)', display: 'block' }}>Purchase Price</span>
                    <span className="font-mono">
                      {vehicle.purchasePrice ? formatCurrency(vehicle.purchasePrice, settings.currency) : '—'}
                    </span>
                  </div>

                  {vehicle.vin && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--vault-text-muted)', display: 'block' }}>VIN</span>
                      <span className="font-mono" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                        {vehicle.vin}
                      </span>
                    </div>
                  )}
                </div>

                {vehicle.notes && (
                  <p style={{ fontSize: '12.5px', color: 'var(--vault-text-secondary)', fontStyle: 'italic' }}>
                    "{vehicle.notes}"
                  </p>
                )}

                {/* Footer Action */}
                {!isActive && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 'auto', alignSelf: 'flex-start' }}
                    onClick={() => setActiveVehicleId(vehicle.id)}
                  >
                    <CheckCircle2 size={14} color="var(--vault-primary)" /> Set as Active Vehicle
                  </button>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(vehicleToDelete)}
        title="Delete Vehicle"
        message={`Are you sure you want to remove "${vehicleToDelete?.year} ${vehicleToDelete?.make} ${vehicleToDelete?.model}"? All associated fuel records, maintenance, and expenses for this vehicle will also be removed.`}
        confirmLabel="Delete Vehicle"
        onConfirm={() => {
          if (vehicleToDelete) {
            deleteVehicle(vehicleToDelete.id)
            setVehicleToDelete(null)
          }
        }}
        onCancel={() => setVehicleToDelete(null)}
      />
    </div>
  )
}
