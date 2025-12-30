-- Migration: Add pricing_mode and additional_person_rate columns
-- This migration adds support for different pricing models:
--   - per_unit: Flat rate for the entire room regardless of guests
--   - per_person: Price multiplied by number of guests
--   - per_person_sharing: Base rate for first person, additional rate for extra guests
--
-- Columns added:
--   - pricing_mode: The pricing model used (default: 'per_unit')
--   - additional_person_rate: Rate for each additional person (used with per_person_sharing)

-- Add pricing_mode column to rooms table
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(20) DEFAULT 'per_unit';

-- Add additional_person_rate column to rooms table
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS additional_person_rate NUMERIC(10,2) DEFAULT NULL;

-- Add pricing_mode column to seasonal_rates table (optional override)
ALTER TABLE seasonal_rates
ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(20) DEFAULT NULL;

-- Add additional_person_rate column to seasonal_rates table
ALTER TABLE seasonal_rates
ADD COLUMN IF NOT EXISTS additional_person_rate NUMERIC(10,2) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN rooms.pricing_mode IS 'Pricing model: per_unit (flat room rate), per_person (rate x guests), per_person_sharing (base + additional person rate)';
COMMENT ON COLUMN rooms.additional_person_rate IS 'Rate per additional person after first guest (used with per_person_sharing pricing mode)';
COMMENT ON COLUMN seasonal_rates.pricing_mode IS 'Optional pricing mode override for this rate period. NULL inherits from room.';
COMMENT ON COLUMN seasonal_rates.additional_person_rate IS 'Optional additional person rate override for this rate period';

-- Add check constraint to ensure valid pricing_mode values
ALTER TABLE rooms
ADD CONSTRAINT check_pricing_mode CHECK (pricing_mode IN ('per_unit', 'per_person', 'per_person_sharing'));

ALTER TABLE seasonal_rates
ADD CONSTRAINT check_seasonal_pricing_mode CHECK (pricing_mode IS NULL OR pricing_mode IN ('per_unit', 'per_person', 'per_person_sharing'));

-- Example usage:
--
-- Per Unit (default - flat rate for room):
--   pricing_mode = 'per_unit'
--   base_price_per_night = 1500  -- R1,500 per night regardless of guests
--
-- Per Person (multiply by guests):
--   pricing_mode = 'per_person'
--   base_price_per_night = 500   -- R500 per person per night
--   2 guests = R1,000, 3 guests = R1,500
--
-- Per Person Sharing:
--   pricing_mode = 'per_person_sharing'
--   base_price_per_night = 800   -- R800 for first person
--   additional_person_rate = 400 -- R400 for each additional person
--   1 guest = R800, 2 guests = R1,200, 3 guests = R1,600

