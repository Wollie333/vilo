import { supabase } from '../lib/supabase.js'
import { emitDashboardNotification, emitCustomerNotification } from '../websocket/index.js'

export type NotificationType =
  // Admin/Staff notifications
  | 'booking_created'
  | 'booking_cancelled'
  | 'booking_modified'
  | 'booking_checked_in'
  | 'booking_checked_out'
  | 'payment_received'
  | 'payment_proof_uploaded'
  | 'payment_failed'
  | 'cart_abandoned'
  | 'review_submitted'
  | 'support_ticket_created'
  | 'support_ticket_replied'
  | 'sync_completed'
  | 'sync_failed'
  | 'room_blocked'
  | 'low_availability'
  | 'member_invited'
  | 'member_role_changed'
  | 'member_removed'
  // Customer notifications
  | 'booking_confirmed'
  | 'booking_modified_customer'
  | 'booking_reminder'
  | 'check_in_reminder'
  | 'payment_confirmed'
  | 'payment_overdue'
  | 'payment_failed_customer'
  | 'cart_abandoned_customer'
  | 'portal_welcome'
  | 'review_requested'
  | 'review_response_added'
  | 'support_status_changed'
  // Refund notifications
  | 'refund_requested'
  | 'refund_approved'
  | 'refund_rejected'
  | 'refund_completed'
  | 'refund_escalation'

export type LinkType = 'booking' | 'review' | 'support' | 'customer' | 'room' | 'settings' | 'refund'

export type PreferenceCategory = 'bookings' | 'payments' | 'reviews' | 'support' | 'system' | 'members' | 'refunds'

// Individual notification type preferences
export interface NotificationPreferences {
  // Bookings - Staff
  booking_created: boolean
  booking_cancelled: boolean
  booking_modified: boolean
  booking_checked_in: boolean
  booking_checked_out: boolean
  room_blocked: boolean
  low_availability: boolean
  // Bookings - Customer
  booking_confirmed: boolean
  booking_modified_customer: boolean
  booking_reminder: boolean
  check_in_reminder: boolean
  // Payments
  payment_received: boolean
  payment_proof_uploaded: boolean
  payment_confirmed: boolean
  payment_overdue: boolean
  payment_failed: boolean
  payment_failed_customer: boolean
  cart_abandoned: boolean
  cart_abandoned_customer: boolean
  // Reviews
  review_submitted: boolean
  review_requested: boolean
  review_response_added: boolean
  // Support
  support_ticket_created: boolean
  support_ticket_replied: boolean
  support_status_changed: boolean
  // System
  sync_completed: boolean
  sync_failed: boolean
  portal_welcome: boolean
  // Members
  member_invited: boolean
  member_role_changed: boolean
  member_removed: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  // Bookings - Staff
  booking_created: true,
  booking_cancelled: true,
  booking_modified: true,
  booking_checked_in: true,
  booking_checked_out: true,
  room_blocked: true,
  low_availability: true,
  // Bookings - Customer
  booking_confirmed: true,
  booking_modified_customer: true,
  booking_reminder: true,
  check_in_reminder: true,
  // Payments
  payment_received: true,
  payment_proof_uploaded: true,
  payment_confirmed: true,
  payment_overdue: true,
  payment_failed: true,
  payment_failed_customer: true,
  cart_abandoned: true,
  cart_abandoned_customer: true,
  // Reviews
  review_submitted: true,
  review_requested: true,
  review_response_added: true,
  // Support
  support_ticket_created: true,
  support_ticket_replied: true,
  support_status_changed: true,
  // System
  sync_completed: true,
  sync_failed: true,
  portal_welcome: true,
  // Members
  member_invited: true,
  member_role_changed: true,
  member_removed: true
}

// Map notification types to preference categories
const TYPE_TO_CATEGORY: Record<NotificationType, PreferenceCategory> = {
  booking_created: 'bookings',
  booking_cancelled: 'bookings',
  booking_modified: 'bookings',
  booking_modified_customer: 'bookings',
  booking_checked_in: 'bookings',
  booking_checked_out: 'bookings',
  booking_confirmed: 'bookings',
  booking_reminder: 'bookings',
  check_in_reminder: 'bookings',
  room_blocked: 'bookings',
  low_availability: 'bookings',
  payment_received: 'payments',
  payment_confirmed: 'payments',
  payment_proof_uploaded: 'payments',
  payment_overdue: 'payments',
  payment_failed: 'payments',
  payment_failed_customer: 'payments',
  cart_abandoned: 'bookings',
  cart_abandoned_customer: 'bookings',
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
  member_removed: 'members',
  refund_requested: 'refunds',
  refund_approved: 'refunds',
  refund_rejected: 'refunds',
  refund_completed: 'refunds',
  refund_escalation: 'refunds'
}

// Dynamic data types for each notification category
export interface BookingNotificationData {
  booking_id?: string
  booking_ref?: string
  guest_name?: string
  guest_email?: string
  room_name?: string
  room_id?: string
  check_in?: string
  check_out?: string
  nights?: number
  guests?: number
  total_amount?: number
  currency?: string
  status?: string
  payment_status?: string
  support_ticket_id?: string
}

export interface PaymentNotificationData {
  booking_id?: string
  booking_ref?: string
  guest_name?: string
  amount?: number
  currency?: string
  payment_method?: string
  payment_date?: string
}

export interface ReviewNotificationData {
  review_id?: string
  booking_id?: string
  guest_name?: string
  room_name?: string
  rating?: number
  comment?: string
}

