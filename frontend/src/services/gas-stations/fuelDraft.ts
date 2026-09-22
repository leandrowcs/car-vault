import { stationConfig } from './config'
import type { StationSelection } from './types'

export interface FuelAmounts { liters: string; pricePerLiter: string; totalCost: string }
export function calculateFuelTotal(liters: string, price: string): string {
  const volume = Number(liters)
  const amount = Number(price)
  return Number.isFinite(volume) && volume > 0 && Number.isFinite(amount) && amount > 0
    ? (volume * amount).toFixed(2) : ''
}
/** Only provider suggestions may replace previous suggestions; manual prices are never replaced. */
export function applyStationSelection(amounts: FuelAmounts, selection: StationSelection, manualPrice: boolean, currency: string) {
  const suggestion = selection.station.prices[selection.fuelType]
  const canSuggest = !manualPrice && suggestion?.currency === currency && Date.now() - selection.fetchedAt < stationConfig.cacheMs
  const pricePerLiter = manualPrice ? amounts.pricePerLiter : canSuggest ? suggestion!.pricePerLiter.toFixed(3) : ''
  return {
    station: selection.station.name,
    fuelType: selection.fuelType,
    pricePerLiter,
    totalCost: manualPrice ? amounts.totalCost : calculateFuelTotal(amounts.liters, pricePerLiter),
  }
}
