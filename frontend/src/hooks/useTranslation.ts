import { useSyncExternalStore } from 'react'
import { getLanguage, subscribeLanguage, translate } from '../services/language'

export function useTranslation() {
  useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage)
  return translate
}
