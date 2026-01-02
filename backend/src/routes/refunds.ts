import { Router, Request, Response } from 'express'
import {
  getRefundsByTenant,
  getRefundById,
  getRefundStats,
  getRefundStatusHistory,
  createRefundFromCancellation,
  markRefundUnderReview,
  approveRefund,
  rejectRefund,
  completeRefund,
  processPaystackRefund,
  calculateEligibleRefund,
  updateStaffNotes,
  CancellationPolicy
} from '../services/refundService.js'
import { supabase } from '../lib/supabase.js'
import {
  notifyRefundRequested,
  notifyRefundApproved,
  notifyRefundRejected,
  notifyRefundCompleted
} from '../services/notificationService.js'

const router = Router()

// ============================================
// LIST & STATS
// ============================================

/**
 * Get all refunds for a tenant (with filters)
 * GET /api/refunds
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    console.log('[Refunds] GET / - tenantId:', tenantId)
    console.log('[Refunds] GET / - all headers:', JSON.stringify(req.headers, null, 2))
    if (!tenantId) {
      console.error('[Refunds] GET / - No tenant ID in request headers!')
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { status, date_from, date_to, search, limit, offset } = req.query
    console.log('[Refunds] GET / - filters:', { status, date_from, date_to, search, limit, offset })

    const { data, count } = await getRefundsByTenant(tenantId, {
      status: status as any,
      dateFrom: date_from as string,
      dateTo: date_to as string,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    })

    console.log('[Refunds] GET / - returned', data.length, 'refunds, count:', count)
    if (data.length > 0) {
      console.log('[Refunds] GET / - first refund:', JSON.stringify(data[0], null, 2))
    } else {
      console.log('[Refunds] GET / - No refunds found for tenant:', tenantId)
    }
    res.json({ data, count })
  } catch (error: any) {
    console.error('[Refunds] Error fetching refunds:', error)
    console.error('[Refunds] Error stack:', error.stack)
    res.status(500).json({ error: 'Failed to fetch refunds' })
  }
})

/**
 * Get refund statistics
 * GET /api/refunds/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const stats = await getRefundStats(tenantId)
    res.json(stats)
  } catch (error: any) {
    console.error('[Refunds] Error fetching stats:', error)
    res.status(500).json({ error: 'Failed to fetch refund stats' })
  }
})

/**
 * Calculate eligible refund for a booking (preview)
 * POST /api/refunds/calculate
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { booking_id } = req.body
    if (!booking_id) {
      return res.status(400).json({ error: 'Booking ID required' })
    }

    // Get booking and tenant policies
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        tenants:tenant_id (
          cancellation_policies
        )
      `)
      .eq('id', booking_id)
      .eq('tenant_id', tenantId)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    const policies: CancellationPolicy[] = (booking.tenants as any)?.cancellation_policies || [
      { days_before: 7, refund_percentage: 100, label: 'Free cancellation up to 7 days before' }
    ]

    const checkInDate = new Date(booking.check_in)
    const cancellationDate = booking.cancelled_at ? new Date(booking.cancelled_at) : new Date()

    const calculation = calculateEligibleRefund(
      parseFloat(booking.total_amount),
      checkInDate,
      policies,
      cancellationDate
    )

    res.json({
      booking_id,
      currency: booking.currency || 'ZAR',
      ...calculation
    })
  } catch (error: any) {
    console.error('[Refunds] Error calculating refund:', error)
    res.status(500).json({ error: 'Failed to calculate refund' })
  }
})

// ============================================
// SINGLE REFUND
// ============================================

/**
 * Get single refund by ID
 * GET /api/refunds/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { id } = req.params
    const refund = await getRefundById(id, tenantId)

    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' })
    }

    res.json(refund)
  } catch (error: any) {
    console.error('[Refunds] Error fetching refund:', error)
    res.status(500).json({ error: 'Failed to fetch refund' })
  }
})

/**
 * Get refund status history
 * GET /api/refunds/:id/history
 */
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { id } = req.params

    // Verify refund belongs to tenant
    const refund = await getRefundById(id, tenantId)
    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' })
    }

    const history = await getRefundStatusHistory(id)
    res.json(history)
  } catch (error: any) {
    console.error('[Refunds] Error fetching history:', error)
    res.status(500).json({ error: 'Failed to fetch refund history' })
  }
})

