-- ============================================
-- COMPLETE DEMO DATA for wollie333@gmail.com
-- Creates: 1 Room + 3 Bookings + 3 Reviews
-- Run this in Supabase SQL Editor
-- ============================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_room_id UUID;
  v_room_name TEXT := 'Deluxe Garden Suite';
  v_booking_id_1 UUID;
  v_booking_id_2 UUID;
  v_booking_id_3 UUID;
BEGIN
  -- Get the user ID for wollie333@gmail.com
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'wollie333@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User wollie333@gmail.com not found in auth.users';
  END IF;

  -- Get the tenant for this user
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE owner_user_id = v_user_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found for user wollie333@gmail.com';
  END IF;

  RAISE NOTICE 'Found tenant ID: %', v_tenant_id;

  -- Check if room exists, if not create one
  SELECT id, name INTO v_room_id, v_room_name
  FROM rooms
  WHERE tenant_id = v_tenant_id AND is_active = true
  LIMIT 1;

  IF v_room_id IS NULL THEN
    RAISE NOTICE 'No room found, creating demo room...';

    INSERT INTO rooms (
      id, tenant_id, name, description, room_code,
      max_guests, amenities, images,
      base_price_per_night, currency, min_stay_nights,
      inventory_mode, total_units, is_active, created_at
    ) VALUES (
      gen_random_uuid(),
      v_tenant_id,
      'Deluxe Garden Suite',
      'A beautiful suite overlooking our manicured gardens. Features a king-size bed, en-suite bathroom with rain shower, private balcony, and modern amenities. Perfect for couples seeking a romantic getaway or business travelers who appreciate comfort and style.',
      'DGS-101',
      2,
      '["Free WiFi", "Air Conditioning", "King Bed", "En-suite Bathroom", "Rain Shower", "Private Balcony", "Garden View", "Mini Bar", "Coffee Machine", "Smart TV", "Work Desk", "Safe", "Hair Dryer", "Bathrobes"]'::jsonb,
      '{"featured": null, "gallery": []}'::jsonb,
      1850,
      'ZAR',
      1,
      'single_unit',
      1,
      true,
      NOW()
    ) RETURNING id INTO v_room_id;

    v_room_name := 'Deluxe Garden Suite';
    RAISE NOTICE 'Created room: % (ID: %)', v_room_name, v_room_id;
  ELSE
    RAISE NOTICE 'Using existing room: % (ID: %)', v_room_name, v_room_id;
  END IF;

  -- Delete any existing demo reviews (to allow re-running)
  DELETE FROM reviews WHERE tenant_id = v_tenant_id AND guest_name IN ('Sarah Mitchell', 'James van der Berg', 'Kevin Mokoena');
  DELETE FROM bookings WHERE tenant_id = v_tenant_id AND guest_name IN ('Sarah Mitchell', 'James van der Berg', 'Kevin Mokoena');
  RAISE NOTICE 'Cleaned up any existing demo data';

  -- ========================================
  -- BOOKING 1: Excellent 5-star review
  -- ========================================
  INSERT INTO bookings (
    id, tenant_id, room_id, room_name, guest_name, guest_email, guest_phone,
    check_in, check_out, status, payment_status, total_amount, currency,
    adults, children, created_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_room_id, v_room_name,
    'Sarah Mitchell', 'sarah.mitchell@email.com', '+27 82 555 1001',
    '2024-11-15', '2024-11-18', 'checked_out', 'paid', 5550, 'ZAR',
    2, 0, NOW() - INTERVAL '45 days'
  ) RETURNING id INTO v_booking_id_1;

  INSERT INTO reviews (
    tenant_id, booking_id, rating, title, content, guest_name, status, created_at
  ) VALUES (
    v_tenant_id, v_booking_id_1, 5,
    'Absolutely wonderful stay!',
    'We had the most amazing time here. The room was spotlessly clean, beautifully decorated, and had everything we needed. The hosts were incredibly welcoming and went above and beyond to make our anniversary special. The breakfast was delicious with fresh local ingredients. The garden view from our balcony was stunning. We will definitely be back and have already recommended this place to all our friends!',
    'Sarah Mitchell', 'published', NOW() - INTERVAL '42 days'
  );
  RAISE NOTICE 'Created 5-star review from Sarah Mitchell';

  -- ========================================
  -- BOOKING 2: Good 4-star review
  -- ========================================
  INSERT INTO bookings (
    id, tenant_id, room_id, room_name, guest_name, guest_email, guest_phone,
    check_in, check_out, status, payment_status, total_amount, currency,
    adults, children, created_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_room_id, v_room_name,
    'James van der Berg', 'james.vdb@email.com', '+27 83 555 2002',
    '2024-12-01', '2024-12-03', 'checked_out', 'paid', 3700, 'ZAR',
    2, 0, NOW() - INTERVAL '30 days'
  ) RETURNING id INTO v_booking_id_2;

  INSERT INTO reviews (
    tenant_id, booking_id, rating, title, content, guest_name, status, created_at
  ) VALUES (
    v_tenant_id, v_booking_id_2, 4,
    'Great location, minor issues',
    'Overall a very pleasant stay. The room was comfortable and clean, and the location is perfect for exploring the area. WiFi was a bit slow at times which made working remotely challenging, but the staff quickly helped resolve it. The hosts were friendly and responsive. Would recommend for leisure travelers. Good value for money considering the quality of the accommodation.',
    'James van der Berg', 'published', NOW() - INTERVAL '27 days'
  );
  RAISE NOTICE 'Created 4-star review from James van der Berg';

  -- ========================================
  -- BOOKING 3: Negative 1-star review (demo for hiding)
  -- ========================================
  INSERT INTO bookings (
    id, tenant_id, room_id, room_name, guest_name, guest_email, guest_phone,
    check_in, check_out, status, payment_status, total_amount, currency,
    adults, children, created_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_room_id, v_room_name,
    'Kevin Mokoena', 'k.mokoena@email.com', '+27 71 555 3003',
    '2024-12-10', '2024-12-12', 'checked_out', 'paid', 3700, 'ZAR',
    1, 0, NOW() - INTERVAL '20 days'
  ) RETURNING id INTO v_booking_id_3;

  INSERT INTO reviews (
    tenant_id, booking_id, rating, title, content, guest_name, status, created_at
  ) VALUES (
    v_tenant_id, v_booking_id_3, 1,
    'Terrible experience - DO NOT BOOK',
    'This was the worst stay ever. The aircon was broken and nobody fixed it despite multiple requests. The bathroom had visible mold in the corners. I asked for help multiple times but staff seemed to not care at all. Complete waste of my hard-earned money. This place is a bloody rip-off and the management is absolutely useless. I want a refund! Never coming back here again!',
    'Kevin Mokoena', 'published', NOW() - INTERVAL '18 days'
  );
  RAISE NOTICE 'Created 1-star review from Kevin Mokoena (demo for hiding)';

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'DEMO DATA CREATED SUCCESSFULLY!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Room: %', v_room_name;
  RAISE NOTICE '';
  RAISE NOTICE 'Reviews created:';
  RAISE NOTICE '  1. Sarah Mitchell    - 5 stars (excellent)';
  RAISE NOTICE '  2. James van der Berg - 4 stars (good, respond to this)';
  RAISE NOTICE '  3. Kevin Mokoena     - 1 star (harsh, demo HIDING this)';
  RAISE NOTICE '';
  RAISE NOTICE 'Average rating: 3.3 stars (includes all reviews)';
  RAISE NOTICE '===========================================';

END $$;

-- Verify the data
SELECT 'REVIEWS CREATED:' as status;
SELECT
  r.rating as stars,
  r.guest_name,
  r.title,
  r.status,
  b.room_name
FROM reviews r
JOIN bookings b ON r.booking_id = b.id
ORDER BY r.rating DESC;

SELECT 'ROOM CREATED:' as status;
SELECT id, name, base_price_per_night, currency FROM rooms WHERE is_active = true LIMIT 3;
