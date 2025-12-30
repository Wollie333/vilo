-- Test Data for Customer Portal Demo
-- Run this in your Supabase SQL Editor

-- First, let's get your tenant ID (you'll need this)
-- Replace 'YOUR_TENANT_ID' below with your actual tenant ID from the tenants table

-- Step 1: Check your tenant ID
SELECT id, business_name, owner_user_id FROM tenants LIMIT 5;

-- ============================================
-- IMPORTANT: Copy your tenant_id from above and
-- replace 'YOUR_TENANT_ID' in the queries below
-- ============================================

-- Step 2: Create a test customer
INSERT INTO customers (id, email, name, phone, preferred_language, marketing_consent)
VALUES (
  gen_random_uuid(),
  'demo@customer.com',
  'Demo Customer',
  '+27 82 123 4567',
  'en',
  true
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone;

-- Get the customer ID we just created
SELECT id, email, name FROM customers WHERE email = 'demo@customer.com';

-- Step 3: Create test bookings for this customer
-- IMPORTANT: Replace 'YOUR_TENANT_ID' with your actual tenant ID
-- You can also replace room_id and room_name with actual room data if you have rooms

DO $$
DECLARE
  v_tenant_id UUID;
  v_customer_id UUID;
  v_room_id UUID;
  v_room_name TEXT;
BEGIN
  -- Get the first tenant
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;

  -- Get the customer
  SELECT id INTO v_customer_id FROM customers WHERE email = 'demo@customer.com';

  -- Try to get an existing room, or use a placeholder
  SELECT id, name INTO v_room_id, v_room_name FROM rooms WHERE tenant_id = v_tenant_id LIMIT 1;

  IF v_room_id IS NULL THEN
    v_room_id := gen_random_uuid();
    v_room_name := 'Ocean View Suite';
  END IF;

  -- Booking 1: Upcoming booking (next week)
  INSERT INTO bookings (
    id, tenant_id, customer_id, room_id, room_name,
    guest_name, guest_email, guest_phone,
    check_in, check_out,
    status, payment_status,
    total_amount, currency,
    notes
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    v_customer_id,
    v_room_id,
    v_room_name,
    'Demo Customer',
    'demo@customer.com',
    '+27 82 123 4567',
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '10 days',
    'confirmed',
    'paid',
    4500.00,
    'ZAR',
    '{"guests": 2, "adults": 2, "children": 0, "special_requests": "Late check-in requested", "addons": []}'
  );

  -- Booking 2: Past booking (last month) - eligible for review
  INSERT INTO bookings (
    id, tenant_id, customer_id, room_id, room_name,
    guest_name, guest_email, guest_phone,
    check_in, check_out,
    status, payment_status,
    total_amount, currency,
    notes
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    v_customer_id,
    v_room_id,
    v_room_name,
    'Demo Customer',
    'demo@customer.com',
    '+27 82 123 4567',
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '27 days',
    'completed',
    'paid',
    3800.00,
    'ZAR',
    '{"guests": 2, "adults": 2, "children": 0, "addons": [{"id": "addon1", "name": "Breakfast", "quantity": 2, "price": 150, "total": 300}]}'
  );

  -- Booking 3: Another past booking (2 months ago) - with review
  INSERT INTO bookings (
    id, tenant_id, customer_id, room_id, room_name,
    guest_name, guest_email, guest_phone,
    check_in, check_out,
    status, payment_status,
    total_amount, currency,
    notes
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    v_customer_id,
    v_room_id,
    v_room_name,
    'Demo Customer',
    'demo@customer.com',
    '+27 82 123 4567',
    CURRENT_DATE - INTERVAL '60 days',
    CURRENT_DATE - INTERVAL '57 days',
    'completed',
    'paid',
    3200.00,
    'ZAR',
    '{"guests": 1, "adults": 1, "children": 0, "addons": []}'
  );

  RAISE NOTICE 'Test bookings created for tenant: %', v_tenant_id;
END $$;

-- Step 4: Add a review for the oldest booking
INSERT INTO reviews (
  id, tenant_id, booking_id, rating, title, content, guest_name, status, owner_response, owner_response_at
)
SELECT
  gen_random_uuid(),
  b.tenant_id,
  b.id,
  5,
  'Amazing stay!',
  'The room was beautiful and the service was excellent. Would definitely recommend to anyone visiting the area. The views were breathtaking and the staff went above and beyond.',
  'Demo Customer',
  'published',
  'Thank you so much for your kind words! We are thrilled you enjoyed your stay and hope to welcome you back soon.',
  NOW() - INTERVAL '50 days'
FROM bookings b
WHERE b.guest_email = 'demo@customer.com'
ORDER BY b.check_in ASC
LIMIT 1
ON CONFLICT DO NOTHING;

-- Step 5: Create a support ticket
INSERT INTO support_messages (
  id, tenant_id, customer_id, booking_id, subject, message, sender_email, sender_name, status, priority
)
SELECT
  gen_random_uuid(),
  b.tenant_id,
  c.id,
  b.id,
  'Question about upcoming booking',
  'Hi there! I wanted to ask if early check-in would be possible for my upcoming stay? We are arriving on an early morning flight and it would be great if we could check in around 11am instead of the usual 2pm. Please let me know if this can be arranged. Thank you!',
  'demo@customer.com',
  'Demo Customer',
  'open',
  'normal'
FROM bookings b
JOIN customers c ON c.email = b.guest_email
WHERE b.guest_email = 'demo@customer.com'
AND b.check_in > CURRENT_DATE
LIMIT 1;

-- Add a reply to the support ticket
INSERT INTO support_replies (id, message_id, content, sender_type, sender_name)
SELECT
  gen_random_uuid(),
  sm.id,
  'Hello! Thank you for reaching out. We would be happy to arrange an early check-in for you at 11am. We will make a note on your reservation. Safe travels!',
  'admin',
  'Property Manager'
FROM support_messages sm
WHERE sm.sender_email = 'demo@customer.com'
LIMIT 1;

-- Verify the data was created
SELECT '=== CREATED TEST DATA ===' as info;

SELECT 'Customer:' as type, email, name FROM customers WHERE email = 'demo@customer.com';

SELECT 'Bookings:' as type, room_name, check_in, check_out, status, payment_status
FROM bookings WHERE guest_email = 'demo@customer.com' ORDER BY check_in DESC;

SELECT 'Reviews:' as type, r.rating, r.title, r.status
FROM reviews r JOIN bookings b ON r.booking_id = b.id WHERE b.guest_email = 'demo@customer.com';

SELECT 'Support Tickets:' as type, subject, status
FROM support_messages WHERE sender_email = 'demo@customer.com';

SELECT '=== LOGIN DETAILS ===' as info;
SELECT 'Email: demo@customer.com' as login_info;
SELECT 'Portal URL: /portal/login' as portal_url;
