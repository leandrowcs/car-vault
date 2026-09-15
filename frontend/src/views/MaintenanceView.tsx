import React, { useState, useMemo } from 'react'
import {
  Wrench,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Search,
} from 'lucide-react'
import { useCarVault } from '../context/CarVaultContext'
import { formatCurrency, formatDistance, formatDate } from '../utils/formatters'
import { Card } from '../components/common/Card'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import type { MaintenanceRecord } from '../types/maintenance'

interface MaintenanceViewProps {
  onAddMaintenance: () => void
  onEditMaintenance: (record: MaintenanceRecord) => void
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  onAddMaintenance,
  onEditMaintenance,
}) => {
  const { activeVehicle, activeMaintenanceRecords, deleteMaintenanceRecord, settings } =
    useCarVault()

  const [recordToDelete, setRecordToDelete] = useState<MaintenanceRecord | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = useMemo(() => {
    const set = new Set<string>()
    activeMaintenanceRecords.forEach((m) => set.add(m.category))
    return Array.from(set).sort()
  }, [activeMaintenanceRecords])

  const filteredRecords = useMemo(() => {
    return activeMaintenanceRecords.filter((m) => {
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory
      const query = searchQuery.toLowerCase()
      const matchQuery =
        !query ||
        m.description.toLowerCase().includes(query) ||
        (m.serviceProvider && m.serviceProvider.toLowerCase().includes(query)) ||
        m.category.toLowerCase().includes(query) ||
        (m.notes && m.notes.toLowerCase().includes(query))
      return matchCat && matchQuery
    })
  }, [activeMaintenanceRecords, selectedCategory, searchQuery])

  const totalCost = useMemo(
    () => filteredRecords.reduce((acc, m) => acc + (m.cost || 0), 0),
    [filteredRecords]
  )

  const partsTotal = useMemo(
    () => filteredRecords.reduce((acc, m) => acc + (m.partsCost || 0), 0),
    [filteredRecords]
  )

  const laborTotal = useMemo(
    () => filteredRecords.reduce((acc, m) => acc + (m.laborCost || 0), 0),
    [filteredRecords]
  )

  if (!activeVehicle) {
    return (
      <div className="empty-state">
        <Wrench className="empty-state-icon" />
        <h3 className="empty-state-title">Select or Add a Vehicle First</h3>
        <p className="empty-state-desc">
          You must have an active vehicle in your garage to log maintenance records.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Header */}
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
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Maintenance & Service History</h2>
          <p className="card-subtitle">
            Keep track of oil changes, tire rotations, brake jobs, and scheduled service
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={onAddMaintenance}>
          <Plus size={16} /> Log Service Record
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid-metrics">
        <div className="metric-card">
          <div className="metric-card-top">
            <span>Total Maintenance Cost</span>
            <DollarSign className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(totalCost, settings.currency)}
          </div>
          <div className="metric-subtext">Across {filteredRecords.length} records</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Parts Spend</span>
            <Wrench className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(partsTotal, settings.currency)}
          </div>
          <div className="metric-subtext">Components & supplies</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Labor Spend</span>
            <DollarSign className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(laborTotal, settings.currency)}
          </div>
          <div className="metric-subtext">Shop and technician fees</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Current Odometer</span>
            <Wrench className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatDistance(activeVehicle.currentOdometer, settings.distanceUnit)}
          </div>
          <div className="metric-subtext">Vehicle baseline</div>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--vault-surface)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--vault-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedCategory('all')}
          >
            All Services
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
          <Search size={16} color="var(--vault-text-muted)" />
          <input
            type="text"
            className="form-input"
            style={{ padding: '6px 10px', fontSize: '13px' }}
            placeholder="Search service records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Maintenance Table */}
      <Card>
        {filteredRecords.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--vault-text-muted)' }}>
            No maintenance records found.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Odometer</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Service Provider</th>
                  <th>Parts / Labor</th>
                  <th style={{ textAlign: 'right' }}>Total Cost</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((maint) => (
                  <tr key={maint.id}>
                    <td className="font-mono" style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(maint.date, settings.dateFormat)}
                    </td>
                    <td className="font-mono" style={{ fontWeight: 600 }}>
                      {maint.odometer.toLocaleString()} km
                    </td>
                    <td>
                      <span className="badge badge-blue">{maint.category}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{maint.description}</div>
                      {maint.notes && (
                        <div style={{ fontSize: '12px', color: 'var(--vault-text-secondary)', marginTop: '2px' }}>
                          {maint.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--vault-text-secondary)' }}>
                      {maint.serviceProvider || '—'}
                    </td>
                    <td className="font-mono" style={{ fontSize: '12.5px', color: 'var(--vault-text-secondary)' }}>
                      {maint.partsCost !== undefined || maint.laborCost !== undefined ? (
                        <span>
                          P: ${maint.partsCost ?? 0} | L: ${maint.laborCost ?? 0}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                      {formatCurrency(maint.cost, settings.currency)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => onEditMaintenance(maint)}
                          title="Edit record"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => setRecordToDelete(maint)}
                          title="Delete record"
                        >
                          <Trash2 size={13} color="var(--vault-danger)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={Boolean(recordToDelete)}
        title="Delete Service Record"
        message={`Are you sure you want to delete this maintenance record: "${recordToDelete?.description}"?`}
        confirmLabel="Delete Record"
        onConfirm={() => {
          if (recordToDelete) {
            deleteMaintenanceRecord(recordToDelete.id)
            setRecordToDelete(null)
          }
        }}
        onCancel={() => setRecordToDelete(null)}
      />
    </div>
  )
}

