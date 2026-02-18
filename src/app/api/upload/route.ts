import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 60

// 최대 파일 크기 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// 허용된 이미지 타입
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif' // AVIF 포맷 추가
]

// AVIF 최적화를 위한 설정
const AVIF_CONVERSION_SETTINGS = {
  quality: 90, // AVIF는 품질이 우수하므로 높은 quality 설정
  effort: 9,   // 최고 압축 효율
  chromaSubsampling: '4:4:4' // 색상 정보 보존
}

// WebP 변환 설정
const WEBP_CONVERSION_SETTINGS = {
  quality: 85,
  effort: 6
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: { message: 'No files to upload.' } },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // 현재 user 확인 (선택사항)
    const { data: { user } } = await supabase.auth.getUser()
    
    const uploadedFiles = []
    
    for (const file of files) {
      // 파일 유효성 검사
      if (!file || typeof file === 'string') {
        continue
      }

      // 파일 크기 검사
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: { message: `File size cannot exceed 10MB: ${file.name}` } },
          { status: 400 }
        )
      }

      // 파일 타입 검사
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: {
              message: `Unsupported file format: ${file.type}`,
              code: 'UNSUPPORTED_FILE_TYPE',
              supportedTypes: ALLOWED_IMAGE_TYPES
            }
          },
          { status: 400 }
        )
      }

      // ArrayBuffer로 변환
      const arrayBuffer = await file.arrayBuffer()
      let processedBuffer = Buffer.from(arrayBuffer as ArrayBuffer)
      let finalContentType = file.type
      let finalExtension = file.name.split('.').pop() || 'webp'

      // 이미지 처리 및 변환
      try {
        const sharpImage = sharp(processedBuffer)

        // 이미지 메타데이터 가져오기
        const metadata = await sharpImage.metadata()

        // AVIF 원본은 품질을 유지하면서 최적화
        if (file.type === 'image/avif') {
          // AVIF는 이미 효율적이므로 필요한 경우만 변환
          if (metadata.width && metadata.width > 1920) {
            processedBuffer = Buffer.from(await sharpImage
              .resize(1920, 1080, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .avif(AVIF_CONVERSION_SETTINGS)
              .toBuffer())

            finalContentType = 'image/avif'
            finalExtension = 'avif'
          }
        }
        // SVG는 변환하지 않고 그대로 사용
        else if (file.type === 'image/svg+xml') {
          // SVG는 벡터이므로 변환 불필요
        }
        // 기타 포맷은 WebP로 변환
        else if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
          processedBuffer = Buffer.from(await sharpImage
            .resize(1920, 1080, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .webp(WEBP_CONVERSION_SETTINGS)
            .toBuffer())

          finalContentType = 'image/webp'
          finalExtension = 'webp'
        }
        // JPEG, PNG, GIF, WebP는 크기만 조정
        else if (metadata.width && metadata.width > 1920) {
          processedBuffer = Buffer.from(await sharpImage
            .resize(1920, 1080, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .toBuffer())
        }
      } catch (sharpError) {
        console.error('Image conversion failed:', sharpError)
        return NextResponse.json(
          {
            error: {
              message: `Image processing failed: ${file.name}`,
              code: 'IMAGE_PROCESSING_ERROR',
              details: sharpError instanceof Error ? sharpError.message : 'Unknown error'
            }
          },
          { status: 500 }
        )
      }

      // 파일명 생성 (UUID + 최종 확장자)
      const fileName = `${uuidv4()}.${finalExtension}`
      const filePath = `posts/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`

      // Supabase Storage에 업로드 (post-images 버킷 사용)
      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(filePath, processedBuffer, {
          contentType: finalContentType,
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
          {
            error: {
              message: `Upload failed: ${file.name}`,
              code: 'UPLOAD_ERROR',
              details: error.message,
              fileName: file.name
            }
          },
          { status: 500 }
        )
      }

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath)

      uploadedFiles.push({
        url: publicUrl,
        name: file.name,
        originalSize: file.size,
        processedSize: processedBuffer.length,
        originalType: file.type,
        finalType: finalContentType,
        dimensions: await sharp(processedBuffer).metadata().then(m => ({ width: m.width, height: m.height })).catch(() => null)
      })
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles.map(f => f.url),
      isImages: uploadedFiles.map(() => true),
      uploadedFiles: uploadedFiles,
      statistics: {
        totalFiles: uploadedFiles.length,
        totalOriginalSize: uploadedFiles.reduce((sum, f) => sum + f.originalSize, 0),
        totalProcessedSize: uploadedFiles.reduce((sum, f) => sum + f.processedSize, 0),
        compressionRatio: uploadedFiles.reduce((sum, f) => sum + f.originalSize, 0) > 0 ?
          uploadedFiles.reduce((sum, f) => sum + f.processedSize, 0) / uploadedFiles.reduce((sum, f) => sum + f.originalSize, 0) : 1
      },
      path: '',
      baseurl: '',
      error: null,
      msg: `${uploadedFiles.length} images uploaded successfully!`
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        error: {
          message: 'An unexpected error occurred during upload.',
          code: 'UNEXPECTED_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}