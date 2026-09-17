import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getLanguage, setLanguage, subscribeLanguage, translate } from './language'
import { ptBR } from '../translations/pt-BR'
import { Sidebar } from '../components/layout/Sidebar'
import { ExpenseFormModal } from '../components/forms/ExpenseFormModal'
import { RecordCard } from '../components/common/RecordCard'
import { DEFAULT_SETTINGS } from '../types/settings'
import type { ReactNode } from 'react'

vi.mock('../context/CarVaultContext', () => ({ useCarVault: () => ({
  activeVehicle: { id: 'v1', name: 'My Garage', year: 2026, make: 'Honda', model: 'Civic', currentOdometer: 12000 },
  settings: DEFAULT_SETTINGS,
}) }))
vi.mock('../components/common/Modal', () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }))

beforeEach(() => { setLanguage('en-US') })
afterEach(() => { vi.unstubAllGlobals(); setLanguage('en-US') })

describe('language preference and UI', () => {
  it('persists the choice, updates document language and notifies subscribers', () => {
    const setItem = vi.fn()
    const root = { lang: 'en-US' }
    vi.stubGlobal('localStorage', { setItem })
    vi.stubGlobal('document', { documentElement: root })
    const listener = vi.fn()
    const unsubscribe = subscribeLanguage(listener)
    setLanguage('pt-BR')
    expect(getLanguage()).toBe('pt-BR')
    expect(setItem).toHaveBeenCalledWith('car-vault-language', 'pt-BR')
    expect(root.lang).toBe('pt-BR')
    expect(listener).toHaveBeenCalledOnce()
    unsubscribe()
    setLanguage('en-US')
    expect(listener).toHaveBeenCalledOnce()
  })

  it('keeps working when browser storage is denied', () => {
    vi.stubGlobal('localStorage', { setItem: () => { throw new Error('Denied') } })
    expect(() => setLanguage('pt-BR')).not.toThrow()
    expect(translate('Dashboard')).toBe('Painel')
  })

  it('interpolates values without translating or interpreting user content', () => {
    setLanguage('pt-BR')
    expect(translate('Edit {0}', { 0: 'My Garage $& {0}' })).toBe('Editar My Garage $& {0}')
    expect(translate('My own station')).toBe('My own station')
    expect(translate('constructor')).toBe('constructor')
    expect(translate('in {0} days', { 0: 5 })).toBe('em 5 dias')
    setLanguage('en-US')
    expect(translate('in {0} days', { 0: 5 })).toBe('in 5 days')
  })

  it('renders the sidebar in either language without changing vehicle information', () => {
    const english = renderToStaticMarkup(<Sidebar currentView="dashboard" onNavigate={() => {}} />)
    expect(english).toContain('Dashboard')
    setLanguage('pt-BR')
    const portuguese = renderToStaticMarkup(<Sidebar currentView="dashboard" onNavigate={() => {}} />)
    expect(portuguese).toContain('Painel')
    expect(portuguese).toContain('Garagem')
    expect(portuguese).toContain('My Garage')
    expect(portuguese).toContain('Honda')
    expect(portuguese).toContain('PT-BR')
    expect(portuguese).toContain('EN-US')
  })

  it('translates form labels while preserving the domain values saved by selects', () => {
    setLanguage('pt-BR')
    const form = renderToStaticMarkup(<ExpenseFormModal isOpen onClose={() => {}} onSave={() => {}} />)
    expect(form).toContain('Descrição')
    expect(form).toContain('value="Insurance" selected="">Seguro</option>')
    expect(form).not.toContain('value="Seguro"')
  })

  it('preserves user-entered card titles even when they match a translation key', () => {
    setLanguage('pt-BR')
    const card = renderToStaticMarkup(<RecordCard icon={null} title="Garage" date="2026-09-17" amount="$10" metrics={[{ label: 'Volume', value: '10 L' }]} actionLabel="Garage" onEdit={() => {}} onDelete={() => {}} />)
    expect(card).toContain('<h4>Garage</h4>')
    expect(card).toContain('Excluir Garage')
  })

  it('preserves interpolation tokens across the entire translation catalog', () => {
    for (const [english, portuguese] of Object.entries(ptBR)) {
      expect(portuguese.trim(), english).not.toBe('')
      expect(portuguese.match(/\{\w+\}/g)?.sort() ?? [], english).toEqual(english.match(/\{\w+\}/g)?.sort() ?? [])
    }
  })
})
