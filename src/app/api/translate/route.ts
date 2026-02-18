import { NextResponse } from 'next/server'
import { translateText } from '@/lib/ai/translation'
import { DEFAULT_LANGUAGE, isSupportedLanguage, type SupportedLanguage } from '@/lib/i18n/config'

interface TranslateRequestBody {
  text: string
  targetLanguage: SupportedLanguage
  sourceLanguage?: string
}

export async function POST(request: Request) {
  let body: TranslateRequestBody

  try {
    body = await request.json()
  } catch (error) {
    console.error('Failed to parse translation request body:', error)
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { text, targetLanguage, sourceLanguage } = body

  if (typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  }

  if (!isSupportedLanguage(targetLanguage)) {
    return NextResponse.json({ error: 'Unsupported language' }, { status: 400 })
  }

  if (targetLanguage === DEFAULT_LANGUAGE) {
    return NextResponse.json({
      translatedText: text,
      detectedLanguage: sourceLanguage ?? 'unknown'
    })
  }

  try {
    const result = await translateText(text, targetLanguage, { sourceLanguage })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json({
      translatedText: text,
      detectedLanguage: sourceLanguage ?? 'unknown',
      error: 'Translation failed'
    }, { status: 500 })
  }
}
