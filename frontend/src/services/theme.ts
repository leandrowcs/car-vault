export type Theme = 'light' | 'dark'
const key = 'car-vault-theme'
let current: Theme = 'dark'
try { current = localStorage.getItem(key) === 'light' ? 'light' : 'dark' } catch { /* Use the default when storage is unavailable. */ }
const listeners = new Set<() => void>()
export const getTheme = () => current
export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function setTheme(theme: Theme) {
  current = theme
  try { localStorage.setItem(key, theme) } catch { /* Keep the selection for this session. */ }
  listeners.forEach(listener => listener())
}
