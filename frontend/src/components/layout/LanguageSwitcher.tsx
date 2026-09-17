import { Languages } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { getLanguage, setLanguage, subscribeLanguage, translate } from '../../services/language'

export function LanguageSwitcher() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage)
  return (
    <div className="language-switcher" role="group" aria-label={translate('Language')}>
      <Languages size={16} aria-hidden="true" />
      <button type="button" lang="pt-BR" className={`btn btn-sm ${language === 'pt-BR' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={language === 'pt-BR'} onClick={() => setLanguage('pt-BR')}>PT-BR</button>
      <button type="button" lang="en-US" className={`btn btn-sm ${language === 'en-US' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={language === 'en-US'} onClick={() => setLanguage('en-US')}>EN-US</button>
    </div>
  )
}
