import { useCarVault } from '../context/CarVaultContext'
import { useTranslation } from '../hooks/useTranslation'
import { calculateVehicleComparisons } from '../utils/calculations'
import { formatConsumption, formatCostPerKm, formatCurrency, formatDistance } from '../utils/formatters'
import { Card } from './common/Card'
import { BarChart3 } from 'lucide-react'

export function VehicleComparison() {
  const { data, settings, activeVehicle } = useCarVault()
  const t = useTranslation()
  const rows = calculateVehicleComparisons(data)
  return <Card style={{ minWidth: 0 }}>
    <div className="card-header"><div>
      <h3 className="card-title"><BarChart3 size={18} color="var(--vault-primary)" aria-hidden="true" />{t('Compare vehicles')}</h3>
      <p className="card-subtitle">{t('Complete history, including sold vehicles. Operating costs exclude purchase price. Cost/km uses the distance between recorded odometers.')}</p>
    </div></div>
    {rows.length < 2 && <p className="card-subtitle">{t('Add another vehicle to compare your garage.')}</p>}
    <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label={t('Compare vehicles')}>
      <table className="data-table vehicle-comparison-table" style={{ width: '100%', minWidth: 720 }}>
        <thead><tr>{['Vehicle', 'Status', 'Average Consumption', 'Energy consumption', 'Total Logged KM', 'Cost Per KM', 'Maintenance', 'Total Vehicle Cost'].map(label => <th key={label} scope="col">{t(label)}</th>)}</tr></thead>
        <tbody>{rows.map(({ vehicle, costs, fuel, energy }) => <tr key={vehicle.id}>
          <th scope="row">{vehicle.name || `${vehicle.make} ${vehicle.model}`} ({vehicle.year}){vehicle.id === activeVehicle?.id ? ' •' : ''}</th>
          <td>{t(vehicle.isSold ? 'Sold' : 'Owned')}</td>
          <td>{formatConsumption(fuel.averageLPer100Km)}</td>
          <td>{energy.kwhPer100Km === null ? '—' : `${energy.kwhPer100Km.toFixed(2)} kWh/100 km`}</td>
          <td>{costs.totalDistanceKm > 0 ? formatDistance(costs.totalDistanceKm) : '—'}</td>
          <td>{formatCostPerKm(costs.costPerKm, settings.currency)}</td>
          <td>{formatCurrency(costs.totalMaintenance, settings.currency)}</td>
          <td>{formatCurrency(costs.grandTotal, settings.currency)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </Card>
}