export interface SupportNotificationData {
  ticket_id?: string
  ticket_ref?: string
  customer_name?: string
  subject?: string
  status?: string
  priority?: string
}

export interface SyncNotificationData {
  room_name?: string
  room_id?: string
  source?: string
  bookings_imported?: number
  bookings_updated?: number
  error?: string
}

export interface MemberNotificationData {
  business_name?: string
  role_name?: string
  invited_by?: string
}

export interface RoomNotificationData {
  room_id?: string
  room_name?: string
  start_date?: string
  end_date?: string
  reason?: string
  available_days?: number
  period_days?: number
}

export type NotificationData =
  | BookingNotificationData
  | PaymentNotificationData
  | ReviewNotificationData
  | SupportNotificationData
  | SyncNotificationData
  | MemberNotificationData
  | RoomNotificationData
  | Record<string, unknown>

interface CreateNotificationParams {
  tenantId: string
  memberId?: string
  customerId?: string
  type: NotificationType
  title: string
  message?: string
  linkType?: LinkType
  linkId?: string
  data?: NotificationData
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
  data: NotificationData | null
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
    const preferences = await getPreferences(
      params.tenantId,
      params.memberId,
      params.customerId
    )

    // Check individual notification type preference
    const typeKey = params.type as keyof NotificationPreferences
    const isEnabled = preferences[typeKey] ?? true // Default to true if not specified

    console.log('[Notification] Preference for', params.type, ':', isEnabled)

    if (!isEnabled) {
      console.log('[Notification] Notification disabled for type:', params.type)
      return
    }

    console.log('[Notification] Inserting notification into database...')

    const { data: insertedData, error } = await supabase
      .from('notifications')
      .insert({
        tenant_id: params.tenantId,
        member_id: params.memberId || null,
        customer_id: params.customerId || null,
        type: params.type,
        title: params.title,
        message: params.message || null,
        link_type: params.linkType || null,
        link_id: params.linkId || null,
        data: params.data || {}
      })
      .select()
      .single()

    if (error) {
      console.error('[Notification] Failed to insert notification:', error)
      return
    }

    console.log('[Notification] Notification created:', insertedData.id)

    // Emit real-time notification via WebSocket
    if (insertedData) {
      if (params.memberId) {
        console.log('[Notification] Emitting to dashboard for tenant:', params.tenantId)
        emitDashboardNotification(params.tenantId, insertedData)
      } else if (params.customerId) {
        console.log('[Notification] Emitting to portal for customer:', params.customerId)
        emitCustomerNotification(params.customerId, insertedData)
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

    // Handle backward compatibility: expand legacy category preferences to individual types
    const storedPrefs = data.preferences as any
    const expandedPrefs = { ...DEFAULT_PREFERENCES }

    // Check if this is a legacy format (has category keys like 'bookings', 'payments', etc.)
    const legacyCategories = ['bookings', 'payments', 'reviews', 'support', 'system', 'members'] as const
    const isLegacyFormat = legacyCategories.some(cat => cat in storedPrefs && !(storedPrefs.booking_created !== undefined))

    if (isLegacyFormat) {
      // Expand category preferences to individual types
      for (const [type, category] of Object.entries(TYPE_TO_CATEGORY)) {
        const catKey = category as keyof typeof storedPrefs
        if (catKey in storedPrefs) {
          (expandedPrefs as any)[type] = storedPrefs[catKey]
        }
      }
    } else {
      // New format: merge individual type preferences
      Object.assign(expandedPrefs, storedPrefs)
    }

    return expandedPrefs
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
  bookingData: {
    id: string
    ref?: string
    guest_name: string
    guest_email?: string
    room_name: string
    room_id?: string
    check_in: string
    check_out: string
    nights?: number
    guests?: number
    total_amount?: number
    currency?: string
  }
): Promise<void> {
  console.log('[Notification] notifyNewBooking called for tenant:', tenantId)

  const memberIds = await getAllTenantMemberIds(tenantId)
  console.log('[Notification] Found', memberIds.length, 'members to notify')

  if (memberIds.length === 0) {
    console.log('[Notification] No members found for tenant:', tenantId)
    return
  }

  const data: BookingNotificationData = {
    booking_id: bookingData.id,
    booking_ref: bookingData.ref,
    guest_name: bookingData.guest_name,
    guest_email: bookingData.guest_email,
    room_name: bookingData.room_name,
    room_id: bookingData.room_id,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out,
    nights: bookingData.nights,
    guests: bookingData.guests,
    total_amount: bookingData.total_amount,
    currency: bookingData.currency
  }

  const amountStr = bookingData.total_amount && bookingData.currency
    ? ` - ${bookingData.currency} ${bookingData.total_amount.toFixed(2)}`
    : ''

  // Create notification for each member
  for (const memberId of memberIds) {
    console.log('[Notification] Creating notification for member:', memberId)
    await createNotification({
      tenantId,
      memberId,
      type: 'booking_created',
      title: 'New Booking',
      message: `${bookingData.guest_name} booked ${bookingData.room_name} (${bookingData.check_in} - ${bookingData.check_out})${amountStr}`,
      linkType: 'booking',
      linkId: bookingData.id,
      data
    })
  }
}

/**
 * Notify all members about a cancelled booking
 */
export async function notifyBookingCancelled(
  tenantId: string,
  bookingData: {
    id: string
    ref?: string
    guest_name: string
    guest_email?: string
    room_name: string
    check_in: string
    check_out: string
    total_amount?: number
    currency?: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: BookingNotificationData = {
    booking_id: bookingData.id,
    booking_ref: bookingData.ref,
    guest_name: bookingData.guest_name,
    guest_email: bookingData.guest_email,
    room_name: bookingData.room_name,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out,
    total_amount: bookingData.total_amount,
    currency: bookingData.currency,
    status: 'cancelled'
  }

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: `${bookingData.guest_name} cancelled ${bookingData.room_name} (${bookingData.check_in} - ${bookingData.check_out})`,
      linkType: 'booking',
      linkId: bookingData.id,
      data
    })
  }
}

