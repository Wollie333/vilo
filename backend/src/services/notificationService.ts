import { supabase } from '../lib/supabase.js'
import { emitDashboardNotification, emitCustomerNotification } from '../websocket/index.js'

export type NotificationType =
  // Admin/Staff notifications
  | 'booking_created'
  | 'booking_cancelled'
  | 'booking_checked_in'
  | 'booking_checked_out'
  | 'payment_received'
  | 'payment_proof_uploaded'
  | 'review_submitted'
  | 'support_ticket_created'
  | 'support_ticket_replied'
  | 'sync_completed'
  | 'sync_failed'
  | 'member_invited'
  | 'member_role_changed'
  | 'member_removed'
  // Customer notifications
  | 'booking_confirmed'
  | 'booking_reminder'
  | 'payment_confirmed'
  | 'portal_welcome'
  | 'review_requested'
  | 'review_response_added'
  | 'support_status_changed'

export type LinkType = 'booking' | 'review' | 'support' | 'customer' | 'room' | 'settings'

export type PreferenceCategory = 'bookings' | 'payments' | 'reviews' | 'support' | 'system' | 'members'

export interface NotificationPreferences {
  bookings: boolean
  payments: boolean
  reviews: boolean
  support: boolean
  system: boolean
  members: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  bookings: true,
  payments: true,
  reviews: true,
  support: true,
  system: true,
  members: true
}

// Map notification types to preference categories
const TYPE_TO_CATEGORY: Record<NotificationType, PreferenceCategory> = {
  booking_created: 'bookings',
  booking_cancelled: 'bookings',
  booking_checked_in: 'bookings',
  booking_checked_out: 'bookings',
  booking_confirmed: 'bookings',
  booking_reminder: 'bookings',
  payment_received: 'payments',
  payment_confirmed: 'payments',
  payment_proof_uploaded: 'payments',
  review_submitted: 'reviews',
  review_requested: 'reviews',
  review_response_added: 'reviews',
  support_ticket_created: 'support',
  support_ticket_replied: 'support',
  support_status_changed: 'support',
  sync_completed: 'system',
  sync_failed: 'system',
  portal_welcome: 'system',
  member_invited: 'members',
  member_role_changed: 'members',
  member_removed: 'members'
}

interface CreateNotificationParams {
  tenantId: string
  memberId?: string
  customerId?: string
  type: NotificationType
  title: string
  message?: string
  linkType?: LinkType
  linkId?: string
}

interface Notification {
  id: string
  tenant_id: string
  member_id: string | null
  customer_id: string | null
  type: string
  title: string
  message: string | null
  link_type: string | null
  link_id: string | null
  read_at: string | null
  created_at: string
}

/**
 * Create a notification for a member or customer
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  console.log('[Notification] createNotification called:', params.type, 'for', params.memberId || params.customerId)

  try {
    // Check if recipient has this notification type enabled
    const category = TYPE_TO_CATEGORY[params.type]
    const preferences = await getPreferences(
      params.tenantId,
      params.memberId,
      params.customerId
    )

    console.log('[Notification] Preferences for category', category, ':', preferences[category])

    if (!preferences[category]) {
      console.log('[Notification] Notification disabled for category:', category)
      return
    }

    console.log('[Notification] Inserting notification into database...')

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        tenant_id: params.tenantId,
        member_id: params.memberId || null,
        customer_id: params.customerId || null,
        type: params.type,
        title: params.title,
        message: params.message || null,
        link_type: params.linkType || null,
        link_id: params.linkId || null
      })
      .select()
      .single()

    if (error) {
      console.error('[Notification] Failed to insert notification:', error)
      return
    }

    console.log('[Notification] Notification created:', data.id)

    // Emit real-time notification via WebSocket
    if (data) {
      if (params.memberId) {
        console.log('[Notification] Emitting to dashboard for tenant:', params.tenantId)
        emitDashboardNotification(params.tenantId, data)
      } else if (params.customerId) {
        console.log('[Notification] Emitting to portal for customer:', params.customerId)
        emitCustomerNotification(params.customerId, data)
      }
    }
  } catch (error) {
    console.error('[Notification] Error creating notification:', error)
  }
}

/**
 * Get notifications for a member or customer
 * For members, tenantId is required. For customers, tenantId is optional (get all tenant notifications)
 */
