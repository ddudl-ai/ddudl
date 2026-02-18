import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import sharp from 'sharp'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string | null) || 'posts'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Basic type guard
    if (typeof file.name !== 'string' || file.size === undefined) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
    }

    // 이미지 파일만 허용
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // Sharp로 이미지 처리 (WebP 변환 + 최적화)
    const processedBuffer = await sharp(inputBuffer)
      .resize(1920, 1080, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .webp({ 
        quality: 85,
        effort: 6 // 더 나은 압축을 위해
      })
      .toBuffer()

    // 현재 날짜로 폴더 구조 생성
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const fileName = `${folder}/${year}/${month}/${crypto.randomUUID()}.webp`

    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(fileName, processedBuffer, {
        contentType: 'image/webp',
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(data.path)

    return NextResponse.json({
      path: data.path,
      url: publicUrlData.publicUrl,
      originalSize: inputBuffer.length,
      processedSize: processedBuffer.length,
      compressionRatio: Math.round(((inputBuffer.length - processedBuffer.length) / inputBuffer.length) * 100)
    })
  } catch (error) {
    console.error('Image upload API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

