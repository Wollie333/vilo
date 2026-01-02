-- Migration: 048_plan_enhancements.sql
-- Description: Add display enhancement fields to subscription_plans for admin UI

-- Add highlight badge for plan cards (e.g., "Most Popular", "Best Value")
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS highlight_badge VARCHAR(50);

-- Add recommended flag for highlighting preferred plans
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS recommended BOOLEAN DEFAULT FALSE;

-- Add payment provider integration fields
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS paystack_plan_code TEXT;

-- Add comments for documentation
COMMENT ON COLUMN subscription_plans.highlight_badge IS 'Display badge on plan card, e.g., Most Popular, Best Value';
COMMENT ON COLUMN subscription_plans.recommended IS 'Whether this plan is highlighted as recommended';
COMMENT ON COLUMN subscription_plans.stripe_price_id IS 'Stripe Price ID for recurring billing';
COMMENT ON COLUMN subscription_plans.paystack_plan_code IS 'Paystack Plan Code for recurring billing';

-- Mark Professional plan as recommended (example)
UPDATE subscription_plans
SET recommended = TRUE, highlight_badge = 'Most Popular'
WHERE slug = 'professional';
