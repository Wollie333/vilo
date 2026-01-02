// Currency conversion service with live exchange rates
// Uses ExchangeRate-API (free tier: 1500 requests/month)

interface ExchangeRates {
  base: string
  rates: Record<string, number>
  lastUpdated: number
}

let cachedRates: ExchangeRates | null = null
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour cache

// Free exchange rate API (no key required for basic usage)
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD'

export async function getExchangeRates(): Promise<ExchangeRates> {
  // Return cached rates if still valid
  if (cachedRates && Date.now() - cachedRates.lastUpdated < CACHE_DURATION) {
    return cachedRates
  }

  try {
    const response = await fetch(EXCHANGE_API_URL)
    const data = await response.json() as { rates: Record<string, number> }

    cachedRates = {
      base: 'USD',
      rates: data.rates,
      lastUpdated: Date.now(),
    }

    return cachedRates
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)

    // Return fallback rates if API fails
    if (cachedRates) {
      return cachedRates
    }

    // Hardcoded fallback rates (approximate)
    return {
      base: 'USD',
      rates: {
        ZAR: 18.50,
        NGN: 1550,
        GHS: 15.50,
        KES: 153,
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
      },
      lastUpdated: Date.now(),
    }
  }
}

export async function convertCurrency(
  amountInCents: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amountInCents
  }

  const rates = await getExchangeRates()

  // Convert to USD first (base currency)
  let amountInUSD = amountInCents
  if (fromCurrency !== 'USD') {
    const fromRate = rates.rates[fromCurrency]
    if (!fromRate) {
      throw new Error(`Unsupported currency: ${fromCurrency}`)
    }
    amountInUSD = amountInCents / fromRate
  }

  // Convert from USD to target currency
  const toRate = rates.rates[toCurrency]
  if (!toRate) {
    throw new Error(`Unsupported currency: ${toCurrency}`)
  }

  // Round to nearest whole cent
  return Math.round(amountInUSD * toRate)
}

export async function getConvertedPrice(
  usdAmountInCents: number,
  targetCurrency: string
): Promise<{ amount: number; currency: string; rate: number }> {
  const rates = await getExchangeRates()
  const rate = rates.rates[targetCurrency] || 1
  const convertedAmount = Math.round(usdAmountInCents * rate)

  return {
    amount: convertedAmount,
    currency: targetCurrency,
    rate,
  }
}

// Paystack supported currencies
export const PAYSTACK_CURRENCIES = ['NGN', 'GHS', 'ZAR', 'USD', 'KES'] as const
export type PaystackCurrency = typeof PAYSTACK_CURRENCIES[number]

export function isPaystackCurrency(currency: string): currency is PaystackCurrency {
  return PAYSTACK_CURRENCIES.includes(currency as PaystackCurrency)
}

// Get best Paystack currency based on user locale/preference
export function getBestPaystackCurrency(preferredCurrency?: string): PaystackCurrency {
  if (preferredCurrency && isPaystackCurrency(preferredCurrency)) {
    return preferredCurrency
  }
  // Default to ZAR for South African users
  return 'ZAR'
}
