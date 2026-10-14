import { describe, expect, it } from 'vitest'
import { getVehicleLogTypes } from './vehicleLogTypes'

describe('getVehicleLogTypes', () => {
  it.each([
    ['gasoline', ['fuel']],
    ['hybrid', ['fuel']],
    ['plug-in-hybrid', ['fuel', 'charging']],
    ['electric', ['charging']],
  ] as const)('returns the supported log types for %s vehicles', (fuelType, expected) => {
    expect(getVehicleLogTypes(fuelType)).toEqual(expected)
  })
})
