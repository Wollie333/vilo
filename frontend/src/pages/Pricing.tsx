import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Star, Zap, Shield, Clock, Users, Calendar, BarChart3, Globe, Headphones } from 'lucide-react'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export default function Pricing() {
  const navigate = useNavigate()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleSelectPlan = async (plan: 'lifetime' | 'monthly' | 'annual') => {
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      // User is logged in - go directly to payment
      setLoading(plan)
      try {
        const response = await fetch(`${API_URL}/payments/initialize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan, currency: 'ZAR' }),
        })

        const data = await response.json()

        if (data.authorization_url) {
          window.location.href = data.authorization_url
        } else {
          setError(data.error || 'Failed to initialize payment')
          setLoading(null)
        }
      } catch (err) {
        setError('Payment failed. Please try again.')
        setLoading(null)
      }
    } else {
      // User not logged in - go to signup wizard
      navigate(`/signup?plan=${plan}`)
    }
  }

  const features = [
    { icon: Calendar, text: 'Unlimited bookings & rooms' },
    { icon: Users, text: 'Customer portal & management' },
    { icon: Globe, text: 'Listed in our property directory' },
    { icon: BarChart3, text: 'Analytics & reporting' },
    { icon: Shield, text: 'Secure payment processing' },
    { icon: Headphones, text: 'Priority support' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Vilo</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full mb-6">
            <Zap size={14} />
            <span>Launch Special - Save up to 50%</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            List your property today
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Get listed on South Africa's growing accommodation directory. Manage bookings with ease.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {/* Billing Toggle */}
          <div className="flex justify-center mb-10">
            <div className="bg-gray-100 p-1 rounded-xl inline-flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual
                <span className="ml-1.5 text-xs text-emerald-600 font-semibold">Save 17%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Subscription Plan */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 relative">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {billingCycle === 'monthly' ? 'Monthly' : 'Annual'} Plan
                </h3>
                <p className="text-sm text-gray-500">
                  Flexible subscription with all features
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">
                    R{billingCycle === 'monthly' ? '499' : '4,999'}
                  </span>
                  <span className="text-gray-500">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-sm text-emerald-600 mt-1">
                    That's just R417/month
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm text-gray-600">
                    <Check size={18} className="text-emerald-500 flex-shrink-0" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(billingCycle)}
                disabled={loading === billingCycle}
                className="w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {loading === billingCycle ? 'Processing...' : 'Get Started'}
              </button>
            </div>

            {/* Lifetime Plan */}
            <div className="bg-white rounded-2xl border-2 border-black p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-black text-white text-xs font-bold rounded-full flex items-center gap-1">
                <Star size={12} />
                BEST VALUE
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Lifetime Access
                </h3>
                <p className="text-sm text-gray-500">
                  Pay once, use forever
                </p>
              </div>

              <div className="mb-6">
                <div className="text-sm text-gray-400 line-through">R3,999</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">R1,999</span>
                  <span className="text-gray-500">once</span>
                </div>
                <p className="text-sm text-emerald-600 mt-1">
                  Save R2,000 - Limited time offer
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm text-gray-600">
                    <Check size={18} className="text-emerald-500 flex-shrink-0" />
                    <span>{feature.text}</span>
                  </li>
                ))}
                <li className="flex items-center gap-3 text-sm text-gray-900 font-medium">
                  <Check size={18} className="text-emerald-500 flex-shrink-0" />
                  <span>All future updates included</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-900 font-medium">
                  <Check size={18} className="text-emerald-500 flex-shrink-0" />
                  <span>No recurring fees ever</span>
                </li>
              </ul>

              <button
                onClick={() => handleSelectPlan('lifetime')}
                disabled={loading === 'lifetime'}
                className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {loading === 'lifetime' ? 'Processing...' : 'Get Lifetime Access'}
              </button>

              <p className="text-center text-xs text-gray-500 mt-4">
                30-day money-back guarantee
              </p>
            </div>
          </div>

          {/* Already have an account */}
          <p className="text-center text-sm text-gray-500 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-black font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Everything you need to run your accommodation business
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Calendar, title: 'Smart Booking Calendar', desc: 'Manage availability, prevent double-bookings, and sync with Google Calendar.' },
              { icon: Users, title: 'Guest Management', desc: 'Keep track of guest details, preferences, and booking history.' },
              { icon: Globe, title: 'Directory Listing', desc: 'Get discovered by travellers searching for accommodation in your area.' },
              { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track revenue, occupancy rates, and business performance.' },
              { icon: Shield, title: 'Secure Payments', desc: 'Accept payments via Paystack, EFT, or PayPal securely.' },
              { icon: Clock, title: 'Automated Emails', desc: 'Booking confirmations, reminders, and review requests.' },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon size={20} className="text-gray-700" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit/debit cards via Paystack, as well as EFT bank transfers.'
              },
              {
                q: 'Can I switch from monthly to lifetime later?',
                a: 'Yes! You can upgrade to lifetime access at any time. We\'ll credit your remaining subscription towards the lifetime price.'
              },
              {
                q: 'What does "lifetime access" mean?',
                a: 'Lifetime access means you pay once and can use Vilo forever. This includes all current features and future updates at no additional cost.'
              },
              {
                q: 'How does the directory listing work?',
                a: 'Once you complete your profile, your property will be listed on our accommodation directory where travellers can discover and book directly with you.'
              },
              {
                q: 'What if I\'m not satisfied?',
                a: 'We offer a 30-day money-back guarantee on all plans. If you\'re not satisfied, we\'ll refund your payment - no questions asked.'
              },
            ].map((faq, idx) => (
              <div key={idx} className="border-b border-gray-200 pb-6">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-sm text-gray-600">© 2024 Vilo. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link to="/terms" className="hover:text-gray-900">Terms</Link>
            <Link to="/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link to="/contact" className="hover:text-gray-900">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
