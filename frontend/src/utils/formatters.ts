import { getLanguage } from '../services/language'

export function formatCurrency(amount: number, currency = 'CAD'): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00'
  }
  return new Intl.NumberFormat(getLanguage(), {
    style: 'currency',
    currency: currency || 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDistance(distanceKm: number, unit: 'km' | 'mi' = 'km'): string {
  if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) {
    return `0 ${unit}`
  }
  const formatted = new Intl.NumberFormat(getLanguage(), {
    maximumFractionDigits: 0,
  }).format(distanceKm)
  return `${formatted} ${unit}`
}

export function formatConsumption(
  lPer100Km: number | null,
  unit = 'L/100 km'
): string {
  if (lPer100Km === null || lPer100Km === undefined || isNaN(lPer100Km)) {
    return '—'
  }
  return `${lPer100Km.toFixed(1)} ${unit}`
}

export function formatCostPerKm(costPerKm: number | null, currency = 'CAD'): string {
  if (costPerKm === null || costPerKm === undefined || isNaN(costPerKm)) {
    return '—'
  }
  const symbol = currency === 'CAD' || currency === 'USD' ? '$' : `${currency} `
  return `${symbol}${costPerKm.toFixed(2)}/km`
}

export function formatDate(dateString: string, format = 'YYYY-MM-DD'): string {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString

  // Handle YYYY-MM-DD safely without timezone shifts
  const [year, month, day] = dateString.split('T')[0].split('-')
  if (year && month && day) {
    if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`
    if (format === 'MM/DD/YYYY') return `${month}/${day}/${year}`
    return `${year}-${month}-${day}`
  }

  return date.toLocaleDateString(getLanguage())
}

export function formatMonth(monthKey: string, month: 'short' | 'long' = 'long'): string {
  return new Date(`${monthKey}-01T12:00:00`).toLocaleDateString(getLanguage(), { month, year: 'numeric' })
}
