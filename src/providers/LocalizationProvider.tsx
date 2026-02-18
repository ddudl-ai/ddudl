'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { LANGUAGE_OPTIONS, DEFAULT_LANGUAGE, type SupportedLanguage } from '@/lib/i18n/config'
import { translate, type TranslationKey } from '@/locales/translations'
import { usePreferencesStore } from '@/stores/preferencesStore'

interface TranslateContentOptions {
  targetLanguage?: SupportedLanguage
  sourceLanguage?: string
  fallback?: string
}

interface LocalizationContextValue {
  language: SupportedLanguage
  autoTranslate: boolean
  availableLanguages: typeof LANGUAGE_OPTIONS
  t: (key: TranslationKey | string, fallback?: string, variables?: Record<string, string | number>) => string
  translateContent: (text: string, options?: TranslateContentOptions) => Promise<string>
  setLanguage: (language: SupportedLanguage) => void
  setAutoTranslate: (value: boolean) => void
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null)

const MAX_CACHE_SIZE = 200

function setDocumentLanguage(language: SupportedLanguage, autoTranslate: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = language
  document.documentElement.dataset.language = language
  document.documentElement.dataset.autoTranslate = String(autoTranslate)
}

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const language = usePreferencesStore((state) => state.language)
  const autoTranslate = usePreferencesStore((state) => state.autoTranslate)
  const setLanguage = usePreferencesStore((state) => state.setLanguage)
  const setAutoTranslate = usePreferencesStore((state) => state.setAutoTranslate)
  const cacheRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    setDocumentLanguage(language, autoTranslate)
  }, [language, autoTranslate])

  const t = useCallback(
    (key: TranslationKey | string, fallback?: string, variables?: Record<string, string | number>) =>
      translate(language, key, fallback, variables),
    [language]
  )

  const translateContent = useCallback(
    async (text: string, options?: TranslateContentOptions) => {
      const baseText = options?.fallback ?? text
      const trimmed = text?.trim()

      if (!trimmed) {
        return baseText
      }

      const targetLanguage = options?.targetLanguage ?? language

      if (!autoTranslate || targetLanguage === DEFAULT_LANGUAGE || targetLanguage === options?.sourceLanguage) {
        return baseText
      }

      const cacheKey = `${targetLanguage}:${trimmed}`
      const cached = cacheRef.current.get(cacheKey)
      if (cached) {
        return cached
      }

      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: trimmed,
            targetLanguage,
            sourceLanguage: options?.sourceLanguage
          })
        })

        if (!response.ok) {
          throw new Error('Translation request failed')
        }

        const data = await response.json()
        const translated: string = typeof data.translatedText === 'string' && data.translatedText.trim().length > 0
          ? data.translatedText
          : baseText

        cacheRef.current.set(cacheKey, translated)
        if (cacheRef.current.size > MAX_CACHE_SIZE) {
          const firstKey = cacheRef.current.keys().next().value
          if (typeof firstKey === 'string') {
            cacheRef.current.delete(firstKey)
          }
        }

        return translated
      } catch (error) {
        console.error('Failed to translate content', error)
        cacheRef.current.set(cacheKey, baseText)
        if (cacheRef.current.size > MAX_CACHE_SIZE) {
          const firstKey = cacheRef.current.keys().next().value
          if (typeof firstKey === 'string') {
            cacheRef.current.delete(firstKey)
          }
        }
        return baseText
      }
    },
    [autoTranslate, language]
  )

  const value = useMemo<LocalizationContextValue>(
    () => ({
      language,
      autoTranslate,
      availableLanguages: LANGUAGE_OPTIONS,
      t,
      translateContent,
      setLanguage,
      setAutoTranslate
    }),
    [language, autoTranslate, t, translateContent, setLanguage, setAutoTranslate]
  )

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  )
}

export function useTranslation(): LocalizationContextValue {
  const context = useContext(LocalizationContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LocalizationProvider')
  }
  return context
}
