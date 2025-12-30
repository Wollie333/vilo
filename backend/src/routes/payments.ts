import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { initializeTransaction, verifyTransaction, getPricesInCurrency, PRICES_USD } from '../services/paystack.js'
import { type PaystackCurrency, PAYSTACK_CURRENCIES } from '../services/currency.js'

const router = Router()
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

router.get('/prices', async (req: Request, res: Response) => {
  try {
    const prices = await getPricesInCurrency('ZAR')
    res.json({
      ...prices,
      baseCurrency: 'ZAR',
    })
  } catch (error) {
    console.error('Error fetching prices:', error)
    res.status(500).json({ error: 'Failed to fetch prices' })
  }
})

router.post('/initialize', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }
  const token = authHeader.split(' ')[1]
  const { plan = 'lifetime', currency = 'ZAR' } = req.body
  if (!PAYSTACK_CURRENCIES.includes(currency)) {
    return res.status(400).json({ error: 'Invalid currency. Supported: NGN, GHS, ZAR, USD, KES' })
  }
  if (!['lifetime', 'monthly', 'annual'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan. Must be: lifetime, monthly, or annual' })
  }
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    let { data: tenant } = await supabase.from('tenants').select('*').eq('owner_user_id', user.id).single()
    if (!tenant) {
      const { data: newTenant, error: createError } = await supabase.from('tenants').insert({ owner_user_id: user.id, has_lifetime_access: false }).select().single()
      if (createError) {
        console.error('Error creating tenant:', createError)
        return res.status(500).json({ error: 'Failed to create tenant' })
      }
      tenant = newTenant
    }
    if (tenant.has_lifetime_access && plan === 'lifetime') {
      return res.status(400).json({ error: 'You already have lifetime access' })
    }
    const callbackUrl = FRONTEND_URL + '/payment/callback'
    const result = await initializeTransaction(user.email, callbackUrl, { tenant_id: tenant.id, user_id: user.id, plan }, currency as PaystackCurrency)
    if (!result.success || !result.data) {
      return res.status(500).json({ error: result.error || 'Failed to initialize payment' })
    }
    const prices = await getPricesInCurrency(currency as PaystackCurrency)
    const chargedAmount = (prices as any)[plan]?.amount || 0
    const { error: paymentError } = await supabase.from('payments').insert({ tenant_id: tenant.id, amount: chargedAmount, currency: currency, paystack_reference: result.data.reference, status: 'pending' })
    if (paymentError) { console.error('Error storing payment:', paymentError) }
    res.json({ authorization_url: result.data.authorization_url, reference: result.data.reference, amount: chargedAmount, currency: currency })
  } catch (error) {
    console.error('Error in POST /payments/initialize:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/verify/:reference', async (req: Request, res: Response) => {
  const { reference } = req.params
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) { return res.status(401).json({ error: 'Invalid token' }) }
    const result = await verifyTransaction(reference)
    if (!result.success || !result.data) {
      return res.status(400).json({ error: result.error || 'Payment verification failed' })
    }
    const paymentData = result.data
    if (paymentData.status !== 'success') {
      await supabase.from('payments').update({ status: 'failed' }).eq('paystack_reference', reference)
      return res.status(400).json({ error: 'Payment was not successful', status: paymentData.status })
    }
    const tenantId = paymentData.metadata?.tenant_id
    if (!tenantId) { return res.status(400).json({ error: 'Invalid payment metadata' }) }
    const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).eq('owner_user_id', user.id).single()
    if (!tenant) { return res.status(403).json({ error: 'Payment does not belong to this user' }) }
    await supabase.from('payments').update({ status: 'success' }).eq('paystack_reference', reference)
    const plan = paymentData.metadata?.plan || 'lifetime'
    if (plan === 'lifetime') {
      const { error: updateError } = await supabase.from('tenants').update({ has_lifetime_access: true, paystack_customer_code: paymentData.customer.customer_code }).eq('id', tenantId)
      if (updateError) {
        console.error('Error updating tenant:', updateError)
        return res.status(500).json({ error: 'Failed to grant access' })
      }
    }
    res.json({ success: true, message: plan === 'lifetime' ? 'Payment verified! Lifetime access granted!' : 'Payment verified! Subscription active!', plan })
  } catch (error) {
    console.error('Error in GET /payments/verify:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/webhook', async (req: Request, res: Response) => {
  const { event, data } = req.body
  if (event === 'charge.success') {
    const { reference, metadata } = data
    const tenantId = metadata?.tenant_id
    const plan = metadata?.plan || 'lifetime'
    if (tenantId) {
      await supabase.from('payments').update({ status: 'success' }).eq('paystack_reference', reference)
      if (plan === 'lifetime') {
        await supabase.from('tenants').update({ has_lifetime_access: true, paystack_customer_code: data.customer?.customer_code }).eq('id', tenantId)
        console.log('Webhook: Granted lifetime access to tenant ' + tenantId)
      }
    }
  }
  res.status(200).json({ received: true })
})

export default router
