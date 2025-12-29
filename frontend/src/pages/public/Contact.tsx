import { useState, useRef, useEffect } from 'react'
import { Phone, Mail, MapPin, Clock, Send, CheckCircle } from 'lucide-react'

// Hook for scroll-triggered animations
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return { ref, isInView }
}

interface FormData {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

interface FormErrors {
  name?: string
  email?: string
  message?: string
}

export default function Contact() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    subject: 'general',
    message: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const heroSection = useInView()
  const contactSection = useInView(0.05)
  const mapSection = useInView()

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    // Simulate form submission
    // In production, this would send to your backend
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone',
      content: '+27 12 345 6789',
      link: 'tel:+27123456789',
    },
    {
      icon: Mail,
      title: 'Email',
      content: 'info@viloguesthouse.com',
      link: 'mailto:info@viloguesthouse.com',
    },
    {
      icon: MapPin,
      title: 'Address',
      content: '123 Guest House Street, Pretoria, South Africa',
      link: null,
    },
    {
      icon: Clock,
      title: 'Reception Hours',
      content: 'Mon - Sun: 7:00 AM - 10:00 PM',
      link: null,
    },
  ]

  if (isSubmitted) {
    return (
      <div className="overflow-x-hidden">
        {/* Hero Section */}
        <section ref={heroSection.ref} className="bg-gray-900 text-white py-16 sm:py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-white rounded-full blur-3xl animate-pulse-slow"></div>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 transition-all duration-700 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Contact Us
            </h1>
            <p className={`text-base sm:text-lg text-gray-300 max-w-2xl mx-auto transition-all duration-700 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '100ms' }}>
              We'd love to hear from you. Get in touch with us for bookings, inquiries, or just to say hello.
            </p>
          </div>
        </section>

        {/* Success Message */}
        <section className="py-16 sm:py-20 md:py-32">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full mb-6 animate-scale-in">
              <CheckCircle size={32} className="text-green-600 sm:w-10 sm:h-10" />
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s' }}>
              Message Sent Successfully!
            </h2>
            <p className="text-gray-600 mb-8 text-sm sm:text-base animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s' }}>
              Thank you for reaching out. We've received your message and will get back to you
              within 24 hours.
            </p>
            <button
              onClick={() => {
                setIsSubmitted(false)
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  subject: 'general',
                  message: '',
                })
              }}
              className="text-gray-900 font-medium hover:underline transition-colors animate-fade-in-up opacity-0"
              style={{ animationDelay: '0.4s' }}
            >
              Send another message
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="overflow-x-hidden">
      {/* Hero Section */}
      <section ref={heroSection.ref} className="bg-gray-900 text-white py-16 sm:py-20 md:py-28 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-white rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 sm:w-72 sm:h-72 bg-white rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 transition-all duration-700 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Contact Us
          </h1>
          <p className={`text-base sm:text-lg text-gray-300 max-w-2xl mx-auto transition-all duration-700 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '100ms' }}>
            We'd love to hear from you. Get in touch with us for bookings, inquiries, or just to say hello.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section ref={contactSection.ref} className="py-12 sm:py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Contact Info */}
            <div className={`lg:col-span-1 transition-all duration-700 ${contactSection.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Get in Touch</h2>
              <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">
                Have questions about our accommodation or want to make a booking?
                We're here to help.
              </p>

              <div className="space-y-4 sm:space-y-6">
                {contactInfo.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 sm:gap-4 transition-all duration-500 ${
                      contactSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                    style={{ transitionDelay: `${index * 100 + 200}ms` }}
                  >
                    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center transition-transform hover:scale-110">
                      <item.icon size={18} className="text-gray-700 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base">{item.title}</h3>
                      {item.link ? (
                        <a
                          href={item.link}
                          className="text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
                        >
                          {item.content}
                        </a>
                      ) : (
                        <p className="text-gray-600 text-sm sm:text-base">{item.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Form */}
            <div className={`lg:col-span-2 transition-all duration-700 ${contactSection.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`} style={{ transitionDelay: '100ms' }}>
              <div className="bg-white rounded-lg border border-gray-200 p-5 sm:p-6 md:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full px-3 sm:px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 transition-all duration-200 text-sm sm:text-base ${
                          errors.name
                            ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                            : 'border-gray-300 focus:ring-gray-200 focus:border-gray-400'
                        }`}
                        placeholder="John Smith"
                      />
                      {errors.name && (
                        <p className="mt-1 text-xs sm:text-sm text-red-600 animate-fade-in">{errors.name}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-3 sm:px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 transition-all duration-200 text-sm sm:text-base ${
                          errors.email
                            ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                            : 'border-gray-300 focus:ring-gray-200 focus:border-gray-400'
                        }`}
                        placeholder="john@example.com"
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs sm:text-sm text-red-600 animate-fade-in">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all duration-200 text-sm sm:text-base"
                        placeholder="+27 12 345 6789"
                      />
                    </div>

                    {/* Subject */}
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Subject
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all duration-200 text-sm sm:text-base bg-white"
                      >
                        <option value="general">General Inquiry</option>
                        <option value="booking">Room Booking</option>
                        <option value="availability">Check Availability</option>
                        <option value="feedback">Feedback</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={5}
                      className={`w-full px-3 sm:px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 resize-none transition-all duration-200 text-sm sm:text-base ${
                        errors.message
                          ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                          : 'border-gray-300 focus:ring-gray-200 focus:border-gray-400'
                      }`}
                      placeholder="Tell us about your inquiry or booking request..."
                    />
                    {errors.message && (
                      <p className="mt-1 text-xs sm:text-sm text-red-600 animate-fade-in">{errors.message}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center bg-gray-900 text-white px-6 py-3 rounded-md text-base font-medium hover:bg-gray-800 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isSubmitting ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={18} className="mr-2" />
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section ref={mapSection.ref} className="bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className={`text-center mb-6 sm:mb-8 transition-all duration-700 ${mapSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Find Us</h2>
            <p className="text-gray-600 text-sm sm:text-base">Located in the heart of Pretoria</p>
          </div>
          <div className={`bg-gray-200 rounded-lg h-64 sm:h-80 flex items-center justify-center transition-all duration-700 hover:shadow-lg ${mapSection.isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ transitionDelay: '100ms' }}>
            <div className="text-center px-4">
              <MapPin size={36} className="mx-auto text-gray-400 mb-4 sm:w-12 sm:h-12 animate-float" />
              <p className="text-gray-600 text-sm sm:text-base">
                123 Guest House Street<br />
                Pretoria, South Africa
              </p>
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-gray-900 font-medium hover:underline text-sm sm:text-base transition-colors"
              >
                View on Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
