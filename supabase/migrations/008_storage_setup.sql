-- Migration: Storage Setup for Image Uploads
-- Date: 2025-01-14
-- Description: Creates storage buckets and policies for image upload system

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage bucket for thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,
  2097152, -- 2MB limit for thumbnails
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for temporary uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temp-uploads',
  'temp-uploads',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for images bucket
CREATE POLICY "Images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for thumbnails bucket
CREATE POLICY "Thumbnails are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

CREATE POLICY "System can manage thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "System can update thumbnails"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'thumbnails');

CREATE POLICY "System can delete thumbnails"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'thumbnails');

-- Storage policies for temp-uploads bucket
CREATE POLICY "Users can view their own temp uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'temp-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload to temp bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'temp-uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their temp uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'temp-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to generate optimized file path
CREATE OR REPLACE FUNCTION generate_image_path(
  user_id UUID,
  original_filename TEXT,
  upload_context TEXT DEFAULT 'general'
)
RETURNS TEXT AS $$
DECLARE
  file_extension TEXT;
  timestamp_str TEXT;
  random_suffix TEXT;
  final_path TEXT;
BEGIN
  -- Extract file extension
  file_extension := lower(split_part(original_filename, '.', -1));

  -- Generate timestamp string
  timestamp_str := to_char(NOW(), 'YYYY/MM/DD');

  -- Generate random suffix
  random_suffix := substr(gen_random_uuid()::text, 1, 8);

  -- Build final path: user_id/context/YYYY/MM/DD/random_suffix.extension
  final_path := format('%s/%s/%s/%s.%s',
    user_id::text,
    upload_context,
    timestamp_str,
    random_suffix,
    file_extension
  );

  RETURN final_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to move temp file to permanent storage
CREATE OR REPLACE FUNCTION move_temp_to_permanent(
  temp_path TEXT,
  permanent_path TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  -- This would typically be handled by the application layer
  -- but we can create a placeholder for future Edge Function integration

  -- For now, return true to indicate the function exists
  -- The actual file moving will be handled by the upload API
  success := TRUE;

  RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old temporary files
CREATE OR REPLACE FUNCTION cleanup_temp_uploads()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER := 0;
BEGIN
  -- Mark temp uploads older than 24 hours for cleanup
  -- This would be integrated with storage cleanup in the application

  -- Log cleanup attempt
  INSERT INTO upload_sessions (user_id, status, upload_context)
  SELECT
    '00000000-0000-0000-0000-000000000000'::UUID,
    'expired',
    'cleanup'
  WHERE NOT EXISTS (
    SELECT 1 FROM upload_sessions
    WHERE upload_context = 'cleanup'
    AND started_at > NOW() - INTERVAL '1 hour'
  );

  -- Return placeholder count
  cleanup_count := 1;

  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate image upload
CREATE OR REPLACE FUNCTION validate_image_upload(
  file_size BIGINT,
  mime_type TEXT,
  user_id UUID DEFAULT auth.uid()
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  user_upload_count INTEGER;
  daily_limit INTEGER := 50; -- Default daily limit
  size_limit BIGINT := 10485760; -- 10MB
BEGIN
  -- Check file size
  IF file_size > size_limit THEN
    result := json_build_object(
      'valid', false,
      'error', 'FILE_TOO_LARGE',
      'message', format('파일 크기가 %s를 초과합니다', pg_size_pretty(size_limit))
    );
    RETURN result;
  END IF;

  -- Check mime type
  IF mime_type NOT IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif') THEN
    result := json_build_object(
      'valid', false,
      'error', 'INVALID_MIME_TYPE',
      'message', '지원되지 않는 이미지 형식입니다'
    );
    RETURN result;
  END IF;

  -- Check daily upload limit
  SELECT COUNT(*)
  INTO user_upload_count
  FROM images
  WHERE uploaded_by = user_id
    AND uploaded_at > CURRENT_DATE;

  IF user_upload_count >= daily_limit THEN
    result := json_build_object(
      'valid', false,
      'error', 'DAILY_LIMIT_EXCEEDED',
      'message', format('일일 업로드 한도(%s개)를 초과했습니다', daily_limit)
    );
    RETURN result;
  END IF;

  -- Validation passed
  result := json_build_object(
    'valid', true,
    'remaining_uploads', daily_limit - user_upload_count - 1
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get upload stats for user
CREATE OR REPLACE FUNCTION get_user_upload_stats(user_id UUID DEFAULT auth.uid())
RETURNS JSON AS $$
DECLARE
  stats JSON;
  daily_count INTEGER;
  weekly_count INTEGER;
  monthly_count INTEGER;
  total_size BIGINT;
BEGIN
  -- Get upload counts and total size
  SELECT
    COUNT(CASE WHEN uploaded_at > CURRENT_DATE THEN 1 END),
    COUNT(CASE WHEN uploaded_at > CURRENT_DATE - INTERVAL '7 days' THEN 1 END),
    COUNT(CASE WHEN uploaded_at > CURRENT_DATE - INTERVAL '30 days' THEN 1 END),
    COALESCE(SUM(size_bytes), 0)
  INTO daily_count, weekly_count, monthly_count, total_size
  FROM images
  WHERE uploaded_by = user_id;

  stats := json_build_object(
    'daily_uploads', daily_count,
    'weekly_uploads', weekly_count,
    'monthly_uploads', monthly_count,
    'total_size', total_size,
    'total_size_pretty', pg_size_pretty(total_size),
    'daily_limit_remaining', GREATEST(0, 50 - daily_count)
  );

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate thumbnail paths
CREATE OR REPLACE FUNCTION generate_thumbnail_paths(
  original_path TEXT,
  sizes TEXT[] DEFAULT ARRAY['small', 'medium', 'large']
)
RETURNS JSON AS $$
DECLARE
  base_path TEXT;
  file_name TEXT;
  extension TEXT;
  thumbnail_paths JSON;
  size_name TEXT;
  path_obj JSON := '{}';
BEGIN
  -- Extract components from original path
  base_path := regexp_replace(original_path, '/[^/]+$', '');
  file_name := regexp_replace(split_part(original_path, '/', -1), '\.[^.]+$', '');
  extension := split_part(original_path, '.', -1);

  -- Generate thumbnail paths for each size
  FOREACH size_name IN ARRAY sizes
  LOOP
    path_obj := path_obj || json_build_object(
      size_name,
      format('%s/thumbnails/%s_%s.%s', base_path, file_name, size_name, extension)
    );
  END LOOP;

  thumbnail_paths := json_build_object('paths', path_obj);

  RETURN thumbnail_paths;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add some helpful comments
COMMENT ON FUNCTION generate_image_path IS 'Generate organized path for uploaded images with user isolation';
COMMENT ON FUNCTION validate_image_upload IS 'Validate image upload against size, type and rate limits';
COMMENT ON FUNCTION get_user_upload_stats IS 'Get comprehensive upload statistics for a user';
COMMENT ON FUNCTION generate_thumbnail_paths IS 'Generate standardized thumbnail paths for different sizes';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;