export type CurrencyCode = 'CAD' | 'USD' | 'EUR' | 'GBP' | 'BRL' | string
export type DistanceUnit = 'km' | 'mi'
export type VolumeUnit = 'L' | 'gal'
export type FuelEconomyUnit = 'L/100km' | 'mpg-us' | 'mpg-uk' | 'km/L'
export type EvEconomyUnit = 'kWh/100km' | 'mi/kWh' | 'km/kWh'
export type DateFormatOption = 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY'

export interface UserSettings {
  currency: CurrencyCode
  distanceUnit: DistanceUnit
  volumeUnit: VolumeUnit
  fuelEconomyUnit: FuelEconomyUnit
  evEconomyUnit: EvEconomyUnit
  dateFormat: DateFormatOption
  activeVehicleId: string | null
}

export const DEFAULT_SETTINGS: UserSettings = {
  currency: 'CAD',
  distanceUnit: 'km',
  volumeUnit: 'L',
  fuelEconomyUnit: 'L/100km',
  evEconomyUnit: 'kWh/100km',
  dateFormat: 'YYYY-MM-DD',
  activeVehicleId: null,
}