/**
 * Notify all members about a cancelled booking WITH support ticket link
 * Used when customer cancels from portal (always creates ticket for communication)
 */
export async function notifyBookingCancelledWithTicket(
  tenantId: string,
  bookingData: {
    id: string
    ref?: string
    guest_name: string
    guest_email?: string
    room_name: string
    check_in: string
    check_out: string
    total_amount?: number
    currency?: string
    cancellation_reason?: string
    refund_requested?: boolean
    support_ticket_id?: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  // Build notification data with support ticket reference
  const data: BookingNotificationData = {
    booking_id: bookingData.id,
    booking_ref: bookingData.ref,
    guest_name: bookingData.guest_name,
    guest_email: bookingData.guest_email,
    room_name: bookingData.room_name,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out,
    total_amount: bookingData.total_amount,
    currency: bookingData.currency,
    status: 'cancelled',
    support_ticket_id: bookingData.support_ticket_id
  }

  // Add refund tag to title if requested
  const refundTag = bookingData.refund_requested ? ' [REFUND REQUESTED]' : ''
  const title = `Booking Cancelled${refundTag}`

  // Include reason in message if available
  const reasonText = bookingData.cancellation_reason
    ? ` - Reason: ${bookingData.cancellation_reason}`
    : ''
  const message = `${bookingData.guest_name} cancelled ${bookingData.room_name} (${bookingData.check_in} - ${bookingData.check_out})${reasonText}`

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'booking_cancelled',
      title,
      message,
      // Link to support ticket if available, otherwise fall back to booking
      linkType: bookingData.support_ticket_id ? 'support' : 'booking',
      linkId: bookingData.support_ticket_id || bookingData.id,
      data
    })
  }
}

/**
 * Notify all members about a check-in
 */
export async function notifyCheckIn(
  tenantId: string,
  bookingData: {
    id: string
    ref?: string
    guest_name: string
    room_name: string
    check_in: string
    check_out: string
    guests?: number
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: BookingNotificationData = {
    booking_id: bookingData.id,
    booking_ref: bookingData.ref,
    guest_name: bookingData.guest_name,
    room_name: bookingData.room_name,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out,
    guests: bookingData.guests,
    status: 'checked_in'
  }

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'booking_checked_in',
      title: 'Guest Checked In',
      message: `${bookingData.guest_name} checked in to ${bookingData.room_name}`,
      linkType: 'booking',
      linkId: bookingData.id,
      data
    })
  }
}

/**
 * Notify all members about a check-out
 */
export async function notifyCheckOut(
  tenantId: string,
  bookingData: {
    id: string
    ref?: string
    guest_name: string
    room_name: string
    check_in: string
    check_out: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: BookingNotificationData = {
    booking_id: bookingData.id,
    booking_ref: bookingData.ref,
    guest_name: bookingData.guest_name,
    room_name: bookingData.room_name,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out,
    status: 'checked_out'
  }

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'booking_checked_out',
      title: 'Guest Checked Out',
      message: `${bookingData.guest_name} checked out from ${bookingData.room_name}`,
      linkType: 'booking',
      linkId: bookingData.id,
      data
    })
  }
}

/**
 * Notify all members about a payment
 */
export async function notifyPaymentReceived(
  tenantId: string,
  paymentData: {
    booking_id: string
    booking_ref?: string
    guest_name: string
    amount: number
    currency: string
    payment_method?: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: PaymentNotificationData = {
    booking_id: paymentData.booking_id,
    booking_ref: paymentData.booking_ref,
    guest_name: paymentData.guest_name,
    amount: paymentData.amount,
    currency: paymentData.currency,
    payment_method: paymentData.payment_method,
    payment_date: new Date().toISOString().split('T')[0]
  }

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `${paymentData.guest_name} paid ${paymentData.currency} ${paymentData.amount.toFixed(2)}`,
      linkType: 'booking',
      linkId: paymentData.booking_id,
      data
    })
  }
}

/**
 * Notify all members about a new review
 */
export async function notifyNewReview(
  tenantId: string,
  reviewData: {
    review_id?: string
    booking_id: string
    guest_name: string
    room_name: string
    rating: number
    comment?: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: ReviewNotificationData = {
    review_id: reviewData.review_id,
    booking_id: reviewData.booking_id,
    guest_name: reviewData.guest_name,
    room_name: reviewData.room_name,
    rating: reviewData.rating,
    comment: reviewData.comment
  }

  const stars = '★'.repeat(reviewData.rating) + '☆'.repeat(5 - reviewData.rating)

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'review_submitted',
      title: `New ${reviewData.rating}-Star Review`,
      message: `${reviewData.guest_name} reviewed ${reviewData.room_name} ${stars}`,
      linkType: 'booking',
      linkId: reviewData.booking_id,
      data
    })
  }
}

/**
 * Notify all members about a new support ticket
 */