// ============================================
// CREATE REFUND
// ============================================

/**
 * Create refund from booking
 * POST /api/refunds
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { booking_id } = req.body
    if (!booking_id) {
      return res.status(400).json({ error: 'Booking ID required' })
    }

    // Verify booking belongs to tenant and is cancelled
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('tenant_id', tenantId)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    if (booking.status !== 'cancelled') {
      return res.status(400).json({ error: 'Can only create refund for cancelled bookings' })
    }

    const result = await createRefundFromCancellation(booking_id, tenantId)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    // Send notification
    try {
      await notifyRefundRequested(tenantId, {
        refund_id: result.refund!.id,
        booking_id,
        guest_name: booking.guest_name,
        amount: result.refund!.eligible_amount,
        currency: result.refund!.currency
      })
    } catch (notifyError) {
      console.error('[Refunds] Failed to send notification:', notifyError)
    }

    res.status(201).json(result.refund)
  } catch (error: any) {
    console.error('[Refunds] Error creating refund:', error)
    res.status(500).json({ error: 'Failed to create refund' })
  }
})

// ============================================
// STATUS WORKFLOW
// ============================================

/**
 * Mark refund as under review
 * PATCH /api/refunds/:id/review
 */
router.patch('/:id/review', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const staffId = req.headers['x-user-id'] as string
    const staffName = req.headers['x-user-name'] as string || 'Staff'

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { id } = req.params
    const result = await markRefundUnderReview(id, tenantId, staffId, staffName)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.json({ success: true, message: 'Refund marked as under review' })
  } catch (error: any) {
    console.error('[Refunds] Error updating refund:', error)
    res.status(500).json({ error: 'Failed to update refund' })
  }
})

/**
 * Approve refund
 * PATCH /api/refunds/:id/approve
 */
router.patch('/:id/approve', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const staffId = req.headers['x-user-id'] as string
    const staffName = req.headers['x-user-name'] as string || 'Staff'

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { id } = req.params
    const { approved_amount, override_reason, notes } = req.body

    if (approved_amount === undefined || approved_amount === null) {
      return res.status(400).json({ error: 'Approved amount is required' })
    }

    const result = await approveRefund(id, tenantId, staffId, staffName, approved_amount, override_reason, notes)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    // Get refund and send notification
    const refund = await getRefundById(id, tenantId)
    if (refund && refund.customer_id) {
      try {
        await notifyRefundApproved(tenantId, refund.customer_id, {
          refund_id: id,
          amount: approved_amount,
          currency: refund.currency
        })
      } catch (notifyError) {
        console.error('[Refunds] Failed to send notification:', notifyError)
      }
    }

    res.json({ success: true, message: 'Refund approved' })
  } catch (error: any) {
    console.error('[Refunds] Error approving refund:', error)
    res.status(500).json({ error: 'Failed to approve refund' })
  }
})

/**
 * Reject refund
 * PATCH /api/refunds/:id/reject
 */
router.patch('/:id/reject', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const staffId = req.headers['x-user-id'] as string
    const staffName = req.headers['x-user-name'] as string || 'Staff'

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { id } = req.params
    const { rejection_reason } = req.body

    if (!rejection_reason) {
      return res.status(400).json({ error: 'Rejection reason is required' })
    }

    const result = await rejectRefund(id, tenantId, staffId, staffName, rejection_reason)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    // Get refund and send notification
    const refund = await getRefundById(id, tenantId)
    if (refund && refund.customer_id) {
      try {
        await notifyRefundRejected(tenantId, refund.customer_id, {
          refund_id: id,
          reason: rejection_reason
        })
      } catch (notifyError) {
        console.error('[Refunds] Failed to send notification:', notifyError)
      }
    }

    res.json({ success: true, message: 'Refund rejected' })
  } catch (error: any) {
    console.error('[Refunds] Error rejecting refund:', error)
    res.status(500).json({ error: 'Failed to reject refund' })
  }
})

