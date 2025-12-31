import { useState, useEffect, useRef } from 'react'
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export default function PaymentIntegration() {
  const { session, tenant } = useAuth()

  // Toggle debounce to prevent accidental double-clicks
  const lastToggleRef = useRef<{ [key: string]: number }>({})
  const canToggle = (key: string) => {
    const now = Date.now()
    const lastToggle = lastToggleRef.current[key] || 0
    if (now - lastToggle < 300) return false
    lastToggleRef.current[key] = now
    return true
  }

  // Paystack
  const [paystackEnabled, setPaystackEnabled] = useState(false)
  const [paystackMode, setPaystackMode] = useState<'test' | 'live'>('test')
  const [paystackTestPublicKey, setPaystackTestPublicKey] = useState('')
  const [paystackTestSecretKey, setPaystackTestSecretKey] = useState('')
  const [paystackLivePublicKey, setPaystackLivePublicKey] = useState('')
  const [paystackLiveSecretKey, setPaystackLiveSecretKey] = useState('')
  const [showPaystackSecretKey, setShowPaystackSecretKey] = useState(false)
  const [paystackLoading, setPaystackLoading] = useState(false)
  const [paystackMessage, setPaystackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // EFT/Bank Details
  const [eftEnabled, setEftEnabled] = useState(false)
  const [eftAccountHolder, setEftAccountHolder] = useState('')
  const [eftBankName, setEftBankName] = useState('')
  const [eftAccountNumber, setEftAccountNumber] = useState('')
  const [eftBranchCode, setEftBranchCode] = useState('')
  const [eftAccountType, setEftAccountType] = useState<'cheque' | 'savings' | 'current'>('cheque')
  const [eftSwiftCode, setEftSwiftCode] = useState('')
  const [eftReferenceInstructions, setEftReferenceInstructions] = useState('')
  const [eftLoading, setEftLoading] = useState(false)
  const [eftMessage, setEftMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // PayPal
  const [paypalEnabled, setPaypalEnabled] = useState(false)
  const [paypalMode, setPaypalMode] = useState<'sandbox' | 'live'>('sandbox')
  const [paypalSandboxClientId, setPaypalSandboxClientId] = useState('')
  const [paypalSandboxSecret, setPaypalSandboxSecret] = useState('')
  const [paypalLiveClientId, setPaypalLiveClientId] = useState('')
  const [paypalLiveSecret, setPaypalLiveSecret] = useState('')
  const [showPaypalSecret, setShowPaypalSecret] = useState(false)
  const [paypalLoading, setPaypalLoading] = useState(false)
  const [paypalMessage, setPaypalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Initialize with tenant data
  useEffect(() => {
    if (tenant) {
      // Paystack settings
      setPaystackEnabled(tenant.paystack_enabled || false)
      setPaystackMode((tenant.paystack_mode as 'test' | 'live') || 'test')
      setPaystackTestPublicKey(tenant.paystack_test_public_key || '')
      setPaystackTestSecretKey(tenant.paystack_test_secret_key || '')
      setPaystackLivePublicKey(tenant.paystack_live_public_key || '')
      setPaystackLiveSecretKey(tenant.paystack_live_secret_key || '')

      // EFT settings
      setEftEnabled(tenant.eft_enabled || false)
      setEftAccountHolder(tenant.eft_account_holder || '')
      setEftBankName(tenant.eft_bank_name || '')
      setEftAccountNumber(tenant.eft_account_number || '')
      setEftBranchCode(tenant.eft_branch_code || '')
      setEftAccountType((tenant.eft_account_type as 'cheque' | 'savings' | 'current') || 'cheque')
      setEftSwiftCode(tenant.eft_swift_code || '')
      setEftReferenceInstructions(tenant.eft_reference_instructions || '')

      // PayPal settings
      setPaypalEnabled(tenant.paypal_enabled || false)
      setPaypalMode((tenant.paypal_mode as 'sandbox' | 'live') || 'sandbox')
      setPaypalSandboxClientId(tenant.paypal_sandbox_client_id || '')
      setPaypalSandboxSecret(tenant.paypal_sandbox_secret || '')
      setPaypalLiveClientId(tenant.paypal_live_client_id || '')
      setPaypalLiveSecret(tenant.paypal_live_secret || '')
    }
  }, [tenant])

  // Payment Apps Handlers
  const handlePaystackSave = async () => {
    if (!session?.access_token) return

    setPaystackLoading(true)
    setPaystackMessage(null)

    try {
      const response = await fetch(`${API_URL}/tenants/me/payment-apps/paystack`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          enabled: paystackEnabled,
          mode: paystackMode,
          test_public_key: paystackTestPublicKey,
          test_secret_key: paystackTestSecretKey,
          live_public_key: paystackLivePublicKey,
          live_secret_key: paystackLiveSecretKey,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save Paystack settings')
      }

      setPaystackMessage({ type: 'success', text: 'Paystack settings saved successfully' })
    } catch (error) {
      setPaystackMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save Paystack settings',
      })
    } finally {
      setPaystackLoading(false)
    }
  }

  const handleEftSave = async () => {
    if (!session?.access_token) return

    setEftLoading(true)
    setEftMessage(null)

    try {
      const response = await fetch(`${API_URL}/tenants/me/payment-apps/eft`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          enabled: eftEnabled,
          account_holder: eftAccountHolder,
          bank_name: eftBankName,
          account_number: eftAccountNumber,
          branch_code: eftBranchCode,
          account_type: eftAccountType,
          swift_code: eftSwiftCode,
          reference_instructions: eftReferenceInstructions,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save EFT settings')
      }

      setEftMessage({ type: 'success', text: 'EFT settings saved successfully' })
    } catch (error) {
      setEftMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save EFT settings',
      })
    } finally {
      setEftLoading(false)
    }
  }

  const handlePaypalSave = async () => {
    if (!session?.access_token) return

    setPaypalLoading(true)
    setPaypalMessage(null)

    try {
      const response = await fetch(`${API_URL}/tenants/me/payment-apps/paypal`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          enabled: paypalEnabled,
          mode: paypalMode,
          sandbox_client_id: paypalSandboxClientId,
          sandbox_secret: paypalSandboxSecret,
          live_client_id: paypalLiveClientId,
          live_secret: paypalLiveSecret,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save PayPal settings')
      }

      setPaypalMessage({ type: 'success', text: 'PayPal settings saved successfully' })
    } catch (error) {
      setPaypalMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save PayPal settings',
      })
    } finally {
      setPaypalLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Payment Integration</h1>
          <p className="text-gray-500 mt-1">
            Connect payment gateways to accept payments directly from your guests. Configure your API keys and banking details below.
          </p>
        </div>

        <div className="space-y-6">
          {/* Paystack Card */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#00C3F7]/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#00C3F7"/>
                      <path d="M12 6.5c-1.38 0-2.5 1.12-2.5 2.5h1.5c0-.55.45-1 1-1s1 .45 1 1c0 .55-.45 1-1 1h-.5v2.5h1.5v-1.08c1.14-.32 2-1.37 2-2.62 0-1.52-1.35-2.8-3-2.8zM11.25 14.5v1.5h1.5v-1.5h-1.5z" fill="white"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Paystack</h3>
                    <p className="text-sm text-gray-500">Accept card payments, bank transfers, and mobile money</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => canToggle('paystack') && setPaystackEnabled(!paystackEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    paystackEnabled ? 'bg-[#00C3F7]' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      paystackEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {paystackEnabled && (
              <div className="p-6 bg-gray-50">
                {/* Mode Toggle */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Environment</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaystackMode('test')}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                        paystackMode === 'test'
                          ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Test Mode
                    </button>
                    <button
                      onClick={() => setPaystackMode('live')}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                        paystackMode === 'live'
                          ? 'bg-accent-100 text-accent-800 border-2 border-accent-300'
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Live Mode
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {paystackMode === 'test'
                      ? 'Test mode allows you to simulate transactions without processing real payments.'
                      : 'Live mode processes real transactions. Make sure your keys are correct.'}
                  </p>
                </div>

                {/* Test Keys */}
                {paystackMode === 'test' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Test Public Key
                      </label>
                      <input
                        type="text"
                        value={paystackTestPublicKey}
                        onChange={(e) => setPaystackTestPublicKey(e.target.value)}
                        placeholder="pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00C3F7] focus:border-[#00C3F7] font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Test Secret Key
                      </label>
                      <div className="relative">
                        <input
                          type={showPaystackSecretKey ? 'text' : 'password'}
                          value={paystackTestSecretKey}
                          onChange={(e) => setPaystackTestSecretKey(e.target.value)}
                          placeholder="sk_test_your_secret_key_here"
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00C3F7] focus:border-[#00C3F7] font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPaystackSecretKey(!showPaystackSecretKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPaystackSecretKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Keys */}
                {paystackMode === 'live' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-amber-800">
                        <strong>Warning:</strong> Live keys will process real transactions. Only use verified keys from your Paystack dashboard.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Live Public Key
                      </label>
                      <input
                        type="text"
                        value={paystackLivePublicKey}
                        onChange={(e) => setPaystackLivePublicKey(e.target.value)}
                        placeholder="pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00C3F7] focus:border-[#00C3F7] font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Live Secret Key
                      </label>
                      <div className="relative">
                        <input
                          type={showPaystackSecretKey ? 'text' : 'password'}
                          value={paystackLiveSecretKey}
                          onChange={(e) => setPaystackLiveSecretKey(e.target.value)}
                          placeholder="sk_live_your_secret_key_here"
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00C3F7] focus:border-[#00C3F7] font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPaystackSecretKey(!showPaystackSecretKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPaystackSecretKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={handlePaystackSave}
                    disabled={paystackLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00C3F7] text-white rounded-lg text-sm font-medium hover:bg-[#00a8d4] transition-colors disabled:opacity-50"
                  >
                    {paystackLoading && <Loader2 size={16} className="animate-spin" />}
                    Save Paystack Settings
                  </button>
                  {paystackMessage && (
                    <span className={`text-sm ${paystackMessage.type === 'success' ? 'text-accent-600' : 'text-red-600'}`}>
                      {paystackMessage.text}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* EFT/Bank Details Card */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Building2 size={24} className="text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">EFT / Bank Transfer</h3>
                    <p className="text-sm text-gray-500">Accept direct bank transfers to your account</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => canToggle('eft') && setEftEnabled(!eftEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    eftEnabled ? 'bg-gray-900' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      eftEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {eftEnabled && (
              <div className="p-6 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={eftAccountHolder}
                      onChange={(e) => setEftAccountHolder(e.target.value)}
                      placeholder="John Doe or Business Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={eftBankName}
                      onChange={(e) => setEftBankName(e.target.value)}
                      placeholder="e.g., FNB, Standard Bank, Absa"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={eftAccountNumber}
                      onChange={(e) => setEftAccountNumber(e.target.value)}
                      placeholder="1234567890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Branch Code
                    </label>
                    <input
                      type="text"
                      value={eftBranchCode}
                      onChange={(e) => setEftBranchCode(e.target.value)}
                      placeholder="250655"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Type
                    </label>
                    <select
                      value={eftAccountType}
                      onChange={(e) => setEftAccountType(e.target.value as 'cheque' | 'savings' | 'current')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    >
                      <option value="cheque">Cheque Account</option>
                      <option value="savings">Savings Account</option>
                      <option value="current">Current Account</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SWIFT Code <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={eftSwiftCode}
                      onChange={(e) => setEftSwiftCode(e.target.value)}
                      placeholder="FIABORJJ"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-mono"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Instructions
                  </label>
                  <textarea
                    value={eftReferenceInstructions}
                    onChange={(e) => setEftReferenceInstructions(e.target.value)}
                    placeholder="e.g., Please use your booking reference number as the payment reference."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This message will be shown to guests when they select EFT as a payment method.
                  </p>
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleEftSave}
                    disabled={eftLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {eftLoading && <Loader2 size={16} className="animate-spin" />}
                    Save EFT Settings
                  </button>
                  {eftMessage && (
                    <span className={`text-sm ${eftMessage.type === 'success' ? 'text-accent-600' : 'text-red-600'}`}>
                      {eftMessage.text}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PayPal Card */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#003087]/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                      <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 3.72a.77.77 0 01.76-.654h6.394c2.118 0 3.768.506 4.896 1.502 1.168 1.03 1.652 2.56 1.384 4.42-.312 2.168-1.26 3.862-2.82 5.04-1.512 1.141-3.479 1.719-5.85 1.719h-1.31c-.503 0-.929.365-1.007.862l-.917 5.893a.642.642 0 01-.633.54l-.765-.005z" fill="#003087"/>
                      <path d="M19.093 8.366c-.307 2.168-1.259 3.862-2.819 5.04-1.512 1.142-3.48 1.72-5.85 1.72h-1.31c-.503 0-.93.364-1.007.861l-1.373 8.694a.519.519 0 00.512.6h3.327c.44 0 .816-.32.886-.753l.729-4.648a.897.897 0 01.886-.752h.559c3.616 0 6.45-1.47 7.282-5.72.347-1.781.149-3.258-.822-4.042z" fill="#0070E0"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">PayPal</h3>
                    <p className="text-sm text-gray-500">Accept PayPal payments worldwide</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => canToggle('paypal') && setPaypalEnabled(!paypalEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    paypalEnabled ? 'bg-[#003087]' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      paypalEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {paypalEnabled && (
              <div className="p-6 bg-gray-50">
                {/* Mode Toggle */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Environment</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaypalMode('sandbox')}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                        paypalMode === 'sandbox'
                          ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Sandbox (Test)
                    </button>
                    <button
                      onClick={() => setPaypalMode('live')}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                        paypalMode === 'live'
                          ? 'bg-accent-100 text-accent-800 border-2 border-accent-300'
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Live Mode
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {paypalMode === 'sandbox'
                      ? 'Sandbox mode allows you to test payments without processing real transactions.'
                      : 'Live mode processes real PayPal payments.'}
                  </p>
                </div>

                {/* Sandbox Keys */}
                {paypalMode === 'sandbox' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sandbox Client ID
                      </label>
                      <input
                        type="text"
                        value={paypalSandboxClientId}
                        onChange={(e) => setPaypalSandboxClientId(e.target.value)}
                        placeholder="AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxB"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#003087] focus:border-[#003087] font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sandbox Secret
                      </label>
                      <div className="relative">
                        <input
                          type={showPaypalSecret ? 'text' : 'password'}
                          value={paypalSandboxSecret}
                          onChange={(e) => setPaypalSandboxSecret(e.target.value)}
                          placeholder="ExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxB"
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#003087] focus:border-[#003087] font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPaypalSecret(!showPaypalSecret)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPaypalSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Keys */}
                {paypalMode === 'live' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-amber-800">
                        <strong>Warning:</strong> Live credentials will process real PayPal transactions. Use production keys from your PayPal Developer Dashboard.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Live Client ID
                      </label>
                      <input
                        type="text"
                        value={paypalLiveClientId}
                        onChange={(e) => setPaypalLiveClientId(e.target.value)}
                        placeholder="AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxB"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#003087] focus:border-[#003087] font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Live Secret
                      </label>
                      <div className="relative">
                        <input
                          type={showPaypalSecret ? 'text' : 'password'}
                          value={paypalLiveSecret}
                          onChange={(e) => setPaypalLiveSecret(e.target.value)}
                          placeholder="ExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxB"
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#003087] focus:border-[#003087] font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPaypalSecret(!showPaypalSecret)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPaypalSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={handlePaypalSave}
                    disabled={paypalLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#003087] text-white rounded-lg text-sm font-medium hover:bg-[#002060] transition-colors disabled:opacity-50"
                  >
                    {paypalLoading && <Loader2 size={16} className="animate-spin" />}
                    Save PayPal Settings
                  </button>
                  {paypalMessage && (
                    <span className={`text-sm ${paypalMessage.type === 'success' ? 'text-accent-600' : 'text-red-600'}`}>
                      {paypalMessage.text}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-accent-900 mb-2">How Payment Integration Works</h4>
            <ul className="text-sm text-accent-700 space-y-1">
              <li>- Enable the payment methods you want to offer to your guests.</li>
              <li>- Guests will see available payment options when making a booking.</li>
              <li>- For Paystack and PayPal, payments are processed automatically.</li>
              <li>- For EFT, guests will receive your bank details to make a manual transfer.</li>
              <li>- Always test your integration in test/sandbox mode first.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
