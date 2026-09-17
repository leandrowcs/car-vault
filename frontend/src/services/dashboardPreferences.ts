const metricsKey = 'car-vault-dashboard-metrics-expanded'

export function getDashboardMetricsExpanded(): boolean {
  try { return localStorage.getItem(metricsKey) === 'true' } catch { return false }
}

export function saveDashboardMetricsExpanded(expanded: boolean): void {
  try { localStorage.setItem(metricsKey, String(expanded)) } catch { /* The control still works when storage is unavailable. */ }
}
