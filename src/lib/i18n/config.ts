export const LANGUAGE_OPTIONS = [
  { code: 'ko', label: '한국어', englishName: 'Korean' },
  { code: 'en', label: 'English', englishName: 'English' },
  { code: 'ja', label: '日本語', englishName: 'Japanese' }
] as const

export type SupportedLanguage = typeof LANGUAGE_OPTIONS[number]['code']

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en'

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && LANGUAGE_OPTIONS.some((option) => option.code === value)
}

export function getLanguageLabel(language: SupportedLanguage): string {
  const option = LANGUAGE_OPTIONS.find((item) => item.code === language)
  return option ? option.label : language
}

export function getLanguageEnglishName(language: SupportedLanguage): string {
  const option = LANGUAGE_OPTIONS.find((item) => item.code === language)
  return option ? option.englishName : language
}
