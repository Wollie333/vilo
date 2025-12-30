-- Migration: Add global_styles JSONB to website_settings
-- This stores the Site Kit global styles (colors, typography, buttons, spacing)

-- Add global_styles column
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS global_styles JSONB DEFAULT '{
  "colors": {
    "primary": "#2563eb",
    "secondary": "#64748b",
    "accent": "#10b981",
    "headingText": "#1f2937",
    "bodyText": "#4b5563",
    "mutedText": "#9ca3af",
    "background": "#ffffff",
    "sectionBg": "#f9fafb",
    "cardBg": "#ffffff",
    "borderColor": "#e5e7eb"
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "baseFontSize": 16,
    "lineHeight": 1.6,
    "headings": {
      "h1": { "size": 48, "weight": 700, "lineHeight": 1.2 },
      "h2": { "size": 36, "weight": 600, "lineHeight": 1.3 },
      "h3": { "size": 28, "weight": 600, "lineHeight": 1.4 },
      "h4": { "size": 22, "weight": 500, "lineHeight": 1.4 },
      "h5": { "size": 18, "weight": 500, "lineHeight": 1.5 },
      "h6": { "size": 16, "weight": 500, "lineHeight": 1.5 }
    }
  },
  "buttons": {
    "primary": {
      "background": "#2563eb",
      "text": "#ffffff",
      "border": "#2563eb",
      "hoverBg": "#1d4ed8",
      "radius": 8,
      "paddingY": 12,
      "paddingX": 24
    },
    "secondary": {
      "background": "transparent",
      "text": "#2563eb",
      "border": "#2563eb",
      "hoverBg": "#eff6ff",
      "radius": 8,
      "paddingY": 12,
      "paddingX": 24
    }
  },
  "spacing": {
    "sectionPaddingY": 80,
    "containerMaxWidth": 1200,
    "elementGap": 24,
    "cardPadding": 24,
    "cardRadius": 12
  }
}';

-- Add menus JSONB for WordPress-style menu management
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS menus JSONB DEFAULT '[
  {
    "id": "main-nav",
    "name": "Main Navigation",
    "location": "header",
    "items": []
  },
  {
    "id": "footer-nav",
    "name": "Footer Navigation",
    "location": "footer",
    "items": []
  }
]';

-- Comment the columns
COMMENT ON COLUMN website_settings.global_styles IS 'Site Kit global styles - colors, typography, buttons, spacing';
COMMENT ON COLUMN website_settings.menus IS 'WordPress-style menu definitions with nested items';
