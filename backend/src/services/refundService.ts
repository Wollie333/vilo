import { supabase } from '../lib/supabase.js'

// ============================================
// TYPES
// ============================================

export interface CancellationPolicy {
  days_before: number
  refund_percentage: number
  label: string
}

export interface RefundCalculation {
  originalAmount: number
  eligibleAmount: number
  refundPercentage: number
  daysBeforeCheckIn: number
  policyApplied: CancellationPolicy
  cancellationDate: string
}

export interface Refund {
  id: string
  tenant_id: string
  booking_id: string
  customer_id: string | null
  original_amount: number
  eligible_amount: number
  approved_amount: number | null
  processed_amount: number | null
  currency: string
  policy_applied: CancellationPolicy | null
  days_before_checkin: number | null
  refund_percentage: number | null
  status: RefundStatus
  payment_method: string | null
  original_payment_reference: string | null
  refund_reference: string | null
  rejection_reason: string | null
  staff_notes: string | null
  override_reason: string | null
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  processed_at: string | null
  processed_by: string | null
  completed_at: string | null
  failed_at: string | null
  failure_reason: string | null
  created_at: string
  updated_at: string
}

export type RefundStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'completed'
  | 'failed'

export interface RefundStats {
  pending: number  // alias for requested
  requested: number
  under_review: number
  approved: number
  processing: number
  completed_this_month: number
  total_refunded_this_month: number
  total_requested_amount: number
  total_approved_amount: number
  total_processed_amount: number
}

// ============================================
// REFUND CALCULATION
// ============================================

/**
 * Calculate eligible refund amount based on cancellation policies
 */
export function calculateEligibleRefund(
  bookingAmount: number,
  checkInDate: Date,
  cancellationPolicies: CancellationPolicy[],
  cancellationDate: Date = new Date()
): RefundCalculation {
  // Calculate days before check-in
  const daysBeforeCheckIn = Math.ceil(
    (checkInDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Sort policies by days_before descending (most lenient first)
  const sortedPolicies = [...cancellationPolicies].sort(
    (a, b) => b.days_before - a.days_before
  )

  // Find applicable policy (first one where daysBeforeCheckIn >= policy.days_before)
  const applicablePolicy = sortedPolicies.find(
    policy => daysBeforeCheckIn >= policy.days_before
  ) || { days_before: 0, refund_percentage: 0, label: 'No refund available' }

  // Calculate refund amount
  const refundPercentage = applicablePolicy.refund_percentage
  const eligibleAmount = Math.round((bookingAmount * refundPercentage) / 100 * 100) / 100

  return {
    originalAmount: bookingAmount,
    eligibleAmount,
    refundPercentage,
    daysBeforeCheckIn,
    policyApplied: applicablePolicy,
    cancellationDate: cancellationDate.toISOString()
  }
}

// ============================================
// REFUND CRUD OPERATIONS
// ============================================

/**
 * Create a refund request from a cancelled booking
 */
export async function createRefundFromCancellation(
  bookingId: string,
  tenantId: string
): Promise<{ success: boolean; refund?: Refund; error?: string }> {
  console.log('[RefundService] createRefundFromCancellation called for booking:', bookingId, 'tenant:', tenantId)

  try {
    // Get booking with tenant info for cancellation policies
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        tenants:tenant_id (
          cancellation_policies
        )
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('[RefundService] Booking not found:', bookingId, bookingError)
      return { success: false, error: 'Booking not found' }
    }

    console.log('[RefundService] Found booking:', booking.id, 'tenant:', booking.tenant_id, 'amount:', booking.total_amount)

    // Check if refund already exists
    const { data: existingRefund, error: existingError } = await supabase
      .from('refunds')
      .select('id')
      .eq('booking_id', bookingId)
      .single()

    if (existingRefund) {
      console.log('[RefundService] Refund already exists for booking:', bookingId, 'refund:', existingRefund.id)
      return { success: false, error: 'Refund already exists for this booking' }
    }

    // Note: existingError is expected if no refund exists (PGRST116 - no rows returned)
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[RefundService] Error checking existing refund:', existingError)
    }

    // Get cancellation policies
    const policies: CancellationPolicy[] = (booking.tenants as any)?.cancellation_policies || [
      { days_before: 7, refund_percentage: 100, label: 'Free cancellation up to 7 days before' }
    ]

    // Calculate eligible refund
    const checkInDate = new Date(booking.check_in)
    const cancellationDate = booking.cancelled_at ? new Date(booking.cancelled_at) : new Date()
    const calculation = calculateEligibleRefund(
      parseFloat(booking.total_amount),
      checkInDate,
      policies,
      cancellationDate
    )

    // Create refund record
    const refundData = {
      tenant_id: tenantId,
      booking_id: bookingId,
      customer_id: booking.customer_id || null,
      original_amount: calculation.originalAmount,
      eligible_amount: calculation.eligibleAmount,
      currency: booking.currency || 'ZAR',
      policy_applied: calculation.policyApplied,
      days_before_checkin: calculation.daysBeforeCheckIn,
      refund_percentage: calculation.refundPercentage,
      status: 'requested',
      payment_method: booking.payment_method || null,
      original_payment_reference: booking.payment_reference || null,
      requested_at: new Date().toISOString()
    }

    console.log('[RefundService] Inserting refund:', JSON.stringify(refundData, null, 2))

    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .insert(refundData)
      .select()
      .single()

    if (refundError) {
      console.error('[RefundService] Error creating refund:', refundError)
      console.error('[RefundService] Error details:', JSON.stringify(refundError, null, 2))
      return { success: false, error: `Failed to create refund request: ${refundError.message}` }
    }

    // Update booking with refund reference
    await supabase
      .from('bookings')
      .update({
        refund_id: refund.id,
        refund_status: 'requested'
      })
      .eq('id', bookingId)

    // Log initial status history
    await logRefundStatusChange(refund.id, null, 'requested', null, null, 'Refund request auto-created from booking cancellation')

    console.log('[RefundService] Created refund:', refund.id, 'for booking:', bookingId)

    return { success: true, refund }
  } catch (error) {
    console.error('[RefundService] Unexpected error:', error)
    return { success: false, error: 'Unexpected error creating refund' }
  }
}