export async function notifyNewSupportTicket(
  tenantId: string,
  ticketData: {
    ticket_id: string
    ticket_ref?: string
    customer_name: string
    subject: string
    priority?: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: SupportNotificationData = {
    ticket_id: ticketData.ticket_id,
    ticket_ref: ticketData.ticket_ref,
    customer_name: ticketData.customer_name,
    subject: ticketData.subject,
    priority: ticketData.priority,
    status: 'open'
  }

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'support_ticket_created',
      title: 'New Support Ticket',
      message: `${ticketData.customer_name}: ${ticketData.subject}`,
      linkType: 'support',
      linkId: ticketData.ticket_id,
      data
    })
  }
}

/**
 * Notify all members about a customer reply to support ticket
 */
export async function notifyCustomerReplied(
  tenantId: string,
  ticketData: {
    ticket_id: string
    ticket_ref?: string
    customer_name: string
    subject?: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: SupportNotificationData = {
    ticket_id: ticketData.ticket_id,
    ticket_ref: ticketData.ticket_ref,
    customer_name: ticketData.customer_name,
    subject: ticketData.subject
  }

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'support_ticket_replied',
      title: 'Customer Replied',
      message: `${ticketData.customer_name} replied to support ticket${ticketData.subject ? `: ${ticketData.subject}` : ''}`,
      linkType: 'support',
      linkId: ticketData.ticket_id,
      data
    })
  }
}

/**
 * Notify customer that their booking is confirmed
 */
export async function notifyCustomerBookingConfirmed(
  tenantId: string,
  customerId: string,
  bookingData: {
    id: string
    ref?: string
    room_name: string
    check_in: string
    check_out: string
    nights?: number
    guests?: number
    total_amount?: number
    currency?: string
  }
): Promise<void> {
  const data: BookingNotificationData = {
    booking_id: bookingData.id,
    booking_ref: bookingData.ref,
    room_name: bookingData.room_name,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out,
    nights: bookingData.nights,
    guests: bookingData.guests,
    total_amount: bookingData.total_amount,
    currency: bookingData.currency,
    status: 'confirmed'
  }

  await createNotification({
    tenantId,
    customerId,
    type: 'booking_confirmed',
    title: 'Booking Confirmed',
    message: `Your booking for ${bookingData.room_name} (${bookingData.check_in} - ${bookingData.check_out}) is confirmed`,
    linkType: 'booking',
    linkId: bookingData.id,
    data
  })
}

/**
 * Notify customer that their booking is cancelled
 */
export async function notifyCustomerBookingCancelled(
  tenantId: string,
  customerId: string,
  bookingData: {
    id: string
    ref?: string
    room_name: string
    check_in: string
    check_out: string
  }
): Promise<void> {
  const data: BookingNotificationData = {
    booking_id: bookingData.id,
    booking_ref: bookingData.ref,
    room_name: bookingData.room_name,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out,
    status: 'cancelled'
  }

  await createNotification({
    tenantId,
    customerId,
    type: 'booking_cancelled',
    title: 'Booking Cancelled',
    message: `Your booking for ${bookingData.room_name} (${bookingData.check_in} - ${bookingData.check_out}) has been cancelled`,
    linkType: 'booking',
    linkId: bookingData.id,
    data
  })
}

/**
 * Notify customer about staff reply to their support ticket
 */
export async function notifyCustomerSupportReply(
  tenantId: string,
  customerId: string,
  ticketData: {
    ticket_id: string
    ticket_ref?: string
    subject?: string
  }
): Promise<void> {
  const data: SupportNotificationData = {
    ticket_id: ticketData.ticket_id,
    ticket_ref: ticketData.ticket_ref,
    subject: ticketData.subject
  }

  await createNotification({
    tenantId,
    customerId,
    type: 'support_ticket_replied',
    title: 'Support Response',
    message: ticketData.subject
      ? `New reply on: ${ticketData.subject}`
      : 'You have a new reply on your support ticket',
    linkType: 'support',
    linkId: ticketData.ticket_id,
    data
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
  const data: MemberNotificationData = {
    business_name: businessName
  }

  await createNotification({
    tenantId,
    customerId,
    type: 'portal_welcome',
    title: 'Welcome!',
    message: `Welcome to ${businessName}. You can now manage your bookings here.`,
    data
  })
}

/**
 * Notify all members when customer uploads payment proof
 */
export async function notifyPaymentProofUploaded(
  tenantId: string,
  paymentData: {
    booking_id: string
    booking_ref?: string
    guest_name: string
    amount: number
    currency: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: PaymentNotificationData = {
    booking_id: paymentData.booking_id,
    booking_ref: paymentData.booking_ref,
    guest_name: paymentData.guest_name,
    amount: paymentData.amount,
    currency: paymentData.currency,
    payment_date: new Date().toISOString().split('T')[0]
  }

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'payment_proof_uploaded',
      title: 'Payment Proof Uploaded',
      message: `${paymentData.guest_name} uploaded proof of payment (${paymentData.currency} ${paymentData.amount.toFixed(2)})`,
      linkType: 'booking',
      linkId: paymentData.booking_id,
      data
    })
  }
}

/**
 * Notify customer when staff responds to their review
 */
export async function notifyCustomerReviewResponse(
  tenantId: string,
  customerId: string,
  reviewData: {
    review_id?: string
    booking_id?: string
    room_name: string
  }
): Promise<void> {
  const data: ReviewNotificationData = {
    review_id: reviewData.review_id,
    booking_id: reviewData.booking_id,
    room_name: reviewData.room_name
  }

  await createNotification({
    tenantId,
    customerId,
    type: 'review_response_added',
    title: 'Response to Your Review',
    message: `The property responded to your review for ${reviewData.room_name}`,
    linkType: 'review',
    linkId: reviewData.review_id,
    data
  })
}

