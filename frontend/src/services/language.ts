import { ptBR } from '../translations/pt-BR'

export type Language = 'en-US' | 'pt-BR'
const storageKey = 'car-vault-language'
let language: Language = 'en-US'
try { language = localStorage.getItem(storageKey) === 'pt-BR' ? 'pt-BR' : 'en-US' } catch { /* Storage may be unavailable. */ }
const listeners = new Set<() => void>()
export const getLanguage = () => language
export function subscribeLanguage(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function setLanguage(value: Language) {
  language = value
  if (typeof document !== 'undefined') document.documentElement.lang = value
  try { localStorage.setItem(storageKey, value) } catch { /* Retain the choice for this session. */ }
  listeners.forEach(listener => listener())
}

/** Translate UI copy only. Stored names, notes and domain identifiers stay intact. */
export function translate(text: string | null | undefined, values: Record<string, string | number> = {}): string {
  if (text == null) return ''
  const copy = language === 'pt-BR' && Object.hasOwn(ptBR, text) ? ptBR[text] : text
  return copy.replace(/\{(\w+)\}/g, (token, key: string) => key in values ? String(values[key]) : token)
}

if (typeof document !== 'undefined') document.documentElement.lang = language
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== null) return
  language = event.newValue === 'pt-BR' ? 'pt-BR' : 'en-US'
  document.documentElement.lang = language
  listeners.forEach(listener => listener())
})
