-- Migration: Update template_id constraint to allow 1-4 templates
-- Date: 2024-12-30

-- Drop existing constraint if it exists
ALTER TABLE website_pages
DROP CONSTRAINT IF EXISTS website_pages_valid_template;

-- Add new constraint allowing 1-4 templates
ALTER TABLE website_pages
ADD CONSTRAINT website_pages_valid_template
CHECK (template_id BETWEEN 1 AND 4);

-- Update any existing rows that might be out of range (shouldn't be any)
UPDATE website_pages
SET template_id = 1
WHERE template_id > 4 OR template_id < 1;
