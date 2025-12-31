-- ============================================
-- Migration: 011_header_footer_config.sql
-- Description: Add header, footer, and menu configuration to website_settings
-- ============================================

-- Add header configuration
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS header_config JSONB DEFAULT '{
  "logo_position": "left",
  "show_cta_button": true,
  "cta_text": "Book Now",
  "cta_link": "/book",
  "cta_style": "solid",
  "sticky": true,
  "transparent_on_hero": false
}';

-- Add footer configuration
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS footer_config JSONB DEFAULT '{
  "show_logo": true,
  "show_description": true,
  "description": "",
  "columns": [
    {
      "title": "Quick Links",
      "links": [
        {"label": "Home", "url": "/"},
        {"label": "Rooms", "url": "/accommodation"},
        {"label": "Contact", "url": "/contact"}
      ]
    },
    {
      "title": "Legal",
      "links": [
        {"label": "Privacy Policy", "url": "/privacy"},
        {"label": "Terms of Service", "url": "/terms"}
      ]
    }
  ],
  "show_social_icons": true,
  "copyright_text": "",
  "show_powered_by": false
}';

-- Add navigation menu configuration
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS navigation_config JSONB DEFAULT '{
  "items": [
    {"id": "home", "label": "Home", "url": "/", "enabled": true, "order": 1},
    {"id": "accommodation", "label": "Accommodation", "url": "/accommodation", "enabled": true, "order": 2},
    {"id": "reviews", "label": "Reviews", "url": "/reviews", "enabled": true, "order": 3},
    {"id": "blog", "label": "Blog", "url": "/blog", "enabled": true, "order": 4},
    {"id": "contact", "label": "Contact", "url": "/contact", "enabled": true, "order": 5}
  ]
}';

-- Add logo and favicon URLs
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- Add theme preset ID
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS theme_preset VARCHAR(30) DEFAULT 'modern';
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS font_pairing_preset VARCHAR(30) DEFAULT 'modern';

-- Comments
COMMENT ON COLUMN website_settings.header_config IS 'Header configuration: logo position, CTA button, sticky behavior';
COMMENT ON COLUMN website_settings.footer_config IS 'Footer configuration: columns, links, social icons, copyright';
COMMENT ON COLUMN website_settings.navigation_config IS 'Navigation menu items and their order/visibility';
COMMENT ON COLUMN website_settings.logo_url IS 'URL to the site logo image';
COMMENT ON COLUMN website_settings.favicon_url IS 'URL to the site favicon';
COMMENT ON COLUMN website_settings.theme_preset IS 'Selected color theme preset ID';
COMMENT ON COLUMN website_settings.font_pairing_preset IS 'Selected font pairing preset ID';
