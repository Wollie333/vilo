import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  CreditCard,
  Globe,
  BarChart3,
  Users,
  Star,
  Check,
  ArrowRight,
  BedDouble,
  Plus,
  CalendarDays,
  Shield,
  TrendingUp,
  Sparkles,
  ChevronDown,
  Play,
  BookOpen,
  Headphones,
  FileText,
  MessageSquare,
  Lightbulb,
  Building2,
  Home,
  Tent,
  Menu,
  X,
  Image as ImageIcon,
  Tag,
  Settings,
  Eye,
  Ban,
  Bell,
  Wallet,
  Receipt,
  Mail,
  Heart,
  PieChart,
  Target,
  Clock,
  Lock
} from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

interface PlatformStats {
  totalRevenue: number
  feesSaved: number
  commissionRate: number
  propertiesCount: number
  bookingsCount: number
  reviewsCount: number
  averageRating: number
  currency: string
}

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Scroll animation refs
  const [heroRef, heroVisible] = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 })
  const [socialProofRef, socialProofVisible] = useScrollAnimation<HTMLElement>({ threshold: 0.2 })
  const [problemRef, problemVisible] = useScrollAnimation<HTMLElement>({ threshold: 0.15 })
  const [featuresRef, featuresVisible] = useScrollAnimation<HTMLElement>({ threshold: 0.1 })
  const [howItWorksRef, howItWorksVisible] = useScrollAnimation<HTMLElement>({ threshold: 0.15 })
  const [comparisonRef, comparisonVisible] = useScrollAnimation<HTMLElement>({ threshold: 0.15 })
  const [pricingRef, pricingVisible] = useScrollAnimation<HTMLElement>({ threshold: 0.1 })
  const [testimonialsRef, testimonialsVisible] = useScrollAnimation<HTMLElement>({ threshold: 0.15 })
  const [ctaRef, ctaVisible] = useScrollAnimation<HTMLElement>({ threshold: 0.2 })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch platform stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/discovery/platform-stats')
        if (response.ok) {
          const data = await response.json()
          setPlatformStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch platform stats:', error)
      }
    }
    fetchStats()
  }, [])


  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name)
  }

  // Format currency with abbreviations for large numbers
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `R${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `R${(amount / 1000).toFixed(0)}K`
    }
    return `R${amount.toLocaleString()}`
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Custom animations for notification */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          50% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        @keyframes fadeSlideIn {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
      {/* Navigation with Mega Menu */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Vilo</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
              {/* Features Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('features')}
                  className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeDropdown === 'features' ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Features
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'features' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'features' && (
                  <div className="absolute top-full left-0 mt-2 w-[600px] bg-white rounded-2xl shadow-xl border border-gray-100 p-6 grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Core Features</div>
                      <div className="space-y-1">
                        <MegaMenuItem icon={<BedDouble className="w-5 h-5" />} title="Room Management" description="Set up and manage all your rooms" href="#features" />
                        <MegaMenuItem icon={<CalendarDays className="w-5 h-5" />} title="Booking Calendar" description="Visual calendar with drag & drop" href="#features" />
                        <MegaMenuItem icon={<CreditCard className="w-5 h-5" />} title="Payment Processing" description="Accept payments via Paystack" href="#features" />
                        <MegaMenuItem icon={<Users className="w-5 h-5" />} title="Guest Management" description="Build your guest database" href="#features" />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Growth Tools</div>
                      <div className="space-y-1">
                        <MegaMenuItem icon={<Globe className="w-5 h-5" />} title="Booking Website" description="Your own branded booking site" href="#features" />
                        <MegaMenuItem icon={<Star className="w-5 h-5" />} title="Reviews & Ratings" description="Collect and display reviews" href="#features" />
                        <MegaMenuItem icon={<BarChart3 className="w-5 h-5" />} title="Analytics Dashboard" description="Track revenue and occupancy" href="#features" />
                        <MegaMenuItem icon={<Plus className="w-5 h-5" />} title="Add-ons & Extras" description="Upsell breakfast, activities" href="#features" />
                      </div>
                    </div>
                    <div className="col-span-2 pt-4 border-t border-gray-100">
                      <Link to="/pricing" className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">See All Features</div>
                            <div className="text-sm text-gray-500">Everything you need to run your property</div>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Solutions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('solutions')}
                  className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeDropdown === 'solutions' ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Solutions
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'solutions' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'solutions' && (
                  <div className="absolute top-full left-0 mt-2 w-[400px] bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">By Property Type</div>
                    <div className="space-y-1">
                      <MegaMenuItem icon={<Home className="w-5 h-5" />} title="Guesthouses & B&Bs" description="Perfect for small properties" href="#" />
                      <MegaMenuItem icon={<Building2 className="w-5 h-5" />} title="Boutique Hotels" description="For hotels up to 50 rooms" href="#" />
                      <MegaMenuItem icon={<Tent className="w-5 h-5" />} title="Lodges & Camps" description="Safari lodges and campsites" href="#" />
                      <MegaMenuItem icon={<BedDouble className="w-5 h-5" />} title="Holiday Rentals" description="Self-catering accommodation" href="#" />
                    </div>
                  </div>
                )}
              </div>

              {/* Resources Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('resources')}
                  className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeDropdown === 'resources' ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Resources
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'resources' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'resources' && (
                  <div className="absolute top-full left-0 mt-2 w-[400px] bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Learn & Support</div>
                    <div className="space-y-1">
                      <MegaMenuItem icon={<BookOpen className="w-5 h-5" />} title="Blog" description="Tips and industry insights" href="#" />
                      <MegaMenuItem icon={<FileText className="w-5 h-5" />} title="Documentation" description="Guides and tutorials" href="#" />
                      <MegaMenuItem icon={<Lightbulb className="w-5 h-5" />} title="Help Center" description="FAQs and troubleshooting" href="#" />
                      <MegaMenuItem icon={<Headphones className="w-5 h-5" />} title="Contact Support" description="Get help from our team" href="/contact" />
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Community</div>
                      <MegaMenuItem icon={<MessageSquare className="w-5 h-5" />} title="Customer Stories" description="See how others use Vilo" href="#testimonials" />
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing Link */}
              <a
                href="#pricing"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setActiveDropdown(null)}
              >
                Pricing
              </a>

              {/* Directory Link */}
              <Link
                to="/directory"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setActiveDropdown(null)}
              >
                Directory
              </Link>
            </div>

            {/* Right Side - CTAs */}
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden sm:block text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/pricing"
                className="hidden sm:flex bg-black text-white px-5 py-2.5 rounded-full hover:bg-gray-800 transition-all text-sm font-medium items-center gap-2"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 px-4 py-6">
            <div className="space-y-4">
              <a href="#features" className="block py-2 text-gray-900 font-medium" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#how-it-works" className="block py-2 text-gray-900 font-medium" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
              <a href="#pricing" className="block py-2 text-gray-900 font-medium" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <Link to="/directory" className="block py-2 text-gray-900 font-medium" onClick={() => setMobileMenuOpen(false)}>Directory</Link>
              <hr className="my-4" />
              <Link to="/login" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
              <Link
                to="/pricing"
                className="block w-full bg-black text-white px-5 py-3 rounded-full text-center font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Modern SaaS Dark Background */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gray-950">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black" />

        {/* Animated gradient orbs */}
        <div className="absolute top-0 -left-40 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
          }}
        />

        {/* Top highlight glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent blur-2xl" />

        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        />

        {/* Content */}
        <div className="relative z-10 w-full pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div
              ref={heroRef}
              className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              {/* Minimal Badge */}
              <div className="inline-flex items-center gap-2 text-emerald-400 text-sm font-medium mb-8 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span>Zero commission fees ever</span>
              </div>

              {/* Main Headline - Clean & Direct */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-8 leading-[1.05]">
                Your bookings.
                <br />
                <span className="text-white/60">Your guests.</span>
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Your revenue.</span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed">
                Manage properties, accept payments, and build guest relationships — all without OTA commission fees.
              </p>

              {/* CTAs - Green Brand Color */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <Link
                  to="/pricing"
                  className="w-full sm:w-auto bg-emerald-500 text-white px-8 py-4 rounded-full hover:bg-emerald-400 transition-all font-medium text-base flex items-center justify-center gap-2 group shadow-lg shadow-emerald-500/25"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto text-white/90 px-8 py-4 rounded-full hover:text-white hover:bg-white/10 transition-all font-medium text-base flex items-center justify-center gap-2 backdrop-blur-sm border border-white/20"
                >
                  <Play className="w-4 h-4" />
                  See how it works
                </a>
              </div>

              {/* Trust Signals */}
              <div className="flex items-center justify-center gap-6 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  No Fees ever, keep 100% profits
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Setup in 10 minutes
                </span>
              </div>
            </div>

            {/* Hero Visual - Cleaner Dashboard Preview */}
            <div
              className={`mt-16 relative transition-all duration-1000 delay-300 ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
            >
              {/* Glow effect behind dashboard */}
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 rounded-3xl blur-2xl opacity-60" />

              {/* Standalone Floating Notification Card */}
              <div
                className="absolute -top-8 -right-4 sm:-right-8 lg:-right-16 w-72 sm:w-80 z-50"
                style={{
                  animation: 'fadeSlideIn 0.8s ease-out 0.5s forwards, float 4s ease-in-out 1.3s infinite',
                  opacity: 0,
                }}
              >
                {/* Notification Card with 3D effect */}
                <div
                  className="bg-white rounded-2xl overflow-hidden"
                  style={{
                    boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.5), 0 30px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0,0,0,0.05)',
                    transform: 'perspective(1000px) rotateY(-5deg) rotateX(5deg)',
                  }}
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Bell className="w-5 h-5 text-white" style={{ animation: 'wiggle 0.5s ease-in-out infinite' }} />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      </div>
                      <span className="text-sm font-bold text-white">Notifications</span>
                    </div>
                    <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">2 new</span>
                  </div>

                  {/* New Booking Notification */}
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-emerald-500">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-emerald-700">New Booking!</span>
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        </div>
                        <p className="text-xs text-gray-700 mt-1 font-medium">John D. booked Deluxe Suite</p>
                        <p className="text-sm text-emerald-600 font-bold mt-1">+R2,400 revenue</p>
                        <p className="text-[10px] text-gray-400 mt-1">Just now</p>
                      </div>
                    </div>
                  </div>

                  {/* Second notification */}
                  <div className="p-3 border-t border-gray-100 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Star className="w-4 h-4 text-yellow-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 font-medium">New 5-star review received</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">2 mins ago</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connector line from bell to notification */}
                <div className="absolute -bottom-4 left-1/2 w-px h-8 bg-gradient-to-b from-emerald-400 to-transparent hidden lg:block" />
              </div>

              <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-emerald-500/10 border border-white/30 overflow-hidden ring-1 ring-white/10">
                <div className="bg-emerald-600 px-4 py-3 border-b border-emerald-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="ml-3 text-xs text-white/80 font-medium">app.vilo.co.za</span>
                  </div>

                  {/* Notification Bell with Animation */}
                  <div className="relative cursor-pointer">
                    <Bell
                      className="w-5 h-5 text-white"
                      style={{
                        animation: 'wiggle 0.5s ease-in-out infinite',
                      }}
                    />
                    {/* Notification dot */}
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-emerald-600" />
                  </div>
                </div>
                <div className="p-6 sm:p-8 bg-gray-100">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <StatCard icon={<Calendar className="w-5 h-5" />} value="156" label="Total Bookings" trend="+12%" />
                    <StatCard icon={<CreditCard className="w-5 h-5" />} value="R245,800" label="Revenue" trend="+23%" highlighted />
                    <StatCard icon={<BarChart3 className="w-5 h-5" />} value="87%" label="Occupancy" trend="+5%" />
                    <StatCard icon={<Star className="w-5 h-5" />} value="4.9" label="Guest Rating" trend="" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Stats Section */}
      <section
        ref={socialProofRef}
        className={`py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white transition-all duration-700 ${
          socialProofVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-2">Platform Impact</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Real Results, Real Savings</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Every rand processed through Vilo stays with our hosts. No hidden fees, no commission cuts.
            </p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Revenue */}
            <div
              className={`relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-500 ${
                socialProofVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
              style={{ transitionDelay: '100ms' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-emerald-600" />
                </div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Revenue</span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
                {platformStats ? formatCurrency(platformStats.totalRevenue) : 'R0'}
              </div>
              <p className="text-sm text-gray-500">Revenue generated for users</p>
              <div className="absolute top-4 right-4">
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">100% to hosts</span>
              </div>
            </div>

            {/* Fees Saved */}
            <div
              className={`relative bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-500 ${
                socialProofVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
              style={{ transitionDelay: '200ms' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-emerald-100 uppercase tracking-wide">Fees Saved</span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                {platformStats ? formatCurrency(platformStats.feesSaved) : 'R0'}
              </div>
              <p className="text-sm text-emerald-100">Based on 15% OTA industry average</p>
              <div className="absolute top-4 right-4">
                <span className="text-xs font-semibold text-emerald-700 bg-white px-2 py-1 rounded-full">0% Vilo fees</span>
              </div>
            </div>

            {/* Properties */}
            <div
              className={`relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-500 ${
                socialProofVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
              style={{ transitionDelay: '300ms' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Properties</span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
                {platformStats ? platformStats.propertiesCount : 0}
              </div>
              <p className="text-sm text-gray-500">Active on Vilo</p>
            </div>

            {/* Bookings */}
            <div
              className={`relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-500 ${
                socialProofVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
              style={{ transitionDelay: '400ms' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Bookings</span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
                {platformStats ? platformStats.bookingsCount : 0}
              </div>
              <p className="text-sm text-gray-500">Successful reservations</p>
            </div>
          </div>

          {/* Bottom callout */}
          <div className={`mt-10 text-center transition-all duration-700 ${socialProofVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '500ms' }}>
            <div className="inline-flex items-center gap-3 bg-gray-900 text-white px-6 py-3 rounded-full">
              <Ban className="w-5 h-5 text-red-400" />
              <span className="text-sm font-medium">
                <span className="text-red-400 font-bold">R0</span> in commission fees — we never take a cut of your bookings
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section
        ref={problemRef}
        className="py-28 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            <div className={`transition-all duration-700 ${problemVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">The Problem</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                OTAs are eating
                <br />your profits
              </h2>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                Every booking through Booking.com, Airbnb, or other platforms costs you 15-20% in commission.
                On a R1,000/night room, that's R150 gone — every single night.
              </p>
              <div className="space-y-3">
                <ProblemItem text="15-20% commission on every booking" />
                <ProblemItem text="No control over guest relationships" />
                <ProblemItem text="Competing with your own listing" />
                <ProblemItem text="Hidden fees that add up fast" />
              </div>
            </div>
            <div className={`bg-gray-800 rounded-3xl p-8 lg:p-10 text-white transition-all duration-700 delay-200 ${problemVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="text-sm text-gray-400 mb-2">Your annual loss to OTAs</div>
              <div className="text-5xl font-bold text-red-400 mb-1">-R54,750</div>
              <div className="text-sm text-gray-500 mb-8">Based on 1 room at R1,000/night, 75% occupancy</div>
              <div className="border-t border-gray-700 pt-8">
                <div className="text-sm text-gray-400 mb-2">With Vilo you keep</div>
                <div className="text-4xl font-bold text-emerald-400 mb-1">+R54,750</div>
                <div className="text-sm text-gray-500">100% of your booking revenue</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Clean & Minimal */}
      <section
        ref={featuresRef}
        id="features"
        className="py-28 px-4 sm:px-6 lg:px-8"
      >
        {/* Section Header */}
        <div className={`max-w-7xl mx-auto text-center mb-24 transition-all duration-700 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-sm font-medium text-emerald-600 uppercase tracking-wide mb-4">Features</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Everything you need to
            <br />
            <span className="text-gray-400">run your property</span>
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            From bookings to payments, guest management to analytics — complete control without the complexity.
          </p>
        </div>

        {/* Feature Section 1: Room Management - Image Right */}
        <div className="max-w-7xl mx-auto mb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5 leading-tight">
                Manage your rooms,
                <br />your way
              </h3>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                Set up rooms with photos, amenities, flexible pricing, and real-time availability — all from one intuitive dashboard.
              </p>
              <div className="grid grid-cols-2 gap-5">
                <FeaturePoint icon={<BedDouble className="w-5 h-5" />} title="Multiple Room Types" description="Standard, deluxe, suites — organize however you want." />
                <FeaturePoint icon={<ImageIcon className="w-5 h-5" />} title="Photo Galleries" description="Showcase with unlimited high-quality images." />
                <FeaturePoint icon={<Tag className="w-5 h-5" />} title="Dynamic Pricing" description="Seasonal rates, weekday specials, and more." />
                <FeaturePoint icon={<Settings className="w-5 h-5" />} title="Amenities Manager" description="WiFi, parking, pool — list what guests need." />
              </div>
            </div>
            <div className="relative">
              <FeatureMockup variant="rooms" />
            </div>
          </div>
        </div>

        {/* Feature Section 2: Booking Calendar - Image Left */}
        <div className="max-w-7xl mx-auto mb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 relative">
              <FeatureMockup variant="calendar" />
            </div>
            <div className="order-1 lg:order-2">
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5 leading-tight">
                Visual calendar that
                <br />just works
              </h3>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                See all bookings at a glance. Drag to create bookings, spot availability gaps, and never double-book again.
              </p>
              <div className="grid grid-cols-2 gap-5">
                <FeaturePoint icon={<CalendarDays className="w-5 h-5" />} title="Drag & Drop" description="Create and move bookings with ease." />
                <FeaturePoint icon={<Eye className="w-5 h-5" />} title="At-a-Glance View" description="See occupancy across all rooms instantly." />
                <FeaturePoint icon={<Ban className="w-5 h-5" />} title="No Double Bookings" description="Automatic conflict prevention built-in." />
                <FeaturePoint icon={<Bell className="w-5 h-5" />} title="Smart Alerts" description="Get notified of check-ins and check-outs." />
              </div>
            </div>
          </div>
        </div>

        {/* Feature Section 3: Payments - Image Right */}
        <div className="max-w-7xl mx-auto mb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5 leading-tight">
                Accept payments
                <br />directly
              </h3>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                No middleman, no delays. Accept card payments via Paystack and get funds deposited straight to your bank account.
              </p>
              <div className="grid grid-cols-2 gap-5">
                <FeaturePoint icon={<CreditCard className="w-5 h-5" />} title="Card Payments" description="Visa, Mastercard, and local cards accepted." />
                <FeaturePoint icon={<Wallet className="w-5 h-5" />} title="Fast Payouts" description="Money in your account within 2-3 days." />
                <FeaturePoint icon={<Receipt className="w-5 h-5" />} title="Auto Invoices" description="Professional invoices sent automatically." />
                <FeaturePoint icon={<Shield className="w-5 h-5" />} title="Secure & PCI" description="Bank-level security for every transaction." />
              </div>
            </div>
            <div className="relative">
              <FeatureMockup variant="payments" />
            </div>
          </div>
        </div>

        {/* Feature Section 4: Guest Management - Image Right */}
        <div className="max-w-7xl mx-auto mb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5 leading-tight">
                Build guest
                <br />relationships
              </h3>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                Own your guest data. See booking history, preferences, and contact details — everything for personalized service.
              </p>
              <div className="grid grid-cols-2 gap-5">
                <FeaturePoint icon={<Users className="w-5 h-5" />} title="Guest Profiles" description="Complete history for every guest." />
                <FeaturePoint icon={<Mail className="w-5 h-5" />} title="Direct Contact" description="Email guests without restrictions." />
                <FeaturePoint icon={<Heart className="w-5 h-5" />} title="Loyalty Tracking" description="See returning guests and reward them." />
                <FeaturePoint icon={<FileText className="w-5 h-5" />} title="Notes & Tags" description="Add notes and organize with tags." />
              </div>
            </div>
            <div className="relative">
              <FeatureMockup variant="guests" />
            </div>
          </div>
        </div>

        {/* Feature Section 6: Analytics - Image Left */}
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 relative">
              <FeatureMockup variant="analytics" />
            </div>
            <div className="order-1 lg:order-2">
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5 leading-tight">
                Know your
                <br />numbers
              </h3>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                Track revenue, occupancy, and booking trends with beautiful analytics. Make data-driven decisions to grow.
              </p>
              <div className="grid grid-cols-2 gap-5">
                <FeaturePoint icon={<BarChart3 className="w-5 h-5" />} title="Revenue Reports" description="Track income by room, period, or source." />
                <FeaturePoint icon={<TrendingUp className="w-5 h-5" />} title="Occupancy Trends" description="See patterns and optimize pricing." />
                <FeaturePoint icon={<PieChart className="w-5 h-5" />} title="Booking Sources" description="Know where your guests come from." />
                <FeaturePoint icon={<Target className="w-5 h-5" />} title="Performance Goals" description="Set targets and track progress." />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* More Features Grid */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">And more</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything else you need
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniFeatureCard icon={<Plus className="w-5 h-5" />} title="Add-ons & Extras" description="Upsell breakfast, transfers, activities" />
            <MiniFeatureCard icon={<Star className="w-5 h-5" />} title="Reviews System" description="Collect and display guest reviews" />
            <MiniFeatureCard icon={<MessageSquare className="w-5 h-5" />} title="Guest Messaging" description="Communicate before and after stays" />
            <MiniFeatureCard icon={<Clock className="w-5 h-5" />} title="Auto Emails" description="Confirmations, reminders, thank-yous" />
            <MiniFeatureCard icon={<Users className="w-5 h-5" />} title="Team Access" description="Add staff with role-based permissions" />
            <MiniFeatureCard icon={<FileText className="w-5 h-5" />} title="Reports Export" description="Download data in CSV or PDF" />
            <MiniFeatureCard icon={<Headphones className="w-5 h-5" />} title="Priority Support" description="Get help when you need it" />
            <MiniFeatureCard icon={<Lock className="w-5 h-5" />} title="Secure & Safe" description="Daily backups, SSL encryption" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        ref={howItWorksRef}
        id="how-it-works"
        className="py-28 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-5xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${howItWorksVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <p className="text-sm font-medium text-emerald-600 uppercase tracking-wide mb-4">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Go live in 10 minutes
            </h2>
            <p className="text-xl text-gray-500">
              Three simple steps to start accepting direct bookings
            </p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px bg-gray-200" />

            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              <StepCard
                number="01"
                title="Create your account"
                description="Sign up and add your property details — name, location, and photos."
                visible={howItWorksVisible}
                delay={0}
              />
              <StepCard
                number="02"
                title="Set up your rooms"
                description="Add rooms with pricing, amenities, and connect your payment account."
                visible={howItWorksVisible}
                delay={150}
              />
              <StepCard
                number="03"
                title="Start accepting bookings"
                description="Publish your booking site, share the link, and receive bookings."
                visible={howItWorksVisible}
                delay={300}
              />
            </div>
          </div>

          <div className={`mt-16 text-center transition-all duration-700 delay-500 ${howItWorksVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-full hover:bg-black transition-all font-medium group"
            >
              Get started now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section
        ref={comparisonRef}
        className="py-28 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white"
      >
        <div className="max-w-5xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${comparisonVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Compare</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              See the difference
            </h2>
            <p className="text-xl text-gray-400">
              Why property owners are switching to direct bookings
            </p>
          </div>

          <div className={`grid md:grid-cols-2 gap-6 transition-all duration-700 delay-200 ${comparisonVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* OTAs */}
            <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50">
              <div className="text-gray-400 font-medium text-sm uppercase tracking-wide mb-6">OTAs (Booking.com, Airbnb)</div>
              <ul className="space-y-4">
                <ComparisonItem negative text="15-20% commission per booking" />
                <ComparisonItem negative text="Guests belong to the platform" />
                <ComparisonItem negative text="Limited customization" />
                <ComparisonItem negative text="Competing with other listings" />
                <ComparisonItem negative text="Delayed payouts (14-30 days)" />
                <ComparisonItem negative text="No direct guest communication" />
              </ul>
            </div>

            {/* Vilo */}
            <div className="bg-emerald-900/20 rounded-2xl p-8 border border-emerald-500/20">
              <div className="text-emerald-400 font-medium text-sm uppercase tracking-wide mb-6">With Vilo</div>
              <ul className="space-y-4">
                <ComparisonItem positive text="0% commission — keep everything" />
                <ComparisonItem positive text="Build your own guest database" />
                <ComparisonItem positive text="Fully branded booking site" />
                <ComparisonItem positive text="Direct relationship with guests" />
                <ComparisonItem positive text="Fast payouts (2-3 days)" />
                <ComparisonItem positive text="Direct email & communication" />
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        ref={pricingRef}
        id="pricing"
        className="py-28 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-12 transition-all duration-700 ${pricingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <p className="text-sm font-medium text-emerald-600 uppercase tracking-wide mb-4">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-500 mb-8">
              One flat fee. No commissions. No hidden costs.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center bg-gray-100 p-1 rounded-full">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Annual
                <span className="ml-1.5 text-xs text-emerald-600 font-medium">-17%</span>
              </button>
            </div>
          </div>

          <div className={`grid md:grid-cols-3 gap-6 transition-all duration-700 delay-200 ${pricingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Monthly/Annual Plan */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {billingCycle === 'monthly' ? 'Monthly' : 'Annual'}
                </h3>
                <p className="text-sm text-gray-400">Flexible subscription</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  R{billingCycle === 'monthly' ? '499' : '4,999'}
                </span>
                <span className="text-gray-400 text-sm">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                {billingCycle === 'annual' && (
                  <p className="text-sm text-gray-500 mt-1">R417/month billed annually</p>
                )}
              </div>
              <ul className="space-y-3 mb-8">
                <PricingFeature text="Unlimited rooms & bookings" />
                <PricingFeature text="Online payments" />
                <PricingFeature text="Guest management" />
                <PricingFeature text="Analytics dashboard" />
                <PricingFeature text="Email support" />
              </ul>
              <Link
                to="/pricing"
                className="block w-full text-center py-3 rounded-full font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
              >
                Get started
              </Link>
            </div>

            {/* Lifetime Plan - Featured */}
            <div className="bg-gray-900 rounded-2xl p-8 text-white relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">
                Best value
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-1">Lifetime</h3>
                <p className="text-sm text-gray-400">Pay once, use forever</p>
              </div>
              <div className="mb-6">
                <div className="text-sm text-gray-500 line-through">R3,999</div>
                <span className="text-4xl font-bold">R1,999</span>
                <span className="text-gray-400 text-sm"> once</span>
                <p className="text-sm text-emerald-400 mt-1">Save R2,000 — limited time</p>
              </div>
              <ul className="space-y-3 mb-8">
                <PricingFeature text="Everything in Monthly" light />
                <PricingFeature text="All future updates" light />
                <PricingFeature text="No recurring fees ever" light />
                <PricingFeature text="Priority support" light />
                <PricingFeature text="30-day money-back guarantee" light />
              </ul>
              <Link
                to="/pricing"
                className="block w-full text-center py-3 rounded-full font-medium bg-white text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Get lifetime access
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Enterprise</h3>
                <p className="text-sm text-gray-400">Multiple properties</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                <PricingFeature text="Everything in Lifetime" />
                <PricingFeature text="Multiple properties" />
                <PricingFeature text="Team member access" />
                <PricingFeature text="Custom integrations" />
                <PricingFeature text="Dedicated support" />
                <PricingFeature text="Custom domain setup" />
              </ul>
              <Link
                to="/contact"
                className="block w-full text-center py-3 rounded-full font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
              >
                Contact sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - What Travelers Say */}
      <section
        ref={testimonialsRef}
        id="testimonials"
        className="py-28 px-4 sm:px-6 lg:px-8 bg-gray-50/50 overflow-hidden"
      >
        {/* Inline styles for marquee animation */}
        <style>{`
          @keyframes scroll-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes scroll-right {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
          .testimonial-marquee-left {
            display: flex;
            gap: 1.5rem;
            width: max-content;
            animation: scroll-left 30s linear infinite;
          }
          .testimonial-marquee-right {
            display: flex;
            gap: 1.5rem;
            width: max-content;
            animation: scroll-right 30s linear infinite;
          }
          .testimonial-marquee-left:hover,
          .testimonial-marquee-right:hover {
            animation-play-state: paused;
          }
        `}</style>

        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              What Travelers Say
            </h2>
            <p className="text-xl text-gray-500">
              Real experiences from guests who booked directly
            </p>
          </div>

          {/* Animated Marquee Container */}
          <div className={`relative overflow-hidden transition-all duration-700 delay-200 ${testimonialsVisible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Gradient overlays for smooth fade effect */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />

            {/* First row - scrolling left */}
            <div className="testimonial-marquee-left mb-6">
              <TestimonialCard
                quote="I was losing R4,000 a month to OTA commissions. Vilo paid for itself in the first week."
                author="Sarah M."
                role="Oceanview B&B, Cape Town"
                rating={5}
              />
              <TestimonialCard
                quote="Finally I own my guest relationships. I can email them directly and build real loyalty."
                author="John D."
                role="Mountain Lodge, Drakensberg"
                rating={5}
              />
              <TestimonialCard
                quote="The calendar view is brilliant. No more double bookings, no more spreadsheets."
                author="Lisa K."
                role="Safari Suites, Kruger"
                rating={5}
              />
              <TestimonialCard
                quote="Booking directly was so easy! Got a better rate and the host gave us a personal welcome."
                author="Emma R."
                role="Guest from London"
                rating={5}
              />
              <TestimonialCard
                quote="Love that I can communicate directly with the property. Makes the whole experience more personal."
                author="Michael T."
                role="Guest from Johannesburg"
                rating={5}
              />
              <TestimonialCard
                quote="No hidden fees, no surprises. The price I saw was the price I paid. Refreshing!"
                author="Anita P."
                role="Guest from Durban"
                rating={5}
              />
              {/* Duplicate for seamless loop */}
              <TestimonialCard
                quote="I was losing R4,000 a month to OTA commissions. Vilo paid for itself in the first week."
                author="Sarah M."
                role="Oceanview B&B, Cape Town"
                rating={5}
              />
              <TestimonialCard
                quote="Finally I own my guest relationships. I can email them directly and build real loyalty."
                author="John D."
                role="Mountain Lodge, Drakensberg"
                rating={5}
              />
              <TestimonialCard
                quote="The calendar view is brilliant. No more double bookings, no more spreadsheets."
                author="Lisa K."
                role="Safari Suites, Kruger"
                rating={5}
              />
              <TestimonialCard
                quote="Booking directly was so easy! Got a better rate and the host gave us a personal welcome."
                author="Emma R."
                role="Guest from London"
                rating={5}
              />
              <TestimonialCard
                quote="Love that I can communicate directly with the property. Makes the whole experience more personal."
                author="Michael T."
                role="Guest from Johannesburg"
                rating={5}
              />
              <TestimonialCard
                quote="No hidden fees, no surprises. The price I saw was the price I paid. Refreshing!"
                author="Anita P."
                role="Guest from Durban"
                rating={5}
              />
            </div>

            {/* Second row - scrolling right (opposite direction) */}
            <div className="testimonial-marquee-right">
              <TestimonialCard
                quote="Best decision we made was switching to direct bookings. Our repeat guest rate is now 40%!"
                author="David K."
                role="Vineyard Retreat, Stellenbosch"
                rating={5}
              />
              <TestimonialCard
                quote="The automated emails save me hours every week. Guests love the personal touch."
                author="Thandi M."
                role="Beachfront Villa, Ballito"
                rating={5}
              />
              <TestimonialCard
                quote="Such a peaceful stay. Loved booking direct - felt like we were supporting the family business."
                author="Peter & Sue"
                role="Guests from Australia"
                rating={5}
              />
              <TestimonialCard
                quote="Setup took 15 minutes and I had my first booking within 3 days. Amazing support team!"
                author="Rachel N."
                role="Boutique Hotel, Clarens"
                rating={5}
              />
              <TestimonialCard
                quote="The host remembered our anniversary from the booking notes. That never happens on big sites!"
                author="James & Claire"
                role="Guests from Cape Town"
                rating={5}
              />
              <TestimonialCard
                quote="Finally have control over my own business. No more waiting for OTA payouts."
                author="Pieter V."
                role="Game Farm, Limpopo"
                rating={5}
              />
              {/* Duplicate for seamless loop */}
              <TestimonialCard
                quote="Best decision we made was switching to direct bookings. Our repeat guest rate is now 40%!"
                author="David K."
                role="Vineyard Retreat, Stellenbosch"
                rating={5}
              />
              <TestimonialCard
                quote="The automated emails save me hours every week. Guests love the personal touch."
                author="Thandi M."
                role="Beachfront Villa, Ballito"
                rating={5}
              />
              <TestimonialCard
                quote="Such a peaceful stay. Loved booking direct - felt like we were supporting the family business."
                author="Peter & Sue"
                role="Guests from Australia"
                rating={5}
              />
              <TestimonialCard
                quote="Setup took 15 minutes and I had my first booking within 3 days. Amazing support team!"
                author="Rachel N."
                role="Boutique Hotel, Clarens"
                rating={5}
              />
              <TestimonialCard
                quote="The host remembered our anniversary from the booking notes. That never happens on big sites!"
                author="James & Claire"
                role="Guests from Cape Town"
                rating={5}
              />
              <TestimonialCard
                quote="Finally have control over my own business. No more waiting for OTA payouts."
                author="Pieter V."
                role="Game Farm, Limpopo"
                rating={5}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section
        ref={ctaRef}
        className="py-28 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-4xl mx-auto">
          <div className={`bg-gray-900 rounded-3xl p-12 sm:p-16 text-center transition-all duration-700 ${ctaVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Ready to keep 100%
              <br />of your revenue?
            </h2>
            <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
              Join property owners who've made the switch to direct bookings. Setup takes less than 10 minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/pricing"
                className="w-full sm:w-auto bg-white text-gray-900 px-8 py-4 rounded-full hover:bg-gray-100 transition-all font-medium text-base"
              >
                Get started
              </Link>
              <Link
                to="/directory"
                className="w-full sm:w-auto text-gray-400 px-8 py-4 rounded-full hover:text-white transition-colors font-medium text-base"
              >
                Browse properties
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              No credit card required. 30-day money-back guarantee.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">V</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">Vilo</span>
              </div>
              <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                The booking platform for accommodation providers. No commissions. Just simple, direct bookings.
              </p>
            </div>
            <div>
              <h4 className="text-gray-900 font-medium text-sm mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#features" className="text-gray-500 hover:text-gray-900 transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-gray-500 hover:text-gray-900 transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-medium text-sm mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">About</a></li>
                <li><a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">Blog</a></li>
                <li><Link to="/contact" className="text-gray-500 hover:text-gray-900 transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-medium text-sm mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">Privacy</a></li>
                <li><a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Vilo. All rights reserved.</p>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                SSL Secure
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                PCI Compliant
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Component: Mega Menu Item
function MegaMenuItem({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href: string }) {
  const isExternal = href.startsWith('http')
  const isHash = href.startsWith('#')

  const className = "flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"

  const content = (
    <>
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-black group-hover:text-white transition-colors flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-medium text-gray-900 group-hover:text-black">{title}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
    </>
  )

  if (isExternal || isHash) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    )
  }

  return (
    <Link to={href} className={className}>
      {content}
    </Link>
  )
}

// Component: Stat Card for Dashboard Preview
function StatCard({ icon, value, label, trend, highlighted }: { icon: React.ReactNode; value: string; label: string; trend: string; highlighted?: boolean }) {
  return (
    <div className={`rounded-xl p-4 sm:p-5 shadow-sm relative ${
      highlighted
        ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-400 ring-4 ring-yellow-400/30'
        : 'bg-white border border-gray-200'
    }`}>
      {highlighted && (
        <>
          {/* Bottom badges inline */}
          <div className="absolute -bottom-2 right-2 flex items-center gap-1">
            <div className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              100% YOURS
            </div>
            <div className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              0% FEES
            </div>
          </div>
        </>
      )}
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          highlighted ? 'bg-gradient-to-br from-yellow-400 to-amber-400 text-yellow-900 shadow-sm' : 'bg-gray-100 text-gray-500'
        }`}>
          {icon}
        </div>
        {trend && !highlighted && (
          <span className="text-xs font-medium text-emerald-600">
            {trend}
          </span>
        )}
        {trend && highlighted && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
            {trend}
          </span>
        )}
      </div>
      <div className={`text-xl sm:text-2xl font-bold ${highlighted ? 'text-gray-900' : 'text-gray-900'}`}>{value}</div>
      <div className={`text-xs sm:text-sm ${highlighted ? 'text-amber-700 font-medium' : 'text-gray-500'}`}>{label}</div>
    </div>
  )
}

// Component: Problem Item
function ProblemItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
        <span className="text-red-600 text-xs">✕</span>
      </div>
      <span className="text-gray-700">{text}</span>
    </div>
  )
}

// Component: Feature Card (keeping for potential future use)
function _FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all group">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-gray-100 text-gray-600 group-hover:bg-black group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
void _FeatureCard

// Component: Step Card
function StepCard({ number, title, description, visible = true, delay = 0 }: { number: string; title: string; description: string; visible?: boolean; delay?: number }) {
  return (
    <div
      className={`text-center relative transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-xl font-semibold mx-auto mb-5 relative z-10">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

// Component: Comparison Item
function ComparisonItem({ text, positive, negative }: { text: string; positive?: boolean; negative?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      {positive && (
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-emerald-400" />
        </div>
      )}
      {negative && (
        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-red-400 text-xs">✕</span>
        </div>
      )}
      <span className={positive ? 'text-gray-200' : 'text-gray-400'}>{text}</span>
    </li>
  )
}

// Component: Pricing Feature
function PricingFeature({ text, light }: { text: string; light?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <Check className={`w-5 h-5 flex-shrink-0 ${light ? 'text-emerald-400' : 'text-gray-900'}`} />
      <span className={light ? 'text-gray-300' : 'text-gray-600'}>{text}</span>
    </li>
  )
}

// Component: Testimonial Card
function TestimonialCard({ quote, author, role, rating }: { quote: string; author: string; role: string; rating: number }) {
  return (
    <div className="flex-shrink-0 w-[340px] bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all">
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
        ))}
      </div>
      <p className="text-gray-600 mb-5 leading-relaxed text-[15px]">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-medium">
          {author.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <div className="font-medium text-gray-900 text-sm">{author}</div>
          <div className="text-xs text-gray-400">{role}</div>
        </div>
      </div>
    </div>
  )
}

// Component: Feature Point (for 2x2 grids in feature sections)
function FeaturePoint({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-medium text-gray-900 mb-0.5">{title}</div>
        <div className="text-sm text-gray-400 leading-relaxed">{description}</div>
      </div>
    </div>
  )
}

// Component: Mini Feature Card (for the "more features" grid)
function MiniFeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
      <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 mb-3 group-hover:bg-gray-100 transition-colors">
        {icon}
      </div>
      <h4 className="font-medium text-gray-900 mb-0.5">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  )
}

// Component: Feature Mockup (stacked screenshot images like SureCart)
function FeatureMockup({ variant }: { variant: 'rooms' | 'calendar' | 'payments' | 'website' | 'guests' | 'analytics' }) {
  const mockupContent = {
    rooms: {
      title: 'Room Management',
      screens: [
        { type: 'main', content: <RoomsMockup /> },
        { type: 'secondary', content: <RoomDetailMockup /> }
      ]
    },
    calendar: {
      title: 'Booking Calendar',
      screens: [
        { type: 'main', content: <CalendarMockup /> },
        { type: 'secondary', content: <BookingDetailMockup /> }
      ]
    },
    payments: {
      title: 'Payments',
      screens: [
        { type: 'main', content: <PaymentsMockup /> },
        { type: 'secondary', content: <InvoiceMockup /> }
      ]
    },
    website: {
      title: 'Website',
      screens: [
        { type: 'main', content: <WebsiteMockup /> },
        { type: 'secondary', content: <WebsiteMobileMockup /> }
      ]
    },
    guests: {
      title: 'Guests',
      screens: [
        { type: 'main', content: <GuestsMockup /> },
        { type: 'secondary', content: <GuestDetailMockup /> }
      ]
    },
    analytics: {
      title: 'Analytics',
      screens: [
        { type: 'main', content: <AnalyticsMockup /> },
        { type: 'secondary', content: <ReportMockup /> }
      ]
    }
  }

  const { screens } = mockupContent[variant]

  return (
    <div className="relative">
      {/* Main screenshot */}
      <div className="relative z-10 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-1">
          {screens[0].content}
        </div>
      </div>

      {/* Secondary screenshot - offset and stacked */}
      <div className="absolute -bottom-6 -right-6 w-2/3 z-20 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-300">
        <div className="p-1">
          {screens[1].content}
        </div>
      </div>
    </div>
  )
}

// Mockup: Rooms List
function RoomsMockup() {
  return (
    <div className="bg-gray-50 p-4 min-h-[280px]">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-gray-900">Your Rooms</div>
        <div className="bg-black text-white text-xs px-3 py-1.5 rounded-full">+ Add Room</div>
      </div>
      <div className="space-y-3">
        {['Deluxe Suite', 'Ocean View Room', 'Standard Double'].map((room, i) => (
          <div key={i} className="bg-white rounded-lg p-3 border border-gray-100 flex items-center gap-3">
            <div className="w-16 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{room}</div>
              <div className="text-xs text-gray-500">R{(1200 - i * 200).toLocaleString()}/night</div>
            </div>
            <div className={`text-xs px-2 py-1 rounded-full ${i === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
              {i === 0 ? 'Available' : i === 1 ? 'Booked' : '2 units'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Mockup: Room Detail
function RoomDetailMockup() {
  return (
    <div className="bg-gray-50 p-3 min-h-[160px]">
      <div className="bg-gradient-to-br from-emerald-200 to-teal-200 rounded-lg h-20 mb-3" />
      <div className="text-sm font-semibold text-gray-900 mb-1">Deluxe Suite</div>
      <div className="flex gap-2 mb-2">
        {['WiFi', 'AC', 'TV'].map(a => (
          <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{a}</span>
        ))}
      </div>
      <div className="text-xs text-emerald-600 font-medium">R1,200/night</div>
    </div>
  )
}

// Mockup: Calendar
function CalendarMockup() {
  return (
    <div className="bg-gray-50 p-4 min-h-[280px]">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-gray-900">December 2024</div>
        <div className="flex gap-1">
          <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">&lt;</div>
          <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">&gt;</div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
          <div key={d} className="text-center text-gray-400 py-1">{d}</div>
        ))}
        {Array.from({ length: 31 }, (_, i) => {
          const isBooked = [5, 6, 7, 12, 13, 14, 15, 20, 21, 22].includes(i + 1)
          const isToday = i + 1 === 15
          return (
            <div
              key={i}
              className={`text-center py-1.5 rounded ${
                isBooked ? 'bg-emerald-100 text-emerald-700' : isToday ? 'bg-black text-white' : 'text-gray-700'
              }`}
            >
              {i + 1}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Mockup: Booking Detail
function BookingDetailMockup() {
  return (
    <div className="bg-gray-50 p-3 min-h-[160px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xs font-bold">JD</div>
        <div>
          <div className="text-sm font-semibold text-gray-900">John Doe</div>
          <div className="text-xs text-gray-500">Dec 12-15, 2024</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Room</span>
          <span className="text-gray-900">Deluxe Suite</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Total</span>
          <span className="text-emerald-600 font-medium">R3,600</span>
        </div>
      </div>
    </div>
  )
}

// Mockup: Payments
function PaymentsMockup() {
  return (
    <div className="bg-gray-50 p-4 min-h-[280px]">
      <div className="text-sm font-semibold text-gray-900 mb-4">Recent Payments</div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'This Month', value: 'R24,500', color: 'emerald' },
          { label: 'Pending', value: 'R3,200', color: 'yellow' },
          { label: 'Processed', value: '12', color: 'gray' }
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-lg p-3 border border-gray-100">
            <div className={`text-lg font-bold text-${stat.color}-600`}>{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {['John Doe - R1,200', 'Sarah Smith - R2,400', 'Mike Johnson - R800'].map((p, i) => (
          <div key={i} className="bg-white rounded-lg p-2.5 border border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-700">{p}</span>
            <span className="text-xs text-emerald-600">Paid</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Mockup: Invoice
function InvoiceMockup() {
  return (
    <div className="bg-white p-3 min-h-[160px]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-gray-900">Invoice #1234</div>
        <div className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Paid</div>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between text-gray-500">
          <span>3 nights x R1,200</span>
          <span>R3,600</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Breakfast add-on</span>
          <span>R450</span>
        </div>
        <div className="border-t pt-1.5 flex justify-between font-semibold text-gray-900">
          <span>Total</span>
          <span>R4,050</span>
        </div>
      </div>
    </div>
  )
}

// Mockup: Website
function WebsiteMockup() {
  return (
    <div className="bg-gray-50 min-h-[280px]">
      <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-6 text-white">
        <div className="text-xs font-medium mb-2 opacity-80">yourproperty.vilo.co.za</div>
        <div className="text-lg font-bold mb-1">Oceanview B&B</div>
        <div className="text-xs opacity-80">Cape Town, South Africa</div>
      </div>
      <div className="p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">Available Rooms</div>
        <div className="space-y-2">
          {['Deluxe Suite', 'Ocean View'].map((room, i) => (
            <div key={i} className="bg-white rounded-lg p-2.5 border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-8 bg-gradient-to-br from-emerald-100 to-teal-100 rounded" />
                <span className="text-xs font-medium text-gray-900">{room}</span>
              </div>
              <div className="text-xs text-emerald-600 font-medium">R{(1200 - i * 400)}/night</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Mockup: Website Mobile
function WebsiteMobileMockup() {
  return (
    <div className="bg-gray-50 min-h-[160px]">
      <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-3 text-white text-center">
        <div className="text-sm font-bold">Oceanview B&B</div>
        <div className="text-xs opacity-80">Book Now</div>
      </div>
      <div className="p-3">
        <div className="bg-white rounded-lg p-2 border border-gray-100 text-center">
          <div className="text-xs text-gray-500 mb-1">Select Dates</div>
          <div className="text-sm font-semibold text-gray-900">Dec 20 - Dec 23</div>
        </div>
      </div>
    </div>
  )
}

// Mockup: Guests List
function GuestsMockup() {
  return (
    <div className="bg-gray-50 p-4 min-h-[280px]">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-gray-900">Guest Database</div>
        <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full">248 guests</div>
      </div>
      <div className="space-y-2">
        {[
          { name: 'Sarah Johnson', stays: 5, tag: 'VIP' },
          { name: 'Michael Chen', stays: 3, tag: 'Returning' },
          { name: 'Emma Williams', stays: 1, tag: 'New' }
        ].map((guest, i) => (
          <div key={i} className="bg-white rounded-lg p-3 border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center text-emerald-600 text-sm font-bold">
              {guest.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{guest.name}</div>
              <div className="text-xs text-gray-500">{guest.stays} stay{guest.stays > 1 ? 's' : ''}</div>
            </div>
            <div className={`text-xs px-2 py-1 rounded-full ${
              guest.tag === 'VIP' ? 'bg-yellow-50 text-yellow-600' :
              guest.tag === 'Returning' ? 'bg-emerald-50 text-emerald-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              {guest.tag}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Mockup: Guest Detail
function GuestDetailMockup() {
  return (
    <div className="bg-gray-50 p-3 min-h-[160px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center text-yellow-600 text-sm font-bold">SJ</div>
        <div>
          <div className="text-sm font-semibold text-gray-900">Sarah Johnson</div>
          <div className="text-xs text-yellow-600">VIP Guest</div>
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Total Stays</span>
          <span className="text-gray-900">5</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Total Spent</span>
          <span className="text-emerald-600 font-medium">R18,500</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Last Stay</span>
          <span className="text-gray-900">Nov 2024</span>
        </div>
      </div>
    </div>
  )
}

// Mockup: Analytics Dashboard
function AnalyticsMockup() {
  return (
    <div className="bg-gray-50 p-4 min-h-[280px]">
      <div className="text-sm font-semibold text-gray-900 mb-4">Dashboard Overview</div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Revenue', value: 'R124,500', change: '+23%' },
          { label: 'Occupancy', value: '78%', change: '+5%' },
          { label: 'Bookings', value: '45', change: '+12%' },
          { label: 'Avg Rate', value: 'R1,150', change: '+8%' }
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
            <div className="text-sm font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-emerald-600">{stat.change}</div>
          </div>
        ))}
      </div>
      {/* Mini chart */}
      <div className="bg-white rounded-lg p-3 border border-gray-100">
        <div className="text-xs text-gray-500 mb-2">Revenue Trend</div>
        <div className="flex items-end gap-1 h-12">
          {[40, 55, 45, 60, 75, 65, 80, 70, 85, 90, 82, 95].map((h, i) => (
            <div key={i} className="flex-1 bg-emerald-200 rounded-t" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Mockup: Report
function ReportMockup() {
  return (
    <div className="bg-white p-3 min-h-[160px]">
      <div className="text-xs font-semibold text-gray-900 mb-3">Monthly Report</div>
      <div className="space-y-2">
        {[
          { label: 'Direct Bookings', value: '65%', color: 'emerald' },
          { label: 'Website', value: '25%', color: 'teal' },
          { label: 'Other', value: '10%', color: 'gray' }
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-${item.color}-400`} />
            <span className="text-xs text-gray-600 flex-1">{item.label}</span>
            <span className="text-xs font-medium text-gray-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
