-- Analytics & Reporting System Tables
-- Privacy-first tracking with anonymous session IDs (no fingerprinting)

-- =====================================================
-- 1. ANALYTICS SESSIONS - Privacy-first visitor tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  page_count INTEGER DEFAULT 0,
  total_time_seconds INTEGER,
  entry_page TEXT,
  exit_page TEXT,
  entry_source TEXT, -- 'direct', 'organic', 'paid', 'social', 'referral'
  referrer TEXT,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  converted BOOLEAN DEFAULT FALSE,
  conversion_type TEXT, -- 'booking', 'inquiry'
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_tenant_date ON analytics_sessions(tenant_id, started_at);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session ON analytics_sessions(session_id);

-- =====================================================
-- 2. ANALYTICS PAGE VIEWS - Page/listing view tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  page_type TEXT NOT NULL, -- 'property', 'room', 'checkout', 'booking_form'
  page_path TEXT NOT NULL,
  time_on_page INTEGER, -- seconds
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_page_views_tenant_date ON analytics_page_views(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_room ON analytics_page_views(tenant_id, room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_session ON analytics_page_views(session_id);

-- =====================================================
-- 3. ANALYTICS EVENTS - Interaction tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'book_now_click', 'inquiry_submit', 'gallery_view', 'date_select'
  event_category TEXT NOT NULL, -- 'engagement', 'conversion', 'navigation'
  event_label TEXT,
  event_value DECIMAL(12, 2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_date ON analytics_events(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(tenant_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);

-- =====================================================
-- 4. ANALYTICS DAILY METRICS - Pre-aggregated daily stats
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,

  -- Traffic metrics
  total_sessions INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0, -- seconds
  bounce_rate DECIMAL(5, 2) DEFAULT 0,

  -- Conversion metrics
  total_bookings INTEGER DEFAULT 0,
  total_inquiries INTEGER DEFAULT 0,
  booking_conversion_rate DECIMAL(5, 4) DEFAULT 0,
  inquiry_conversion_rate DECIMAL(5, 4) DEFAULT 0,

  -- Revenue metrics
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  average_booking_value DECIMAL(12, 2) DEFAULT 0,

  -- Occupancy metrics
  occupied_room_nights INTEGER DEFAULT 0,
  available_room_nights INTEGER DEFAULT 0,
  occupancy_rate DECIMAL(5, 2) DEFAULT 0,

  -- Review metrics
  new_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2),

  -- Room-level views (JSONB for flexibility)
  room_views JSONB DEFAULT '{}', -- { "room_id": view_count }

  -- Source breakdown
  traffic_sources JSONB DEFAULT '{}', -- { "direct": 50, "organic": 30, ... }
  device_breakdown JSONB DEFAULT '{}', -- { "mobile": 60, "desktop": 35, ... }

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_metrics_tenant_date ON analytics_daily_metrics(tenant_id, metric_date);

-- =====================================================
-- 5. ANALYTICS MONTHLY METRICS - Long-term aggregated stats
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_monthly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_year INTEGER NOT NULL,
  metric_month INTEGER NOT NULL, -- 1-12

  -- Traffic
  total_sessions INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,

  -- Revenue & Bookings
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  average_booking_value DECIMAL(12, 2) DEFAULT 0,
  cancellation_count INTEGER DEFAULT 0,
  cancellation_rate DECIMAL(5, 2) DEFAULT 0,

  -- Hospitality KPIs
  revpar DECIMAL(12, 2) DEFAULT 0, -- Revenue Per Available Room
  adr DECIMAL(12, 2) DEFAULT 0, -- Average Daily Rate
  occupancy_rate DECIMAL(5, 2) DEFAULT 0,
  avg_length_of_stay DECIMAL(5, 2) DEFAULT 0,
  avg_booking_lead_time INTEGER DEFAULT 0, -- days

  -- Customer metrics
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  repeat_guest_rate DECIMAL(5, 2) DEFAULT 0,

  -- Reviews
  total_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2),

  -- Room performance (JSONB)
  room_performance JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, metric_year, metric_month)
);

CREATE INDEX IF NOT EXISTS idx_analytics_monthly_metrics_tenant ON analytics_monthly_metrics(tenant_id, metric_year, metric_month);

-- =====================================================
-- 6. ANALYTICS REPORTS - Generated report storage
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Report metadata
  report_type TEXT NOT NULL, -- 'comprehensive', 'revenue', 'occupancy', 'customer', 'traffic'
  report_name TEXT NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,

  -- Generation info
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- File storage
  pdf_url TEXT,
  pdf_path TEXT,
  csv_url TEXT,
  csv_path TEXT,

  -- Report data (cached for regeneration)
  report_data JSONB NOT NULL,

  -- Scheduling
  is_scheduled BOOLEAN DEFAULT FALSE,
  schedule_frequency TEXT, -- 'daily', 'weekly', 'monthly'
  next_run_at TIMESTAMPTZ,
  email_recipients TEXT[],
  last_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_reports_tenant ON analytics_reports(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_scheduled ON analytics_reports(is_scheduled, next_run_at) WHERE is_scheduled = TRUE;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_monthly_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY "Tenant isolation for analytics_sessions"
  ON analytics_sessions
  FOR ALL
  USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id));

CREATE POLICY "Tenant isolation for analytics_page_views"
  ON analytics_page_views
  FOR ALL
  USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id));

CREATE POLICY "Tenant isolation for analytics_events"
  ON analytics_events
  FOR ALL
  USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id));

CREATE POLICY "Tenant isolation for analytics_daily_metrics"
  ON analytics_daily_metrics
  FOR ALL
  USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id));

CREATE POLICY "Tenant isolation for analytics_monthly_metrics"
  ON analytics_monthly_metrics
  FOR ALL
  USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id));

CREATE POLICY "Tenant isolation for analytics_reports"
  ON analytics_reports
  FOR ALL
  USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id));

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE analytics_sessions IS 'Privacy-first visitor session tracking - no fingerprinting, anonymous session IDs only';
COMMENT ON TABLE analytics_page_views IS 'Individual page view events for listing and conversion tracking';
COMMENT ON TABLE analytics_events IS 'User interaction events (clicks, form submissions, etc.)';
COMMENT ON TABLE analytics_daily_metrics IS 'Pre-aggregated daily metrics for fast dashboard queries';
COMMENT ON TABLE analytics_monthly_metrics IS 'Pre-aggregated monthly metrics with hospitality KPIs';
COMMENT ON TABLE analytics_reports IS 'Generated PDF/CSV reports with scheduling support';
