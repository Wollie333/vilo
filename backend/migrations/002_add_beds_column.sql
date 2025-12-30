-- Migration: Add beds JSONB column to rooms table
-- This migration adds a flexible bed configuration column
--
-- Bed configuration structure:
-- beds: Array of objects with:
--   - id: string (unique identifier for React keys)
--   - bed_type: string (King, Queen, Double, Twin, Single, Bunk, Sofa Bed)
--   - quantity: number (how many of this bed type)
--   - sleeps: number (how many people can sleep in this bed configuration)
--
-- Example:
-- [
--   { "id": "uuid1", "bed_type": "King", "quantity": 1, "sleeps": 2 },
--   { "id": "uuid2", "bed_type": "Single", "quantity": 2, "sleeps": 1 }
-- ]
-- This room has 1 King bed (sleeps 2) and 2 Single beds (sleeps 1 each) = total 4 sleeps

-- Add beds JSONB column to rooms table
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS beds JSONB DEFAULT '[]'::jsonb;

-- Add extra_options column for additional room features (Balcony, Sea View, Kitchenette, etc.)
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS extra_options JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN rooms.beds IS 'Flexible bed configuration as JSON array. Each entry has: id, bed_type, quantity, sleeps';
COMMENT ON COLUMN rooms.extra_options IS 'Extra room features as JSON array (e.g., ["Balcony", "Sea View", "Kitchenette"])';

-- Migrate existing data: Convert legacy bed_type/bed_count to beds array
-- Only for rooms that don't have beds configured yet
UPDATE rooms
SET beds = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'bed_type', COALESCE(bed_type, 'Double'),
    'quantity', COALESCE(bed_count, 1),
    'sleeps', CASE
      WHEN bed_type IN ('King', 'Queen', 'Double', 'Bunk', 'Sofa Bed') THEN 2
      WHEN bed_type IN ('Twin', 'Single') THEN 1
      ELSE 2
    END
  )
)
WHERE beds IS NULL OR beds = '[]'::jsonb;

-- Note: Legacy columns bed_type and bed_count are kept for backwards compatibility
-- They will continue to be populated with the primary bed configuration

