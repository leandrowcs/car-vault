import { useTranslation } from '../../hooks/useTranslation'
import { Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { getTheme, setTheme, subscribeTheme } from '../../services/theme'

export function ThemeSwitcher() {
  const t = useTranslation()
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getTheme)
  return (
    <div className="theme-switcher" role="group" aria-label={t("Theme")}>
      <button type="button" className={`btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
        <Sun size={16} aria-hidden="true" /> {t("Light")}
      </button>
      <button type="button" className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
        <Moon size={16} aria-hidden="true" /> {t("Dark")}
      </button>
    </div>
  )
}
