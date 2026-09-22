import type { GasStation, StationQuery } from './types'

export interface GasStationProvider {
  readonly name: string
  supports(query: StationQuery): boolean
  nearby(query: StationQuery): Promise<GasStation[]>
}
