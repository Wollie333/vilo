-- Migration: 021_customer_profile_picture.sql
-- Description: Add profile picture URL to customers table

-- Add profile_picture_url column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN customers.profile_picture_url IS 'URL to customer profile picture stored in Supabase Storage';
