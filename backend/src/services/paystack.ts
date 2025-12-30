import { type PaystackCurrency } from './currency.js'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const PAYSTACK_BASE_URL = 'https://api.paystack.co'

// Fixed prices in ZAR cents
export const PRICES_ZAR = {
  lifetime: 199900,   // R1,999
  monthly: 49900,     // R499
  annual: 499900,     // R4,999
}

// Base prices in USD cents (for reference)
export const PRICES_USD = {
  lifetime: 9900,    // $99
  monthly: 2900,     // $29
  annual: 29900,     // $299
}

interface PaystackInitializeResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

interface PaystackVerifyResponse {
  status: boolean
  message: string
  data: {
    id: number
    status: 'success' | 'failed' | 'abandoned'
    reference: string
    amount: number
    currency: string
    customer: {
      email: string
      customer_code: string
    }
    metadata: Record<string, string>
  }
}

export async function initializeTransaction(
  email: string,
  callbackUrl: string,
  metadata: { tenant_id: string; user_id: string; plan: string },
  currency: PaystackCurrency = 'ZAR'
): Promise<{ success: boolean; data?: PaystackInitializeResponse['data']; error?: string }> {
  if (!PAYSTACK_SECRET_KEY) {
    return { success: false, error: 'Paystack secret key not configured' }
  }

  try {
    const plan = metadata.plan as keyof typeof PRICES_ZAR
    // Use fixed ZAR prices
    const amount = PRICES_ZAR[plan] || PRICES_ZAR.lifetime

    const response = await fetch(PAYSTACK_BASE_URL + '/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + PAYSTACK_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount,
        currency: 'ZAR',
        callback_url: callbackUrl,
        metadata: {
          ...metadata,
          amount_zar: amount,
        },
      }),
    })

    const result = (await response.json()) as PaystackInitializeResponse

    if (!result.status) {
      return { success: false, error: result.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Paystack initialize error:', error)
    return { success: false, error: 'Failed to initialize payment' }
  }
}

export async function verifyTransaction(
  reference: string
): Promise<{ success: boolean; data?: PaystackVerifyResponse['data']; error?: string }> {
  if (!PAYSTACK_SECRET_KEY) {
    return { success: false, error: 'Paystack secret key not configured' }
  }

  try {
    const response = await fetch(PAYSTACK_BASE_URL + '/transaction/verify/' + reference, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + PAYSTACK_SECRET_KEY,
      },
    })

    const result = (await response.json()) as PaystackVerifyResponse

    if (!result.status) {
      return { success: false, error: result.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Paystack verify error:', error)
    return { success: false, error: 'Failed to verify payment' }
  }
}

// Returns fixed ZAR prices
export async function getPricesInCurrency(currency: PaystackCurrency = 'ZAR') {
  return {
    lifetime: { amount: PRICES_ZAR.lifetime, currency: 'ZAR' },
    monthly: { amount: PRICES_ZAR.monthly, currency: 'ZAR' },
    annual: { amount: PRICES_ZAR.annual, currency: 'ZAR' },
    currency: 'ZAR',
  }
}
