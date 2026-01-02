import { supabase } from '../lib/supabase.js'

export type ActivityType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_checked_in'
  | 'booking_checked_out'
  | 'cart_abandoned'
  | 'payment_failed'
  | 'booking_recovered'
  | 'payment_received'
  | 'payment_refunded'
  | 'review_submitted'
  | 'review_responded'
  | 'support_ticket_created'
  | 'support_ticket_replied'
  | 'support_ticket_resolved'
  | 'portal_signup'
  | 'portal_login'
  | 'portal_profile_updated'
  | 'message_sent'
  | 'note_added'

interface LogActivityParams {
  tenantId: string
  customerEmail: string
  customerId?: string | null
  activityType: ActivityType
  title: string
  description?: string
  bookingId?: string
  reviewId?: string
  supportTicketId?: string
  metadata?: Record<string, any>
}

/**
 * Log a customer activity event
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const { error } = await supabase
      .from('customer_activity')
      .insert({
        tenant_id: params.tenantId,
        customer_id: params.customerId || null,
        customer_email: params.customerEmail.toLowerCase(),
        activity_type: params.activityType,
        title: params.title,
        description: params.description || null,
        booking_id: params.bookingId || null,
        review_id: params.reviewId || null,
        support_ticket_id: params.supportTicketId || null,
        metadata: params.metadata || {}
      })

    if (error) {
      console.error('Failed to log activity:', error)
    }
  } catch (error) {
    console.error('Error logging activity:', error)
    // Don't throw - activity logging should not break the main flow
  }
}

/**
 * Get customer activities for a specific email
 */
export async function getCustomerActivities(
  tenantId: string,
  email: string,
  limit: number = 50
) {
  const { data, error } = await supabase
    .from('customer_activity')
    .select('*')
    .eq('tenant_id', tenantId)
    .ilike('customer_email', email)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching activities:', error)
    return []
  }

  return data || []
}

// Helper functions for common activity types

export function logBookingCreated(
  tenantId: string,
  customerEmail: string,
  customerId: string | null,
  bookingId: string,
  roomName: string,
  amount: number,
  currency: string
) {
  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType: 'booking_created',
    title: `New booking for ${roomName}`,
    description: `Booking created`,
    bookingId,
    metadata: { amount, currency, roomName }
  })
}

export function logBookingStatusChange(
  tenantId: string,
  customerEmail: string,
  customerId: string | null,
  bookingId: string,
  roomName: string,
  newStatus: string
) {
  const statusTitles: Record<string, string> = {
    confirmed: 'Booking confirmed',
    cancelled: 'Booking cancelled',
    checked_in: 'Checked in',
    checked_out: 'Checked out'
  }

  const activityTypes: Record<string, ActivityType> = {
    confirmed: 'booking_confirmed',
    cancelled: 'booking_cancelled',
    checked_in: 'booking_checked_in',
    checked_out: 'booking_checked_out'
  }

  const activityType = activityTypes[newStatus]
  if (!activityType) return Promise.resolve()

  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType,
    title: statusTitles[newStatus] || `Booking status: ${newStatus}`,
    description: roomName,
    bookingId,
    metadata: { status: newStatus, roomName }
  })
}

export function logPaymentReceived(
  tenantId: string,
  customerEmail: string,
  customerId: string | null,
  bookingId: string,
  amount: number,
  currency: string
) {
  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType: 'payment_received',
    title: `Payment received`,
    description: `${currency} ${amount.toFixed(2)}`,
    bookingId,
    metadata: { amount, currency }
  })
}

export function logReviewSubmitted(
  tenantId: string,
  customerEmail: string,
  customerId: string | null,
  reviewId: string,
  bookingId: string,
  rating: number,
  roomName: string
) {
  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType: 'review_submitted',
    title: `Submitted ${rating}-star review`,
    description: roomName,
    bookingId,
    reviewId,
    metadata: { rating, roomName }
  })
}

export function logSupportTicketCreated(
  tenantId: string,
  customerEmail: string,
  customerId: string | null,
  ticketId: string,
  subject: string
) {
  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType: 'support_ticket_created',
    title: 'Opened support ticket',
    description: subject,
    supportTicketId: ticketId,
    metadata: { subject }
  })
}

export function logSupportTicketReplied(
  tenantId: string,
  customerEmail: string,
  customerId: string | null,
  ticketId: string,
  senderType: 'customer' | 'admin'
) {
  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType: 'support_ticket_replied',
    title: senderType === 'customer' ? 'Replied to support ticket' : 'Received support reply',
    supportTicketId: ticketId,
    metadata: { senderType }
  })
}

export function logPortalSignup(
  tenantId: string,
  customerEmail: string,
  customerId: string
) {
  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType: 'portal_signup',
    title: 'Signed up for customer portal'
  })
}

export function logPortalLogin(
  tenantId: string,
  customerEmail: string,
  customerId: string
) {
  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType: 'portal_login',
    title: 'Logged into customer portal'
  })
}

export function logProfileUpdated(
  tenantId: string,
  customerEmail: string,
  customerId: string,
  fieldsUpdated: string[]
) {
  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType: 'portal_profile_updated',
    title: 'Updated profile',
    description: fieldsUpdated.join(', '),
    metadata: { fieldsUpdated }
  })
}

export function logMessageSent(
  tenantId: string,
  customerEmail: string,
  customerId: string | null,
  context: string
) {
  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType: 'message_sent',
    title: 'Sent a message',
    description: context
  })
}

export function logNoteAdded(
  tenantId: string,
  customerEmail: string,
  customerId: string | null,
  addedBy: string
) {
  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType: 'note_added',
    title: 'Internal note added',
    description: `By ${addedBy}`,
    metadata: { addedBy }
  })
}

export interface CartAbandonedData {
  bookingId: string
  bookingRef: string
  roomName: string
  propertyName: string
  checkIn: string
  checkOut: string
  totalAmount: number
  guests: number
  currency?: string
  addons?: Array<{ name: string; price: number }>
}

export function logCartAbandoned(
  tenantId: string,
  customerEmail: string,
  customerId: string | null,
  bookingData: CartAbandonedData
) {
  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType: 'cart_abandoned',
    title: 'Cart abandoned',
    description: `${bookingData.roomName} - ${bookingData.checkIn} to ${bookingData.checkOut}`,
    bookingId: bookingData.bookingId,
    metadata: {
      bookingRef: bookingData.bookingRef,
      roomName: bookingData.roomName,
      propertyName: bookingData.propertyName,
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      totalAmount: bookingData.totalAmount,
      guests: bookingData.guests,
      currency: bookingData.currency || 'ZAR',
      addons: bookingData.addons || []
    }
  })
}

export function logPaymentFailed(
  tenantId: string,
  customerEmail: string,
  customerId: string | null,
  bookingId: string,
  bookingRef: string,
  roomName: string,
  amount: number,
  failureReason?: string
) {
  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType: 'payment_failed',
    title: 'Payment failed',
    description: failureReason || 'Payment could not be processed',
    bookingId,
    metadata: { bookingRef, roomName, amount, failureReason }
  })
}

export function logBookingRecovered(
  tenantId: string,
  customerEmail: string,
  customerId: string | null,
  originalBookingRef: string,
  newBookingId: string,
  roomName: string,
  recoveredBy: string
) {
  return logActivity({
    tenantId,
    customerEmail,
    customerId,
    activityType: 'booking_recovered',
    title: 'Booking recovered',
    description: `${roomName} - Recovered from abandoned cart`,
    bookingId: newBookingId,
    metadata: { originalBookingRef, recoveredBy, roomName }
  })
}
