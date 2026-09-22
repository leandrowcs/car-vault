import { useEffect, useId, useState } from 'react'
import { Fuel, LocateFixed, Navigation, RefreshCw } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useNearbyGasStations } from '../../hooks/useNearbyGasStations'
import { manualLocation } from '../../services/gas-stations/location'
import { navigationUrl } from '../../services/gas-stations/config'
import { fuelTypes, type StationFuelType, type StationSelection, type StationSort } from '../../services/gas-stations/types'
import { getLanguage } from '../../services/language'
import './gas-stations.css'

interface Props {
  onSelect: (selection: StationSelection) => void
  initialFuelType?: StationFuelType
  selectionDisabled?: boolean
}
export function StationPicker({ onSelect, initialFuelType = 'regular', selectionDisabled = false }: Props) {
  const t = useTranslation()
  const id = useId()
  const location = useGeolocation()
  const [radius, setRadius] = useState(5)
  const [fuelType, setFuelType] = useState<StationFuelType>(initialFuelType)
  const [sort, setSort] = useState<StationSort>('distance')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [manualError, setManualError] = useState(false)
  const search = useNearbyGasStations(location.coordinates, radius, fuelType, sort)
  const { request } = location
  useEffect(() => { void request() }, [request])
  const busy = location.loading || search.loading

  return <section className="station-picker" aria-label={t('Nearby Stations')}>
    <p className="card-subtitle">{t('Your location is used only for this search and shared with the station provider. It is not saved to your vault.')}</p>
    <div className="station-actions">
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void request()}><LocateFixed size={16} />{t('Use current location')}</button>
      {location.coordinates && <button type="button" className="btn btn-secondary" disabled={busy} onClick={search.retry}><RefreshCw size={16} />{t('Search again')}</button>}
    </div>
    {location.error && <div role="status" className="station-notice">
      <strong>{t('Location access is unavailable.')}</strong>
      <p>{t(location.error === 'denied' ? 'Location permission was denied.' : location.error === 'timeout' ? 'Location request timed out.' : 'Your browser could not determine your location.')}</p>
      <p>{t('Enter a location manually or enable location permissions to find nearby stations.')}</p>
    </div>}
    <details className="station-manual" open={location.error !== null || undefined} onKeyDown={event => {
      if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
        event.preventDefault()
        const point = manualLocation(latitude, longitude)
        setManualError(!point)
        if (point && !search.loading) location.setManualCoordinates(point)
      }
    }}>
      <summary>{t('Enter location manually')}</summary>
      <p className="card-subtitle">{t('Enter latitude and longitude from your map application.')}</p>
      <div className="station-filters">
        <label className="form-group" htmlFor={`${id}-lat`}><span className="form-label">{t('Latitude')}</span><input id={`${id}-lat`} className="form-input" type="number" min="-90" max="90" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} /></label>
        <label className="form-group" htmlFor={`${id}-lng`}><span className="form-label">{t('Longitude')}</span><input id={`${id}-lng`} className="form-input" type="number" min="-180" max="180" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} /></label>
        <button type="button" className="btn btn-secondary" disabled={search.loading} onClick={() => {
          const point = manualLocation(latitude, longitude)
          setManualError(!point)
          if (point) location.setManualCoordinates(point)
        }}>{t('Search here')}</button>
      </div>
      {manualError && <p role="alert">{t('Enter valid latitude (−90 to 90) and longitude (−180 to 180).')}</p>}
    </details>
    <div className="station-filters">
      <label className="form-group" htmlFor={`${id}-radius`}><span className="form-label">{t('Radius')}</span><select id={`${id}-radius`} className="form-input" value={radius} disabled={busy} onChange={e => setRadius(Number(e.target.value))}>{[1, 5, 10, 20, 30].map(value => <option key={value} value={value}>{value} km</option>)}</select></label>
      <label className="form-group" htmlFor={`${id}-fuel`}><span className="form-label">{t('Fuel type')}</span><select id={`${id}-fuel`} className="form-input" value={fuelType} disabled={busy} onChange={e => setFuelType(e.target.value as StationFuelType)}>{Object.entries(fuelTypes).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>
      <label className="form-group" htmlFor={`${id}-sort`}><span className="form-label">{t('Sort by')}</span><select id={`${id}-sort`} className="form-input" value={sort} disabled={busy} onChange={e => setSort(e.target.value as StationSort)}><option value="distance">{t('Distance')}</option><option value="price">{t('Price')}</option></select></label>
    </div>
    {fuelType === 'midGrade' && <p className="station-notice">{t('Mid-grade prices are not supplied by Gas Québec. Enter the pump price manually.')}</p>}
    <div aria-live="polite" aria-busy={busy}>
      {busy && <p role="status">{t(location.loading ? 'Finding your location…' : 'Loading nearby stations…')}</p>}
      {search.error && <p role="alert" className="station-notice">{t(search.error)}</p>}
      {!busy && search.results && <>
        <p className="card-subtitle">{t('Retrieved')}: {new Date(search.results.fetchedAt).toLocaleString(getLanguage())}</p>
        <p className="card-subtitle">{t('Distances are straight-line estimates, not driving distances.')}</p>
        {search.results.notice && <p className="station-notice">{t(search.results.notice)}</p>}
        {search.results.stations.length === 0 && <p className="record-empty">{t('No stations found. Try a larger radius or another location.')}</p>}
        <div className="station-grid">
          {search.results.stations.map(station => {
            const price = station.prices[fuelType]
            return <article className="card station-card" key={station.id}>
              <div className="station-card-heading"><Fuel size={20} aria-hidden="true" /><h3>{station.name === 'Gas station' ? t(station.name) : station.name}</h3><span>{station.distanceKm?.toFixed(1)} km</span></div>
              {station.address && <p className="card-subtitle">{station.address}</p>}
              {station.openingHours && <p className="card-subtitle">{t('Opening hours')}: {station.openingHours}</p>}
              <p className="station-price">{price ? `${(price.pricePerLiter * 100).toFixed(1)} ¢/L (${price.currency})` : t('Price unavailable')}</p>
              <p className="card-subtitle">{t(fuelTypes[fuelType])} · {t('Updated')}: {price?.updatedAt ? new Date(price.updatedAt).toLocaleString(getLanguage()) : t('Update time unavailable')}</p>
              <p className="station-attribution">{t('Source')}: <a href={station.sourceUrl} target="_blank" rel="noopener noreferrer">{station.source}</a><br />{station.attribution}</p>
              <div className="station-actions">
                <button type="button" className="btn btn-primary" disabled={selectionDisabled} onClick={() => onSelect({ station, fuelType, fetchedAt: search.results!.fetchedAt })}>{t('Select')}</button>
                <a className="btn btn-secondary" href={navigationUrl(station.latitude, station.longitude)} target="_blank" rel="noopener noreferrer"><Navigation size={15} />{t('Navigate')}</a>
              </div>
            </article>
          })}
        </div>
      </>}
    </div>
  </section>
}
