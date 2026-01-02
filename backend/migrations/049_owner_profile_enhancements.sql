-- Migration: 049_owner_profile_enhancements.sql
-- Description: Add enhanced profile fields for tenant owners (job title, bio, social links, avatar)

-- ============================================
-- OWNER PROFILE ENHANCEMENTS
-- ============================================

-- Add avatar URL field
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add job title field
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);

-- Add bio/description field
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add social links as JSONB (flexible for multiple platforms)
-- Format: { "whatsapp": "+27...", "linkedin": "https://...", "twitter": "https://...", "facebook": "https://...", "instagram": "https://..." }
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN tenant_members.avatar_url IS 'URL to the member avatar image';
COMMENT ON COLUMN tenant_members.job_title IS 'Job title or role of the team member (e.g., Property Manager, Owner)';
COMMENT ON COLUMN tenant_members.bio IS 'Short biography or description of the team member';
COMMENT ON COLUMN tenant_members.social_links IS 'Social media links as JSON: { whatsapp, linkedin, twitter, facebook, instagram }';
