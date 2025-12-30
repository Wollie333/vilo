// Default section configurations for each page type
// These are used when a page doesn't have custom sections configured

export interface SectionConfig {
  id: string
  type: SectionType
  enabled: boolean
  order: number
  config: Record<string, any>
  styles?: Record<string, any>
}

export type SectionType =
  | 'hero'
  | 'features'
  | 'room_grid'
  | 'room_carousel'
  | 'testimonials'
  | 'cta'
  | 'faq'
  | 'contact_form'
  | 'map'
  | 'gallery'
  | 'text_block'
  | 'stats'
  | 'review_grid'
  | 'booking_widget'
  | 'spacer'
  | 'divider'

export const DEFAULT_SECTIONS: Record<string, SectionConfig[]> = {
  home: [
    {
      id: 'hero-1',
      type: 'hero',
      enabled: true,
      order: 1,
      config: {
        title: 'Welcome to Paradise',
        subtitle: 'Experience comfort and luxury at its finest',
        backgroundImage: null,
        backgroundOverlay: 0.4,
        ctaText: 'Book Your Stay',
        ctaLink: '/book',
        secondaryCtaText: 'View Rooms',
        secondaryCtaLink: '/accommodation',
        height: 'full',
        alignment: 'center',
      },
    },
    {
      id: 'features-1',
      type: 'features',
      enabled: true,
      order: 2,
      config: {
        title: 'Why Choose Us',
        subtitle: 'Experience the best hospitality',
        columns: 4,
        items: [
          { icon: 'wifi', title: 'Free WiFi', description: 'High-speed internet throughout' },
          { icon: 'car', title: 'Free Parking', description: 'Secure on-site parking' },
          { icon: 'coffee', title: 'Breakfast', description: 'Complimentary breakfast daily' },
          { icon: 'map-pin', title: 'Prime Location', description: 'Close to attractions' },
        ],
      },
    },
    {
      id: 'rooms-1',
      type: 'room_grid',
      enabled: true,
      order: 3,
      config: {
        title: 'Our Accommodations',
        subtitle: 'Find your perfect room',
        limit: 4,
        showPrices: true,
        showRatings: true,
        ctaText: 'View All Rooms',
        ctaLink: '/accommodation',
      },
    },
    {
      id: 'testimonials-1',
      type: 'testimonials',
      enabled: true,
      order: 4,
      config: {
        title: 'What Our Guests Say',
        subtitle: 'Real reviews from real guests',
        limit: 3,
        showRating: true,
        layout: 'cards',
      },
    },
    {
      id: 'cta-1',
      type: 'cta',
      enabled: true,
      order: 5,
      config: {
        title: 'Ready to Experience Paradise?',
        subtitle: 'Book your stay today and enjoy exclusive rates',
        buttonText: 'Book Now',
        buttonLink: '/book',
        style: 'dark',
      },
    },
  ],

  accommodation: [
    {
      id: 'hero-1',
      type: 'hero',
      enabled: true,
      order: 1,
      config: {
        title: 'Our Rooms & Suites',
        subtitle: 'Find your perfect accommodation',
        height: 'medium',
        alignment: 'center',
      },
    },
    {
      id: 'rooms-1',
      type: 'room_grid',
      enabled: true,
      order: 2,
      config: {
        showAll: true,
        layout: 'grid',
        showPrices: true,
        showAmenities: true,
        showCapacity: true,
        columns: 3,
      },
    },
    {
      id: 'cta-1',
      type: 'cta',
      enabled: true,
      order: 3,
      config: {
        title: 'Need Help Choosing?',
        subtitle: 'Contact us and we\'ll help you find the perfect room',
        buttonText: 'Contact Us',
        buttonLink: '/contact',
        style: 'light',
      },
    },
  ],

  reviews: [
    {
      id: 'hero-1',
      type: 'hero',
      enabled: true,
      order: 1,
      config: {
        title: 'Guest Reviews',
        subtitle: 'See what our guests have to say',
        height: 'small',
        alignment: 'center',
      },
    },
    {
      id: 'stats-1',
      type: 'stats',
      enabled: true,
      order: 2,
      config: {
        items: [
          { label: 'Happy Guests', value: '1000+', icon: 'users' },
          { label: 'Average Rating', value: '4.8', icon: 'star' },
          { label: '5-Star Reviews', value: '500+', icon: 'award' },
        ],
      },
    },
    {
      id: 'reviews-1',
      type: 'review_grid',
      enabled: true,
      order: 3,
      config: {
        showAll: true,
        layout: 'masonry',
        showRating: true,
        showDate: true,
      },
    },
    {
      id: 'cta-1',
      type: 'cta',
      enabled: true,
      order: 4,
      config: {
        title: 'Stayed With Us?',
        subtitle: 'We\'d love to hear about your experience',
        buttonText: 'Leave a Review',
        buttonLink: '/leave-review',
        style: 'light',
      },
    },
  ],

  blog: [
    {
      id: 'hero-1',
      type: 'hero',
      enabled: true,
      order: 1,
      config: {
        title: 'Our Blog',
        subtitle: 'Stories, tips, and local guides',
        height: 'small',
        alignment: 'center',
      },
    },
    {
      id: 'text-1',
      type: 'text_block',
      enabled: true,
      order: 2,
      config: {
        content: 'Discover travel tips, local attractions, and stories from our guests.',
        alignment: 'center',
      },
    },
  ],

  contact: [
    {
      id: 'hero-1',
      type: 'hero',
      enabled: true,
      order: 1,
      config: {
        title: 'Contact Us',
        subtitle: 'We\'d love to hear from you',
        height: 'small',
        alignment: 'center',
      },
    },
    {
      id: 'contact-1',
      type: 'contact_form',
      enabled: true,
      order: 2,
      config: {
        showPhone: true,
        showEmail: true,
        showAddress: true,
        showHours: true,
        formFields: ['name', 'email', 'phone', 'subject', 'message'],
      },
    },
    {
      id: 'map-1',
      type: 'map',
      enabled: true,
      order: 3,
      config: {
        height: 400,
        zoom: 15,
        showMarker: true,
      },
    },
    {
      id: 'faq-1',
      type: 'faq',
      enabled: true,
      order: 4,
      config: {
        title: 'Frequently Asked Questions',
        items: [
          { question: 'What are your check-in/check-out times?', answer: 'Check-in is at 2:00 PM and check-out is at 11:00 AM.' },
          { question: 'Do you offer airport transfers?', answer: 'Yes, we offer airport pickup and drop-off services for an additional fee.' },
          { question: 'Is breakfast included?', answer: 'Breakfast options vary by room type. Please check individual room details.' },
          { question: 'Do you have parking?', answer: 'Yes, we offer free on-site parking for all guests.' },
        ],
      },
    },
  ],

  book: [
    {
      id: 'booking-1',
      type: 'booking_widget',
      enabled: true,
      order: 1,
      config: {
        fullScreen: true,
        showRoomSelection: true,
        showCalendar: true,
        showGuestInfo: true,
        showPayment: true,
      },
    },
  ],

  room_detail: [
    {
      id: 'hero-1',
      type: 'hero',
      enabled: true,
      order: 1,
      config: {
        useRoomImage: true,
        height: 'medium',
        showPrice: true,
        showBookButton: true,
      },
    },
    {
      id: 'gallery-1',
      type: 'gallery',
      enabled: true,
      order: 2,
      config: {
        useRoomImages: true,
        layout: 'grid',
        lightbox: true,
      },
    },
    {
      id: 'features-1',
      type: 'features',
      enabled: true,
      order: 3,
      config: {
        title: 'Room Amenities',
        useRoomAmenities: true,
        columns: 4,
      },
    },
    {
      id: 'cta-1',
      type: 'cta',
      enabled: true,
      order: 4,
      config: {
        title: 'Book This Room',
        buttonText: 'Check Availability',
        buttonLink: '/book',
        style: 'dark',
      },
    },
  ],
}

// CMS sections have type as string, we cast to SectionConfig for rendering
interface CMSSectionConfig {
  id: string
  type: string
  enabled: boolean
  order: number
  config: Record<string, unknown>
  styles?: Record<string, unknown>
}

// Get sections for a page type, with fallback to defaults
export function getSectionsForPage(
  pageType: string,
  customSections?: SectionConfig[] | CMSSectionConfig[] | null
): SectionConfig[] {
  // If custom sections exist and have content, use them (cast string type to SectionType)
  if (customSections && customSections.length > 0) {
    return (customSections as SectionConfig[]).filter(s => s.enabled).sort((a, b) => a.order - b.order)
  }

  // Otherwise return defaults
  const defaults = DEFAULT_SECTIONS[pageType] || []
  return defaults.filter(s => s.enabled).sort((a, b) => a.order - b.order)
}
