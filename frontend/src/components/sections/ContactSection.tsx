import { useState } from 'react'
import { MapPin, Phone, Mail, Clock, Send, Loader2 } from 'lucide-react'
import TermsAcceptance from '../TermsAcceptance'

interface ContactSectionProps {
  config: {
    showPhone?: boolean
    showEmail?: boolean
    showAddress?: boolean
    showHours?: boolean
    formFields?: string[]
  }
  tenant?: {
    business_name?: string | null
    business_phone?: string | null
    business_email?: string | null
    address_line1?: string | null
    city?: string | null
    state_province?: string | null
    country?: string | null
  } | null
  colors?: {
    primary?: string
    accent?: string
  }
}

export default function ContactSection({ config, tenant, colors }: ContactSectionProps) {
  const {
    showPhone = true,
    showEmail = true,
    showAddress = true,
    showHours = true,
  } = config

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const primaryColor = colors?.primary || '#1f2937'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    setSending(false)
    setSent(true)
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
    setTermsAccepted(false)
  }

  const address = [
    tenant?.address_line1,
    tenant?.city,
    tenant?.state_province,
    tenant?.country,
  ].filter(Boolean).join(', ')

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Get in Touch
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Have questions about your stay? We're here to help! Reach out to us
              through any of the channels below and we'll get back to you as soon
              as possible.
            </p>

            <div className="space-y-6">
              {showAddress && address && (
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <MapPin size={20} style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                    <p className="text-gray-600">{address}</p>
                  </div>
                </div>
              )}

              {showPhone && tenant?.business_phone && (
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <Phone size={20} style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                    <a
                      href={`tel:${tenant.business_phone}`}
                      className="text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      {tenant.business_phone}
                    </a>
                  </div>
                </div>
              )}

              {showEmail && tenant?.business_email && (
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <Mail size={20} style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                    <a
                      href={`mailto:${tenant.business_email}`}
                      className="text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      {tenant.business_email}
                    </a>
                  </div>
                </div>
              )}

              {showHours && (
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <Clock size={20} style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Front Desk Hours</h3>
                    <p className="text-gray-600">24/7 - We're always here for you</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Send us a Message
            </h3>

            {sent ? (
              <div className="text-center py-12">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Send size={24} style={{ color: primaryColor }} />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Message Sent!
                </h4>
                <p className="text-gray-600 mb-6">
                  Thank you for reaching out. We'll get back to you soon.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="How can we help?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="Your message..."
                  />
                </div>

                {/* Terms Acceptance */}
                <TermsAcceptance
                  accepted={termsAccepted}
                  onChange={setTermsAccepted}
                  size="sm"
                />

                <button
                  type="submit"
                  disabled={sending || !termsAccepted}
                  className="w-full py-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {sending ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
