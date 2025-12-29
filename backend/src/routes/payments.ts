import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { initializeTransaction, verifyTransaction, LIFETIME_PRICE_CENTS, LIFETIME_CURRENCY } from '../services/paystack.js'

const router = Router()
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// Initialize a payment
// Requires: Authorization header with Supabase JWT
router.post('/initialize', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get or create tenant
    let { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_user_id', user.id)
      .single()

    if (!tenant) {
      // Create tenant if doesn't exist
      const { data: newTenant, error: createError } = await supabase
        .from('tenants')
        .insert({
          owner_user_id: user.id,
          has_lifetime_access: false,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating tenant:', createError)
        return res.status(500).json({ error: 'Failed to create tenant' })
      }
      tenant = newTenant
    }

    // Check if already has lifetime access
    if (tenant.has_lifetime_access) {
      return res.status(400).json({ error: 'You already have lifetime access' })
    }

    // Initialize Paystack transaction
    const callbackUrl = `${FRONTEND_URL}/payment/callback`
    const result = await initializeTransaction(
      user.email!,
      callbackUrl,
      { tenant_id: tenant.id, user_id: user.id }
    )

    if (!result.success || !result.data) {
      return res.status(500).json({ error: result.error || 'Failed to initialize payment' })
    }

    // Store payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: tenant.id,
        amount: LIFETIME_PRICE_CENTS,
        currency: LIFETIME_CURRENCY,
        paystack_reference: result.data.reference,
        status: 'pending',
      })

    if (paymentError) {
      console.error('Error storing payment:', paymentError)
      // Don't fail - payment can still proceed
    }

    res.json({
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
    })
  } catch (error) {
    console.error('Error in POST /payments/initialize:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Verify a payment
router.get('/verify/:reference', async (req: Request, res: Response) => {
  const { reference } = req.params
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Verify with Paystack
    const result = await verifyTransaction(reference)

    if (!result.success || !result.data) {
      return res.status(400).json({ error: result.error || 'Payment verification failed' })
    }

    const paymentData = result.data

    // Check payment was successful
    if (paymentData.status !== 'success') {
      // Update payment status
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('paystack_reference', reference)

      return res.status(400).json({
        error: 'Payment was not successful',
        status: paymentData.status
      })
    }

    // Get tenant from metadata
    const tenantId = paymentData.metadata?.tenant_id

    if (!tenantId) {
      return res.status(400).json({ error: 'Invalid payment metadata' })
    }

    // Verify this payment belongs to the authenticated user
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .eq('owner_user_id', user.id)
      .single()

    if (!tenant) {
      return res.status(403).json({ error: 'Payment does not belong to this user' })
    }

    // Update payment status
    await supabase
      .from('payments')
      .update({ status: 'success' })
      .eq('paystack_reference', reference)

    // Grant lifetime access
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        has_lifetime_access: true,
        paystack_customer_code: paymentData.customer.customer_code,
      })
      .eq('id', tenantId)

    if (updateError) {
      console.error('Error updating tenant:', updateError)
      return res.status(500).json({ error: 'Failed to grant access' })
    }

    res.json({
      success: true,
      message: 'Payment verified successfully. You now have lifetime access!',
    })
  } catch (error) {
    console.error('Error in GET /payments/verify:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Paystack webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  // Verify webhook signature (optional but recommended)
  // const hash = crypto.createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
  //   .update(JSON.stringify(req.body)).digest('hex')
  // if (hash !== req.headers['x-paystack-signature']) {
  //   return res.status(400).json({ error: 'Invalid signature' })
  // }

  const { event, data } = req.body

  if (event === 'charge.success') {
    const { reference, metadata } = data
    const tenantId = metadata?.tenant_id

    if (tenantId) {
      // Update payment status
      await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('paystack_reference', reference)

      // Grant lifetime access
      await supabase
        .from('tenants')
        .update({
          has_lifetime_access: true,
          paystack_customer_code: data.customer?.customer_code,
        })
        .eq('id', tenantId)

      console.log(`Webhook: Granted lifetime access to tenant ${tenantId}`)
    }
  }

  // Always respond 200 to acknowledge receipt
  res.status(200).json({ received: true })
})

export default router
