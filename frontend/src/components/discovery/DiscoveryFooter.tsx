import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'

const destinations = [
  { name: 'Cape Town', slug: 'cape-town' },
  { name: 'Garden Route', slug: 'garden-route' },
  { name: 'Kruger National Park', slug: 'kruger' },
  { name: 'Drakensberg', slug: 'drakensberg' },
  { name: 'Durban', slug: 'durban' },
  { name: 'Cape Winelands', slug: 'wine-lands' },
  { name: 'Wild Coast', slug: 'wild-coast' },
  { name: 'Johannesburg', slug: 'johannesburg' },
]

const categories = [
  { name: 'Beach Getaways', slug: 'beach' },
  { name: 'Safari & Wildlife', slug: 'safari' },
  { name: 'Mountain Escapes', slug: 'mountain' },
  { name: 'Pet-Friendly', slug: 'pet-friendly' },
  { name: 'Family Stays', slug: 'family' },
  { name: 'Romantic Retreats', slug: 'romantic' },
]

export default function DiscoveryFooter() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Newsletter Section */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Get travel inspiration</h3>
              <p className="text-gray-400">Subscribe for exclusive deals and destination guides</p>
            </div>
            <form className="flex w-full md:w-auto gap-3">
              <div className="relative flex-1 md:w-64">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-500"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-accent-600 hover:bg-accent-700 rounded-lg font-medium transition-colors whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-bold">Vilo</span>
            </Link>
            <p className="text-gray-400 text-sm mb-4">
              Discover and book unique accommodations across South Africa.
              From beachfront stays to safari lodges.
            </p>
          </div>

          {/* Destinations */}
          <div>
            <h4 className="font-semibold mb-4">Top Destinations</h4>
            <ul className="space-y-2">
              {destinations.slice(0, 6).map((dest) => (
                <li key={dest.slug}>
                  <Link
                    to={`/destinations/${dest.slug}`}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {dest.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-4">Categories</h4>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to={`/search?category=${cat.slug}`}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Hosts */}
          <div>
            <h4 className="font-semibold mb-4">For Hosts</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/for-hosts" className="text-gray-400 hover:text-white text-sm transition-colors">
                  List Your Property
                </Link>
              </li>
              <li>
                <Link to="/for-hosts#pricing" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/for-hosts#features" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Host Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white text-sm transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/earnings-disclaimer" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Earnings Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Vilo. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>Made with love in South Africa</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
