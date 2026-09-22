// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FuelFormModal } from './FuelFormModal'
import { gasStationService } from '../../services/gas-stations/gasStationService'
import { normalizeGasQuebec } from '../../services/gas-stations/GasQuebecProvider'
import { VaultStore } from '../../services/vaultStore'
import { initialVaultData } from '../../services/storage'
import { DEFAULT_SETTINGS } from '../../types/settings'
import type { FuelEntry } from '../../types/fuel'
import type { Vehicle } from '../../types/vehicle'
import { setLanguage } from '../../services/language'
import { locationSearchService } from '../../services/gas-stations/locationSearch'

const vehicle: Vehicle = {
  id: 'vehicle-test', name: 'Test car', year: 2020, make: 'Test', model: 'Car', fuelType: 'gasoline',
  currentOdometer: 10000, createdAt: '2026-01-01', updatedAt: '2026-01-01',
}
vi.mock('../../context/CarVaultContext', () => ({
  useCarVault: () => ({ activeVehicle: vehicle, settings: DEFAULT_SETTINGS }),
}))

let container: HTMLDivElement
let root: Root
const station = normalizeGasQuebec({ stations: [{ stationId: 'test', name: 'Test station', lat: 45.5, lng: -73.56, prixOrdinaire: 164.9 }] })[0]
let onSave: ReturnType<typeof vi.fn>
let store: VaultStore

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  localStorage.clear()
  setLanguage('en-US')
  localStorage.setItem('car_vault_data_v1', JSON.stringify({ ...initialVaultData, vehicles: [vehicle] }))
  store = new VaultStore()
  onSave = vi.fn((entry: Omit<FuelEntry, 'id' | 'createdAt'>) => {
    store.update(previous => ({ ...previous, fuelEntries: [{ ...entry, id: 'saved-fuel', createdAt: new Date().toISOString() }] }))
  })
  vi.spyOn(gasStationService, 'nearby').mockResolvedValue({ stations: [{ ...station, distanceKm: 1.2 }], fetchedAt: Date.now() })
  vi.spyOn(locationSearchService, 'search').mockResolvedValue([{
    id: 'city', label: 'Montréal, Québec, Canada', latitude: 45.5, longitude: -73.56,
    attribution: 'Photon · © OpenStreetMap contributors', sourceUrl: 'https://www.openstreetmap.org/copyright',
  }])
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: vi.fn(success => success({ coords: { latitude: 45.5, longitude: -73.56 } })),
  } })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root.render(<FuelFormModal isOpen onClose={() => {}} onSave={onSave} />))
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function click(text: string) {
  const button = Array.from(container.querySelectorAll('button')).find(element => element.textContent === text)
  expect(button, `Button ${text}`).toBeDefined()
  await act(async () => button!.click())
}
function input(id: string): HTMLInputElement { return container.querySelector<HTMLInputElement>(`#${id}`)! }
async function change(id: string, value: string) {
  await act(async () => {
    const element = input(id)
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function selectNearby() {
  await click('Select nearby station')
  await click('Select')
}

describe('fuel form station integration', () => {
  it('only requests location when the picker opens, selects a station, overrides price, calculates and saves', async () => {
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled()
    expect(input('fuel-station').value).toBe('')
    expect(input('fuel-price').value).toBe('')
    await selectNearby()
    expect(input('fuel-station').value).toBe('Test station')
    expect(input('fuel-price').value).toBe('1.649')
    expect(container.textContent).toContain('Gas Québec')
    expect(container.textContent).toContain('Update time unavailable')
    await change('fuel-liters', '40')
    expect(input('fuel-total').value).toBe('65.96')
    await change('fuel-price', '1.500')
    expect(input('fuel-total').value).toBe('60.00')
    await selectNearby()
    expect(input('fuel-price').value).toBe('1.500')
    await click('Save Fill-Up')
    expect(onSave).toHaveBeenCalledOnce()
    expect(store.getSnapshot().data.fuelEntries[0]).toMatchObject({ station: 'Test station', pricePerLiter: 1.5, liters: 40, totalCost: 60, fuelType: 'regular' })
    expect(new VaultStore().getSnapshot().data.fuelEntries[0].station).toBe('Test station')
  })
  it('keeps manual entry usable when location is denied', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition: (_success: unknown, error: (value: { code: number }) => void) => error({ code: 1 }),
    } })
    await click('Select nearby station')
    expect(container.textContent).toContain('Location permission was denied.')
    expect(gasStationService.nearby).not.toHaveBeenCalled()
    await click('Close nearby stations')
    await change('fuel-station', 'Manual station')
    await change('fuel-liters', '10')
    await change('fuel-price', '1.600')
    await click('Save Fill-Up')
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ station: 'Manual station', totalCost: 16 }))
  })
  it('populates a station chosen on the Gas Stations page without requesting location again', async () => {
    await act(async () => root.render(<FuelFormModal isOpen onClose={() => {}} onSave={onSave}
      selectedStation={{ station, fuelType: 'regular', fetchedAt: Date.now() }} />))
    expect(input('fuel-station').value).toBe('Test station')
    expect(input('fuel-price').value).toBe('1.649')
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled()
  })
  it('preserves saved prices and legacy fuel types when editing an existing entry', async () => {
    await act(async () => root.render(<FuelFormModal isOpen onClose={() => {}} onSave={onSave} initialData={{
      id: 'existing', vehicleId: vehicle.id, date: '2026-09-01', createdAt: '2026-09-01', odometer: 9900,
      liters: 40, pricePerLiter: 1.55, totalCost: 62, fuelType: 'gasoline', station: 'Old station', fullTank: true,
    }} />))
    expect(container.querySelector<HTMLSelectElement>('#fuel-grade')!.value).toBe('gasoline')
    await selectNearby()
    expect(input('fuel-price').value).toBe('1.55')
    expect(input('fuel-total').value).toBe('62')
  })
  it('shows API failures with retry and leaves form fields intact', async () => {
    vi.mocked(gasStationService.nearby).mockRejectedValue(new Error('offline'))
    await change('fuel-price', '1.600')
    await click('Select nearby station')
    expect(container.textContent).toContain('Unable to load nearby stations.')
    expect(input('fuel-price').value).toBe('1.600')
    await click('Search again')
    expect(gasStationService.nearby).toHaveBeenCalledTimes(2)
  })
  it('searches a city after denial, requires choosing a match, and supports repeated selection', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition: (_success: unknown, error: (value: { code: number }) => void) => error({ code: 1 }),
    } })
    await click('Select nearby station')
    const labels = Array.from(container.querySelectorAll('label'))
    const cityInput = labels.find(label => label.textContent === 'City or postal code')!.control as HTMLInputElement
    expect(container.textContent).not.toContain('Latitude')
    expect(container.textContent).not.toContain('Longitude')
    await change(cityInput.id, 'Montréal')
    expect(locationSearchService.search).not.toHaveBeenCalled()
    await click('Search location')
    expect(locationSearchService.search).toHaveBeenCalledWith('Montréal')
    expect(gasStationService.nearby).not.toHaveBeenCalled()
    await click('Montréal, Québec, Canada')
    expect(gasStationService.nearby).toHaveBeenCalledWith(expect.objectContaining({ latitude: 45.5, longitude: -73.56 }))
    await click('Montréal, Québec, Canada')
    expect(gasStationService.nearby).toHaveBeenCalledTimes(2)
    await click('Select')
    expect(input('fuel-station').value).toBe('Test station')
  })
  it('searches a postal code and reports empty results without guessing coordinates', async () => {
    await click('Select nearby station')
    vi.mocked(locationSearchService.search).mockResolvedValue([])
    const cityInput = Array.from(container.querySelectorAll('label')).find(label => label.textContent === 'City or postal code')!.control as HTMLInputElement
    await change(cityInput.id, 'J1H 5N4')
    await click('Search location')
    expect(locationSearchService.search).toHaveBeenCalledWith('J1H 5N4')
    expect(container.textContent).toContain('No location found.')
    expect(gasStationService.nearby).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })
  it('clears a previous automatic price when the next station has no price', async () => {
    await selectNearby()
    await change('fuel-liters', '40')
    expect(input('fuel-price').value).toBe('1.649')
    vi.mocked(gasStationService.nearby).mockResolvedValue({ stations: [{ ...station, name: 'No-price station', prices: {} }], fetchedAt: Date.now() })
    await selectNearby()
    expect(input('fuel-station').value).toBe('No-price station')
    expect(input('fuel-price').value).toBe('')
    expect(input('fuel-total').value).toBe('')
    expect(container.textContent).toContain('Price unavailable')
  })
})