/**
 * Notify customer when a review is requested
 */
export async function notifyCustomerReviewRequested(
  tenantId: string,
  customerId: string,
  bookingData: {
    booking_id: string
    room_name: string
    check_out: string
  }
): Promise<void> {
  const data: BookingNotificationData = {
    booking_id: bookingData.booking_id,
    room_name: bookingData.room_name,
    check_out: bookingData.check_out
  }

  await createNotification({
    tenantId,
    customerId,
    type: 'review_requested',
    title: 'Share Your Experience',
    message: `How was your stay at ${bookingData.room_name}? We'd love to hear your feedback!`,
    linkType: 'booking',
    linkId: bookingData.booking_id,
    data
  })
}

/**
 * Notify customer when support ticket status changes
 */
export async function notifyCustomerSupportStatusChanged(
  tenantId: string,
  customerId: string,
  ticketData: {
    ticket_id: string
    ticket_ref?: string
    subject?: string
    status: string
  }
): Promise<void> {
  const statusLabels: Record<string, string> = {
    open: 'reopened',
    in_progress: 'being reviewed',
    resolved: 'resolved',
    closed: 'closed'
  }
  const statusLabel = statusLabels[ticketData.status] || ticketData.status

  const data: SupportNotificationData = {
    ticket_id: ticketData.ticket_id,
    ticket_ref: ticketData.ticket_ref,
    subject: ticketData.subject,
    status: ticketData.status
  }

  await createNotification({
    tenantId,
    customerId,
    type: 'support_status_changed',
    title: 'Ticket Status Updated',
    message: ticketData.subject
      ? `"${ticketData.subject}" has been ${statusLabel}`
      : `Your support ticket has been ${statusLabel}`,
    linkType: 'support',
    linkId: ticketData.ticket_id,
    data
  })
}

/**
 * Notify new member they've been invited
 */
export async function notifyMemberInvited(
  tenantId: string,
  memberId: string,
  memberData: {
    business_name: string
    role_name?: string
    invited_by?: string
  }
): Promise<void> {
  const data: MemberNotificationData = {
    business_name: memberData.business_name,
    role_name: memberData.role_name,
    invited_by: memberData.invited_by
  }

  await createNotification({
    tenantId,
    memberId,
    type: 'member_invited',
    title: 'Team Invitation',
    message: memberData.invited_by
      ? `${memberData.invited_by} invited you to join ${memberData.business_name}${memberData.role_name ? ` as ${memberData.role_name}` : ''}`
      : `You've been invited to join ${memberData.business_name}`,
    data
  })
}

/**
 * Notify member their role has changed
 */
export async function notifyMemberRoleChanged(
  tenantId: string,
  memberId: string,
  memberData: {
    business_name?: string
    role_name: string
  }
): Promise<void> {
  const data: MemberNotificationData = {
    business_name: memberData.business_name,
    role_name: memberData.role_name
  }

  await createNotification({
    tenantId,
    memberId,
    type: 'member_role_changed',
    title: 'Role Updated',
    message: `Your role has been changed to ${memberData.role_name}`,
    data
  })
}

/**
 * Notify member they've been removed from the team
 */
export async function notifyMemberRemoved(
  tenantId: string,
  memberId: string,
  memberData: {
    business_name?: string
  }
): Promise<void> {
  const data: MemberNotificationData = {
    business_name: memberData.business_name
  }

  await createNotification({
    tenantId,
    memberId,
    type: 'member_removed',
    title: 'Team Access Removed',
    message: memberData.business_name
      ? `You have been removed from ${memberData.business_name}`
      : 'You have been removed from the team',
    data
  })
}

/**
 * Notify all members about a modified booking
 */
export async function notifyBookingModified(
  tenantId: string,
  bookingData: {
    id: string
    ref?: string
    guest_name: string
    room_name: string
    check_in: string
    check_out: string
    changes: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: BookingNotificationData = {
    booking_id: bookingData.id,
    booking_ref: bookingData.ref,
    guest_name: bookingData.guest_name,
    room_name: bookingData.room_name,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out
  }

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'booking_modified',
      title: 'Booking Modified',
      message: `${bookingData.guest_name}'s booking for ${bookingData.room_name} was updated: ${bookingData.changes}`,
      linkType: 'booking',
      linkId: bookingData.id,
      data
    })
  }
}

/**
 * Notify customer about their modified booking
 */
export async function notifyCustomerBookingModified(
  tenantId: string,
  customerId: string,
  bookingData: {
    id: string
    ref?: string
    room_name: string
    check_in: string
    check_out: string
    changes: string
    total_amount?: number
    currency?: string
  }
): Promise<void> {
  const data: BookingNotificationData = {
    booking_id: bookingData.id,
    booking_ref: bookingData.ref,
    room_name: bookingData.room_name,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out,
    total_amount: bookingData.total_amount,
    currency: bookingData.currency
  }

  await createNotification({
    tenantId,
    customerId,
    type: 'booking_modified_customer',
    title: 'Booking Updated',
    message: `Your booking for ${bookingData.room_name} has been updated: ${bookingData.changes}`,
    linkType: 'booking',
    linkId: bookingData.id,
    data
  })
}

/**
 * Notify all members when a room is manually blocked
 */
export async function notifyRoomBlocked(
  tenantId: string,
  roomData: {
    room_id: string
    room_name: string
    start_date: string
    end_date: string
    reason?: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: RoomNotificationData = {
    room_id: roomData.room_id,
    room_name: roomData.room_name,
    start_date: roomData.start_date,
    end_date: roomData.end_date,
    reason: roomData.reason
  }

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'room_blocked',
      title: 'Room Blocked',
      message: `${roomData.room_name} blocked from ${roomData.start_date} to ${roomData.end_date}${roomData.reason ? `: ${roomData.reason}` : ''}`,
      linkType: 'room',
      linkId: roomData.room_id,
      data
    })
  }
}