/**
 * Get refunds for a tenant with filters
 */
export async function getRefundsByTenant(
  tenantId: string,
  filters?: {
    status?: RefundStatus
    dateFrom?: string
    dateTo?: string
    search?: string
    limit?: number
    offset?: number
  }
): Promise<{ data: any[]; count: number }> {
  console.log('[RefundService] getRefundsByTenant called for tenant:', tenantId)

  let query = supabase
    .from('refunds')
    .select(`
      *,
      bookings:booking_id (
        id,
        guest_name,
        guest_email,
        room_name,
        check_in,
        check_out
      ),
      customers:customer_id (
        id,
        name,
        email
      )
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.dateFrom) {
    query = query.gte('requested_at', filters.dateFrom)
  }

  if (filters?.dateTo) {
    query = query.lte('requested_at', filters.dateTo)
  }

  if (filters?.search) {
    // Search will need to be done client-side or with a more complex query
    // For now, we'll skip server-side search
  }

  query = query.order('requested_at', { ascending: false })

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
  }

  const { data, error, count } = await query

  console.log('[RefundService] Query result - count:', count, 'data length:', data?.length || 0)

  if (error) {
    console.error('[RefundService] Error fetching refunds:', error)
    console.error('[RefundService] Error code:', error.code)
    console.error('[RefundService] Error details:', error.details)
    console.error('[RefundService] Error hint:', error.hint)
    return { data: [], count: 0 }
  }

  // Flatten booking data for frontend consumption
  const flattenedData = (data || []).map((refund: any) => ({
    ...refund,
    guest_name: refund.bookings?.guest_name,
    guest_email: refund.bookings?.guest_email,
    room_name: refund.bookings?.room_name,
    check_in: refund.bookings?.check_in,
    check_out: refund.bookings?.check_out,
    booking_reference: refund.bookings?.id?.substring(0, 8).toUpperCase()
  }))

  return { data: flattenedData, count: count || 0 }
}

/**
 * Get single refund by ID
 */
export async function getRefundById(
  refundId: string,
  tenantId: string
): Promise<Refund | null> {
  const { data, error } = await supabase
    .from('refunds')
    .select(`
      *,
      bookings:booking_id (
        id,
        guest_name,
        guest_email,
        guest_phone,
        room_name,
        room_id,
        check_in,
        check_out,
        total_amount,
        currency,
        status,
        payment_status,
        payment_method,
        payment_reference,
        cancelled_at,
        cancellation_reason,
        cancellation_details
      ),
      customers:customer_id (
        id,
        name,
        email,
        phone
      )
    `)
    .eq('id', refundId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('[RefundService] Error fetching refund:', error)
    return null
  }

  return data
}

/**
 * Get refund statistics for a tenant
 */
export async function getRefundStats(tenantId: string): Promise<RefundStats> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Get all refunds with amounts for calculations
  const { data: allRefunds } = await supabase
    .from('refunds')
    .select('status, eligible_amount, approved_amount, processed_amount, completed_at')
    .eq('tenant_id', tenantId)

  const counts = {
    requested: 0,
    under_review: 0,
    approved: 0,
    processing: 0
  }

  let totalRequestedAmount = 0
  let totalApprovedAmount = 0
  let totalProcessedAmount = 0
  let completedThisMonthCount = 0
  let totalRefundedThisMonth = 0

  allRefunds?.forEach(r => {
    // Count by status
    if (r.status in counts) {
      counts[r.status as keyof typeof counts]++
    }

    // Sum eligible amounts for all non-rejected refunds (total requested)
    if (r.status !== 'rejected') {
      totalRequestedAmount += parseFloat(r.eligible_amount) || 0
    }

    // Sum approved amounts for approved/processing/completed refunds
    if (['approved', 'processing', 'completed'].includes(r.status)) {
      totalApprovedAmount += parseFloat(r.approved_amount) || parseFloat(r.eligible_amount) || 0
    }

    // Sum processed amounts for completed refunds
    if (r.status === 'completed') {
      totalProcessedAmount += parseFloat(r.processed_amount) || 0

      // Check if completed this month
      if (r.completed_at && r.completed_at >= startOfMonth) {
        completedThisMonthCount++
        totalRefundedThisMonth += parseFloat(r.processed_amount) || 0
      }
    }
  })

  return {
    pending: counts.requested, // alias for requested
    ...counts,
    completed_this_month: completedThisMonthCount,
    total_refunded_this_month: totalRefundedThisMonth,
    total_requested_amount: totalRequestedAmount,
    total_approved_amount: totalApprovedAmount,
    total_processed_amount: totalProcessedAmount
  }
}

// ============================================
// STATUS WORKFLOW
// ============================================

/**
 * Log status change to history
 */
async function logRefundStatusChange(
  refundId: string,
  previousStatus: string | null,
  newStatus: string,
  changedBy: string | null,
  changedByName: string | null,
  notes?: string
): Promise<void> {
  await supabase
    .from('refund_status_history')
    .insert({
      refund_id: refundId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: changedBy,
      changed_by_name: changedByName,
      notes: notes || null
    })
}

/**
 * Update booking's cached refund status
 */
async function updateBookingRefundStatus(
  bookingId: string,
  refundStatus: string
): Promise<void> {
  await supabase
    .from('bookings')
    .update({ refund_status: refundStatus })
    .eq('id', bookingId)
}

/**
 * Mark refund as under review
 */
export async function markRefundUnderReview(
  refundId: string,
  tenantId: string,
  staffId: string,
  staffName: string
): Promise<{ success: boolean; error?: string }> {
  const refund = await getRefundById(refundId, tenantId)
  if (!refund) return { success: false, error: 'Refund not found' }
  if (refund.status !== 'requested') {
    return { success: false, error: 'Can only review refunds in requested status' }
  }

  const { error } = await supabase
    .from('refunds')
    .update({
      status: 'under_review',
      reviewed_at: new Date().toISOString(),
      reviewed_by: staffId
    })
    .eq('id', refundId)

  if (error) return { success: false, error: 'Failed to update refund' }

  await logRefundStatusChange(refundId, 'requested', 'under_review', staffId, staffName)
  await updateBookingRefundStatus(refund.booking_id, 'under_review')

  return { success: true }
}

/**
 * Approve a refund
 */
export async function approveRefund(
  refundId: string,
  tenantId: string,
  staffId: string,
  staffName: string,
  approvedAmount: number,
  overrideReason?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const refund = await getRefundById(refundId, tenantId)
  if (!refund) return { success: false, error: 'Refund not found' }
  if (!['requested', 'under_review'].includes(refund.status)) {
    return { success: false, error: 'Can only approve refunds in requested or under_review status' }
  }

  // Check if override reason is required
  if (approvedAmount !== refund.eligible_amount && !overrideReason) {
    return { success: false, error: 'Override reason required when amount differs from eligible amount' }
  }

  const { error } = await supabase
    .from('refunds')
    .update({
      status: 'approved',
      approved_amount: approvedAmount,
      override_reason: overrideReason || null,
      staff_notes: notes || refund.staff_notes,
      approved_at: new Date().toISOString(),
      approved_by: staffId
    })
    .eq('id', refundId)

  if (error) return { success: false, error: 'Failed to approve refund' }

  await logRefundStatusChange(
    refundId,
    refund.status,
    'approved',
    staffId,
    staffName,
    `Approved for ${approvedAmount}${overrideReason ? ` (Override: ${overrideReason})` : ''}`
  )
  await updateBookingRefundStatus(refund.booking_id, 'approved')

  return { success: true }
}

/**
 * Reject a refund
 */
export async function rejectRefund(
  refundId: string,
  tenantId: string,
  staffId: string,
  staffName: string,
  rejectionReason: string
): Promise<{ success: boolean; error?: string }> {
  const refund = await getRefundById(refundId, tenantId)
  if (!refund) return { success: false, error: 'Refund not found' }
  if (!['requested', 'under_review'].includes(refund.status)) {
    return { success: false, error: 'Can only reject refunds in requested or under_review status' }
  }

  if (!rejectionReason) {
    return { success: false, error: 'Rejection reason is required' }
  }

  const { error } = await supabase
    .from('refunds')
    .update({
      status: 'rejected',
      rejection_reason: rejectionReason,
      rejected_at: new Date().toISOString(),
      rejected_by: staffId
    })
    .eq('id', refundId)

  if (error) return { success: false, error: 'Failed to reject refund' }

  await logRefundStatusChange(refundId, refund.status, 'rejected', staffId, staffName, rejectionReason)
  await updateBookingRefundStatus(refund.booking_id, 'rejected')

  return { success: true }
}

/**
 * Mark refund as processing (before actual refund attempt)
 */
export async function markRefundProcessing(
  refundId: string,
  tenantId: string,
  staffId: string,
  staffName: string
): Promise<{ success: boolean; error?: string }> {
  const refund = await getRefundById(refundId, tenantId)
  if (!refund) return { success: false, error: 'Refund not found' }
  if (refund.status !== 'approved') {
    return { success: false, error: 'Can only process approved refunds' }
  }

  const { error } = await supabase
    .from('refunds')
    .update({
      status: 'processing',
      processed_at: new Date().toISOString(),
      processed_by: staffId
    })
    .eq('id', refundId)

  if (error) return { success: false, error: 'Failed to update refund' }

  await logRefundStatusChange(refundId, 'approved', 'processing', staffId, staffName)
  await updateBookingRefundStatus(refund.booking_id, 'processing')

  return { success: true }
}

/**
 * Mark refund as completed (after successful processing)
 */
export async function completeRefund(
  refundId: string,
  tenantId: string,
  staffId: string,
  staffName: string,
  processedAmount: number,
  refundReference?: string
): Promise<{ success: boolean; error?: string }> {
  const refund = await getRefundById(refundId, tenantId)
  if (!refund) return { success: false, error: 'Refund not found' }
  if (!['approved', 'processing'].includes(refund.status)) {
    return { success: false, error: 'Can only complete approved or processing refunds' }
  }

  const { error } = await supabase
    .from('refunds')
    .update({
      status: 'completed',
      processed_amount: processedAmount,
      refund_reference: refundReference || null,
      completed_at: new Date().toISOString()
    })
    .eq('id', refundId)

  if (error) return { success: false, error: 'Failed to complete refund' }

  // Update booking payment status to refunded
  await supabase
    .from('bookings')
    .update({
      payment_status: 'refunded',
      refund_status: 'completed'
    })
    .eq('id', refund.booking_id)

  await logRefundStatusChange(
    refundId,
    refund.status,
    'completed',
    staffId,
    staffName,
    `Refund processed: ${processedAmount}${refundReference ? ` (Ref: ${refundReference})` : ''}`
  )

  return { success: true }
}

/**
 * Mark refund as failed
 */
export async function failRefund(
  refundId: string,
  tenantId: string,
  staffId: string,
  staffName: string,
  failureReason: string
): Promise<{ success: boolean; error?: string }> {
  const refund = await getRefundById(refundId, tenantId)
  if (!refund) return { success: false, error: 'Refund not found' }
  if (refund.status !== 'processing') {
    return { success: false, error: 'Can only fail processing refunds' }
  }

  const { error } = await supabase
    .from('refunds')
    .update({
      status: 'failed',
      failure_reason: failureReason,
      failed_at: new Date().toISOString()
    })
    .eq('id', refundId)

  if (error) return { success: false, error: 'Failed to update refund' }

  await logRefundStatusChange(refundId, 'processing', 'failed', staffId, staffName, failureReason)
  await updateBookingRefundStatus(refund.booking_id, 'failed')

  return { success: true }
}

/**
 * Get status history for a refund
 */
export async function getRefundStatusHistory(refundId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('refund_status_history')
    .select('*')
    .eq('refund_id', refundId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[RefundService] Error fetching status history:', error)
    return []
  }

  return data || []
}

// ============================================
// PAYSTACK REFUND PROCESSING
// ============================================

/**
 * Process refund via Paystack API
 */
export async function processPaystackRefund(
  refundId: string,
  tenantId: string,
  staffId: string,
  staffName: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const refund = await getRefundById(refundId, tenantId)
  if (!refund) return { success: false, error: 'Refund not found' }
  if (refund.status !== 'approved') {
    return { success: false, error: 'Can only process approved refunds' }
  }
  if (refund.payment_method !== 'paystack') {
    return { success: false, error: 'This refund is not for a Paystack payment' }
  }
  if (!refund.original_payment_reference) {
    return { success: false, error: 'Original payment reference not found' }
  }

  // Get tenant's Paystack credentials
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('paystack_mode, paystack_test_secret_key, paystack_live_secret_key')
    .eq('id', tenantId)
    .single()

  if (tenantError || !tenant) {
    return { success: false, error: 'Tenant not found' }
  }

  const secretKey = tenant.paystack_mode === 'live'
    ? tenant.paystack_live_secret_key
    : tenant.paystack_test_secret_key

  if (!secretKey) {
    return { success: false, error: 'Paystack not configured for this tenant' }
  }

  // Mark as processing first
  await markRefundProcessing(refundId, tenantId, staffId, staffName)

  try {
    // Call Paystack Refund API
    const refundAmount = refund.approved_amount || refund.eligible_amount
    const amountInKobo = Math.round(refundAmount * 100) // Convert to kobo/cents

    const response = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transaction: refund.original_payment_reference,
        amount: amountInKobo,
        currency: refund.currency,
        customer_note: 'Refund for cancelled booking',
        merchant_note: `Refund ID: ${refundId}`
      })
    })

    const result = await response.json() as {
      status: boolean
      message?: string
      data?: { id?: number | string }
    }

    if (!result.status) {
      // Mark as failed
      await failRefund(refundId, tenantId, staffId, staffName, result.message || 'Paystack refund failed')
      return { success: false, error: result.message || 'Paystack refund failed' }
    }

    // Mark as completed
    await completeRefund(
      refundId,
      tenantId,
      staffId,
      staffName,
      refundAmount,
      result.data?.id?.toString()
    )

    return { success: true, data: result.data }
  } catch (error: any) {
    console.error('[RefundService] Paystack refund error:', error)
    await failRefund(refundId, tenantId, staffId, staffName, error.message || 'Network error')
    return { success: false, error: 'Failed to process Paystack refund' }
  }
}

// ============================================
// ESCALATION
// ============================================

/**
 * Get pending refunds for escalation alerts
 */
export async function getPendingRefundsForEscalation(
  tenantId: string,
  hoursThreshold: number = 24
): Promise<any[]> {
  const thresholdDate = new Date()
  thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold)

  const { data, error } = await supabase
    .from('refunds')
    .select(`
      *,
      bookings:booking_id (
        guest_name,
        guest_email,
        room_name
      )
    `)
    .eq('tenant_id', tenantId)
    .in('status', ['requested', 'approved'])
    .lt('requested_at', thresholdDate.toISOString())

  if (error) {
    console.error('[RefundService] Error fetching pending refunds:', error)
    return []
  }

  return data || []
}

// ============================================
// CUSTOMER PORTAL
// ============================================

/**
 * Get refunds for a customer
 */
export async function getRefundsByCustomer(
  customerId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from('refunds')
    .select(`
      id,
      booking_id,
      original_amount,
      eligible_amount,
      approved_amount,
      processed_amount,
      currency,
      status,
      refund_percentage,
      requested_at,
      approved_at,
      completed_at,
      rejected_at,
      rejection_reason,
      bookings:booking_id (
        room_name,
        check_in,
        check_out,
        tenants:tenant_id (
          business_name
        )
      )
    `)
    .eq('customer_id', customerId)
    .order('requested_at', { ascending: false })

  if (error) {
    console.error('[RefundService] Error fetching customer refunds:', error)
    return []
  }

  return data || []
}

/**
 * Get refund for a specific booking (customer portal)
 */
export async function getRefundByBookingForCustomer(
  bookingId: string,
  customerId: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from('refunds')
    .select(`
      id,
      booking_id,
      original_amount,
      eligible_amount,
      approved_amount,
      processed_amount,
      currency,
      status,
      refund_percentage,
      policy_applied,
      days_before_checkin,
      requested_at,
      approved_at,
      completed_at,
      rejected_at,
      rejection_reason
    `)
    .eq('booking_id', bookingId)
    .eq('customer_id', customerId)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Update staff notes on a refund
 */
export async function updateStaffNotes(
  refundId: string,
  tenantId: string,
  staffNotes: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('refunds')
    .update({ staff_notes: staffNotes })
    .eq('id', refundId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[RefundService] Error updating staff notes:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
