const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const PAYSTACK_BASE_URL = 'https://api.paystack.co'

// Lifetime access price: $99 USD = 9900 cents
export const LIFETIME_PRICE_CENTS = 9900
export const LIFETIME_CURRENCY = 'USD'

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
  metadata: { tenant_id: string; user_id: string }
): Promise<{ success: boolean; data?: PaystackInitializeResponse['data']; error?: string }> {
  if (!PAYSTACK_SECRET_KEY) {
    return { success: false, error: 'Paystack secret key not configured' }
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: LIFETIME_PRICE_CENTS,
        currency: LIFETIME_CURRENCY,
        callback_url: callbackUrl,
        metadata,
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
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
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