/**
 * Notify all members about low availability
 */
export async function notifyLowAvailability(
  tenantId: string,
  roomData: {
    room_id: string
    room_name: string
    available_days: number
    period_days: number
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: RoomNotificationData = {
    room_id: roomData.room_id,
    room_name: roomData.room_name,
    available_days: roomData.available_days,
    period_days: roomData.period_days
  }

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'low_availability',
      title: 'High Demand Alert',
      message: `${roomData.room_name} only has ${roomData.available_days} days available in the next ${roomData.period_days} days`,
      linkType: 'room',
      linkId: roomData.room_id,
      data
    })
  }
}

/**
 * Notify all members when iCal sync completes
 */
export async function notifySyncCompleted(
  tenantId: string,
  syncData: {
    room_id?: string
    room_name: string
    source: string
    bookings_imported: number
    bookings_updated?: number
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: SyncNotificationData = {
    room_id: syncData.room_id,
    room_name: syncData.room_name,
    source: syncData.source,
    bookings_imported: syncData.bookings_imported,
    bookings_updated: syncData.bookings_updated
  }

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'sync_completed',
      title: 'Calendar Sync Complete',
      message: `${syncData.room_name}: Imported ${syncData.bookings_imported} booking${syncData.bookings_imported !== 1 ? 's' : ''} from ${syncData.source}`,
      data
    })
  }
}

/**
 * Notify all members when iCal sync fails
 */
export async function notifySyncFailed(
  tenantId: string,
  syncData: {
    room_id?: string
    room_name: string
    source: string
    error: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: SyncNotificationData = {
    room_id: syncData.room_id,
    room_name: syncData.room_name,
    source: syncData.source,
    error: syncData.error
  }

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'sync_failed',
      title: 'Calendar Sync Failed',
      message: `${syncData.room_name}: Failed to sync from ${syncData.source} - ${syncData.error}`,
      data
    })
  }
}

/**
 * Notify customer about payment confirmation
 */
export async function notifyCustomerPaymentConfirmed(
  tenantId: string,
  customerId: string,
  paymentData: {
    booking_id: string
    booking_ref?: string
    room_name?: string
    amount: number
    currency: string
    payment_method?: string
  }
): Promise<void> {
  const data: PaymentNotificationData = {
    booking_id: paymentData.booking_id,
    booking_ref: paymentData.booking_ref,
    amount: paymentData.amount,
    currency: paymentData.currency,
    payment_method: paymentData.payment_method,
    payment_date: new Date().toISOString().split('T')[0]
  }

  await createNotification({
    tenantId,
    customerId,
    type: 'payment_confirmed',
    title: 'Payment Confirmed',
    message: `Your payment of ${paymentData.currency} ${paymentData.amount.toFixed(2)}${paymentData.room_name ? ` for ${paymentData.room_name}` : ''} has been confirmed`,
    linkType: 'booking',
    linkId: paymentData.booking_id,
    data
  })
}

/**
 * Notify customer about overdue payment
 */
export async function notifyCustomerPaymentOverdue(
  tenantId: string,
  customerId: string,
  paymentData: {
    booking_id: string
    booking_ref?: string
    room_name: string
    check_in?: string
    amount: number
    currency: string
  }
): Promise<void> {
  const data: PaymentNotificationData & BookingNotificationData = {
    booking_id: paymentData.booking_id,
    booking_ref: paymentData.booking_ref,
    room_name: paymentData.room_name,
    check_in: paymentData.check_in,
    amount: paymentData.amount,
    currency: paymentData.currency
  }

  await createNotification({
    tenantId,
    customerId,
    type: 'payment_overdue',
    title: 'Payment Reminder',
    message: `Payment of ${paymentData.currency} ${paymentData.amount.toFixed(2)} for ${paymentData.room_name} is overdue`,
    linkType: 'booking',
    linkId: paymentData.booking_id,
    data
  })
}

/**
 * Notify customer about upcoming booking (1 day before)
 */
export async function notifyCustomerBookingReminder(
  tenantId: string,
  customerId: string,
  bookingData: {
    booking_id: string
    booking_ref?: string
    room_name: string
    check_in: string
    check_out?: string
    nights?: number
  }
): Promise<void> {
  const data: BookingNotificationData = {
    booking_id: bookingData.booking_id,
    booking_ref: bookingData.booking_ref,
    room_name: bookingData.room_name,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out,
    nights: bookingData.nights
  }

  await createNotification({
    tenantId,
    customerId,
    type: 'booking_reminder',
    title: 'Upcoming Stay',
    message: `Reminder: Your stay at ${bookingData.room_name} starts tomorrow (${bookingData.check_in})`,
    linkType: 'booking',
    linkId: bookingData.booking_id,
    data
  })
}

/**
 * Notify customer on check-in day
 */
export async function notifyCustomerCheckInReminder(
  tenantId: string,
  customerId: string,
  bookingData: {
    booking_id: string
    booking_ref?: string
    room_name: string
    check_in: string
    check_out?: string
    check_in_time?: string
  }
): Promise<void> {
  const data: BookingNotificationData = {
    booking_id: bookingData.booking_id,
    booking_ref: bookingData.booking_ref,
    room_name: bookingData.room_name,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out
  }

  await createNotification({
    tenantId,
    customerId,
    type: 'check_in_reminder',
    title: 'Check-in Today',
    message: `Today's the day! Check in at ${bookingData.room_name}${bookingData.check_in_time ? ` from ${bookingData.check_in_time}` : ''}`,
    linkType: 'booking',
    linkId: bookingData.booking_id,
    data
  })
}

