-- Create storage bucket for gallery images
-- Note: This migration creates the bucket and sets up RLS policies

-- Create the gallery-images bucket (public access for viewing)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery-images',
  'gallery-images',
  true,
  5242880, -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Policy: Allow authenticated users to upload images to their own tenant folder
CREATE POLICY "Users can upload gallery images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gallery-images' AND
    (storage.foldername(name))[1] = (
      SELECT id::text FROM tenants
      WHERE owner_id::text = auth.uid()::text
      LIMIT 1
    )
  );

-- Policy: Allow authenticated users to update their own images
CREATE POLICY "Users can update own gallery images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'gallery-images' AND
    (storage.foldername(name))[1] = (
      SELECT id::text FROM tenants
      WHERE owner_id::text = auth.uid()::text
      LIMIT 1
    )
  );

-- Policy: Allow authenticated users to delete their own images
CREATE POLICY "Users can delete own gallery images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'gallery-images' AND
    (storage.foldername(name))[1] = (
      SELECT id::text FROM tenants
      WHERE owner_id::text = auth.uid()::text
      LIMIT 1
    )
  );

-- Policy: Anyone can view gallery images (public bucket)
CREATE POLICY "Anyone can view gallery images" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'gallery-images');
