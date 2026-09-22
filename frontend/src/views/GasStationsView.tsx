import { StationPicker } from '../components/gas-stations/StationPicker'
import { useCarVault } from '../context/CarVaultContext'
import { useTranslation } from '../hooks/useTranslation'
import type { StationSelection } from '../services/gas-stations/types'

export function GasStationsView({ onSelect }: { onSelect: (selection: StationSelection) => void }) {
  const t = useTranslation()
  const { activeVehicle } = useCarVault()
  const canAdd = Boolean(activeVehicle && !activeVehicle.isSold && activeVehicle.fuelType !== 'electric')
  return <div style={{ display: 'grid', gap: 16 }}>
    <div><h2>{t('Gas Stations')}</h2><p className="card-subtitle">{t('Near you')}</p></div>
    {!canAdd && <p className="station-notice">{t('Select an active fuel-powered vehicle in Garage to save a fill-up. You can still browse stations.')}</p>}
    <StationPicker onSelect={onSelect} selectionDisabled={!canAdd} initialFuelType={activeVehicle?.fuelType === 'diesel' ? 'diesel' : 'regular'} />
  </div>
}
