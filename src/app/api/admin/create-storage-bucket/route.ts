import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const supabase = createAdminClient()

    // Storage 버킷 생성 시도
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('post-images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 52428800 // 50MB
    })

    if (bucketError) {
      // 이미 존재하는 버킷이면 괜찮음
      if (bucketError.message.includes('already exists') || bucketError.message.includes('Duplicate')) {
        return NextResponse.json({ 
          success: true, 
          message: 'Bucket already exists',
          bucket: 'post-images'
        })
      }
      
      console.error('Bucket creation error:', bucketError)
      return NextResponse.json({ 
        error: 'Failed to create storage bucket', 
        details: bucketError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Storage bucket created successfully',
      bucket
    })

  } catch (error) {
    console.error('Create storage bucket error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}