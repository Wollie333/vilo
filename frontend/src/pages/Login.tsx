import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TermsAcceptance from '../components/TermsAcceptance'
import { Check, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { discoveryApi, PropertyDetail } from '../services/discoveryApi'

type AuthMode = 'login' | 'signup'

interface Testimonial {
  quote: string
  author: string
  role: string
  rating: number
  image: string
}

// Fallback testimonials if no real data available
const fallbackTestimonials: Testimonial[] = [
  {
    quote: "Simply all the tools that my team and I need.",
    author: "Isabella Garcia",
    role: "Owner, Oceanview B&B",
    rating: 5,
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071&auto=format&fit=crop"
  }
]

export default function Login() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Real data state
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoadingData, setIsLoadingData] = useState(true)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  // Fetch real properties and reviews
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        // Get featured properties
        const { properties } = await discoveryApi.getFeatured(10)

        if (properties && properties.length > 0) {
          // For each property with reviews, try to get full details
          const testimonialsFromData: Testimonial[] = []

          for (const property of properties) {
            if (property.reviewCount > 0 && property.images.length > 0) {
              try {
                const detail: PropertyDetail = await discoveryApi.getProperty(property.slug)

                // Get reviews from this property
                if (detail.reviews && detail.reviews.length > 0) {
                  for (const review of detail.reviews) {
                    if (review.comment && review.rating >= 4) {
                      testimonialsFromData.push({
                        quote: review.comment,
                        author: review.guestName,
                        role: `Guest at ${property.name}`,
                        rating: review.rating,
                        image: property.images[0] || fallbackTestimonials[0].image
                      })
                    }
                  }
                }
              } catch {
                // Skip this property if we can't get details
              }
            }

            // Stop if we have enough testimonials
            if (testimonialsFromData.length >= 5) break
          }

          if (testimonialsFromData.length > 0) {
            setTestimonials(testimonialsFromData)
          }
        }
      } catch (err) {
        console.log('Using fallback testimonials')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchRealData()
  }, [])

  // Auto-rotate testimonials
  useEffect(() => {
    if (testimonials.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [testimonials.length])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        // Redirect to payment page to complete subscription
        navigate('/payment', { replace: true })
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        navigate(from, { replace: true })
      }
    }
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const currentTestimonial = testimonials[currentIndex]

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image with testimonial */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-gray-900 rounded-3xl m-4 overflow-hidden">
        {/* Background image with transition */}
        <div className="absolute inset-0">
          {testimonials.map((testimonial, index) => (
            <img
              key={index}
              src={testimonial.image}
              alt="Property"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        {/* Logo */}
        <div className="absolute top-8 left-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-xl font-bold text-white">Vilo</span>
          </Link>
        </div>

        {/* Testimonial with navigation */}
        <div className="absolute bottom-8 left-8 right-8">
          {/* Stars */}
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= currentTestimonial.rating
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-white/30'
                }`}
              />
            ))}
          </div>

          <p className="text-white text-2xl font-light leading-relaxed mb-6 transition-opacity duration-500">
            "{currentTestimonial.quote}"
          </p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{currentTestimonial.author}</p>
              <p className="text-white/60 text-sm">{currentTestimonial.role}</p>
            </div>

            {/* Navigation arrows */}
            {testimonials.length > 1 && (
              <div className="flex items-center gap-3">
                {/* Dots indicator */}
                <div className="flex gap-1.5 mr-2">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentIndex
                          ? 'bg-white w-6'
                          : 'bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={goToPrevious}
                  className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToNext}
                  className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading indicator */}
        {isLoadingData && (
          <div className="absolute top-8 right-8">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
        )}
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">Vilo</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              {mode === 'signup' ? 'Create your account' : 'Welcome back to Vilo'}
            </h1>
            <p className="text-gray-500">
              {mode === 'signup'
                ? 'Start accepting direct bookings in minutes.'
                : 'Manage your property and bookings with ease.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className={`px-4 py-3 rounded-xl text-sm flex items-start gap-3 ${
                error.includes('Account created')
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {error.includes('Account created') ? (
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{error}</span>
              </div>
            )}

            {/* Email Field with Floating Label */}
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                className="peer w-full px-4 pt-6 pb-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              <label
                htmlFor="email"
                className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs"
              >
                Email
              </label>
            </div>

            {/* Password Field with Floating Label */}
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                className="peer w-full px-4 pt-6 pb-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              <label
                htmlFor="password"
                className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs"
              >
                Password
              </label>
            </div>

            {/* Forgot password link */}
            {mode === 'login' && (
              <div className="flex justify-start">
                <button type="button" className="text-sm text-emerald-600 hover:underline font-medium">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Remember me toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {mode === 'login' ? 'Remember sign in details' : 'Keep me updated with news'}
              </span>
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  rememberMe ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    rememberMe ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Terms Acceptance - Signup mode only */}
            {mode === 'signup' && (
              <TermsAcceptance
                accepted={termsAccepted}
                onChange={setTermsAccepted}
                size="sm"
              />
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (mode === 'signup' && !termsAccepted)}
              className="w-full py-3.5 px-4 bg-emerald-500 text-white text-sm font-medium rounded-full hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {mode === 'signup' ? 'Create account' : 'Log in'}
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400 uppercase text-xs tracking-wider">or</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Continue with Google</span>
          </button>

          {/* Bottom link */}
          <p className="mt-8 text-center text-sm text-gray-500">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="font-medium text-emerald-600 hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="font-medium text-emerald-600 hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