export async function getNotifications(
  tenantId: string | null,
  memberId?: string,
  customerId?: string,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
): Promise<{ notifications: Notification[]; total: number; unread: number }> {
  const { limit = 20, offset = 0, unreadOnly = false } = options

  try {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // For members, require tenantId. For customers, tenantId is optional
    if (memberId) {
      if (!tenantId) return { notifications: [], total: 0, unread: 0 }
      query = query.eq('tenant_id', tenantId).eq('member_id', memberId)
    } else if (customerId) {
      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      query = query.eq('customer_id', customerId)
    } else {
      return { notifications: [], total: 0, unread: 0 }
    }

    if (unreadOnly) {
      query = query.is('read_at', null)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return { notifications: [], total: 0, unread: 0 }
    }

    // Get unread count
    const unreadCount = await getUnreadCount(tenantId, memberId, customerId)

    return {
      notifications: data || [],
      total: count || 0,
      unread: unreadCount
    }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return { notifications: [], total: 0, unread: 0 }
  }
}

/**
 * Get unread notification count
 * For members, tenantId is required. For customers, tenantId is optional (get all tenant notifications)
 */
export async function getUnreadCount(
  tenantId: string | null,
  memberId?: string,
  customerId?: string
): Promise<number> {
  try {
    let query = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null)

    // For members, require tenantId. For customers, tenantId is optional
    if (memberId) {
      if (!tenantId) return 0
      query = query.eq('tenant_id', tenantId).eq('member_id', memberId)
    } else if (customerId) {
      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      query = query.eq('customer_id', customerId)
    } else {
      return 0
    }

    const { count, error } = await query

    if (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }
}

/**
 * Mark a notification as read
 * For members, tenantId is required. For customers, tenantId is optional
 */
export async function markAsRead(
  notificationId: string,
  tenantId: string | null,
  memberId?: string,
  customerId?: string
): Promise<boolean> {
  try {
    let query = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)

    // For members, require tenantId. For customers, tenantId is optional
    if (memberId) {
      if (!tenantId) return false
      query = query.eq('tenant_id', tenantId).eq('member_id', memberId)
    } else if (customerId) {
      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      query = query.eq('customer_id', customerId)
    }

    const { error } = await query

    if (error) {
      console.error('Error marking notification as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

/**
 * Mark all notifications as read for a member or customer
 * For members, tenantId is required. For customers, tenantId is optional
 */
export async function markAllAsRead(
  tenantId: string | null,
  memberId?: string,
  customerId?: string
): Promise<boolean> {
  try {
    let query = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)

    // For members, require tenantId. For customers, tenantId is optional
    if (memberId) {
      if (!tenantId) return false
      query = query.eq('tenant_id', tenantId).eq('member_id', memberId)
    } else if (customerId) {
      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      query = query.eq('customer_id', customerId)
    } else {
      return false
    }

    const { error } = await query

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return false
  }
}

/**
 * Get notification preferences for a member or customer
 * For members, tenantId is required. For customers, tenantId is optional
 * Note: For customers without tenantId, returns defaults (preferences are per-tenant)
 */
export async function getPreferences(
  tenantId: string | null,
  memberId?: string,
  customerId?: string
): Promise<NotificationPreferences> {
  try {
    // For members, require tenantId. For customers without tenantId, return defaults
    if (memberId) {
      if (!tenantId) return DEFAULT_PREFERENCES
    } else if (customerId) {
      if (!tenantId) return DEFAULT_PREFERENCES
    } else {
      return DEFAULT_PREFERENCES
    }

    let query = supabase
      .from('notification_preferences')
      .select('preferences')
      .eq('tenant_id', tenantId)

    if (memberId) {
      query = query.eq('member_id', memberId)
    } else if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('Error fetching preferences:', error)
      return DEFAULT_PREFERENCES
    }

    if (!data) {
      return DEFAULT_PREFERENCES
    }

    // Merge with defaults to ensure all keys exist
    return { ...DEFAULT_PREFERENCES, ...data.preferences }
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return DEFAULT_PREFERENCES
  }
}

/**
 * Update notification preferences for a member or customer
 * For members, tenantId is required. For customers, tenantId is required to know which tenant's preferences to update
 */
export async function updatePreferences(
  tenantId: string | null,
  preferences: Partial<NotificationPreferences>,
  memberId?: string,
  customerId?: string
): Promise<boolean> {
  try {
    // tenantId is required for updating preferences (to know which tenant context)
    if (!tenantId) return false

    // Get existing preferences
    const existing = await getPreferences(tenantId, memberId, customerId)
    const merged = { ...existing, ...preferences }

    // Upsert preferences
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        tenant_id: tenantId,
        member_id: memberId || null,
        customer_id: customerId || null,
        preferences: merged,
        updated_at: new Date().toISOString()
      }, {
        onConflict: memberId ? 'member_id' : 'customer_id'
      })

    if (error) {
      console.error('Error updating preferences:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating preferences:', error)
    return false
  }
}

