-- Migration: 050_room_pause_field.sql
-- Description: Add pause functionality to rooms for admin management

-- ============================================
-- ROOM PAUSE FIELDS
-- ============================================

-- Add pause flag
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;

-- Add timestamp for when room was paused
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- Add optional reason for pausing
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS pause_reason TEXT;

-- Add comments for documentation
COMMENT ON COLUMN rooms.is_paused IS 'Whether the room is temporarily paused/hidden from availability';
COMMENT ON COLUMN rooms.paused_at IS 'Timestamp when the room was paused';
COMMENT ON COLUMN rooms.pause_reason IS 'Optional reason for pausing the room';

-- Create index for filtering paused rooms
CREATE INDEX IF NOT EXISTS idx_rooms_is_paused ON rooms(is_paused) WHERE is_paused = true;
