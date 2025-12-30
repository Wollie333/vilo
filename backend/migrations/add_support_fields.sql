-- Migration: Add source and assigned_to columns to support_messages
-- Run this in Supabase SQL Editor

-- Add source field to distinguish ticket origin (website form vs portal)
ALTER TABLE support_messages
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'portal';

-- Add check constraint for source values
ALTER TABLE support_messages
ADD CONSTRAINT support_messages_source_check
CHECK (source IN ('website', 'portal'));

-- Add assigned_to field for staff assignment
ALTER TABLE support_messages
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add sender_name for website inquiries (no customer record)
ALTER TABLE support_messages
ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255);

-- Add sender_phone for website inquiries
ALTER TABLE support_messages
ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(50);

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_support_messages_source ON support_messages(source);
CREATE INDEX IF NOT EXISTS idx_support_messages_assigned ON support_messages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);

-- Update existing records to have 'portal' as source
UPDATE support_messages SET source = 'portal' WHERE source IS NULL;