// Helper functions for common notification types

/**
 * Get all member IDs for a tenant (including owner if they have a member record)
 */
async function getAllTenantMemberIds(tenantId: string): Promise<string[]> {
  // Get all active members of the tenant
  const { data: members, error } = await supabase
    .from('tenant_members')
    .select('id, user_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (error) {
    console.error('[Notification] Error fetching members:', error)
  }

  const memberIds = members?.map(m => m.id) || []
  const memberUserIds = members?.map(m => m.user_id) || []

  // Also get the tenant owner (they may not be in tenant_members table)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('owner_user_id')
    .eq('id', tenantId)
    .single()

  if (tenant?.owner_user_id && !memberUserIds.includes(tenant.owner_user_id)) {
    // Owner not in active members, check if they have a member record at all
    const { data: ownerMember } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', tenant.owner_user_id)
      .single()

    if (ownerMember && !memberIds.includes(ownerMember.id)) {
      memberIds.push(ownerMember.id)
      console.log('[Notification] Added owner member to list:', ownerMember.id)
    }
  }

  return memberIds
}

/**
 * Notify all members of a tenant about a new booking (including owner)
 */
export async function notifyNewBooking(
  tenantId: string,
  bookingId: string,
  guestName: string,
  roomName: string
): Promise<void> {
  console.log('[Notification] notifyNewBooking called for tenant:', tenantId)

  const memberIds = await getAllTenantMemberIds(tenantId)
  console.log('[Notification] Found', memberIds.length, 'members to notify')

  if (memberIds.length === 0) {
    console.log('[Notification] No members found for tenant:', tenantId)
    return
  }

  // Create notification for each member
  for (const memberId of memberIds) {
    console.log('[Notification] Creating notification for member:', memberId)
    await createNotification({
      tenantId,
      memberId,
      type: 'booking_created',
      title: 'New Booking',
      message: `${guestName} booked ${roomName}`,
      linkType: 'booking',
      linkId: bookingId
    })
  }
}

/**
 * Notify all members about a cancelled booking
 */
export async function notifyBookingCancelled(
  tenantId: string,
  bookingId: string,
  guestName: string,
  roomName: string
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: `${guestName} cancelled their booking for ${roomName}`,
      linkType: 'booking',
      linkId: bookingId
    })
  }
}

/**
 * Notify all members about a check-in
 */
export async function notifyCheckIn(
  tenantId: string,
  bookingId: string,
  guestName: string,
  roomName: string
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'booking_checked_in',
      title: 'Guest Checked In',
      message: `${guestName} checked in to ${roomName}`,
      linkType: 'booking',
      linkId: bookingId
    })
  }
}

/**
 * Notify all members about a check-out
 */
export async function notifyCheckOut(
  tenantId: string,
  bookingId: string,
  guestName: string,
  roomName: string
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'booking_checked_out',
      title: 'Guest Checked Out',
      message: `${guestName} checked out from ${roomName}`,
      linkType: 'booking',
      linkId: bookingId
    })
  }
}

/**
 * Notify all members about a payment
 */
export async function notifyPaymentReceived(
  tenantId: string,
  bookingId: string,
  guestName: string,
  amount: number,
  currency: string
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `${guestName} paid ${currency} ${amount.toFixed(2)}`,
      linkType: 'booking',
      linkId: bookingId
    })
  }
}

/**
 * Notify all members about a new review
 */
export async function notifyNewReview(
  tenantId: string,
  bookingId: string,
  guestName: string,
  roomName: string,
  rating: number
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'review_submitted',
      title: `New ${rating}-Star Review`,
      message: `${guestName} reviewed ${roomName}`,
      linkType: 'booking',
      linkId: bookingId
    })
  }
}

/**
 * Notify all members about a new support ticket
 */
export async function notifyNewSupportTicket(
  tenantId: string,
  ticketId: string,
  customerName: string,
  subject: string
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'support_ticket_created',
      title: 'New Support Ticket',
      message: `${customerName}: ${subject}`,
      linkType: 'support',
      linkId: ticketId
    })
  }
}

/**
 * Notify all members about a customer reply to support ticket
 */
export async function notifyCustomerReplied(
  tenantId: string,
  ticketId: string,
  customerName: string
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'support_ticket_replied',
      title: 'Customer Replied',
      message: `${customerName} replied to support ticket`,
      linkType: 'support',
      linkId: ticketId
    })
  }
}

/**
 * Notify customer that their booking is confirmed
 */
