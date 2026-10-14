// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChargingFormModal } from './ChargingFormModal'
import { DEFAULT_SETTINGS } from '../../types/settings'
import type { ChargingEntry } from '../../types/fuel'
import type { Vehicle } from '../../types/vehicle'
import { setLanguage } from '../../services/language'

const vehicle: Vehicle = {
  id: 'vehicle-ev', name: 'EV', year: 2024, make: 'Test', model: 'EV', fuelType: 'electric',
  currentOdometer: 5000, createdAt: '2026-01-01', updatedAt: '2026-01-01',
}
vi.mock('../../context/CarVaultContext', () => ({
  useCarVault: () => ({ activeVehicle: vehicle, settings: DEFAULT_SETTINGS }),
}))

let container: HTMLDivElement
let root: Root
let onSave: ReturnType<typeof vi.fn>

async function render(initialData?: ChargingEntry) {
  await act(async () => root.render(<ChargingFormModal isOpen onClose={() => {}} onSave={onSave} initialData={initialData} />))
}
function field(id: string) { return container.querySelector<HTMLInputElement>(`#${id}`)! }
async function change(id: string, value: string) {
  await act(async () => {
    const element = field(id)
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function save() {
  const button = Array.from(container.querySelectorAll('button')).find(element => element.type === 'submit')!
  await act(async () => button.click())
}

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  setLanguage('en-US')
  onSave = vi.fn()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe('EV charging form', () => {
  it('saves structured details and keeps the total-cost calculation', async () => {
    await render()
    await change('charging-kwh', '40')
    await change('charging-price', '0.5')
    expect(field('charging-total').value).toBe('20.00')
    await change('charging-company', ' Electrify Canada ')
    await change('charging-equipment', 'CCS stall 3')
    await change('charging-address', '1 Main St, Barrie')
    await change('charging-start-battery', '15')
    await change('charging-duration', '45')
    await change('charging-power', '150')
    await save()
    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      kwh: 40, pricePerKwh: 0.5, totalCost: 20, company: 'Electrify Canada', equipment: 'CCS stall 3',
      chargingAddress: '1 Main St, Barrie', startBatteryPercent: 15, durationMinutes: 45, powerKw: 150,
    }))
  })

  it('leaves optional details undefined when blank', async () => {
    await render()
    await change('charging-kwh', '10')
    await save()
    const saved = onSave.mock.calls[0][0] as ChargingEntry
    expect(saved).toMatchObject({ kwh: 10, totalCost: 1.4 })
    for (const key of ['startBatteryPercent', 'durationMinutes', 'powerKw', 'company', 'equipment', 'chargingAddress'] as const) {
      expect(saved[key]).toBeUndefined()
    }
  })

  it.each([
    ['charging-start-battery', '101'],
    ['charging-start-battery', '-1'],
    ['charging-duration', '0'],
    ['charging-power', '-5'],
  ])('rejects %s = %s', async (id, value) => {
    await render()
    await change('charging-kwh', '10')
    await change(id, value)
    await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(onSave).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('populates structured values when editing and accepts legacy records', async () => {
    const legacy: ChargingEntry = {
      id: 'old', vehicleId: vehicle.id, date: '2026-01-01', odometer: 100, kwh: 20, pricePerKwh: 0.2,
      totalCost: 4, chargingLocation: 'Home', locationType: 'home', chargingType: 'Level 2', createdAt: '2026-01-01',
    }
    await render(legacy)
    expect(field('charging-start-battery').value).toBe('')
    expect(field('charging-location').value).toBe('Home')
    await render({ ...legacy, company: 'Op', equipment: 'Wall', chargingAddress: 'Addr', startBatteryPercent: 0, durationMinutes: 30, powerKw: 7.4 })
    expect(field('charging-company').value).toBe('Op')
    expect(field('charging-equipment').value).toBe('Wall')
    expect(field('charging-address').value).toBe('Addr')
    expect(field('charging-start-battery').value).toBe('0')
    expect(field('charging-duration').value).toBe('30')
    expect(field('charging-power').value).toBe('7.4')
    await save()
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ startBatteryPercent: 0, durationMinutes: 30, powerKw: 7.4 }))
  })
})
