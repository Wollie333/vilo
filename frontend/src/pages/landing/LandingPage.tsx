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
  Zap,
  BedDouble,
  Plus,
  CalendarDays,
  Shield,
  TrendingUp,
  BadgePercent,
  Sparkles,
  ChevronRight,
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
  Palette,
  Smartphone,
  Mail,
  Heart,
  PieChart,
  Target,
  Clock
} from 'lucide-react'

// Competitor names for animation
const COMPETITORS = ['Booking.com', 'Airbnb', 'Expedia', 'Hotels.com', 'Agoda']

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [currentCompetitor, setCurrentCompetitor] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Animate competitor names
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentCompetitor((prev) => (prev + 1) % COMPETITORS.length)
        setIsAnimating(false)
      }, 200)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

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

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation with Mega Menu */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
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

      {/* Hero Section with Animated Competitor Names */}
      <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-emerald-100">
              <BadgePercent className="w-4 h-4" />
              <span>Keep 100% of your revenue. No commission fees.</span>
            </div>

            {/* Main Headline with Animated Competitor */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight mb-6 leading-[1.1]">
              Stop paying 15% to
              <br />
              <span className="relative inline-block">
                <span
                  className={`bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent transition-all duration-200 ${
                    isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                  }`}
                >
                  {COMPETITORS[currentCompetitor]}
                </span>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              The complete booking platform that lets you manage rooms, accept payments, and delight guests — without giving away your profits to OTAs.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                to="/pricing"
                className="w-full sm:w-auto bg-black text-white px-8 py-4 rounded-full hover:bg-gray-800 transition-all font-semibold text-lg flex items-center justify-center gap-2 shadow-lg shadow-gray-900/10"
              >
                Start Saving Today
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto bg-white text-gray-900 px-8 py-4 rounded-full hover:bg-gray-50 transition-all font-semibold text-lg border border-gray-200 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                See How It Works
              </a>
            </div>

            <p className="text-sm text-gray-500">
              30-day money-back guarantee. Setup in under 10 minutes.
            </p>
          </div>

          {/* Hero Visual - Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="absolute -inset-x-20 -top-20 -bottom-20 bg-gradient-to-b from-emerald-50/50 via-transparent to-transparent rounded-[3rem] -z-10" />
            <div className="bg-white rounded-2xl shadow-2xl shadow-gray-900/10 border border-gray-200 overflow-hidden">
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="ml-4 text-sm text-gray-500 font-medium">app.vilo.co.za</span>
              </div>
              <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  <StatCard icon={<Calendar className="w-5 h-5" />} value="156" label="Total Bookings" trend="+12%" />
                  <StatCard icon={<CreditCard className="w-5 h-5" />} value="R245,800" label="Revenue" trend="+23%" />
                  <StatCard icon={<BarChart3 className="w-5 h-5" />} value="87%" label="Occupancy" trend="+5%" />
                  <StatCard icon={<Star className="w-5 h-5" />} value="4.9" label="Guest Rating" trend="" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">R0</div>
              <div className="text-sm text-gray-500">Commission Fees</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">10min</div>
              <div className="text-sm text-gray-500">Setup Time</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">100%</div>
              <div className="text-sm text-gray-500">Your Revenue</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">24/7</div>
              <div className="text-sm text-gray-500">Online Bookings</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium mb-6">
                <TrendingUp className="w-4 h-4" />
                The Problem
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                OTAs are eating your profits
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Every booking through Booking.com, Airbnb, or other platforms costs you 15-20% in commission.
                On a R1,000/night room, that's R150 gone — every single night.
              </p>
              <div className="space-y-4">
                <ProblemItem text="15-20% commission on every booking" />
                <ProblemItem text="No control over your guest relationships" />
                <ProblemItem text="Competing with your own listing" />
                <ProblemItem text="Hidden fees that add up fast" />
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-8 text-white">
              <div className="text-sm text-gray-400 mb-2">Your annual loss to OTAs</div>
              <div className="text-5xl font-bold text-red-400 mb-6">-R54,750</div>
              <div className="text-sm text-gray-400 mb-4">Based on 1 room at R1,000/night, 75% occupancy</div>
              <div className="border-t border-gray-700 pt-6">
                <div className="text-sm text-gray-400 mb-2">With Vilo you keep</div>
                <div className="text-4xl font-bold text-emerald-400">R54,750</div>
                <div className="text-sm text-gray-400 mt-2">That's 100% of your booking revenue</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - SureCart Style */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-7xl mx-auto text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-emerald-100">
            <Sparkles className="w-4 h-4" />
            Powerful Features
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Everything you need to
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">run your property</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From bookings to payments, guest management to analytics — Vilo gives you complete control without the complexity.
          </p>
        </div>

        {/* Feature Section 1: Room Management - Image Right */}
        <div className="max-w-7xl mx-auto mb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Manage Your Rooms,
                <br />Your Way
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Set up your rooms with beautiful photos, detailed amenities, flexible pricing, and real-time availability — all from one intuitive dashboard.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <FeaturePoint icon={<BedDouble className="w-5 h-5" />} title="Multiple Room Types" description="Standard, deluxe, suites — organize however you want." />
                <FeaturePoint icon={<ImageIcon className="w-5 h-5" />} title="Photo Galleries" description="Showcase rooms with unlimited high-quality images." />
                <FeaturePoint icon={<Tag className="w-5 h-5" />} title="Dynamic Pricing" description="Set seasonal rates, weekday specials, and more." />
                <FeaturePoint icon={<Settings className="w-5 h-5" />} title="Amenities Manager" description="WiFi, parking, pool — list everything guests need." />
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
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Visual Calendar That
                <br />Just Works
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                See all your bookings at a glance with our beautiful calendar view. Drag to create bookings, spot availability gaps, and never double-book again.
              </p>
              <div className="grid grid-cols-2 gap-6">
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
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Accept Payments
                <br />Directly
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                No middleman, no delays. Accept card payments via Paystack and get funds deposited straight to your bank account within 2-3 days.
              </p>
              <div className="grid grid-cols-2 gap-6">
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

        {/* Feature Section 4: Website Builder - Image Left */}
        <div className="max-w-7xl mx-auto mb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 relative">
              <FeatureMockup variant="website" />
            </div>
            <div className="order-1 lg:order-2">
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Your Own Booking
                <br />Website
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Get a beautiful, mobile-friendly booking website on your own subdomain or custom domain. No coding required — just add your content and go live.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <FeaturePoint icon={<Globe className="w-5 h-5" />} title="Custom Domain" description="Use your own domain or our subdomain." />
                <FeaturePoint icon={<Palette className="w-5 h-5" />} title="Brand It Yours" description="Your logo, colors, and style throughout." />
                <FeaturePoint icon={<Smartphone className="w-5 h-5" />} title="Mobile Perfect" description="Looks great on every device." />
                <FeaturePoint icon={<Zap className="w-5 h-5" />} title="Lightning Fast" description="Optimized for speed and SEO." />
              </div>
            </div>
          </div>
        </div>

        {/* Feature Section 5: Guest Management - Image Right */}
        <div className="max-w-7xl mx-auto mb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Build Guest
                <br />Relationships
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Own your guest data. See booking history, preferences, contact details, and notes — everything you need to provide personalized service and encourage repeat visits.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <FeaturePoint icon={<Users className="w-5 h-5" />} title="Guest Profiles" description="Complete history for every guest." />
                <FeaturePoint icon={<Mail className="w-5 h-5" />} title="Direct Contact" description="Email guests without platform restrictions." />
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
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Know Your
                <br />Numbers
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Track revenue, occupancy rates, booking trends, and more with our beautiful analytics dashboard. Make data-driven decisions to grow your business.
              </p>
              <div className="grid grid-cols-2 gap-6">
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
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              And so much more...
            </h2>
            <p className="text-xl text-gray-600">
              Everything else you need to run a successful property
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MiniFeatureCard icon={<Plus className="w-5 h-5" />} title="Add-ons & Extras" description="Upsell breakfast, transfers, activities" />
            <MiniFeatureCard icon={<Star className="w-5 h-5" />} title="Reviews System" description="Collect and display guest reviews" />
            <MiniFeatureCard icon={<MessageSquare className="w-5 h-5" />} title="Guest Messaging" description="Communicate before and after stays" />
            <MiniFeatureCard icon={<Clock className="w-5 h-5" />} title="Auto Emails" description="Confirmations, reminders, thank-yous" />
            <MiniFeatureCard icon={<Users className="w-5 h-5" />} title="Team Access" description="Add staff with role-based permissions" />
            <MiniFeatureCard icon={<FileText className="w-5 h-5" />} title="Reports Export" description="Download data in CSV or PDF" />
            <MiniFeatureCard icon={<Headphones className="w-5 h-5" />} title="Priority Support" description="Get help when you need it" />
            <MiniFeatureCard icon={<Shield className="w-5 h-5" />} title="Daily Backups" description="Your data is always safe" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Go live in 10 minutes
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to start accepting direct bookings
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <StepCard
              number="01"
              title="Create Your Account"
              description="Sign up and add your property details — name, location, photos, and room types."
            />
            <StepCard
              number="02"
              title="Set Up Your Rooms"
              description="Add rooms with pricing, amenities, and availability. Connect your payment account."
            />
            <StepCard
              number="03"
              title="Share & Accept Bookings"
              description="Publish your booking site, share the link, and start receiving direct bookings."
            />
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-full hover:bg-gray-800 transition-all font-semibold"
            >
              Get Started Now
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              See the difference
            </h2>
            <p className="text-xl text-gray-400">
              Why property owners are switching to direct bookings
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* OTAs */}
            <div className="bg-gray-800 rounded-2xl p-8">
              <div className="text-red-400 font-semibold mb-4">OTAs (Booking.com, Airbnb)</div>
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
            <div className="bg-emerald-900/30 rounded-2xl p-8 border border-emerald-500/30">
              <div className="text-emerald-400 font-semibold mb-4">Vilo</div>
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
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              One flat fee. No commissions. No hidden costs.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center bg-gray-100 p-1 rounded-full mb-8">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 text-sm font-medium rounded-full transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2 text-sm font-medium rounded-full transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual
                <span className="ml-2 text-xs text-emerald-600 font-semibold">Save 17%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Monthly/Annual Plan */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {billingCycle === 'monthly' ? 'Monthly' : 'Annual'}
                </h3>
                <p className="text-sm text-gray-500">Flexible subscription</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  R{billingCycle === 'monthly' ? '499' : '4,999'}
                </span>
                <span className="text-gray-500">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                {billingCycle === 'annual' && (
                  <p className="text-sm text-emerald-600 mt-1">R417/month, billed annually</p>
                )}
              </div>
              <ul className="space-y-3 mb-8">
                <PricingFeature text="Unlimited rooms & bookings" />
                <PricingFeature text="Custom booking website" />
                <PricingFeature text="Online payments" />
                <PricingFeature text="Guest management" />
                <PricingFeature text="Analytics dashboard" />
                <PricingFeature text="Email support" />
              </ul>
              <Link
                to="/pricing"
                className="block w-full text-center py-3 rounded-full font-semibold bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Lifetime Plan - Featured */}
            <div className="bg-black rounded-2xl p-8 text-white relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                BEST VALUE
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Lifetime</h3>
                <p className="text-sm text-gray-400">Pay once, use forever</p>
              </div>
              <div className="mb-6">
                <div className="text-sm text-gray-500 line-through">R3,999</div>
                <span className="text-4xl font-bold">R1,999</span>
                <span className="text-gray-400"> once</span>
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
                className="block w-full text-center py-3 rounded-full font-semibold bg-white text-black hover:bg-gray-100 transition-colors"
              >
                Get Lifetime Access
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Enterprise</h3>
                <p className="text-sm text-gray-500">Multiple properties</p>
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
                className="block w-full text-center py-3 rounded-full font-semibold bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Trusted by property owners
            </h2>
            <p className="text-xl text-gray-600">
              See why accommodation providers love Vilo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              quote="I was losing R4,000 a month to OTA commissions. Vilo paid for itself in the first week. The setup was incredibly easy."
              author="Sarah M."
              role="Oceanview B&B, Cape Town"
              rating={5}
            />
            <TestimonialCard
              quote="Finally I own my guest relationships. I can email them directly, offer discounts for returning guests, and build real loyalty."
              author="John D."
              role="Mountain Lodge, Drakensberg"
              rating={5}
            />
            <TestimonialCard
              quote="The calendar view is brilliant. No more double bookings, no more spreadsheets. And keeping 100% of my revenue is amazing."
              author="Lisa K."
              role="Safari Suites, Kruger"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-12 sm:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-emerald-500/30">
                <Zap className="w-4 h-4" />
                Start keeping 100% of your revenue
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to stop paying
                <br />commission fees?
              </h2>
              <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                Join property owners who've already made the switch to direct bookings.
                Setup takes less than 10 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/pricing"
                  className="w-full sm:w-auto bg-white text-black px-8 py-4 rounded-full hover:bg-gray-100 transition-all font-semibold text-lg"
                >
                  Get Started Today
                </Link>
                <Link
                  to="/directory"
                  className="w-full sm:w-auto bg-transparent text-white px-8 py-4 rounded-full hover:bg-white/10 transition-all font-semibold text-lg border border-white/20"
                >
                  Browse Properties
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">V</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Vilo</span>
              </div>
              <p className="text-sm text-gray-500 max-w-xs">
                The booking platform for accommodation providers.
                No commissions. No hidden fees. Just simple, direct bookings.
              </p>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="text-gray-500 hover:text-gray-900 transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-gray-500 hover:text-gray-900 transition-colors">Pricing</a></li>
                <li><Link to="/directory" className="text-gray-500 hover:text-gray-900 transition-colors">Directory</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">About</a></li>
                <li><a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">Blog</a></li>
                <li><Link to="/contact" className="text-gray-500 hover:text-gray-900 transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Vilo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Component: Mega Menu Item
function MegaMenuItem({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href: string }) {
  const isExternal = href.startsWith('http')
  const Component = isExternal ? 'a' : href.startsWith('#') ? 'a' : Link

  return (
    <Component
      to={!isExternal && !href.startsWith('#') ? href : undefined}
      href={isExternal || href.startsWith('#') ? href : undefined}
      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-black group-hover:text-white transition-colors flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-medium text-gray-900 group-hover:text-black">{title}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
    </Component>
  )
}

// Component: Stat Card for Dashboard Preview
function StatCard({ icon, value, label, trend }: { icon: React.ReactNode; value: string; label: string; trend: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
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

// Component: Feature Card
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
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

// Component: Step Card
function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
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
    <div className="bg-white rounded-2xl p-8 border border-gray-100">
      <div className="flex gap-1 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
        ))}
      </div>
      <p className="text-gray-700 mb-6 leading-relaxed">"{quote}"</p>
      <div>
        <div className="font-semibold text-gray-900">{author}</div>
        <div className="text-sm text-gray-500">{role}</div>
      </div>
    </div>
  )
}

// Component: Feature Point (for 2x2 grids in feature sections)
function FeaturePoint({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-gray-900 mb-1">{title}</div>
        <div className="text-sm text-gray-500 leading-relaxed">{description}</div>
      </div>
    </div>
  )
}

// Component: Mini Feature Card (for the "more features" grid)
function MiniFeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all">
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 mb-4">
        {icon}
      </div>
      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-500">{description}</p>
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
      {/* Background decoration */}
      <div className="absolute -inset-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl -z-10" />

      {/* Main screenshot */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-100 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="ml-3 text-xs text-gray-500 font-medium">app.vilo.co.za</span>
        </div>
        <div className="p-1">
          {screens[0].content}
        </div>
      </div>

      {/* Secondary screenshot - offset and stacked */}
      <div className="absolute -bottom-8 -right-8 w-2/3 z-20 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden transform rotate-2 hover:rotate-0 transition-transform">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <div className="w-2 h-2 rounded-full bg-gray-300" />
        </div>
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