export async function notifyCustomerBookingConfirmed(
  tenantId: string,
  customerId: string,
  bookingId: string,
  roomName: string,
  checkInDate: string
): Promise<void> {
  await createNotification({
    tenantId,
    customerId,
    type: 'booking_confirmed',
    title: 'Booking Confirmed',
    message: `Your booking for ${roomName} on ${checkInDate} is confirmed`,
    linkType: 'booking',
    linkId: bookingId
  })
}

/**
 * Notify customer that their booking is cancelled
 */
export async function notifyCustomerBookingCancelled(
  tenantId: string,
  customerId: string,
  bookingId: string,
  roomName: string
): Promise<void> {
  await createNotification({
    tenantId,
    customerId,
    type: 'booking_cancelled',
    title: 'Booking Cancelled',
    message: `Your booking for ${roomName} has been cancelled`,
    linkType: 'booking',
    linkId: bookingId
  })
}

/**
 * Notify customer about staff reply to their support ticket
 */
export async function notifyCustomerSupportReply(
  tenantId: string,
  customerId: string,
  ticketId: string
): Promise<void> {
  await createNotification({
    tenantId,
    customerId,
    type: 'support_ticket_replied',
    title: 'Support Response',
    message: 'You have a new reply on your support ticket',
    linkType: 'support',
    linkId: ticketId
  })
}

/**
 * Send welcome notification to new portal customer
 */
export async function notifyPortalWelcome(
  tenantId: string,
  customerId: string,
  businessName: string
): Promise<void> {
  await createNotification({
    tenantId,
    customerId,
    type: 'portal_welcome',
    title: 'Welcome!',
    message: `Welcome to ${businessName}. You can now manage your bookings here.`
  })
}

/**
 * Notify all members when customer uploads payment proof
 */
export async function notifyPaymentProofUploaded(
  tenantId: string,
  bookingId: string,
  guestName: string,
  amount: number,
  currency: string
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'payment_proof_uploaded',
      title: 'Payment Proof Uploaded',
      message: `${guestName} uploaded proof of payment (${currency} ${amount.toFixed(2)})`,
      linkType: 'booking',
      linkId: bookingId
    })
  }
}

/**
 * Notify customer when staff responds to their review
 */
export async function notifyCustomerReviewResponse(
  tenantId: string,
  customerId: string,
  roomName: string
): Promise<void> {
  await createNotification({
    tenantId,
    customerId,
    type: 'review_response_added',
    title: 'Response to Your Review',
    message: `The property responded to your review for ${roomName}`,
    linkType: 'review'
  })
}

/**
 * Notify customer when a review is requested
 */
export async function notifyCustomerReviewRequested(
  tenantId: string,
  customerId: string,
  bookingId: string,
  roomName: string
): Promise<void> {
  await createNotification({
    tenantId,
    customerId,
    type: 'review_requested',
    title: 'Share Your Experience',
    message: `How was your stay at ${roomName}? We'd love to hear your feedback!`,
    linkType: 'booking',
    linkId: bookingId
  })
}

/**
 * Notify customer when support ticket status changes
 */
export async function notifyCustomerSupportStatusChanged(
  tenantId: string,
  customerId: string,
  ticketId: string,
  newStatus: string
): Promise<void> {
  const statusLabels: Record<string, string> = {
    open: 'reopened',
    in_progress: 'being reviewed',
    resolved: 'resolved',
    closed: 'closed'
  }
  const statusLabel = statusLabels[newStatus] || newStatus

  await createNotification({
    tenantId,
    customerId,
    type: 'support_status_changed',
    title: 'Ticket Status Updated',
    message: `Your support ticket has been ${statusLabel}`,
    linkType: 'support',
    linkId: ticketId
  })
}

/**
 * Notify new member they've been invited
 */
export async function notifyMemberInvited(
  tenantId: string,
  memberId: string,
  businessName: string
): Promise<void> {
  await createNotification({
    tenantId,
    memberId,
    type: 'member_invited',
    title: 'Team Invitation',
    message: `You've been invited to join ${businessName}`
  })
}

/**
 * Notify member their role has changed
 */
export async function notifyMemberRoleChanged(
  tenantId: string,
  memberId: string,
  newRoleName: string
): Promise<void> {
  await createNotification({
    tenantId,
    memberId,
    type: 'member_role_changed',
    title: 'Role Updated',
    message: `Your role has been changed to ${newRoleName}`
  })
}

/**
 * Notify member they've been removed from the team
 */
export async function notifyMemberRemoved(
  tenantId: string,
  memberId: string
): Promise<void> {
  await createNotification({
    tenantId,
    memberId,
    type: 'member_removed',
    title: 'Team Access Removed',
    message: 'You have been removed from the team'
  })
}
