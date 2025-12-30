-- Migration: Add children pricing columns to rooms table
-- This migration adds columns to support children pricing based on age ranges
--
-- Pricing logic:
-- - max_adults: Maximum number of adults allowed (NULL = use max_guests)
-- - max_children: Maximum number of children allowed (NULL = no separate limit)
-- - child_price_per_night: Rate for children who are not free (if null, same as adult rate)
-- - child_free_until_age: Children younger than this age stay free (e.g., 2 = ages 0-1 free)
-- - child_age_limit: Maximum age considered a child (e.g., 12 = ages 0-11 are children, 12+ are adults)

-- Add all children-related columns to rooms table
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS max_adults INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_children INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS child_price_per_night NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS child_free_until_age INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS child_age_limit INTEGER DEFAULT 12;

-- Add comments for documentation
COMMENT ON COLUMN rooms.max_adults IS 'Maximum number of adults allowed (NULL = use max_guests)';
COMMENT ON COLUMN rooms.max_children IS 'Maximum number of children allowed (NULL = no separate limit)';
COMMENT ON COLUMN rooms.child_price_per_night IS 'Price per night for children. 0 = free, NULL = same as adult rate';
COMMENT ON COLUMN rooms.child_free_until_age IS 'Children younger than this age stay free (e.g., 2 = ages 0-1 stay free)';
COMMENT ON COLUMN rooms.child_age_limit IS 'Maximum age to be considered a child (e.g., 12 = ages 0-11 are children, 12+ pay adult rate)';

-- Example usage:
-- A hotel that offers:
-- - Free stay for children under 2 (infants)
-- - Reduced rate of R300/night for children 2-11
-- - Adult rate (base_price_per_night) for guests 12+
-- Would set:
--   child_free_until_age = 2
--   child_age_limit = 12
--   child_price_per_night = 300
