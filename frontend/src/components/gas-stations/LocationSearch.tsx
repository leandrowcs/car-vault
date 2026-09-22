import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { locationSearchService, type LocationMatch } from '../../services/gas-stations/locationSearch'
import { StationServiceError } from '../../services/gas-stations/http'

export function LocationSearch({ onSelect }: { onSelect: (match: LocationMatch) => void }) {
  const t = useTranslation()
  const id = useId()
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<LocationMatch[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sequence = useRef(0)
  useEffect(() => () => { sequence.current++ }, [])
  const search = async () => {
    if (loading) return
    const requestId = ++sequence.current
    setError(''); setMatches(null)
    if (query.trim().length < 2) { setError('Enter a city or postal code.'); return }
    setLoading(true)
    try {
      const results = await locationSearchService.search(query)
      if (sequence.current === requestId) setMatches(results)
    } catch (reason) {
      if (sequence.current === requestId) setError(reason instanceof StationServiceError && reason.code === 'rate-limit'
        ? 'Location search is busy. Please wait before trying again.'
        : 'Unable to find that location right now. Please try again.')
    } finally { if (sequence.current === requestId) setLoading(false) }
  }
  return <div className="station-picker" onKeyDown={event => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) { event.preventDefault(); void search() }
  }}>
    <label className="form-group" htmlFor={id}><span className="form-label">{t('City or postal code')}</span>
      <input id={id} className="form-input" type="text" maxLength={120} autoComplete="off" value={query} onChange={event => {
        sequence.current++; setQuery(event.target.value); setMatches(null); setError(''); setLoading(false)
      }} />
    </label>
    <p className="card-subtitle">{t('Your search is sent to Photon / OpenStreetMap only when you select Search. Add the province or country to narrow city results.')}</p>
    <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => void search()}>{t('Search location')}</button>
    <div aria-live="polite" aria-busy={loading}>
      {loading && <p role="status">{t('Finding locations…')}</p>}
      {error && <p role="alert">{t(error)}</p>}
      {matches?.length === 0 && <p role="status">{t('No location found. Check the postal code or add the province or country to the city name.')}</p>}
      {matches && matches.length > 0 && <>
        <p>{t('Choose the location to search for stations.')}</p>
        <ul className="station-location-results">{matches.map(match => <li key={match.id}>
          <button type="button" className="btn btn-secondary" onClick={() => onSelect(match)}>{match.label}</button>
        </li>)}</ul>
        <p className="station-attribution"><a href={matches[0].sourceUrl} target="_blank" rel="noopener noreferrer">{matches[0].attribution}</a></p>
      </>}
    </div>
  </div>
}