/**
 * Run scheduled notifications (call this from a cron job)
 * - Booking reminders (1 day before check-in)
 * - Check-in reminders (day of check-in)
 * - Payment overdue notifications
 */
export async function runScheduledNotifications(): Promise<{
  bookingReminders: number
  checkInReminders: number
  paymentOverdue: number
}> {
  const results = {
    bookingReminders: 0,
    checkInReminders: 0,
    paymentOverdue: 0
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayStr = today.toISOString().split('T')[0]
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  console.log('[Scheduled] Running scheduled notifications for', todayStr)

  try {
    // 1. Booking reminders (check-in tomorrow)
    const { data: tomorrowBookings } = await supabase
      .from('bookings')
      .select('id, tenant_id, customer_id, guest_name, check_in, check_out, rooms(name)')
      .eq('check_in', tomorrowStr)
      .eq('status', 'confirmed')
      .not('customer_id', 'is', null)

    for (const booking of tomorrowBookings || []) {
      if (booking.customer_id) {
        const roomName = (booking.rooms as any)?.name || 'your room'
        await notifyCustomerBookingReminder(
          booking.tenant_id,
          booking.customer_id,
          {
            booking_id: booking.id,
            room_name: roomName,
            check_in: booking.check_in,
            check_out: booking.check_out
          }
        )
        results.bookingReminders++
      }
    }

    // 2. Check-in reminders (check-in today)
    const { data: todayBookings } = await supabase
      .from('bookings')
      .select('id, tenant_id, customer_id, guest_name, check_in, check_out, rooms(name, check_in_time)')
      .eq('check_in', todayStr)
      .eq('status', 'confirmed')
      .not('customer_id', 'is', null)

    for (const booking of todayBookings || []) {
      if (booking.customer_id) {
        const room = booking.rooms as any
        const roomName = room?.name || 'your room'
        await notifyCustomerCheckInReminder(
          booking.tenant_id,
          booking.customer_id,
          {
            booking_id: booking.id,
            room_name: roomName,
            check_in: booking.check_in,
            check_out: booking.check_out,
            check_in_time: room?.check_in_time
          }
        )
        results.checkInReminders++
      }
    }

    // 3. Payment overdue (unpaid bookings where check-in has passed)
    const { data: overdueBookings } = await supabase
      .from('bookings')
      .select('id, tenant_id, customer_id, guest_name, total_amount, currency, check_in, rooms(name)')
      .lt('check_in', todayStr)
      .eq('payment_status', 'unpaid')
      .in('status', ['confirmed', 'checked_in'])
      .not('customer_id', 'is', null)

    for (const booking of overdueBookings || []) {
      if (booking.customer_id && booking.total_amount) {
        const roomName = (booking.rooms as any)?.name || 'your booking'
        await notifyCustomerPaymentOverdue(
          booking.tenant_id,
          booking.customer_id,
          {
            booking_id: booking.id,
            room_name: roomName,
            check_in: booking.check_in,
            amount: booking.total_amount,
            currency: booking.currency || 'ZAR'
          }
        )
        results.paymentOverdue++
      }
    }

    console.log('[Scheduled] Completed:', results)
    return results
  } catch (error) {
    console.error('[Scheduled] Error running scheduled notifications:', error)
    return results
  }
}

/**
 * Notify all members about a payment failure
 */
export async function notifyPaymentFailed(
  tenantId: string,
  bookingData: {
    id: string
    ref?: string
    guest_name: string
    guest_email?: string
    room_name: string
    total_amount?: number
    currency?: string
    failure_reason?: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data: BookingNotificationData = {
    booking_id: bookingData.id,
    booking_ref: bookingData.ref,
    guest_name: bookingData.guest_name,
    guest_email: bookingData.guest_email,
    room_name: bookingData.room_name,
    total_amount: bookingData.total_amount,
    currency: bookingData.currency,
    status: 'payment_failed'
  }

  const amountStr = bookingData.total_amount && bookingData.currency
    ? ` (${bookingData.currency} ${bookingData.total_amount.toFixed(2)})`
    : ''

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `${bookingData.guest_name}'s payment for ${bookingData.room_name}${amountStr} failed`,
      linkType: 'booking',
      linkId: bookingData.id,
      data
    })
  }
}

/**
 * Notify customer about their failed payment
 */
export async function notifyCustomerPaymentFailed(
  tenantId: string,
  customerId: string,
  bookingData: {
    id: string
    ref?: string
    room_name: string
    total_amount?: number
    currency?: string
  }
): Promise<void> {
  const data: BookingNotificationData = {
    booking_id: bookingData.id,
    booking_ref: bookingData.ref,
    room_name: bookingData.room_name,
    total_amount: bookingData.total_amount,
    currency: bookingData.currency,
    status: 'payment_failed'
  }

  const amountStr = bookingData.total_amount && bookingData.currency
    ? ` (${bookingData.currency} ${bookingData.total_amount.toFixed(2)})`
    : ''

  await createNotification({
    tenantId,
    customerId,
    type: 'payment_failed_customer',
    title: 'Payment Could Not Be Processed',
    message: `Your payment for ${bookingData.room_name}${amountStr} could not be processed. Please try again.`,
    linkType: 'booking',
    linkId: bookingData.id,
    data
  })
}

