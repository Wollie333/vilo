-- Migration 038: Announcements and Changelog System
-- Adds changelog entries and banner dismissal tracking

-- Changelog/Release notes table
CREATE TABLE IF NOT EXISTS changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  content_html TEXT NOT NULL,
  content_markdown TEXT,

  -- Categorization
  category VARCHAR(50) NOT NULL DEFAULT 'improvement',
  -- 'feature', 'improvement', 'bugfix', 'security', 'breaking', 'announcement'

  -- Publishing
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  -- 'draft', 'scheduled', 'published', 'archived'
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,

  -- Targeting (optional - null means visible to all)
  min_plan_slug VARCHAR(50),
  visible_to_plans TEXT[], -- Array of plan slugs

  -- Metadata
  is_major_release BOOLEAN DEFAULT false,
  notify_users BOOLEAN DEFAULT false,
  tags TEXT[],

  -- Tracking
  views_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES super_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for changelog_entries
CREATE INDEX idx_changelog_entries_status ON changelog_entries(status);
CREATE INDEX idx_changelog_entries_category ON changelog_entries(category);
CREATE INDEX idx_changelog_entries_published ON changelog_entries(published_at)
  WHERE status = 'published';
CREATE INDEX idx_changelog_entries_scheduled ON changelog_entries(scheduled_for)
  WHERE status = 'scheduled';

-- Banner dismissals (track which users dismissed which banners/announcements)
CREATE TABLE IF NOT EXISTS banner_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  changelog_id UUID REFERENCES changelog_entries(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID REFERENCES tenant_members(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure at least one of campaign_id or changelog_id is set
  CONSTRAINT banner_dismissals_source_check CHECK (
    campaign_id IS NOT NULL OR changelog_id IS NOT NULL
  ),
  -- Ensure at least one of member_id or customer_id is set
  CONSTRAINT banner_dismissals_user_check CHECK (
    member_id IS NOT NULL OR customer_id IS NOT NULL
  )
);

-- Indexes for banner_dismissals
CREATE INDEX idx_banner_dismissals_campaign ON banner_dismissals(campaign_id);
CREATE INDEX idx_banner_dismissals_changelog ON banner_dismissals(changelog_id);
CREATE INDEX idx_banner_dismissals_member ON banner_dismissals(member_id);
CREATE INDEX idx_banner_dismissals_customer ON banner_dismissals(customer_id);
CREATE INDEX idx_banner_dismissals_tenant ON banner_dismissals(tenant_id);

-- Unique constraints to prevent duplicate dismissals
CREATE UNIQUE INDEX idx_banner_dismissals_campaign_member
  ON banner_dismissals(campaign_id, member_id)
  WHERE campaign_id IS NOT NULL AND member_id IS NOT NULL;

CREATE UNIQUE INDEX idx_banner_dismissals_campaign_customer
  ON banner_dismissals(campaign_id, customer_id)
  WHERE campaign_id IS NOT NULL AND customer_id IS NOT NULL;

CREATE UNIQUE INDEX idx_banner_dismissals_changelog_member
  ON banner_dismissals(changelog_id, member_id)
  WHERE changelog_id IS NOT NULL AND member_id IS NOT NULL;

CREATE UNIQUE INDEX idx_banner_dismissals_changelog_customer
  ON banner_dismissals(changelog_id, customer_id)
  WHERE changelog_id IS NOT NULL AND customer_id IS NOT NULL;

-- Email campaign tracking
CREATE TABLE IF NOT EXISTS email_campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  member_id UUID REFERENCES tenant_members(id) ON DELETE SET NULL,

  -- Event tracking
  event_type VARCHAR(50) NOT NULL,
  -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'complained'

  -- Additional data
  link_clicked TEXT, -- For click events
  user_agent TEXT,
  ip_address INET,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_campaign_events
CREATE INDEX idx_email_campaign_events_campaign ON email_campaign_events(campaign_id);
CREATE INDEX idx_email_campaign_events_email ON email_campaign_events(recipient_email);
CREATE INDEX idx_email_campaign_events_type ON email_campaign_events(event_type);
CREATE INDEX idx_email_campaign_events_created ON email_campaign_events(created_at);

-- Enable RLS on new tables
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Changelog: Published entries visible to all, drafts only to service role
CREATE POLICY "Published changelog entries are visible to all"
  ON changelog_entries FOR SELECT
  USING (status = 'published' OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage changelog entries"
  ON changelog_entries FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Banner dismissals: Users can see their own, service role can see all
CREATE POLICY "Users can view their own dismissals"
  ON banner_dismissals FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage banner dismissals"
  ON banner_dismissals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Email campaign events: Service role only
CREATE POLICY "Service role access only for email_campaign_events"
  ON email_campaign_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Function to publish scheduled changelog entries
CREATE OR REPLACE FUNCTION publish_scheduled_changelog_entries()
RETURNS INTEGER AS $$
DECLARE
  published_count INTEGER;
BEGIN
  UPDATE changelog_entries
  SET
    status = 'published',
    published_at = NOW()
  WHERE status = 'scheduled'
  AND scheduled_for <= NOW();

  GET DIAGNOSTICS published_count = ROW_COUNT;
  RETURN published_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment changelog view count
CREATE OR REPLACE FUNCTION increment_changelog_views(changelog_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE changelog_entries
  SET views_count = views_count + 1
  WHERE id = changelog_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add settings for announcements
INSERT INTO platform_settings (key, value, category, description, is_secret) VALUES
  ('announcement_banner_enabled', 'true', 'system', 'Enable announcement banners', false),
  ('changelog_public_enabled', 'true', 'system', 'Enable public changelog page', false),
  ('changelog_email_notifications', 'true', 'system', 'Send email for major releases', false)
ON CONFLICT (key) DO NOTHING;
