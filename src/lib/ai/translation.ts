import OpenAI from 'openai'
import { getLanguageEnglishName, isSupportedLanguage, type SupportedLanguage } from '@/lib/i18n/config'

export interface TranslationResult {
  translatedText: string
  detectedLanguage: string
}

const translationCache = new Map<string, TranslationResult>()
const MAX_CACHE_SIZE = 500

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

function getCacheKey(text: string, targetLanguage: SupportedLanguage) {
  return `${targetLanguage}:${text}`
}

function getCachedTranslation(text: string, targetLanguage: SupportedLanguage) {
  const key = getCacheKey(text, targetLanguage)
  return translationCache.get(key)
}

function saveCachedTranslation(text: string, targetLanguage: SupportedLanguage, result: TranslationResult) {
  const key = getCacheKey(text, targetLanguage)
  translationCache.set(key, result)
  if (translationCache.size > MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value
    if (typeof firstKey === 'string') {
      translationCache.delete(firstKey)
    }
  }
}

async function translateWithOpenAI(
  text: string,
  targetLanguage: SupportedLanguage,
  sourceLanguage?: string
): Promise<TranslationResult> {
  if (!openai) {
    return {
      translatedText: text,
      detectedLanguage: sourceLanguage ?? 'unknown'
    }
  }

  const targetLanguageName = getLanguageEnglishName(targetLanguage)
  const prompt = `Translate the following text into ${targetLanguageName}.` +
    `${sourceLanguage ? ` The text is likely written in ${sourceLanguage}.` : ''}\n\n` +
    `Return JSON with keys translatedText and detectedLanguage.\n\n` +
    `Text:\n"""${text}"""`

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a professional translator who preserves meaning and tone while localizing naturally.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 800
  })

  const rawContent = response.choices[0]?.message?.content ?? ''

  try {
    const parsed = JSON.parse(rawContent)
    const translatedText = typeof parsed.translatedText === 'string' && parsed.translatedText.trim().length > 0
      ? parsed.translatedText
      : text

    const detectedLanguage = typeof parsed.detectedLanguage === 'string'
      ? parsed.detectedLanguage
      : sourceLanguage ?? 'unknown'

    return { translatedText, detectedLanguage }
  } catch (error) {
    console.error('Failed to parse translation response:', error)
    return {
      translatedText: text,
      detectedLanguage: sourceLanguage ?? 'unknown'
    }
  }
}

export async function translateText(
  text: string,
  targetLanguage: SupportedLanguage,
  options?: { sourceLanguage?: string }
): Promise<TranslationResult> {
  const trimmed = text.trim()

  if (!trimmed) {
    return { translatedText: '', detectedLanguage: options?.sourceLanguage ?? 'unknown' }
  }

  if (!isSupportedLanguage(targetLanguage)) {
    throw new Error(`Unsupported target language: ${targetLanguage}`)
  }

  const cached = getCachedTranslation(trimmed, targetLanguage)
  if (cached) {
    return cached
  }

  try {
    const result = await translateWithOpenAI(trimmed, targetLanguage, options?.sourceLanguage)
    saveCachedTranslation(trimmed, targetLanguage, result)
    return result
  } catch (error) {
    console.error('translateText failed:', error)
    const fallbackResult = {
      translatedText: trimmed,
      detectedLanguage: options?.sourceLanguage ?? 'unknown'
    }
    saveCachedTranslation(trimmed, targetLanguage, fallbackResult)
    return fallbackResult
  }
}
