import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import { AuthProvider } from './contexts/AuthContext'
import { CustomerAuthProvider } from './contexts/CustomerAuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import CustomerProtectedRoute from './components/CustomerProtectedRoute'
// Admin pages
import Dashboard from './pages/Dashboard'
import Rooms from './pages/Rooms'
import RoomWizard from './pages/RoomWizard'
import AddOns from './pages/AddOns'
import AddOnWizard from './pages/AddOnWizard'
import Bookings from './pages/Bookings'
import BookingWizard from './pages/BookingWizard'
import BookingDetail from './pages/BookingDetail'
import Calendar from './pages/Calendar'
import Reviews from './pages/Reviews'
import Settings from './pages/Settings'
import BusinessDetails from './pages/business/BusinessDetails'
import BusinessDirectory from './pages/business/BusinessDirectory'
import PaymentIntegration from './pages/business/PaymentIntegration'
import IntegrationsSettings from './pages/settings/IntegrationsSettings'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Support from './pages/Support'
import Layout from './components/Layout'
import Login from './pages/Login'
import Payment from './pages/Payment'
import PaymentCallback from './pages/PaymentCallback'
// Public pages
import Book from './pages/public/Book'
import LeaveReview from './pages/public/LeaveReview'
import JoinTeam from './pages/JoinTeam'
import Pricing from './pages/Pricing'
import HostSignup from './pages/HostSignup'
// Customer Portal pages
import CustomerLayout from './components/CustomerLayout'
import CustomerLogin from './pages/portal/CustomerLogin'
import CustomerVerify from './pages/portal/CustomerVerify'
// CustomerDashboard is available but currently routes to bookings
// import CustomerDashboard from './pages/portal/CustomerDashboard'
import CustomerBookings from './pages/portal/CustomerBookings'
import CustomerBookingDetail from './pages/portal/CustomerBookingDetail'
import CustomerReviews from './pages/portal/CustomerReviews'
import CustomerSupport from './pages/portal/CustomerSupport'
import CustomerSupportThread from './pages/portal/CustomerSupportThread'
import CustomerProfile from './pages/portal/CustomerProfile'
// Discovery pages
import DiscoveryLayout from './components/discovery/DiscoveryLayout'
import DiscoveryHome from './pages/discovery/DiscoveryHome'
import SearchResults from './pages/discovery/SearchResults'
import PropertyDetail from './pages/discovery/PropertyDetail'
import PropertyRedirect from './components/PropertyRedirect'
import DestinationPage from './pages/discovery/DestinationPage'
import CategoryPage from './pages/discovery/CategoryPage'
import ProvincePage from './pages/discovery/ProvincePage'
import Checkout from './pages/discovery/Checkout'
import BookingConfirmation from './pages/discovery/BookingConfirmation'
import LandingPage from './pages/landing/LandingPage'
// Legal pages
import EarningsDisclaimer from './pages/legal/EarningsDisclaimer'
import TermsAndConditions from './pages/legal/TermsAndConditions'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'

function App() {
  return (
    <AuthProvider>
      <CustomerAuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <Routes>
            {/* Discovery Platform (public) */}
            <Route path="/" element={<DiscoveryLayout />}>
              <Route index element={<DiscoveryHome />} />
              <Route path="search" element={<SearchResults />} />
              <Route path="accommodation/:slug" element={<PropertyDetail />} />
              {/* Legacy routes - redirect to new SEO-friendly URLs */}
              <Route path="property/:slug" element={<PropertyRedirect />} />
              <Route path="property/:slug/book" element={<PropertyRedirect />} />
              <Route path="destinations/:region" element={<DestinationPage />} />
              {/* Category and Province browse pages */}
              <Route path="categories/:slug" element={<CategoryPage />} />
              <Route path="provinces/:provinceSlug" element={<ProvincePage />} />
              {/* Legal pages */}
              <Route path="earnings-disclaimer" element={<EarningsDisclaimer />} />
              <Route path="terms" element={<TermsAndConditions />} />
              <Route path="privacy" element={<PrivacyPolicy />} />
            </Route>

            {/* Checkout flow (outside layout for full-screen experience) */}
            <Route path="/accommodation/:slug/book" element={<Checkout />} />
            <Route path="/booking/confirmed/:bookingId" element={<BookingConfirmation />} />

            {/* SaaS marketing page for property owners */}
            <Route path="/for-hosts" element={<LandingPage />} />

            {/* Public booking route (outside layout for full-screen experience) */}
            <Route path="/book" element={<Book />} />

            {/* Public review submission route */}
            <Route path="/review/:tenantId/:token" element={<LeaveReview />} />

            {/* Team invitation route */}
            <Route path="/join" element={<JoinTeam />} />

            {/* Pricing page (public) */}
            <Route path="/pricing" element={<Pricing />} />

            {/* Host signup wizard */}
            <Route path="/signup" element={<HostSignup />} />

            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/payment/callback" element={<PaymentCallback />} />

            {/* Customer Portal routes */}
            <Route path="/portal/login" element={<CustomerLogin />} />
            <Route path="/portal/verify" element={<CustomerVerify />} />
            <Route path="/portal" element={
              <CustomerProtectedRoute>
                <CustomerLayout />
              </CustomerProtectedRoute>
            }>
              <Route index element={<Navigate to="/portal/bookings" replace />} />
              <Route path="bookings" element={<CustomerBookings />} />
              <Route path="bookings/:id" element={<CustomerBookingDetail />} />
              <Route path="reviews" element={<CustomerReviews />} />
              <Route path="support" element={<CustomerSupport />} />
              <Route path="support/:id" element={<CustomerSupportThread />} />
              <Route path="profile" element={<CustomerProfile />} />
            </Route>

            {/* Admin dashboard routes (protected) */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="rooms" element={<Rooms />} />
              <Route path="rooms/new" element={<RoomWizard />} />
              <Route path="rooms/:id/edit" element={<RoomWizard />} />
              <Route path="addons" element={<AddOns />} />
              <Route path="addons/new" element={<AddOnWizard />} />
              <Route path="addons/:id/edit" element={<AddOnWizard />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="bookings/new" element={<BookingWizard />} />
              <Route path="bookings/:id" element={<BookingDetail />} />
              <Route path="bookings/:id/edit" element={<BookingWizard />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:email" element={<CustomerDetail />} />
              <Route path="support" element={<Support />} />
              <Route path="settings" element={<Settings />} />
              <Route path="business/details" element={<BusinessDetails />} />
              <Route path="business/directory" element={<BusinessDirectory />} />
              <Route path="business/payments" element={<PaymentIntegration />} />
              <Route path="settings/integrations" element={<IntegrationsSettings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CustomerAuthProvider>
    </AuthProvider>
  )
}

export default App
