import { Calendar, CreditCard, Star, MessageSquare, Settings, Users, LucideIcon } from 'lucide-react'

export interface NotificationTypeConfig {
  type: string
  label: string
  description: string
  recipient: 'all_staff' | 'you' | 'customer'
}

export interface NotificationCategory {
  key: string
  label: string
  description: string
  icon: LucideIcon
  types: NotificationTypeConfig[]
}

// Staff/Dashboard notification categories
export const STAFF_NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    key: 'bookings',
    label: 'Bookings',
    description: 'Booking lifecycle events',
    icon: Calendar,
    types: [
      {
        type: 'booking_created',
        label: 'New Booking',
        description: 'When a new booking is made',
        recipient: 'all_staff'
      },
      {
        type: 'booking_cancelled',
        label: 'Booking Cancelled',
        description: 'When a booking is cancelled',
        recipient: 'all_staff'
      },
      {
        type: 'booking_modified',
        label: 'Booking Modified',
        description: 'When booking dates or details are changed',
        recipient: 'all_staff'
      },
      {
        type: 'booking_checked_in',
        label: 'Guest Check-in',
        description: 'When a guest checks in',
        recipient: 'all_staff'
      },
      {
        type: 'booking_checked_out',
        label: 'Guest Check-out',
        description: 'When a guest checks out',
        recipient: 'all_staff'
      },
      {
        type: 'room_blocked',
        label: 'Room Blocked',
        description: 'When a room is manually blocked',
        recipient: 'all_staff'
      },
      {
        type: 'low_availability',
        label: 'Low Availability',
        description: 'When room availability is running low',
        recipient: 'all_staff'
      }
    ]
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Payment events',
    icon: CreditCard,
    types: [
      {
        type: 'payment_received',
        label: 'Payment Received',
        description: 'When a payment is recorded',
        recipient: 'all_staff'
      },
      {
        type: 'payment_proof_uploaded',
        label: 'Payment Proof',
        description: 'When customer uploads proof of payment',
        recipient: 'all_staff'
      }
    ]
  },
  {
    key: 'reviews',
    label: 'Reviews',
    description: 'Guest review events',
    icon: Star,
    types: [
      {
        type: 'review_submitted',
        label: 'New Review',
        description: 'When a guest submits a review',
        recipient: 'all_staff'
      }
    ]
  },
  {
    key: 'support',
    label: 'Support',
    description: 'Support ticket events',
    icon: MessageSquare,
    types: [
      {
        type: 'support_ticket_created',
        label: 'New Ticket',
        description: 'When customer creates a support ticket',
        recipient: 'all_staff'
      },
      {
        type: 'support_ticket_replied',
        label: 'Customer Reply',
        description: 'When customer replies to a ticket',
        recipient: 'all_staff'
      }
    ]
  },
  {
    key: 'system',
    label: 'System',
    description: 'System and sync events',
    icon: Settings,
    types: [
      {
        type: 'sync_completed',
        label: 'Sync Complete',
        description: 'When calendar sync completes successfully',
        recipient: 'all_staff'
      },
      {
        type: 'sync_failed',
        label: 'Sync Failed',
        description: 'When calendar sync fails',
        recipient: 'all_staff'
      }
    ]
  },
  {
    key: 'members',
    label: 'Team',
    description: 'Team membership events',
    icon: Users,
    types: [
      {
        type: 'member_invited',
        label: 'Team Invitation',
        description: "When you're invited to join a team",
        recipient: 'you'
      },
      {
        type: 'member_role_changed',
        label: 'Role Changed',
        description: 'When your team role is updated',
        recipient: 'you'
      },
      {
        type: 'member_removed',
        label: 'Access Removed',
        description: "When you're removed from a team",
        recipient: 'you'
      }
    ]
  }
]

// Customer/Portal notification categories
export const CUSTOMER_NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    key: 'bookings',
    label: 'Bookings',
    description: 'Your booking updates',
    icon: Calendar,
    types: [
      {
        type: 'booking_confirmed',
        label: 'Booking Confirmed',
        description: 'When your booking is confirmed',
        recipient: 'customer'
      },
      {
        type: 'booking_modified_customer',
        label: 'Booking Updated',
        description: 'When your booking details are changed',
        recipient: 'customer'
      },
      {
        type: 'booking_reminder',
        label: 'Upcoming Stay',
        description: 'Reminder 1 day before check-in',
        recipient: 'customer'
      },
      {
        type: 'check_in_reminder',
        label: 'Check-in Today',
        description: 'Reminder on the day of check-in',
        recipient: 'customer'
      }
    ]
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Your payment updates',
    icon: CreditCard,
    types: [
      {
        type: 'payment_confirmed',
        label: 'Payment Confirmed',
        description: 'When your payment is confirmed',
        recipient: 'customer'
      },
      {
        type: 'payment_overdue',
        label: 'Payment Due',
        description: 'Reminder when payment is overdue',
        recipient: 'customer'
      }
    ]
  },
  {
    key: 'reviews',
    label: 'Reviews',
    description: 'Review requests and responses',
    icon: Star,
    types: [
      {
        type: 'review_requested',
        label: 'Leave a Review',
        description: 'Request to review your stay',
        recipient: 'customer'
      },
      {
        type: 'review_response_added',
        label: 'Owner Response',
        description: 'When the property responds to your review',
        recipient: 'customer'
      }
    ]
  },
  {
    key: 'support',
    label: 'Support',
    description: 'Support ticket updates',
    icon: MessageSquare,
    types: [
      {
        type: 'support_ticket_replied',
        label: 'Staff Response',
        description: 'When staff replies to your ticket',
        recipient: 'customer'
      },
      {
        type: 'support_status_changed',
        label: 'Ticket Updated',
        description: 'When your ticket status changes',
        recipient: 'customer'
      }
    ]
  },
  {
    key: 'system',
    label: 'System',
    description: 'Account notifications',
    icon: Settings,
    types: [
      {
        type: 'portal_welcome',
        label: 'Welcome Message',
        description: 'Welcome notification when you join',
        recipient: 'customer'
      }
    ]
  }
]

// Helper to get all notification types for a set of categories
export function getAllNotificationTypes(categories: NotificationCategory[]): string[] {
  return categories.flatMap(cat => cat.types.map(t => t.type))
}

// Helper to get recipient display text
export function getRecipientLabel(recipient: NotificationTypeConfig['recipient']): string {
  switch (recipient) {
    case 'all_staff':
      return 'All team members'
    case 'you':
      return 'You only'
    case 'customer':
      return 'You'
    default:
      return recipient
  }
}