// ============================================
// PROCESSING
// ============================================

/**
 * Process refund (Paystack, EFT, PayPal, or manual)
 * POST /api/refunds/:id/process
 */
router.post('/:id/process', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const staffId = req.headers['x-user-id'] as string
    const staffName = req.headers['x-user-name'] as string || 'Staff'

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { id } = req.params
    const { method } = req.body // 'paystack', 'eft', 'paypal', or 'manual'

    const refund = await getRefundById(id, tenantId)
    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' })
    }

    if (refund.status !== 'approved') {
      return res.status(400).json({ error: 'Can only process approved refunds' })
    }

    // Update the refund with the selected payment method and mark as processing
    await supabase
      .from('refunds')
      .update({
        payment_method: method,
        status: 'processing',
        processed_by: staffId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (method === 'paystack' && refund.payment_method === 'paystack') {
      // Process via Paystack API
      const result = await processPaystackRefund(id, tenantId, staffId, staffName)

      if (!result.success) {
        return res.status(400).json({ error: result.error })
      }

      // Send notification
      if (refund.customer_id) {
        try {
          await notifyRefundCompleted(tenantId, refund.customer_id, {
            refund_id: id,
            amount: refund.approved_amount || refund.eligible_amount,
            currency: refund.currency
          })
        } catch (notifyError) {
          console.error('[Refunds] Failed to send notification:', notifyError)
        }
      }

      res.json({ success: true, message: 'Refund processed via Paystack', data: result.data })
    } else {
      // EFT, PayPal, or Manual processing - return info, staff will complete manually
      const methodLabels: Record<string, string> = {
        eft: 'EFT (Bank Transfer)',
        paypal: 'PayPal',
        manual: 'Manual'
      }

      res.json({
        success: true,
        message: `Refund marked for ${methodLabels[method] || method} processing. Complete the transfer and mark as complete.`,
        refund: {
          id: refund.id,
          amount: refund.approved_amount || refund.eligible_amount,
          currency: refund.currency,
          payment_method: method,
          original_reference: refund.original_payment_reference
        }
      })
    }
  } catch (error: any) {
    console.error('[Refunds] Error processing refund:', error)
    res.status(500).json({ error: 'Failed to process refund' })
  }
})

/**
 * Complete manual refund
 * POST /api/refunds/:id/complete
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const staffId = req.headers['x-user-id'] as string
    const staffName = req.headers['x-user-name'] as string || 'Staff'

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { id } = req.params
    const { processed_amount, refund_reference } = req.body

    if (processed_amount === undefined) {
      return res.status(400).json({ error: 'Processed amount is required' })
    }

    const result = await completeRefund(id, tenantId, staffId, staffName, processed_amount, refund_reference)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    // Get refund and send notification
    const refund = await getRefundById(id, tenantId)
    if (refund && refund.customer_id) {
      try {
        await notifyRefundCompleted(tenantId, refund.customer_id, {
          refund_id: id,
          amount: processed_amount,
          currency: refund.currency
        })
      } catch (notifyError) {
        console.error('[Refunds] Failed to send notification:', notifyError)
      }
    }

    res.json({ success: true, message: 'Refund completed' })
  } catch (error: any) {
    console.error('[Refunds] Error completing refund:', error)
    res.status(500).json({ error: 'Failed to complete refund' })
  }
})

/**
 * Update staff notes
 * PATCH /api/refunds/:id/notes
 */
router.patch('/:id/notes', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { id } = req.params
    const { staff_notes } = req.body

    if (staff_notes === undefined) {
      return res.status(400).json({ error: 'Staff notes are required' })
    }

    const result = await updateStaffNotes(id, tenantId, staff_notes)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.json({ success: true })
  } catch (error: any) {
    console.error('[Refunds] Error updating staff notes:', error)
    res.status(500).json({ error: 'Failed to update staff notes' })
  }
})

export default router
