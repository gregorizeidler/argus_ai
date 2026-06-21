'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import ptBR, { type TranslationKeys } from './pt-BR'
import en from './en'

export type Locale = 'pt-BR' | 'en'

const translations: Record<Locale, TranslationKeys> = {
  'pt-BR': ptBR,
  en,
}

type NestedKeyOf<T> = T extends object
  ? { [K in keyof T & string]: T[K] extends object ? `${K}.${NestedKeyOf<T[K]>}` : K }[keyof T & string]
  : never

export type TranslationKey = NestedKeyOf<TranslationKeys>

function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' ? current : path
}

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

export const I18nContext = createContext<I18nContextType>({
  locale: 'pt-BR',
  setLocale: () => {},
  t: (key: string) => key,
})

export function useI18n() {
  return useContext(I18nContext)
}

export function useTranslation() {
  const { t, locale, setLocale } = useI18n()
  return { t, locale, setLocale }
}

export function createI18nValue(initialLocale: Locale = 'pt-BR') {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof window !== 'undefined') {
      localStorage.setItem('argus-locale', newLocale)
    }
  }, [])

  const t = useCallback((key: string): string => {
    return getNestedValue(translations[locale], key)
  }, [locale])

  return { locale, setLocale, t }
}

export { ptBR, en }
