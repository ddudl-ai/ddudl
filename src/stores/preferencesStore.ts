'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_LANGUAGE, type SupportedLanguage } from '@/lib/i18n/config'

interface PreferencesState {
  language: SupportedLanguage
  autoTranslate: boolean
  setLanguage: (language: SupportedLanguage) => void
  setAutoTranslate: (autoTranslate: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      autoTranslate: false,
      setLanguage: (language) => set({ language }),
      setAutoTranslate: (autoTranslate) => set({ autoTranslate })
    }),
    {
      name: 'preferences-storage'
    }
  )
)
