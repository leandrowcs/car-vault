export const stationConfig = {
  gasQuebecEndpoint: import.meta.env.VITE_GAS_QUEBEC_ENDPOINT || '/api/gas-stations',
  locationSearchEndpoint: import.meta.env.VITE_LOCATION_SEARCH_ENDPOINT || '/api/location-search',
  overpassEndpoint: import.meta.env.VITE_OVERPASS_ENDPOINT || 'https://overpass-api.de/api/interpreter',
  cacheMs: 5 * 60 * 1000,
  requestTimeoutMs: 25_000,
}
export const gasQuebecAttribution = "Fuel-price data from Régie Essence Québec (Régie de l’énergie du Québec), presented by Gas Quebec (gasquebec.ca)"
export const osmAttribution = '© OpenStreetMap contributors (ODbL)'
export const providerLinks = {
  gasQuebec: 'https://www.gasquebec.ca/api',
  osm: 'https://www.openstreetmap.org/copyright',
}
export function navigationUrl(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/directions?to=${encodeURIComponent(`${latitude},${longitude}`)}`
}