/**
 * Notify all members about an abandoned cart
 * Clicking the notification navigates to the customer's activity page
 */
export async function notifyCartAbandoned(
  tenantId: string,
  bookingData: {
    id: string
    ref?: string
    customer_id: string
    guest_name: string
    guest_email?: string
    room_name: string
    check_in: string
    check_out: string
    total_amount?: number
    currency?: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  // Include customer_id in data for navigation to customer activity
  const data: BookingNotificationData & { customer_id: string } = {
    booking_id: bookingData.id,
    booking_ref: bookingData.ref,
    guest_name: bookingData.guest_name,
    guest_email: bookingData.guest_email,
    room_name: bookingData.room_name,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out,
    total_amount: bookingData.total_amount,
    currency: bookingData.currency,
    status: 'cart_abandoned',
    customer_id: bookingData.customer_id
  }

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'cart_abandoned',
      title: 'Cart Abandoned',
      message: `${bookingData.guest_name} abandoned checkout for ${bookingData.room_name} (${bookingData.check_in} - ${bookingData.check_out})`,
      linkType: 'customer',
      linkId: bookingData.customer_id,
      data
    })
  }
}

/**
 * Notify customer about their abandoned cart (reminder)
 */
export async function notifyCustomerCartReminder(
  tenantId: string,
  customerId: string,
  bookingData: {
    id: string
    ref?: string
    room_name: string
    check_in: string
    check_out: string
    total_amount?: number
    currency?: string
  }
): Promise<void> {
  const data: BookingNotificationData = {
    booking_id: bookingData.id,
    booking_ref: bookingData.ref,
    room_name: bookingData.room_name,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out,
    total_amount: bookingData.total_amount,
    currency: bookingData.currency,
    status: 'cart_abandoned'
  }

  await createNotification({
    tenantId,
    customerId,
    type: 'cart_abandoned_customer',
    title: 'Complete Your Booking',
    message: `You left ${bookingData.room_name} (${bookingData.check_in} - ${bookingData.check_out}) in your cart. Complete your booking before it's gone!`,
    linkType: 'booking',
    linkId: bookingData.id,
    data
  })
}

// ============================================
// REFUND NOTIFICATIONS
// ============================================

/**
 * Notify all members about a new refund request
 */
export async function notifyRefundRequested(
  tenantId: string,
  refundData: {
    refund_id: string
    booking_id: string
    guest_name: string
    amount: number
    currency: string
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const data = {
    refund_id: refundData.refund_id,
    booking_id: refundData.booking_id,
    guest_name: refundData.guest_name,
    amount: refundData.amount,
    currency: refundData.currency
  }

  const amountStr = `${refundData.currency} ${refundData.amount.toFixed(2)}`

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'refund_requested',
      title: 'Refund Requested',
      message: `${refundData.guest_name} has requested a refund of ${amountStr}`,
      linkType: 'refund',
      linkId: refundData.refund_id,
      data
    })
  }
}

/**
 * Notify customer that their refund has been approved
 */
export async function notifyRefundApproved(
  tenantId: string,
  customerId: string,
  refundData: {
    refund_id: string
    amount: number
    currency: string
  }
): Promise<void> {
  const amountStr = `${refundData.currency} ${refundData.amount.toFixed(2)}`

  await createNotification({
    tenantId,
    customerId,
    type: 'refund_approved',
    title: 'Refund Approved',
    message: `Your refund of ${amountStr} has been approved and will be processed shortly.`,
    linkType: 'refund',
    linkId: refundData.refund_id,
    data: refundData
  })
}

/**
 * Notify customer that their refund has been rejected
 */
export async function notifyRefundRejected(
  tenantId: string,
  customerId: string,
  refundData: {
    refund_id: string
    reason: string
  }
): Promise<void> {
  await createNotification({
    tenantId,
    customerId,
    type: 'refund_rejected',
    title: 'Refund Request Update',
    message: `Your refund request could not be approved. Reason: ${refundData.reason}`,
    linkType: 'refund',
    linkId: refundData.refund_id,
    data: refundData
  })
}

/**
 * Notify customer that their refund has been completed
 */
export async function notifyRefundCompleted(
  tenantId: string,
  customerId: string,
  refundData: {
    refund_id: string
    amount: number
    currency: string
  }
): Promise<void> {
  const amountStr = `${refundData.currency} ${refundData.amount.toFixed(2)}`

  await createNotification({
    tenantId,
    customerId,
    type: 'refund_completed',
    title: 'Refund Processed',
    message: `Your refund of ${amountStr} has been processed. Please allow 5-10 business days for the funds to reflect in your account.`,
    linkType: 'refund',
    linkId: refundData.refund_id,
    data: refundData
  })
}

/**
 * Notify staff about pending refunds that need attention (escalation)
 */
export async function notifyRefundEscalation(
  tenantId: string,
  refundData: {
    refund_id: string
    guest_name: string
    amount: number
    currency: string
    hours_pending: number
  }
): Promise<void> {
  const memberIds = await getAllTenantMemberIds(tenantId)

  const amountStr = `${refundData.currency} ${refundData.amount.toFixed(2)}`

  for (const memberId of memberIds) {
    await createNotification({
      tenantId,
      memberId,
      type: 'refund_escalation',
      title: 'Refund Needs Attention',
      message: `Refund request from ${refundData.guest_name} for ${amountStr} has been pending for ${refundData.hours_pending}+ hours`,
      linkType: 'refund',
      linkId: refundData.refund_id,
      data: refundData
    })
  }
}
