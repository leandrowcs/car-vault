import React, { useState, useRef } from 'react'
import { useAccount } from '../context/AccountContext'
import { AccountPanel } from '../components/account/AccountPanel'
import {
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Car,
} from 'lucide-react'
import { useCarVault } from '../context/CarVaultContext'
import { exportVaultToJson, parseAndValidateVaultJson } from '../services/exportImport'
import { Card } from '../components/common/Card'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import type { DistanceUnit, VolumeUnit, FuelEconomyUnit, DateFormatOption } from '../types/settings'

export const SettingsView: React.FC = () => {
  const { user } = useAccount()
  const {
    data,
    settings,
    updateSettings,
    loadDemoData,
    restoreData,
    resetAllData,
    sync,
  } = useCarVault()

  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [confirmDemoOpen, setConfirmDemoOpen] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    try {
      exportVaultToJson(data)
      setNotification({ message: 'Car Vault backup JSON exported successfully.', type: 'success' })
    } catch (err) {
      setNotification({ message: 'Failed to export backup.', type: 'error' })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const result = parseAndValidateVaultJson(content)
      if (result.success && result.data) {
        restoreData(result.data)
        setNotification({
          message: user ? 'Backup import submitted. Check the sync status above.' : 'Backup restored to this device.',
          type: 'success',
        })
      } else {
        setNotification({
          message: result.error || 'Invalid backup file structure.',
          type: 'error',
        })
      }
    }
    reader.readAsText(file)
    // reset input
    e.target.value = ''
  }

  return (
    <div style={{ display: 'grid', gap: '24px', maxWidth: '820px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Settings & Preferences</h2>
        <p className="card-subtitle">
          Configure automotive units, regional currency, and local data persistence
        </p>
      </div>

      {notification && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13.5px',
            fontWeight: 600,
            background:
              notification.type === 'success'
                ? 'var(--vault-success-soft)'
                : 'var(--vault-danger-soft)',
            color:
              notification.type === 'success'
                ? 'var(--vault-success)'
                : 'var(--vault-danger)',
            border: `1px solid ${
              notification.type === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
          }}
        >
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      <AccountPanel />

      {/* Regional & Automotive Units (Canadian Default) */}
      <Card>
        <div className="card-header">
          <h3 className="card-title">Regional & Automotive Units</h3>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select
                className="form-select"
                value={settings.currency}
                onChange={(e) => updateSettings({ currency: e.target.value })}
              >
                <option value="CAD">CAD ($ - Canadian Dollar)</option>
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="GBP">GBP (£ - British Pound)</option>
                <option value="BRL">BRL (R$ - Brazilian Real)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Distance Unit</label>
              <select
                className="form-select"
                value={settings.distanceUnit}
                onChange={(e) => updateSettings({ distanceUnit: e.target.value as DistanceUnit })}
              >
                <option value="km">Kilometers (km)</option>
                <option value="mi">Miles (mi)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fuel Volume Unit</label>
              <select
                className="form-select"
                value={settings.volumeUnit}
                onChange={(e) => updateSettings({ volumeUnit: e.target.value as VolumeUnit })}
              >
                <option value="L">Liters (L)</option>
                <option value="gal">US Gallons (gal)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Fuel Efficiency Format</label>
              <select
                className="form-select"
                value={settings.fuelEconomyUnit}
                onChange={(e) =>
                  updateSettings({ fuelEconomyUnit: e.target.value as FuelEconomyUnit })
                }
              >
                <option value="L/100km">Liters per 100 km (L/100 km)</option>
                <option value="mpg-us">Miles per Gallon US (MPG US)</option>
                <option value="km/L">Kilometers per Liter (km/L)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date Format</label>
              <select
                className="form-select"
                value={settings.dateFormat}
                onChange={(e) =>
                  updateSettings({ dateFormat: e.target.value as DateFormatOption })
                }
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO / Canadian Standard)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Local-First Data Portability */}
      <Card>
        <div className="card-header">
          <div>
            <h3 className="card-title">Data Backup & Portability</h3>
            <p className="card-subtitle">
              {user ? 'Changes sync to your account. Keep JSON backups for independent recovery.' : 'Your local garage stays on this device. Export a backup before changing domains or clearing browser data.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExport}
            >
              <Download size={16} color="var(--vault-primary)" /> Export JSON Backup
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={Boolean(sync.error) || Boolean(user && (sync.fromCache || sync.pending))}
            >
              <Upload size={16} color="var(--vault-info)" /> {user ? 'Merge JSON Backup' : 'Restore from JSON'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirmDemoOpen(true)}
              disabled={Boolean(user) || Boolean(sync.error)}
            >
              <RefreshCw size={16} color="var(--vault-warning)" /> Load Demo Garage
            </button>
          </div>

          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid var(--vault-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <strong style={{ color: 'var(--vault-danger)', display: 'block', fontSize: '13.5px' }}>
                Reset All Vault Data
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--vault-text-muted)' }}>
                {user ? 'Deletes account records across all synced devices. Your separate local garage remains.' : 'Irreversibly removes this device’s local garage.'}
              </span>
            </div>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmResetOpen(true)}
              disabled={Boolean(sync.error) || Boolean(user && (sync.fromCache || sync.pending))}
            >
              <Trash2 size={14} /> Clear All Data
            </button>
          </div>
        </div>
      </Card>

      {/* Vault Family Badge */}
      <Card style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="brand-icon-box">
            <Car size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>Car Vault • Vault Family</div>
            <div style={{ fontSize: '12.5px', color: 'var(--vault-text-secondary)' }}>
              Part of the Vault suite alongside <strong>Series Vault</strong> and <strong>Sports Vault</strong>.
              Designed with a dark-first digital garage aesthetic and local-first architecture.
            </div>
          </div>
        </div>
      </Card>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={confirmDemoOpen}
        title="Load Demo Garage"
        message="This will overwrite current data with sample Canadian vehicles (2023 Honda Civic Sedan and 2024 Hyundai Ioniq 5) with 1 year of realistic fill-ups, maintenance records, and reminders."
        confirmLabel="Load Demo Data"
        danger={false}
        onConfirm={() => {
          loadDemoData()
          setConfirmDemoOpen(false)
          setNotification({ message: 'Loaded Canadian demo garage successfully!', type: 'success' })
        }}
        onCancel={() => setConfirmDemoOpen(false)}
      />

      <ConfirmDialog
        isOpen={confirmResetOpen}
        title="Clear All Car Vault Data"
        message={user ? 'Delete all records currently loaded in this account? This deletion syncs to your other devices. Export a backup first.' : 'Delete all records in this device’s local garage? Export a backup first.'}
        confirmLabel="Delete Everything"
        danger={true}
        onConfirm={() => {
          resetAllData()
          setConfirmResetOpen(false)
          setNotification({ message: user ? 'Deletion submitted. Check the sync status above.' : 'Local garage cleared.', type: 'success' })
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  )
}
