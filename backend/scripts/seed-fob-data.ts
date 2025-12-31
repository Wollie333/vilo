import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env from backend directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedFOBData() {
  // Get the first tenant
  const { data: tenants } = await supabase.from('tenants').select('id, name').limit(1)
  if (!tenants || tenants.length === 0) {
    console.error('No tenants found!')
    return
  }
  const tenantId = tenants[0].id
  console.log(`Using tenant: ${tenants[0].name} (${tenantId})`)

  // Get rooms for this tenant
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .limit(3)

  if (!rooms || rooms.length === 0) {
    console.error('No rooms found!')
    return
  }
  console.log(`Found ${rooms.length} rooms`)

  // Create 5 bookings from different sources
  const bookingSources = [
    { source: 'airbnb', external_id: 'ABNB-2024-78934', external_url: 'https://airbnb.com/reservations/78934' },
    { source: 'booking_com', external_id: 'BDC-9912345', external_url: 'https://admin.booking.com/reservations/9912345' },
    { source: 'lekkerslaap', external_id: 'LS-45678', external_url: 'https://lekkeslaap.co.za/bookings/45678' },
    { source: 'expedia', external_id: 'EXP-2024-11223', external_url: 'https://expedia.com/partner/booking/11223' },
    { source: 'manual', external_id: null, external_url: null },
  ]

  const guestNames = [
    'Sarah Johnson',
    'Michael Chen',
    'Emma van der Berg',
    'James Smith',
    'Lisa Nkosi'
  ]

  const today = new Date()
  const bookings = []

  for (let i = 0; i < 5; i++) {
    const checkIn = new Date(today)
    checkIn.setDate(today.getDate() + (i * 7) + 3) // Stagger check-ins
    const checkOut = new Date(checkIn)
    checkOut.setDate(checkIn.getDate() + 2 + (i % 3)) // 2-4 night stays

    const room = rooms[i % rooms.length]
    const sourceInfo = bookingSources[i]
    const guestName = guestNames[i]
    const emailName = guestName.toLowerCase().replace(' ', '.')

    bookings.push({
      tenant_id: tenantId,
      room_id: room.id,
      room_name: room.name,
      guest_name: guestName,
      guest_email: `${emailName}@example.com`,
      guest_phone: `+27${Math.floor(Math.random() * 900000000 + 100000000)}`,
      check_in: checkIn.toISOString().split('T')[0],
      check_out: checkOut.toISOString().split('T')[0],
      total_amount: 1500 + (i * 500),
      currency: 'ZAR',
      status: i < 3 ? 'confirmed' : 'pending',
      payment_status: i < 2 ? 'paid' : 'pending',
      source: sourceInfo.source,
      external_id: sourceInfo.external_id,
      external_url: sourceInfo.external_url,
      synced_at: sourceInfo.source !== 'manual' ? new Date().toISOString() : null
    })
  }

  const { data: insertedBookings, error: bookingError } = await supabase
    .from('bookings')
    .insert(bookings)
    .select()

  if (bookingError) {
    console.error('Error inserting bookings:', bookingError)
    return
  }
  console.log(`Created ${insertedBookings.length} bookings from different sources`)

  // Create 5 reviews from different sources
  const reviewSources = [
    { source: 'airbnb', external_id: 'ABNB-REV-12345', external_url: 'https://airbnb.com/reviews/12345' },
    { source: 'booking_com', external_id: 'BDC-REV-67890', external_url: 'https://booking.com/reviews/67890' },
    { source: 'google', external_id: 'GOOG-REV-11111', external_url: 'https://g.page/review/11111' },
    { source: 'lekkerslaap', external_id: 'LS-REV-22222', external_url: 'https://lekkeslaap.co.za/reviews/22222' },
    { source: 'vilo', external_id: null, external_url: null },
  ]

  const reviewerNames = [
    'David Williams',
    'Anna Müller',
    'Thabo Molefe',
    'Sophie Laurent',
    'Robert van Wyk'
  ]

  const reviewTitles = [
    'Amazing stay, will definitely return!',
    'Perfect getaway spot',
    'Excellent hospitality',
    'Beautiful location and great service',
    'Wonderful experience'
  ]

  const reviewContents = [
    'The accommodation exceeded our expectations. Clean, comfortable, and the host was incredibly helpful. Highly recommended!',
    'We had a fantastic time. The views are stunning and the amenities were top-notch. Already planning our next visit.',
    'From check-in to check-out, everything was perfect. The attention to detail really shows.',
    'A hidden gem! The property is even better than the photos. Great value for money.',
    'Our family loved every minute of our stay. The kids had a blast and we felt right at home.'
  ]

  const reviews = []
  for (let i = 0; i < 5; i++) {
    const sourceInfo = reviewSources[i]
    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - (i * 5)) // Stagger review dates

    reviews.push({
      tenant_id: tenantId,
      booking_id: sourceInfo.source === 'vilo' && insertedBookings[0] ? insertedBookings[0].id : null,
      guest_name: reviewerNames[i],
      rating: 5 - (i % 2), // 5, 4, 5, 4, 5
      title: reviewTitles[i],
      content: reviewContents[i],
      status: 'published',
      source: sourceInfo.source,
      external_id: sourceInfo.external_id,
      external_url: sourceInfo.external_url,
      synced_at: sourceInfo.source !== 'vilo' ? new Date().toISOString() : null,
      created_at: createdAt.toISOString()
    })
  }

  const { data: insertedReviews, error: reviewError } = await supabase
    .from('reviews')
    .insert(reviews)
    .select()

  if (reviewError) {
    console.error('Error inserting reviews:', reviewError)
    return
  }
  console.log(`Created ${insertedReviews.length} reviews from different sources`)

  console.log('\n=== Summary ===')
  console.log('Bookings:')
  insertedBookings.forEach(b => {
    console.log(`  - ${b.guest_name}: ${b.source} ${b.external_id ? `(${b.external_id})` : ''}`)
  })
  console.log('\nReviews:')
  insertedReviews.forEach(r => {
    console.log(`  - ${r.guest_name}: ${r.source} - ${r.rating} stars ${r.external_id ? `(${r.external_id})` : ''}`)
  })
}

seedFOBData().catch(console.error)
